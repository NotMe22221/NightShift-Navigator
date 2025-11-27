/**
 * AR Overlay UI
 * Renders augmented reality navigation elements
 */

import type { Route } from '../pathfinding/index.js';
import type { HazardDetection } from '../computer-vision/index.js';

/**
 * Configuration for AR Overlay UI
 * Controls rendering performance and feature enablement
 */
export interface ARConfig {
  targetFPS: number; // minimum 30 fps
  spectralPathEnabled: boolean;
  hazardMarkersEnabled: boolean;
  lowLightWarningsEnabled: boolean;
  maxPositionJitterCm: number; // maximum 5 cm
}

/**
 * Visual styling for the Spectral Path effect
 * Defines appearance and animation of the navigation path overlay
 */
export interface SpectralPathStyle {
  color: string;
  width: number; // meters
  opacity: number;
  glowIntensity: number;
  animationSpeed: number;
}

/**
 * Marker for displaying hazards in AR
 * Represents a visual indicator for detected environmental hazards
 */
export interface HazardMarker {
  hazardId: string;
  position: { latitude: number; longitude: number };
  type: string;
  iconUrl: string;
  scale: number;
}

/**
 * AR Overlay UI interface
 * Manages augmented reality rendering of navigation elements
 */
export interface AROverlayUI {
  initialize(config: ARConfig): Promise<void>;
  start(): void;
  stop(): void;
  updateRoute(route: Route): void;
  updateHazards(hazards: HazardDetection[]): void;
  setLowLightWarning(visible: boolean): void;
  setSpectralPathStyle(style: SpectralPathStyle): void;
  getCurrentFPS(): number;
}

export { AROverlay } from './ar-overlay-ui.js';
