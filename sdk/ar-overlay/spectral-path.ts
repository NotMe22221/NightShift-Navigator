/**
 * Spectral Path Rendering
 * Creates animated path geometry with glow effect for AR navigation
 */

import * as THREE from 'three';
import type { Route } from '../pathfinding/index.js';
import type { Position } from '../types/index.js';
import type { SpectralPathStyle } from './index.js';

/**
 * Convert GPS coordinates to local world space coordinates
 * Uses a simple equirectangular projection relative to the first point
 */
export function gpsToWorldSpace(position: Position, origin: Position): THREE.Vector3 {
  const EARTH_RADIUS = 6371000; // meters
  
  const latDiff = (position.latitude - origin.latitude) * Math.PI / 180;
  const lonDiff = (position.longitude - origin.longitude) * Math.PI / 180;
  
  const x = lonDiff * EARTH_RADIUS * Math.cos(origin.latitude * Math.PI / 180);
  const z = -latDiff * EARTH_RADIUS; // Negative because Z is forward in three.js
  const y = (position.altitude || 0) - (origin.altitude || 0);
  
  return new THREE.Vector3(x, y, z);
}

/**
 * Create spectral path mesh from route
 */
export function createSpectralPath(route: Route, style: SpectralPathStyle): THREE.Mesh {
  if (route.nodes.length < 2) {
    throw new Error('Route must have at least 2 nodes');
  }
  
  // Use first node as origin for coordinate conversion
  const origin = route.nodes[0].position;
  
  // Convert route nodes to world space points
  const points: THREE.Vector3[] = route.nodes.map(node => 
    gpsToWorldSpace(node.position, origin)
  );
  
  // Create path curve
  const curve = new THREE.CatmullRomCurve3(points);
  
  // Generate tube geometry along the curve
  const tubeGeometry = new THREE.TubeGeometry(
    curve,
    points.length * 10, // segments
    style.width / 2, // radius (width is diameter)
    8, // radial segments
    false // closed
  );
  
  // Create glowing material
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(style.color),
    emissive: new THREE.Color(style.color),
    emissiveIntensity: style.glowIntensity,
    opacity: style.opacity,
    transparent: true,
    side: THREE.DoubleSide
  });
  
  const mesh = new THREE.Mesh(tubeGeometry, material);
  
  // Store animation data
  (mesh as any).animationSpeed = style.animationSpeed;
  (mesh as any).animationTime = 0;
  
  return mesh;
}

/**
 * Update spectral path animation
 */
export function updateSpectralPathAnimation(mesh: THREE.Mesh, deltaTime: number): void {
  const animationSpeed = (mesh as any).animationSpeed || 1.0;
  const animationTime = ((mesh as any).animationTime || 0) + deltaTime * animationSpeed;
  
  (mesh as any).animationTime = animationTime;
  
  // Animate glow intensity with sine wave
  const material = mesh.material as THREE.MeshStandardMaterial;
  const baseIntensity = (mesh as any).baseGlowIntensity || material.emissiveIntensity;
  material.emissiveIntensity = baseIntensity * (0.7 + 0.3 * Math.sin(animationTime * 2));
  
  // Store base intensity for future reference
  if (!(mesh as any).baseGlowIntensity) {
    (mesh as any).baseGlowIntensity = baseIntensity;
  }
}
