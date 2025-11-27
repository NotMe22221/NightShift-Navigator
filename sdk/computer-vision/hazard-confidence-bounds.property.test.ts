/**
 * Property-Based Tests for Hazard Confidence Bounds
 * **Feature: nightshift-navigator, Property 8: Hazard confidence bounds**
 */

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { detectHazards } from './hazard-classifier';
import { computeBrightnessHistogram } from '../sensor-fusion/brightness-histogram';

describe('Property 8: Hazard confidence bounds', () => {
  it('should produce hazard confidence scores between 0.0 and 1.0 for any frame', () => {
    // **Feature: nightshift-navigator, Property 8: Hazard confidence bounds**
    // **Validates: Requirements 2.3**
    
    fc.assert(
      fc.property(
        // Generate random frame dimensions
        fc.integer({ min: 320, max: 1920 }),
        fc.integer({ min: 240, max: 1080 }),
        (width, height) => {
          // Create a random frame
          const frameData = new Uint8ClampedArray(width * height * 4);
          for (let i = 0; i < frameData.length; i++) {
            frameData[i] = Math.floor(Math.random() * 256);
          }
          const frame = new ImageData(frameData, width, height);

          // Compute histogram
          const histogram = computeBrightnessHistogram(frame);

          // Detect hazards
          const hazards = detectHazards(frame, histogram);

          // All hazard confidence scores must be between 0.0 and 1.0
          return hazards.every(h => h.confidence >= 0.0 && h.confidence <= 1.0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
