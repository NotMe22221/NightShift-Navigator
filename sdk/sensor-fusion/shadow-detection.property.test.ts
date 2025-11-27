/**
 * Property-based tests for shadow detection
 */

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { detectShadows } from './shadow-detection.js';

describe('Shadow Detection - Property Tests', () => {
  // **Feature: nightshift-navigator, Property 3: Shadow coverage bounds**
  // **Validates: Requirements 1.3**
  it('Property 3: For any camera frame processed for shadow detection, the computed shadow coverage percentage should be between 0 and 1 inclusive', () => {
    fc.assert(
      fc.property(
        // Generate valid camera frames with realistic dimensions
        fc.record({
          width: fc.integer({ min: 10, max: 640 }),
          height: fc.integer({ min: 10, max: 480 }),
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
          
          // Detect shadows
          const result = detectShadows(frame);
          
          // Property: shadow coverage should be between 0 and 1 inclusive
          const coverageInBounds = result.shadowCoverage >= 0 && result.shadowCoverage <= 1;
          
          // Property: shadow regions should be valid
          const regionsValid = result.shadowRegions.every(region => 
            region.x >= 0 &&
            region.y >= 0 &&
            region.width > 0 &&
            region.height > 0 &&
            region.x + region.width <= width &&
            region.y + region.height <= height
          );
          
          return coverageInBounds && regionsValid;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 3 (edge case): All-black image should have high shadow coverage', () => {
    fc.assert(
      fc.property(
        fc.record({
          width: fc.integer({ min: 10, max: 200 }),
          height: fc.integer({ min: 10, max: 200 }),
        }),
        ({ width, height }) => {
          // Create all-black image
          const data = new Uint8ClampedArray(width * height * 4);
          for (let i = 0; i < data.length; i += 4) {
            data[i] = 0;       // R
            data[i + 1] = 0;   // G
            data[i + 2] = 0;   // B
            data[i + 3] = 255; // A
          }
          
          const frame = new ImageData(data, width, height);
          const result = detectShadows(frame);
          
          // All-black image should have shadow coverage > 0.5
          return result.shadowCoverage > 0.5 && result.shadowCoverage <= 1;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 3 (edge case): All-white image should have low shadow coverage', () => {
    fc.assert(
      fc.property(
        fc.record({
          width: fc.integer({ min: 10, max: 200 }),
          height: fc.integer({ min: 10, max: 200 }),
        }),
        ({ width, height }) => {
          // Create all-white image
          const data = new Uint8ClampedArray(width * height * 4);
          for (let i = 0; i < data.length; i += 4) {
            data[i] = 255;     // R
            data[i + 1] = 255; // G
            data[i + 2] = 255; // B
            data[i + 3] = 255; // A
          }
          
          const frame = new ImageData(data, width, height);
          const result = detectShadows(frame);
          
          // All-white image should have shadow coverage < 0.2
          return result.shadowCoverage >= 0 && result.shadowCoverage < 0.2;
        }
      ),
      { numRuns: 50 }
    );
  });
});
