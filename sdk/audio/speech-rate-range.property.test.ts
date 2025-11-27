/**
 * Property test for speech rate range
 * **Feature: nightshift-navigator, Property 24: Speech rate range**
 * **Validates: Requirements 5.4**
 *
 * Property: For any speech rate setting between 0.5x and 2.0x, the audio system should accept and apply the setting without error.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { AudioSystem } from './audio-system.js';

describe('Property 24: Speech rate range', () => {
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

  it('should accept and apply any speech rate between 0.5x and 2.0x without error', () => {
    // Generator for valid speech rates (0.5 to 2.0)
    const validSpeechRateArb = fc.double({ min: 0.5, max: 2.0, noNaN: true });

    fc.assert(
      fc.property(validSpeechRateArb, (speechRate) => {
        // Should not throw error for valid speech rates
        expect(() => {
          audioSystem.setSpeechRate(speechRate);
        }).not.toThrow();

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should reject speech rates below 0.5x', () => {
    // Generator for invalid speech rates (below 0.5)
    const invalidLowSpeechRateArb = fc.double({ min: 0.0, max: 0.49, noNaN: true });

    fc.assert(
      fc.property(invalidLowSpeechRateArb, (speechRate) => {
        // Should throw error for speech rates below 0.5
        expect(() => {
          audioSystem.setSpeechRate(speechRate);
        }).toThrow('Speech rate must be between 0.5 and 2.0');

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should reject speech rates above 2.0x', () => {
    // Generator for invalid speech rates (above 2.0)
    const invalidHighSpeechRateArb = fc.double({ min: 2.01, max: 10.0, noNaN: true });

    fc.assert(
      fc.property(invalidHighSpeechRateArb, (speechRate) => {
        // Should throw error for speech rates above 2.0
        expect(() => {
          audioSystem.setSpeechRate(speechRate);
        }).toThrow('Speech rate must be between 0.5 and 2.0');

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should accept speech rate during initialization', () => {
    const validSpeechRateArb = fc.double({ min: 0.5, max: 2.0, noNaN: true });

    fc.assert(
      fc.asyncProperty(validSpeechRateArb, async (speechRate) => {
        const newAudioSystem = new AudioSystem();

        // Should not throw error when initializing with valid speech rate
        await expect(
          newAudioSystem.initialize({
            speechRate,
            volume: 1.0,
            directionalAudioEnabled: true,
            prioritizeSafetyCues: true,
          })
        ).resolves.not.toThrow();

        newAudioSystem.stop();

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should reject invalid speech rate during initialization', () => {
    // Generator for invalid speech rates (outside 0.5-2.0 range)
    const invalidSpeechRateArb = fc.oneof(
      fc.double({ min: -10.0, max: 0.49, noNaN: true }),
      fc.double({ min: 2.01, max: 10.0, noNaN: true })
    );

    fc.assert(
      fc.asyncProperty(invalidSpeechRateArb, async (speechRate) => {
        const newAudioSystem = new AudioSystem();

        // Should throw error when initializing with invalid speech rate
        await expect(
          newAudioSystem.initialize({
            speechRate,
            volume: 1.0,
            directionalAudioEnabled: true,
            prioritizeSafetyCues: true,
          })
        ).rejects.toThrow('Speech rate must be between 0.5 and 2.0');

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should handle boundary values correctly', () => {
    // Test exact boundary values
    expect(() => audioSystem.setSpeechRate(0.5)).not.toThrow();
    expect(() => audioSystem.setSpeechRate(2.0)).not.toThrow();
    expect(() => audioSystem.setSpeechRate(1.0)).not.toThrow();
  });
});
