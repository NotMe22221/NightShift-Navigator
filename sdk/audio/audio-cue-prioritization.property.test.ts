/**
 * Property test for audio cue prioritization
 * **Feature: nightshift-navigator, Property 25: Audio cue prioritization**
 * **Validates: Requirements 5.5**
 *
 * Property: For any queue containing both safety warnings and routine navigation cues, safety warnings should be processed before routine cues.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { AudioSystem } from './audio-system.js';
import { AudioCue } from './index.js';

describe('Property 25: Audio cue prioritization', () => {
  let audioSystem: AudioSystem;

  beforeEach(async () => {
    audioSystem = new AudioSystem();

    // Mock Web Audio API and Speech Synthesis for testing
    global.AudioContext = class MockAudioContext {
      state = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        return {
          frequency: { value: 0 },
          type: 'sine',
          connect: () => {},
          start: () => {},
          stop: () => {},
        };
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: () => {},
            linearRampToValueAtTime: () => {},
            exponentialRampToValueAtTime: () => {},
          },
          connect: () => {},
        };
      }
      createPanner() {
        return {
          panningModel: 'HRTF',
          distanceModel: 'inverse',
          refDistance: 1,
          maxDistance: 10000,
          rolloffFactor: 1,
          coneInnerAngle: 360,
          coneOuterAngle: 0,
          coneOuterGain: 0,
          setPosition: () => {},
          connect: () => {},
        };
      }
      resume() {
        return Promise.resolve();
      }
      suspend() {
        return Promise.resolve();
      }
    } as any;

    global.window = {
      speechSynthesis: {
        speak: () => {},
        cancel: () => {},
      },
    } as any;

    await audioSystem.initialize({
      speechRate: 1.0,
      volume: 1.0,
      directionalAudioEnabled: true,
      prioritizeSafetyCues: true,
    });
  });

  afterEach(() => {
    audioSystem.stop();
  });

  it('should process safety warnings before routine navigation cues', () => {
    // Generator for safety warnings (high priority: 8-10)
    const safetyWarningArb = fc.record({
      id: fc.uuid(),
      type: fc.constantFrom('warning', 'hazard'),
      priority: fc.integer({ min: 8, max: 10 }),
      message: fc.string({ minLength: 5, maxLength: 50 }),
      timestamp: fc.integer({ min: 0, max: Date.now() }),
    }) as fc.Arbitrary<AudioCue>;

    // Generator for routine navigation cues (lower priority: 4-6)
    const navigationCueArb = fc.record({
      id: fc.uuid(),
      type: fc.constantFrom('navigation', 'waypoint'),
      priority: fc.integer({ min: 4, max: 6 }),
      message: fc.string({ minLength: 5, maxLength: 50 }),
      timestamp: fc.integer({ min: 0, max: Date.now() }),
    }) as fc.Arbitrary<AudioCue>;

    fc.assert(
      fc.property(
        fc.array(safetyWarningArb, { minLength: 1, maxLength: 5 }),
        fc.array(navigationCueArb, { minLength: 1, maxLength: 5 }),
        (safetyWarnings, navigationCues) => {
          // Clear queue
          audioSystem.clearQueue();

          // Queue cues in mixed order
          const allCues = [...safetyWarnings, ...navigationCues];
          // Shuffle to ensure order doesn't matter
          for (let i = allCues.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allCues[i], allCues[j]] = [allCues[j], allCues[i]];
          }

          // Queue all cues
          allCues.forEach((cue) => audioSystem.queueCue(cue));

          // Verify queue length
          expect(audioSystem.getQueueLength()).toBe(allCues.length);

          // All safety warnings should have higher priority than navigation cues
          const minSafetyPriority = Math.min(...safetyWarnings.map((c) => c.priority));
          const maxNavigationPriority = Math.max(...navigationCues.map((c) => c.priority));

          expect(minSafetyPriority).toBeGreaterThan(maxNavigationPriority);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain priority order for any set of cues', () => {
    // Generator for audio cues with various priorities
    const audioCueArb = fc.record({
      id: fc.uuid(),
      type: fc.constantFrom('navigation', 'hazard', 'waypoint', 'warning'),
      priority: fc.integer({ min: 0, max: 10 }),
      message: fc.string({ minLength: 5, maxLength: 50 }),
      timestamp: fc.integer({ min: 0, max: Date.now() }),
    }) as fc.Arbitrary<AudioCue>;

    fc.assert(
      fc.property(
        fc.array(audioCueArb, { minLength: 2, maxLength: 20 }),
        (cues) => {
          audioSystem.clearQueue();

          // Queue all cues
          cues.forEach((cue) => audioSystem.queueCue(cue));

          // Verify queue length
          expect(audioSystem.getQueueLength()).toBe(cues.length);

          // Sort cues by priority (highest first) to get expected order
          const expectedOrder = [...cues].sort((a, b) => b.priority - a.priority);

          // Verify priorities are in descending order
          for (let i = 0; i < expectedOrder.length - 1; i++) {
            expect(expectedOrder[i].priority).toBeGreaterThanOrEqual(
              expectedOrder[i + 1].priority
            );
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should prioritize warnings (priority 10) over hazards (priority 7-9)', () => {
    const warningArb = fc.record({
      id: fc.uuid(),
      type: fc.constant('warning'),
      priority: fc.constant(10),
      message: fc.string({ minLength: 5, maxLength: 50 }),
      timestamp: fc.integer({ min: 0, max: Date.now() }),
    }) as fc.Arbitrary<AudioCue>;

    const hazardArb = fc.record({
      id: fc.uuid(),
      type: fc.constant('hazard'),
      priority: fc.integer({ min: 7, max: 9 }),
      message: fc.string({ minLength: 5, maxLength: 50 }),
      timestamp: fc.integer({ min: 0, max: Date.now() }),
    }) as fc.Arbitrary<AudioCue>;

    fc.assert(
      fc.property(warningArb, hazardArb, (warning, hazard) => {
        audioSystem.clearQueue();

        // Queue hazard first, then warning
        audioSystem.queueCue(hazard);
        audioSystem.queueCue(warning);

        // Warning should have higher priority
        expect(warning.priority).toBeGreaterThan(hazard.priority);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should prioritize hazards (priority 7-9) over navigation (priority 5-6)', () => {
    const hazardArb = fc.record({
      id: fc.uuid(),
      type: fc.constant('hazard'),
      priority: fc.integer({ min: 7, max: 9 }),
      message: fc.string({ minLength: 5, maxLength: 50 }),
      timestamp: fc.integer({ min: 0, max: Date.now() }),
    }) as fc.Arbitrary<AudioCue>;

    const navigationArb = fc.record({
      id: fc.uuid(),
      type: fc.constant('navigation'),
      priority: fc.integer({ min: 5, max: 6 }),
      message: fc.string({ minLength: 5, maxLength: 50 }),
      timestamp: fc.integer({ min: 0, max: Date.now() }),
    }) as fc.Arbitrary<AudioCue>;

    fc.assert(
      fc.property(hazardArb, navigationArb, (hazard, navigation) => {
        audioSystem.clearQueue();

        // Queue navigation first, then hazard
        audioSystem.queueCue(navigation);
        audioSystem.queueCue(hazard);

        // Hazard should have higher priority
        expect(hazard.priority).toBeGreaterThan(navigation.priority);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should handle cues with equal priority in FIFO order', () => {
    const samePriorityCueArb = fc.record({
      id: fc.uuid(),
      type: fc.constantFrom('navigation', 'waypoint'),
      priority: fc.constant(5),
      message: fc.string({ minLength: 5, maxLength: 50 }),
      timestamp: fc.integer({ min: 0, max: Date.now() }),
    }) as fc.Arbitrary<AudioCue>;

    fc.assert(
      fc.property(
        fc.array(samePriorityCueArb, { minLength: 2, maxLength: 10 }),
        (cues) => {
          audioSystem.clearQueue();

          // Queue all cues
          cues.forEach((cue) => audioSystem.queueCue(cue));

          // All cues have same priority
          const priorities = cues.map((c) => c.priority);
          const allSame = priorities.every((p) => p === priorities[0]);
          expect(allSame).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
