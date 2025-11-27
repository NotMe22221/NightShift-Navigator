/**
 * Waypoint Distance Announcements
 * Tracks user position relative to waypoints and triggers spoken updates
 */

import { AudioCue } from './index.js';

/**
 * Geographic position with latitude and longitude
 */
export interface Position {
  latitude: number;
  longitude: number;
}

/**
 * Waypoint on a navigation route
 */
export interface Waypoint {
  id: string;
  position: Position;
  name?: string;
}

/**
 * Calculate distance between two positions using Haversine formula
 * @param pos1 The first position
 * @param pos2 The second position
 * @returns Distance in meters
 */
export function calculateDistance(pos1: Position, pos2: Position): number {
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
 * Waypoint tracker that manages distance announcements
 */
/**
 * Waypoint tracker for distance-based announcements
 * Tracks user position relative to waypoints and triggers spoken updates
 */
export class WaypointTracker {
  private lastAnnouncedDistance: Map<string, number> = new Map();
  private readonly announcementIntervals = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10]; // meters

  /**
   * Check if a distance announcement should be made
   * Returns the announcement distance if one should be made, null otherwise
   * @param waypointId The ID of the waypoint to check
   * @param currentDistance The current distance to the waypoint in meters
   * @returns The announcement distance if one should be made, null otherwise
   */
  shouldAnnounce(waypointId: string, currentDistance: number): number | null {
    const lastAnnounced = this.lastAnnouncedDistance.get(waypointId);

    // Find the closest announcement interval that is >= currentDistance
    let closestInterval: number | null = null;
    for (const interval of this.announcementIntervals) {
      if (currentDistance <= interval) {
        closestInterval = interval;
        // Keep looking for a closer interval (smaller value)
      }
    }

    // If we found an interval and haven't announced it yet
    if (closestInterval !== null) {
      if (lastAnnounced === undefined || lastAnnounced > closestInterval) {
        return closestInterval;
      }
    }

    return null;
  }

  /**
   * Record that a distance announcement was made
   * @param waypointId The ID of the waypoint
   * @param distance The distance that was announced
   */
  recordAnnouncement(waypointId: string, distance: number): void {
    this.lastAnnouncedDistance.set(waypointId, distance);
  }

  /**
   * Clear tracking for a waypoint (e.g., when reached or route changes)
   * @param waypointId The ID of the waypoint to clear
   */
  clearWaypoint(waypointId: string): void {
    this.lastAnnouncedDistance.delete(waypointId);
  }

  /**
   * Clear all waypoint tracking
   */
  clearAll(): void {
    this.lastAnnouncedDistance.clear();
  }

  /**
   * Get the last announced distance for a waypoint
   * @param waypointId The ID of the waypoint
   * @returns The last announced distance, or undefined if none
   */
  getLastAnnouncedDistance(waypointId: string): number | undefined {
    return this.lastAnnouncedDistance.get(waypointId);
  }
}

/**
 * Generate waypoint distance announcement cue
 * @param waypoint The waypoint to announce
 * @param distance The distance to the waypoint in meters
 * @param timestamp The timestamp for the cue (defaults to current time)
 * @returns An audio cue for the waypoint distance announcement
 */
export function generateWaypointDistanceCue(
  waypoint: Waypoint,
  distance: number,
  timestamp: number = Date.now()
): AudioCue {
  const message = generateWaypointMessage(waypoint, distance);

  return {
    id: `waypoint-${waypoint.id}-${distance}-${timestamp}`,
    type: 'waypoint',
    priority: 6, // Medium-high priority for waypoint updates
    message,
    timestamp,
  };
}

/**
 * Generate spoken message for waypoint distance
 * @param waypoint The waypoint to generate a message for
 * @param distance The distance to the waypoint in meters
 * @returns A formatted spoken message
 */
function generateWaypointMessage(waypoint: Waypoint, distance: number): string {
  const distanceText = formatWaypointDistance(distance);
  const waypointName = waypoint.name || 'waypoint';

  if (distance <= 10) {
    return `Approaching ${waypointName}, ${distanceText}`;
  } else {
    return `${distanceText} to ${waypointName}`;
  }
}

/**
 * Format waypoint distance for spoken output
 * @param meters The distance in meters
 * @returns A formatted distance string for speech
 */
function formatWaypointDistance(meters: number): string {
  if (meters <= 10) {
    return `${Math.round(meters)} meters`;
  } else if (meters <= 100) {
    return `${Math.round(meters / 10) * 10} meters`;
  } else if (meters < 1000) {
    return `${Math.round(meters / 10) * 10} meters`;
  } else {
    const km = (meters / 1000).toFixed(1);
    return `${km} kilometers`;
  }
}

/**
 * Update user position and generate announcements for nearby waypoints
 * @param userPosition The current user position
 * @param waypoints The list of waypoints to check
 * @param tracker The waypoint tracker managing announcement state
 * @param timestamp The timestamp for generated cues (defaults to current time)
 * @returns An array of audio cues for waypoint announcements
 */
export function updatePositionAndGenerateAnnouncements(
  userPosition: Position,
  waypoints: Waypoint[],
  tracker: WaypointTracker,
  timestamp: number = Date.now()
): AudioCue[] {
  const cues: AudioCue[] = [];

  for (const waypoint of waypoints) {
    const distance = calculateDistance(userPosition, waypoint.position);

    // Check if we should announce this distance
    const announcementDistance = tracker.shouldAnnounce(waypoint.id, distance);

    if (announcementDistance !== null) {
      // Generate announcement cue
      const cue = generateWaypointDistanceCue(waypoint, announcementDistance, timestamp);
      cues.push(cue);

      // Record the announcement
      tracker.recordAnnouncement(waypoint.id, announcementDistance);
    }
  }

  return cues;
}
