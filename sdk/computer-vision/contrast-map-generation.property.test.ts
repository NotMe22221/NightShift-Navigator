/**
 * Property-Based Tests for Contrast Map Generation
 * **Feature: nightshift-navigator, Property 9: Contrast map generation**
 */

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { generateContrastMap } from './contrast-map';

describe('Property 9: Contrast map generation', () => {
  it('should generate contrast map with matching dimensions and normalized values for any frame', () => {
    // **Feature: nightshift-navigator, Property 9: Contrast map generation**
    // **Validates: Requirements 2.4**
    
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

          // Generate contrast map
          const contrastMap = generateContrastMap(frame);

          // Verify dimensions match
          const dimensionsMatch = contrastMap.width === width && 
                                 contrastMap.height === height &&
                                 contrastMap.data.length === width * height;

          // Verify all values are normalized to 0-1 range
          const allValuesNormalized = Array.from(contrastMap.data).every(
            val => val >= 0 && val <= 1
          );

          return dimensionsMatch && allValuesNormalized;
        }
      ),
      { numRuns: 100 }
    );
  });
});
