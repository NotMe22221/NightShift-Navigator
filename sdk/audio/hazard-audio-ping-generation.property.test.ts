/**
 * Property test for hazard audio ping generation
 * **Feature: nightshift-navigator, Property 22: Hazard audio ping generation**
 * **Validates: Requirements 5.2**
 *
 * Property: For any hazard detected ahead of the user, a directional audio ping should be emitted with direction information.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateHazardAudioCue, generateHazardCues, type HazardInfo } from './hazard-audio.js';

describe('Property 22: Hazard audio ping generation', () => {
  it('should generate audio cue with direction for any hazard', () => {
    // Generator for hazard information
    const hazardArb = fc.record({
      id: fc.uuid(),
      type: fc.constantFrom('obstacle', 'uneven_surface', 'drop_off', 'unknown'),
      direction: fc.integer({ min: 0, max: 359 }), // 0-359 degrees
      distance: fc.double({ min: 0.1, max: 100, noNaN: true }), // 0.1 to 100 meters
      confidence: fc.double({ min: 0.0, max: 1.0, noNaN: true }),
    }) as fc.Arbitrary<HazardInfo>;

    fc.assert(
      fc.property(hazardArb, (hazard) => {
        const cue = generateHazardAudioCue(hazard);

        // Verify cue was generated
        expect(cue).toBeDefined();
        expect(cue.type).toBe('hazard');

        // Verify direction information is present
        expect(cue.direction).toBeDefined();
        expect(cue.direction).toBe(hazard.direction);

        // Verify direction is in valid range (0-359)
        expect(cue.direction!).toBeGreaterThanOrEqual(0);
        expect(cue.direction!).toBeLessThan(360);

        // Verify message is generated
        expect(cue.message).toBeDefined();
        expect(cue.message!.length).toBeGreaterThan(0);

        // Verify priority is set (hazards should have high priority)
        expect(cue.priority).toBeGreaterThanOrEqual(6);
        expect(cue.priority).toBeLessThanOrEqual(10);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should generate cues with higher priority for closer hazards', () => {
    const hazardTypeArb = fc.constantFrom('obstacle', 'uneven_surface', 'drop_off', 'unknown');

    fc.assert(
      fc.property(hazardTypeArb, (type) => {
        // Create two hazards: one close, one far
        const closeHazard: HazardInfo = {
          id: 'close',
          type,
          direction: 0,
          distance: 1.5, // Very close
          confidence: 0.9,
        };

        const farHazard: HazardInfo = {
          id: 'far',
          type,
          direction: 0,
          distance: 15, // Far away
          confidence: 0.9,
        };

        const closeCue = generateHazardAudioCue(closeHazard);
        const farCue = generateHazardAudioCue(farHazard);

        // Close hazard should have higher or equal priority
        expect(closeCue.priority).toBeGreaterThanOrEqual(farCue.priority);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should generate cues with appropriate priority based on hazard type', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 359 }),
        fc.double({ min: 1, max: 10, noNaN: true }),
        (direction, distance) => {
          // Drop-off should have highest priority
          const dropOffHazard: HazardInfo = {
            id: 'dropoff',
            type: 'drop_off',
            direction,
            distance,
            confidence: 0.9,
          };

          // Obstacle should have high priority
          const obstacleHazard: HazardInfo = {
            id: 'obstacle',
            type: 'obstacle',
            direction,
            distance,
            confidence: 0.9,
          };

          const dropOffCue = generateHazardAudioCue(dropOffHazard);
          const obstacleCue = generateHazardAudioCue(obstacleHazard);

          // Drop-off should have higher or equal priority than obstacle
          expect(dropOffCue.priority).toBeGreaterThanOrEqual(obstacleCue.priority);

          // Both should have high priority (>= 7)
          expect(dropOffCue.priority).toBeGreaterThanOrEqual(7);
          expect(obstacleCue.priority).toBeGreaterThanOrEqual(7);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate multiple hazard cues sorted by priority', () => {
    // Generator for array of hazards
    const hazardsArb = fc.array(
      fc.record({
        id: fc.uuid(),
        type: fc.constantFrom('obstacle', 'uneven_surface', 'drop_off', 'unknown'),
        direction: fc.integer({ min: 0, max: 359 }),
        distance: fc.double({ min: 0.1, max: 100, noNaN: true }),
        confidence: fc.double({ min: 0.0, max: 1.0, noNaN: true }),
      }) as fc.Arbitrary<HazardInfo>,
      { minLength: 1, maxLength: 10 }
    );

    fc.assert(
      fc.property(hazardsArb, (hazards) => {
        const cues = generateHazardCues(hazards);

        // Verify all hazards have corresponding cues
        expect(cues.length).toBe(hazards.length);

        // Verify cues are sorted by priority (highest first)
        for (let i = 0; i < cues.length - 1; i++) {
          expect(cues[i].priority).toBeGreaterThanOrEqual(cues[i + 1].priority);
        }

        // Verify all cues have direction information
        cues.forEach((cue) => {
          expect(cue.direction).toBeDefined();
          expect(cue.direction!).toBeGreaterThanOrEqual(0);
          expect(cue.direction!).toBeLessThan(360);
        });

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should include hazard type information in the message', () => {
    const hazardArb = fc.record({
      id: fc.uuid(),
      type: fc.constantFrom('obstacle', 'uneven_surface', 'drop_off', 'unknown'),
      direction: fc.integer({ min: 0, max: 359 }),
      distance: fc.double({ min: 0.1, max: 100, noNaN: true }),
      confidence: fc.double({ min: 0.0, max: 1.0, noNaN: true }),
    }) as fc.Arbitrary<HazardInfo>;

    fc.assert(
      fc.property(hazardArb, (hazard) => {
        const cue = generateHazardAudioCue(hazard);

        // Message should contain some indication of the hazard
        expect(cue.message).toBeDefined();
        expect(cue.message!.length).toBeGreaterThan(0);

        // Message should be descriptive (contain words like "detected", "ahead", etc.)
        const message = cue.message!.toLowerCase();
        const hasRelevantContent =
          message.includes('detected') ||
          message.includes('obstacle') ||
          message.includes('hazard') ||
          message.includes('surface') ||
          message.includes('drop');

        expect(hasRelevantContent).toBe(true);

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
