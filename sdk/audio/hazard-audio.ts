/**
 * Hazard Audio Cues
 * Generates directional audio pings for detected hazards
 */

import { AudioCue } from './index.js';

/**
 * Information about a detected hazard for audio cue generation
 */
export interface HazardInfo {
  id: string;
  type: 'obstacle' | 'uneven_surface' | 'drop_off' | 'unknown';
  direction: number; // degrees from user's forward direction (0-360)
  distance: number; // meters
  confidence: number; // 0.0-1.0
}

/**
 * Generate audio cue for a hazard
 * @param hazard The hazard information
 * @param timestamp The timestamp for the cue (defaults to current time)
 * @returns An audio cue for the hazard
 */
export function generateHazardAudioCue(
  hazard: HazardInfo,
  timestamp: number = Date.now()
): AudioCue {
  const message = generateHazardMessage(hazard);

  return {
    id: `hazard-${hazard.id}-${timestamp}`,
    type: 'hazard',
    priority: calculateHazardPriority(hazard),
    message,
    direction: hazard.direction,
    timestamp,
  };
}

/**
 * Generate spoken message for hazard
 */
function generateHazardMessage(hazard: HazardInfo): string {
  const directionText = getDirectionText(hazard.direction);
  const distanceText = formatHazardDistance(hazard.distance);
  const typeText = getHazardTypeText(hazard.type);

  return `${typeText} detected ${directionText}, ${distanceText}`;
}

/**
 * Calculate priority for hazard based on distance and type
 */
function calculateHazardPriority(hazard: HazardInfo): number {
  // Base priority on hazard type
  let basePriority = 7; // Default high priority for hazards

  switch (hazard.type) {
    case 'drop_off':
      basePriority = 9; // Highest priority for drop-offs
      break;
    case 'obstacle':
      basePriority = 8; // High priority for obstacles
      break;
    case 'uneven_surface':
      basePriority = 7; // Medium-high priority for uneven surfaces
      break;
    case 'unknown':
      basePriority = 7; // Medium-high priority for unknown hazards
      break;
  }

  // Increase priority for closer hazards
  if (hazard.distance < 2) {
    basePriority = Math.min(10, basePriority + 1); // Very close hazards get +1 priority
  } else if (hazard.distance < 5) {
    // Keep base priority for close hazards
  } else {
    basePriority = Math.max(6, basePriority - 1); // Distant hazards get -1 priority
  }

  return basePriority;
}

/**
 * Get direction text from degrees
 */
function getDirectionText(degrees: number): string {
  // Normalize to 0-360
  const normalized = ((degrees % 360) + 360) % 360;

  if (normalized < 22.5 || normalized >= 337.5) {
    return 'ahead';
  } else if (normalized >= 22.5 && normalized < 67.5) {
    return 'ahead right';
  } else if (normalized >= 67.5 && normalized < 112.5) {
    return 'to your right';
  } else if (normalized >= 112.5 && normalized < 157.5) {
    return 'behind right';
  } else if (normalized >= 157.5 && normalized < 202.5) {
    return 'behind';
  } else if (normalized >= 202.5 && normalized < 247.5) {
    return 'behind left';
  } else if (normalized >= 247.5 && normalized < 292.5) {
    return 'to your left';
  } else {
    return 'ahead left';
  }
}

/**
 * Format hazard distance for spoken output
 */
function formatHazardDistance(meters: number): string {
  if (meters < 1) {
    return 'very close';
  } else if (meters < 2) {
    return 'one meter away';
  } else if (meters < 5) {
    return `${Math.round(meters)} meters away`;
  } else if (meters < 10) {
    return `${Math.round(meters)} meters away`;
  } else {
    return `${Math.round(meters)} meters away`;
  }
}

/**
 * Get human-readable hazard type text
 */
function getHazardTypeText(type: HazardInfo['type']): string {
  switch (type) {
    case 'obstacle':
      return 'Obstacle';
    case 'uneven_surface':
      return 'Uneven surface';
    case 'drop_off':
      return 'Drop-off';
    case 'unknown':
      return 'Hazard';
    default:
      return 'Hazard';
  }
}

/**
 * Generate warning cue for immediate danger
 */
export function generateWarningCue(
  message: string,
  direction?: number,
  timestamp: number = Date.now()
): AudioCue {
  return {
    id: `warning-${timestamp}`,
    type: 'warning',
    priority: 10, // Maximum priority for warnings
    message,
    direction,
    timestamp,
  };
}

/**
 * Generate multiple hazard cues and sort by priority
 */
export function generateHazardCues(
  hazards: HazardInfo[],
  timestamp: number = Date.now()
): AudioCue[] {
  return hazards
    .map((hazard) => generateHazardAudioCue(hazard, timestamp))
    .sort((a, b) => b.priority - a.priority); // Sort by priority (highest first)
}
