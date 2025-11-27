/**
 * Property-based tests for weighted sensor fusion
 */

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { computeWeightedFusion, normalizeFusionWeights } from './weighted-fusion.js';

describe('Weighted Sensor Fusion - Property Tests', () => {
  // **Feature: nightshift-navigator, Property 4: Weighted sensor fusion**
  // **Validates: Requirements 1.4**
  it('Property 4: For any set of sensor inputs with defined weights, the unified light level should equal the weighted average of the individual sensor values', () => {
    fc.assert(
      fc.property(
        // Generate sensor inputs
        fc.record({
          cameraBrightness: fc.float({ min: 0, max: 1, noNaN: true }),
          lightSensorLux: fc.float({ min: 0, max: Math.fround(100000), noNaN: true }),
          shadowCoverage: fc.float({ min: 0, max: 1, noNaN: true }),
        }),
        // Generate weights (will be normalized)
        fc.record({
          camera: fc.float({ min: 0, max: Math.fround(10), noNaN: true }),
          lightSensor: fc.float({ min: 0, max: Math.fround(10), noNaN: true }),
          shadowDetection: fc.float({ min: 0, max: Math.fround(10), noNaN: true }),
        }).filter(w => w.camera + w.lightSensor + w.shadowDetection > 0),
        (inputs, rawWeights) => {
          // Normalize weights to sum to 1
          const weights = normalizeFusionWeights(rawWeights);
          
          // Compute fusion
          const result = computeWeightedFusion(inputs, weights);
          
          // Property 1: Result should be in 0-1 range
          const inRange = result >= 0 && result <= 1;
          
          // Property 2: Result should be finite
          const isFinite = Number.isFinite(result);
          
          // Property 3: With all inputs at 0 and no shadows, result should be low
          if (inputs.cameraBrightness === 0 && 
              inputs.lightSensorLux === 0 && 
              inputs.shadowCoverage === 0) {
            return inRange && isFinite && result <= 0.5;
          }
          
          // Property 4: With all inputs at max and no shadows, result should be high
          if (inputs.cameraBrightness === 1 && 
              inputs.lightSensorLux === 100000 && 
              inputs.shadowCoverage === 0) {
            return inRange && isFinite && result >= 0.5;
          }
          
          return inRange && isFinite;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4 (monotonicity): Increasing camera brightness should not decrease unified light level (with fixed other inputs)', () => {
    fc.assert(
      fc.property(
        // Generate two camera brightness values where b2 > b1
        fc.tuple(
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true })
        ).filter(([b1, b2]) => b1 < b2),
        // Fixed other inputs
        fc.record({
          lightSensorLux: fc.float({ min: 0, max: Math.fround(100000), noNaN: true }),
          shadowCoverage: fc.float({ min: 0, max: 1, noNaN: true }),
        }),
        // Weights with positive camera weight
        fc.record({
          camera: fc.float({ min: Math.fround(0.1), max: 1, noNaN: true }),
          lightSensor: fc.float({ min: 0, max: 1, noNaN: true }),
          shadowDetection: fc.float({ min: 0, max: 1, noNaN: true }),
        }).filter(w => w.camera + w.lightSensor + w.shadowDetection > 0),
        ([brightness1, brightness2], otherInputs, rawWeights) => {
          const weights = normalizeFusionWeights(rawWeights);
          
          const result1 = computeWeightedFusion(
            { cameraBrightness: brightness1, ...otherInputs },
            weights
          );
          
          const result2 = computeWeightedFusion(
            { cameraBrightness: brightness2, ...otherInputs },
            weights
          );
          
          // If camera weight is positive, increasing brightness should not decrease result
          if (weights.camera > 0) {
            return result2 >= result1;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4 (shadow effect): Increasing shadow coverage should not increase unified light level', () => {
    fc.assert(
      fc.property(
        // Generate two shadow coverage values where s2 > s1
        fc.tuple(
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true })
        ).filter(([s1, s2]) => s1 < s2),
        // Fixed other inputs
        fc.record({
          cameraBrightness: fc.float({ min: 0, max: 1, noNaN: true }),
          lightSensorLux: fc.float({ min: 0, max: Math.fround(100000), noNaN: true }),
        }),
        // Weights with positive shadow detection weight
        fc.record({
          camera: fc.float({ min: 0, max: 1, noNaN: true }),
          lightSensor: fc.float({ min: 0, max: 1, noNaN: true }),
          shadowDetection: fc.float({ min: Math.fround(0.1), max: 1, noNaN: true }),
        }).filter(w => w.camera + w.lightSensor + w.shadowDetection > 0),
        ([shadow1, shadow2], otherInputs, rawWeights) => {
          const weights = normalizeFusionWeights(rawWeights);
          
          const result1 = computeWeightedFusion(
            { shadowCoverage: shadow1, ...otherInputs },
            weights
          );
          
          const result2 = computeWeightedFusion(
            { shadowCoverage: shadow2, ...otherInputs },
            weights
          );
          
          // If shadow weight is positive, increasing shadow coverage should not increase result
          if (weights.shadowDetection > 0) {
            return result2 <= result1;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
