/**
 * Hazard Marker System
 * Filters and positions hazard markers in AR with Kalman filtering for stability
 */

import * as THREE from 'three';
import type { HazardDetection } from '../computer-vision/index.js';
import type { Position } from '../types/index.js';
import { gpsToWorldSpace } from './spectral-path.js';

/**
 * Kalman filter state for position stabilization
 */
interface KalmanState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  positionUncertainty: number;
  velocityUncertainty: number;
}

/**
 * Calculate distance between two GPS positions in meters using the Haversine formula
 * @param pos1 The first GPS position
 * @param pos2 The second GPS position
 * @returns The distance in meters
 */
export function calculateDistance(pos1: Position, pos2: Position): number {
  const EARTH_RADIUS = 6371000; // meters
  
  const lat1 = pos1.latitude * Math.PI / 180;
  const lat2 = pos2.latitude * Math.PI / 180;
  const deltaLat = (pos2.latitude - pos1.latitude) * Math.PI / 180;
  const deltaLon = (pos2.longitude - pos1.longitude) * Math.PI / 180;
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return EARTH_RADIUS * c;
}

/**
 * Filter hazards within specified range
 * @param hazards The list of hazards to filter
 * @param userPosition The user's current GPS position
 * @param maxDistanceMeters The maximum distance in meters
 * @returns Filtered list of hazards within range
 */
export function filterHazardsByDistance(
  hazards: HazardDetection[],
  userPosition: Position,
  maxDistanceMeters: number
): HazardDetection[] {
  return hazards.filter(hazard => {
    if (!hazard.worldPosition) {
      return false;
    }
    
    const distance = calculateDistance(userPosition, {
      latitude: hazard.worldPosition.latitude,
      longitude: hazard.worldPosition.longitude
    });
    
    return distance <= maxDistanceMeters;
  });
}

/**
 * Kalman filter for position stabilization
 * Reduces jitter in AR marker positions by filtering noisy measurements
 */
export class KalmanFilter {
  private state: KalmanState;
  private processNoise: number = 0.01;
  private measurementNoise: number = 0.1;
  
  constructor(initialPosition: THREE.Vector3) {
    this.state = {
      position: initialPosition.clone(),
      velocity: new THREE.Vector3(0, 0, 0),
      positionUncertainty: 1.0,
      velocityUncertainty: 1.0
    };
  }
  
  /**
   * Update filter with new measurement
   */
  update(measurement: THREE.Vector3, deltaTime: number): THREE.Vector3 {
    if (deltaTime <= 0) {
      return this.state.position.clone();
    }
    
    // Prediction step
    const predictedPosition = this.state.position.clone()
      .add(this.state.velocity.clone().multiplyScalar(deltaTime));
    const predictedPositionUncertainty = this.state.positionUncertainty + 
      this.state.velocityUncertainty * deltaTime * deltaTime + this.processNoise;
    
    // Update step
    const kalmanGain = predictedPositionUncertainty / 
      (predictedPositionUncertainty + this.measurementNoise);
    
    const innovation = measurement.clone().sub(predictedPosition);
    this.state.position = predictedPosition.add(innovation.multiplyScalar(kalmanGain));
    this.state.positionUncertainty = (1 - kalmanGain) * predictedPositionUncertainty;
    
    // Update velocity estimate
    if (deltaTime > 0) {
      this.state.velocity = innovation.divideScalar(deltaTime);
    }
    
    return this.state.position.clone();
  }
  
  /**
   * Get current filtered position
   */
  getPosition(): THREE.Vector3 {
    return this.state.position.clone();
  }
}

/**
 * Create hazard marker mesh for AR rendering
 * @param hazard The hazard detection to create a marker for
 * @param userPosition The user's current GPS position
 * @param origin The origin point for world space conversion
 * @returns A three.js mesh representing the hazard marker
 */
