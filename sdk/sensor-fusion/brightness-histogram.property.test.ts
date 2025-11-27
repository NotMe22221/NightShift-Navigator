/**
 * Property-based tests for brightness histogram computation
 */

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { computeBrightnessHistogram } from './brightness-histogram.js';

describe('Brightness Histogram - Property Tests', () => {
  // **Feature: nightshift-navigator, Property 1: Brightness histogram computation**
  // **Validates: Requirements 1.1**
  it('Property 1: For any valid camera frame, computing the brightness histogram should produce a histogram with 256 bins and a mean luminance value between 0 and 255', () => {
    fc.assert(
      fc.property(
        // Generate valid camera frames with realistic dimensions
        fc.record({
          width: fc.integer({ min: 1, max: 1920 }),
          height: fc.integer({ min: 1, max: 1080 }),
        }).chain(({ width, height }) => {
          // Generate RGBA pixel data
          return fc.record({
            width: fc.constant(width),
            height: fc.constant(height),
            data: fc.uint8Array({ 
              minLength: width * height * 4, 
              maxLength: width * height * 4 
            }),
          });
        }),
        ({ width, height, data }) => {
          // Create ImageData from generated data
          const frame = new ImageData(new Uint8ClampedArray(data), width, height);
          
          // Compute histogram
          const histogram = computeBrightnessHistogram(frame);
          
          // Property: histogram should have exactly 256 bins
          const has256Bins = histogram.bins.length === 256;
          
          // Property: mean luminance should be between 0 and 255
          const meanInRange = histogram.mean >= 0 && histogram.mean <= 255;
          
          // Property: all bins should be non-negative
          const allBinsNonNegative = histogram.bins.every(count => count >= 0);
          
          // Property: sum of all bins should equal pixel count
          const totalPixels = width * height;
          const binSum = histogram.bins.reduce((sum, count) => sum + count, 0);
          const binSumCorrect = binSum === totalPixels;
          
          // Property: median should be between 0 and 255
          const medianInRange = histogram.median >= 0 && histogram.median <= 255;
          
          // Property: standard deviation should be non-negative
          const stdDevNonNegative = histogram.stdDev >= 0;
          
          return has256Bins && 
                 meanInRange && 
                 allBinsNonNegative && 
                 binSumCorrect && 
                 medianInRange && 
                 stdDevNonNegative;
        }
      ),
      { numRuns: 100 }
    );
  });
});
