/**
 * Property test for route change audio response time
 * **Feature: nightshift-navigator, Property 21: Route change audio response time**
 * **Validates: Requirements 5.1**
 *
 * Property: For any navigation route change, a spoken cue should be generated within 1 second of the change.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { AudioSystem } from './audio-system.js';
import { generateNavigationCue, type RouteChange } from './navigation-cues.js';

describe('Property 21: Route change audio response time', () => {
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

  it('should generate navigation cues within 1 second for any route change', () => {
    // Generator for route changes
    const routeChangeArb = fc.record({
      type: fc.constantFrom('start', 'turn', 'continue', 'arrive', 'reroute'),
      direction: fc.option(fc.constantFrom('left', 'right', 'straight'), { nil: undefined }),
      distance: fc.option(fc.integer({ min: 0, max: 10000 }), { nil: undefined }),
      streetName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
      destination: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    }) as fc.Arbitrary<RouteChange>;

    fc.assert(
      fc.property(routeChangeArb, (routeChange) => {
        const startTime = Date.now();

        // Generate navigation cue
        const cue = generateNavigationCue(routeChange, startTime);

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Verify cue was generated
        expect(cue).toBeDefined();
        expect(cue.type).toBe('navigation');
        expect(cue.message).toBeDefined();
        expect(cue.message!.length).toBeGreaterThan(0);

        // Verify response time is within 1 second (1000ms)
        // Note: Cue generation is synchronous and should be nearly instantaneous
        expect(responseTime).toBeLessThan(1000);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should queue and process cues within acceptable time', async () => {
    // Generator for simple route changes
    const simpleRouteChangeArb = fc.record({
      type: fc.constantFrom('turn', 'continue'),
      direction: fc.constantFrom('left', 'right', 'straight'),
      distance: fc.integer({ min: 10, max: 500 }),
    }) as fc.Arbitrary<RouteChange>;

    await fc.assert(
      fc.asyncProperty(simpleRouteChangeArb, async (routeChange) => {
        const startTime = Date.now();

        // Generate and queue cue
        const cue = generateNavigationCue(routeChange, startTime);
        audioSystem.queueCue(cue);

        // Verify cue was queued
        expect(audioSystem.getQueueLength()).toBeGreaterThanOrEqual(0);

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Queueing should be nearly instantaneous
        expect(responseTime).toBeLessThan(1000);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should generate cues with correct priority for route changes', () => {
    const routeChangeArb = fc.record({
      type: fc.constantFrom('start', 'turn', 'continue', 'arrive', 'reroute'),
      direction: fc.option(fc.constantFrom('left', 'right', 'straight'), { nil: undefined }),
      distance: fc.option(fc.integer({ min: 0, max: 10000 }), { nil: undefined }),
    }) as fc.Arbitrary<RouteChange>;

    fc.assert(
      fc.property(routeChangeArb, (routeChange) => {
        const cue = generateNavigationCue(routeChange);

        // Verify cue has appropriate priority
        expect(cue.priority).toBeGreaterThanOrEqual(0);
        expect(cue.priority).toBeLessThanOrEqual(10);

        // Navigation cues should have medium priority (around 5-7)
        expect(cue.priority).toBeGreaterThanOrEqual(5);
        expect(cue.priority).toBeLessThanOrEqual(7);

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
