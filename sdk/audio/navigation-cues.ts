/**
 * Navigation Cues Generator
 * Generates spoken directions from route changes
 */

import { AudioCue } from './index.js';

export interface RouteChange {
  type: 'start' | 'turn' | 'continue' | 'arrive' | 'reroute';
  direction?: 'left' | 'right' | 'straight';
  distance?: number; // meters
  streetName?: string;
  destination?: string;
}

/**
 * Generate audio cue from route change
 */
export function generateNavigationCue(
  change: RouteChange,
  timestamp: number = Date.now()
): AudioCue {
  const message = generateNavigationMessage(change);

  return {
    id: `nav-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'navigation',
    priority: 5, // Medium priority for routine navigation
    message,
    timestamp,
  };
}

/**
 * Generate spoken message from route change
 */
function generateNavigationMessage(change: RouteChange): string {
  switch (change.type) {
    case 'start':
      if (change.destination) {
        return `Starting navigation to ${change.destination}`;
      }
      return 'Starting navigation';

    case 'turn':
      if (change.direction && change.distance !== undefined) {
        const distanceText = formatDistance(change.distance);
        const directionText = change.direction;
        const streetText = change.streetName ? ` onto ${change.streetName}` : '';
        return `In ${distanceText}, turn ${directionText}${streetText}`;
      }
      if (change.direction) {
        return `Turn ${change.direction}`;
      }
      return 'Turn ahead';

    case 'continue':
      if (change.distance !== undefined) {
        const distanceText = formatDistance(change.distance);
        const streetText = change.streetName ? ` on ${change.streetName}` : '';
        return `Continue ${distanceText}${streetText}`;
      }
      return 'Continue straight';

    case 'arrive':
      if (change.destination) {
        return `You have arrived at ${change.destination}`;
      }
      return 'You have arrived at your destination';

    case 'reroute':
      return 'Recalculating route';

    default:
      return 'Navigation update';
  }
}

/**
 * Format distance for spoken output
 */
function formatDistance(meters: number): string {
  if (meters < 10) {
    return 'a few meters';
  } else if (meters < 50) {
    return `${Math.round(meters / 10) * 10} meters`;
  } else if (meters < 100) {
    return `${Math.round(meters / 10) * 10} meters`;
  } else if (meters < 1000) {
    return `${Math.round(meters / 50) * 50} meters`;
  } else {
    const km = (meters / 1000).toFixed(1);
    return `${km} kilometers`;
  }
}

/**
 * Generate reroute cue with high priority
 */
export function generateRerouteCue(timestamp: number = Date.now()): AudioCue {
  return {
    id: `reroute-${timestamp}`,
    type: 'navigation',
    priority: 7, // Higher priority for reroutes
    message: 'Recalculating route',
    timestamp,
  };
}

/**
 * Generate arrival cue
 */
export function generateArrivalCue(
  destination?: string,
  timestamp: number = Date.now()
): AudioCue {
  const message = destination
    ? `You have arrived at ${destination}`
    : 'You have arrived at your destination';

  return {
    id: `arrive-${timestamp}`,
    type: 'navigation',
    priority: 6,
    message,
    timestamp,
  };
}
