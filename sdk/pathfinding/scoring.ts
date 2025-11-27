/**
 * Visibility and Safety Scoring Module
 * 
 * Computes visibility and safety scores for navigation path segments.
 */

import { NavigationEdge, Position } from './index';

export interface LightMetrics {
  meanLuminance: number; // 0-255
  ambientLux: number; // lux scale
  shadowCoverage: number; // 0-1 (percentage)
  unifiedLightLevel: number; // 0-1 (normalized)
  timestamp: number;
}

export interface HazardDetection {
  id: string;
  type: 'obstacle' | 'uneven_surface' | 'drop_off' | 'unknown';
  confidence: number; // 0.0-1.0
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  worldPosition?: {
    latitude: number;
    longitude: number;
    distance: number; // meters from user
  };
}

/**
 * Calculate distance between two positions using Haversine formula
 */
function calculateDistance(pos1: Position, pos2: Position): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (pos1.latitude * Math.PI) / 180;
  const lat2 = (pos2.latitude * Math.PI) / 180;
  const deltaLat = ((pos2.latitude - pos1.latitude) * Math.PI) / 180;
  const deltaLon = ((pos2.longitude - pos1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Compute visibility score for a path segment based on light metrics and shadow coverage
 * 
 * @param edge - The navigation edge to score
 * @param lightMetrics - Current light metrics from sensor fusion
 * @returns Visibility score between 0 and 1 (higher = better visibility)
 */
export function computeVisibilityScore(
  edge: NavigationEdge,
  lightMetrics: LightMetrics
): number {
  // Use unified light level as primary factor
  const lightScore = lightMetrics.unifiedLightLevel;
  
  // Shadow coverage reduces visibility
  const shadowPenalty = lightMetrics.shadowCoverage;
  
  // Combine factors: higher light = better visibility, more shadows = worse visibility
  const visibilityScore = lightScore * (1 - shadowPenalty * 0.5);
  
  // Normalize to 0-1 range
  return Math.max(0, Math.min(1, visibilityScore));
}

/**
 * Compute safety score for a path segment based on hazard proximity and density
 * 
 * @param edge - The navigation edge to score
 * @param fromPosition - Position of the starting node
 * @param toPosition - Position of the ending node
 * @param hazards - Array of detected hazards
 * @param proximityThreshold - Distance threshold in meters for hazard consideration (default: 20m)
 * @returns Safety score between 0 and 1 (higher = safer)
 */
export function computeSafetyScore(
  edge: NavigationEdge,
  fromPosition: Position,
  toPosition: Position,
  hazards: HazardDetection[],
  proximityThreshold: number = 20
): number {
  // Filter hazards that are near the edge
  const nearbyHazards = hazards.filter((hazard) => {
    if (!hazard.worldPosition) {
      return false;
    }
    
    const hazardPos: Position = {
      latitude: hazard.worldPosition.latitude,
      longitude: hazard.worldPosition.longitude,
    };
    
    // Check distance to both endpoints of the edge
    const distToFrom = calculateDistance(hazardPos, fromPosition);
    const distToTo = calculateDistance(hazardPos, toPosition);
    
    // Hazard is nearby if it's within threshold of either endpoint
    return distToFrom <= proximityThreshold || distToTo <= proximityThreshold;
  });
  
  if (nearbyHazards.length === 0) {
    return 1.0; // Maximum safety when no hazards nearby
  }
  
  // Calculate hazard density and weighted confidence
  const hazardDensity = nearbyHazards.length / 10; // Normalize by expected max hazards
  const avgConfidence = nearbyHazards.reduce((sum, h) => sum + h.confidence, 0) / nearbyHazards.length;
  
  // Safety decreases with more hazards and higher confidence
  const hazardImpact = hazardDensity * avgConfidence;
  const safetyScore = 1 - Math.min(1, hazardImpact);
  
  // Normalize to 0-1 range
  return Math.max(0, Math.min(1, safetyScore));
}

/**
 * Update visibility and safety scores for an edge
 * 
 * @param edge - The navigation edge to update
 * @param fromPosition - Position of the starting node
 * @param toPosition - Position of the ending node
 * @param lightMetrics - Current light metrics
 * @param hazards - Array of detected hazards
 * @returns Updated edge with new scores
 */
export function updateEdgeScores(
  edge: NavigationEdge,
  fromPosition: Position,
  toPosition: Position,
  lightMetrics: LightMetrics,
  hazards: HazardDetection[]
): NavigationEdge {
  return {
    ...edge,
    visibilityScore: computeVisibilityScore(edge, lightMetrics),
    safetyScore: computeSafetyScore(edge, fromPosition, toPosition, hazards),
  };
}
