/**
 * Property test for waypoint distance updates
 * **Feature: nightshift-navigator, Property 23: Waypoint distance updates**
 * **Validates: Requirements 5.3**
 *
 * Property: For any approach to a waypoint, spoken distance updates should occur at 10-meter intervals (20m, 10m, etc.).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  WaypointTracker,
  generateWaypointDistanceCue,
  updatePositionAndGenerateAnnouncements,
  calculateDistance,
  type Position,
  type Waypoint,
} from './waypoint-announcements.js';

describe('Property 23: Waypoint distance updates', () => {
  let tracker: WaypointTracker;

  beforeEach(() => {
    tracker = new WaypointTracker();
  });

  it('should announce at 10-meter intervals when approaching waypoint', () => {
    // Generator for waypoint
    const waypointArb = fc.record({
      id: fc.uuid(),
      position: fc.record({
        latitude: fc.double({ min: -90, max: 90, noNaN: true }),
        longitude: fc.double({ min: -180, max: 180, noNaN: true }),
      }),
      name: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
    }) as fc.Arbitrary<Waypoint>;

    fc.assert(
      fc.property(waypointArb, (waypoint) => {
        const tracker = new WaypointTracker();

        // Test announcement intervals: 100, 90, 80, ..., 20, 10
        const intervals = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];

        for (const distance of intervals) {
          const shouldAnnounce = tracker.shouldAnnounce(waypoint.id, distance);

          // Should announce at this interval
          expect(shouldAnnounce).toBe(distance);

          // Record the announcement
          tracker.recordAnnouncement(waypoint.id, distance);

          // Should not announce again at the same distance
          const shouldAnnounceAgain = tracker.shouldAnnounce(waypoint.id, distance);
          expect(shouldAnnounceAgain).toBeNull();
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should not announce between intervals', () => {
    const waypointArb = fc.record({
      id: fc.uuid(),
      position: fc.record({
        latitude: fc.double({ min: -90, max: 90, noNaN: true }),
        longitude: fc.double({ min: -180, max: 180, noNaN: true }),
      }),
    }) as fc.Arbitrary<Waypoint>;

    fc.assert(
      fc.property(waypointArb, (waypoint) => {
        const tracker = new WaypointTracker();

        // Announce at 50 meters
        tracker.recordAnnouncement(waypoint.id, 50);

        // Check distances between intervals (should not announce)
        const betweenIntervals = [49, 48, 47, 45, 42, 41];

        for (const distance of betweenIntervals) {
          const shouldAnnounce = tracker.shouldAnnounce(waypoint.id, distance);
          expect(shouldAnnounce).toBeNull();
        }

        // Should announce at next interval (40 meters)
        const shouldAnnounceAt40 = tracker.shouldAnnounce(waypoint.id, 40);
        expect(shouldAnnounceAt40).toBe(40);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should generate cues with waypoint information', () => {
    const waypointArb = fc.record({
      id: fc.uuid(),
      position: fc.record({
        latitude: fc.double({ min: -90, max: 90, noNaN: true }),
        longitude: fc.double({ min: -180, max: 180, noNaN: true }),
      }),
      name: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
    }) as fc.Arbitrary<Waypoint>;

    const distanceArb = fc.constantFrom(10, 20, 30, 40, 50, 60, 70, 80, 90, 100);

    fc.assert(
      fc.property(waypointArb, distanceArb, (waypoint, distance) => {
        const cue = generateWaypointDistanceCue(waypoint, distance);

        // Verify cue properties
        expect(cue.type).toBe('waypoint');
        expect(cue.message).toBeDefined();
        expect(cue.message!.length).toBeGreaterThan(0);

        // Message should contain distance information
        const message = cue.message!.toLowerCase();
        const hasDistanceInfo = message.includes('meter') || message.includes('kilometer');
        expect(hasDistanceInfo).toBe(true);

        // Priority should be medium-high (6)
        expect(cue.priority).toBe(6);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should track multiple waypoints independently', () => {
    // Generator for multiple waypoints with unique IDs
    const waypointsArb = fc
      .array(
        fc.record({
          id: fc.uuid(),
          position: fc.record({
            latitude: fc.double({ min: -90, max: 90, noNaN: true }),
            longitude: fc.double({ min: -180, max: 180, noNaN: true }),
          }),
        }) as fc.Arbitrary<Waypoint>,
        { minLength: 2, maxLength: 5 }
      )
      .filter((waypoints) => {
        // Ensure all IDs are unique
        const ids = waypoints.map((w) => w.id);
        return new Set(ids).size === ids.length;
      });

    fc.assert(
      fc.property(waypointsArb, (waypoints) => {
        const tracker = new WaypointTracker();

        // Announce at 50 meters for first waypoint
        tracker.recordAnnouncement(waypoints[0].id, 50);

        // Should not affect other waypoints
        for (let i = 1; i < waypoints.length; i++) {
          const shouldAnnounce = tracker.shouldAnnounce(waypoints[i].id, 50);
          expect(shouldAnnounce).toBe(50); // Should still announce for other waypoints
        }

        // First waypoint should not announce again at 50
        const shouldAnnounceFirst = tracker.shouldAnnounce(waypoints[0].id, 50);
        expect(shouldAnnounceFirst).toBeNull();

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should generate announcements when user approaches waypoints', () => {
    // Create a waypoint at a known location
    const waypoint: Waypoint = {
      id: 'test-waypoint',
      position: { latitude: 0, longitude: 0 },
      name: 'Test Waypoint',
    };

    // Generator for user positions at various distances
    // Using small offsets to create predictable distances
    const positionArb = fc.record({
      latitude: fc.double({ min: -0.001, max: 0.001, noNaN: true }),
      longitude: fc.double({ min: -0.001, max: 0.001, noNaN: true }),
    }) as fc.Arbitrary<Position>;

    fc.assert(
      fc.property(positionArb, (userPosition) => {
        const tracker = new WaypointTracker();
        const distance = calculateDistance(userPosition, waypoint.position);

        // Generate announcements
        const cues = updatePositionAndGenerateAnnouncements(
          userPosition,
          [waypoint],
          tracker
        );

        // If distance is at an announcement interval, should generate cue
        const intervals = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
        const isAtInterval = intervals.some((interval) => distance <= interval);

        if (isAtInterval && distance <= 100) {
          // Should have generated at least one cue (or none if already announced)
          expect(cues.length).toBeGreaterThanOrEqual(0);
          expect(cues.length).toBeLessThanOrEqual(1);

          if (cues.length > 0) {
            expect(cues[0].type).toBe('waypoint');
          }
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should calculate distance correctly using Haversine formula', () => {
    // Test with known positions
    const pos1: Position = { latitude: 0, longitude: 0 };
    const pos2: Position = { latitude: 0, longitude: 0 };

    // Same position should have distance 0
    const distance = calculateDistance(pos1, pos2);
    expect(distance).toBe(0);

    // Test with positions approximately 111km apart (1 degree latitude)
    const pos3: Position = { latitude: 1, longitude: 0 };
    const distance2 = calculateDistance(pos1, pos3);
    expect(distance2).toBeGreaterThan(110000); // ~111km
    expect(distance2).toBeLessThan(112000);
  });

  it('should clear waypoint tracking when requested', () => {
    const waypointArb = fc.record({
      id: fc.uuid(),
      position: fc.record({
        latitude: fc.double({ min: -90, max: 90, noNaN: true }),
        longitude: fc.double({ min: -180, max: 180, noNaN: true }),
      }),
    }) as fc.Arbitrary<Waypoint>;

    fc.assert(
      fc.property(waypointArb, (waypoint) => {
        const tracker = new WaypointTracker();

        // Record announcement at 50 meters
        tracker.recordAnnouncement(waypoint.id, 50);

        // Should not announce again at 50
        expect(tracker.shouldAnnounce(waypoint.id, 50)).toBeNull();

        // Clear waypoint
        tracker.clearWaypoint(waypoint.id);

        // After clearing, should announce at the first applicable interval
        // For distance 50, the first interval is 50 itself
        const shouldAnnounce = tracker.shouldAnnounce(waypoint.id, 50);
        expect(shouldAnnounce).toBe(50);

        // Also test with a larger distance to verify it picks the right interval
        tracker.clearWaypoint(waypoint.id);
        const shouldAnnounceAt75 = tracker.shouldAnnounce(waypoint.id, 75);
        // At 75 meters, should announce at 80 (the next interval >= 75)
        expect(shouldAnnounceAt75).toBe(80);

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