export function createHazardMarker(
  hazard: HazardDetection,
  userPosition: Position,
  origin: Position
): THREE.Mesh {
  if (!hazard.worldPosition) {
    throw new Error('Hazard must have world position');
  }
  
  // Convert hazard position to world space
  const worldPos = gpsToWorldSpace({
    latitude: hazard.worldPosition.latitude,
    longitude: hazard.worldPosition.longitude,
    altitude: 0
  }, origin);
  
  // Create marker geometry based on hazard type
  let geometry: THREE.BufferGeometry;
  let color: number;
  
  switch (hazard.type) {
    case 'obstacle':
      geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
      color = 0xff0000; // Red
      break;
    case 'uneven_surface':
      geometry = new THREE.ConeGeometry(0.2, 0.4, 8);
      color = 0xffaa00; // Orange
      break;
    case 'drop_off':
      geometry = new THREE.CylinderGeometry(0.2, 0.2, 0.4, 8);
      color = 0xff00ff; // Magenta
      break;
    default:
      geometry = new THREE.SphereGeometry(0.2, 16, 16);
      color = 0xffff00; // Yellow
      break;
  }
  
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.8
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(worldPos);
  mesh.position.y = 1.5; // Position at eye level
  
  // Store hazard metadata
  (mesh as any).hazardId = hazard.id;
  (mesh as any).hazardType = hazard.type;
  (mesh as any).confidence = hazard.confidence;
  
  return mesh;
}

/**
 * Hazard marker manager with Kalman filtering
 */
/**
 * Hazard marker manager
 * Manages AR markers for detected hazards with Kalman filtering for stability
 */
export class HazardMarkerManager {
  private markers: Map<string, THREE.Mesh> = new Map();
  private kalmanFilters: Map<string, KalmanFilter> = new Map();
  private lastUpdateTime: Map<string, number> = new Map();
  
  /**
   * Update hazard markers with filtering
   */
  updateMarkers(
    hazards: HazardDetection[],
    userPosition: Position,
    origin: Position,
    scene: THREE.Scene,
    maxJitterCm: number = 5
  ): void {
    const currentTime = performance.now();
    const activeHazardIds = new Set<string>();
    
    for (const hazard of hazards) {
      if (!hazard.worldPosition) {
        continue;
      }
      
      activeHazardIds.add(hazard.id);
      
      // Get or create marker
      let marker = this.markers.get(hazard.id);
      if (!marker) {
        marker = createHazardMarker(hazard, userPosition, origin);
        this.markers.set(hazard.id, marker);
        scene.add(marker);
        
        // Initialize Kalman filter
        this.kalmanFilters.set(hazard.id, new KalmanFilter(marker.position.clone()));
        this.lastUpdateTime.set(hazard.id, currentTime);
      } else {
        // Update position with Kalman filtering
        const lastTime = this.lastUpdateTime.get(hazard.id) || currentTime;
        const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
        
        const newPosition = gpsToWorldSpace({
          latitude: hazard.worldPosition.latitude,
          longitude: hazard.worldPosition.longitude,
          altitude: 0
        }, origin);
        newPosition.y = 1.5;
        
        const filter = this.kalmanFilters.get(hazard.id);
        if (filter) {
          const filteredPosition = filter.update(newPosition, deltaTime);
          
          // Apply position with jitter limit
          const maxJitterMeters = maxJitterCm / 100;
          const displacement = filteredPosition.clone().sub(marker.position);
          if (displacement.length() > maxJitterMeters) {
            displacement.normalize().multiplyScalar(maxJitterMeters);
            marker.position.add(displacement);
          } else {
            marker.position.copy(filteredPosition);
          }
        }
        
        this.lastUpdateTime.set(hazard.id, currentTime);
      }
    }
    
    // Remove markers for hazards that are no longer present
    for (const [hazardId, marker] of this.markers.entries()) {
      if (!activeHazardIds.has(hazardId)) {
        scene.remove(marker);
        this.markers.delete(hazardId);
        this.kalmanFilters.delete(hazardId);
        this.lastUpdateTime.delete(hazardId);
      }
    }
  }
  
  /**
   * Clear all markers
   */
  clear(scene: THREE.Scene): void {
    for (const marker of this.markers.values()) {
      scene.remove(marker);
    }
    this.markers.clear();
    this.kalmanFilters.clear();
    this.lastUpdateTime.clear();
  }
}
