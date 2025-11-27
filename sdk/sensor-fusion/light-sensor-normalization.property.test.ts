/**
 * Property-based tests for light sensor normalization
 */

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { 
  normalizeLightSensorReading, 
  normalizeLightSensorReadingWithCalibration 
} from './light-sensor-normalization.js';

describe('Light Sensor Normalization - Property Tests', () => {
  // **Feature: nightshift-navigator, Property 2: Light sensor normalization**
  // **Validates: Requirements 1.2**
  it('Property 2: For any raw light sensor reading, normalizing to lux scale should produce a non-negative value that increases monotonically with input intensity', () => {
    fc.assert(
      fc.property(
        // Generate pairs of raw readings where reading2 > reading1
        fc.tuple(
          fc.float({ min: 0, max: Math.fround(100000), noNaN: true }),
          fc.float({ min: 0, max: Math.fround(100000), noNaN: true })
        ).filter(([r1, r2]) => r1 < r2),
        ([reading1, reading2]) => {
          // Normalize both readings
          const normalized1 = normalizeLightSensorReading(reading1);
          const normalized2 = normalizeLightSensorReading(reading2);
          
          // Property: both outputs should be non-negative
          const bothNonNegative = normalized1 >= 0 && normalized2 >= 0;
          
          // Property: monotonic increase (if input2 > input1, then output2 >= output1)
          const monotonic = normalized2 >= normalized1;
          
          return bothNonNegative && monotonic;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2 (with calibration): Normalized values should be non-negative and monotonic with positive calibration factor', () => {
    fc.assert(
      fc.property(
        // Generate pairs of raw readings and calibration parameters
        fc.tuple(
          fc.float({ min: 0, max: Math.fround(100000), noNaN: true }),
          fc.float({ min: 0, max: Math.fround(100000), noNaN: true }),
          fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }), // positive calibration factor
          fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }) // offset
        ).filter(([r1, r2]) => r1 < r2),
        ([reading1, reading2, calibrationFactor, offset]) => {
          // Normalize both readings with same calibration
          const normalized1 = normalizeLightSensorReadingWithCalibration(
            reading1, 
            calibrationFactor, 
            offset
          );
          const normalized2 = normalizeLightSensorReadingWithCalibration(
            reading2, 
            calibrationFactor, 
            offset
          );
          
          // Property: both outputs should be non-negative
          const bothNonNegative = normalized1 >= 0 && normalized2 >= 0;
          
          // Property: monotonic increase with positive calibration factor
          const monotonic = normalized2 >= normalized1;
          
          return bothNonNegative && monotonic;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2 (edge case): Negative raw readings should produce zero output', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-100000), max: Math.fround(-0.001), noNaN: true }),
        (negativeReading) => {
          const normalized = normalizeLightSensorReading(negativeReading);
          return normalized === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2 (identity): Zero input should produce zero output', () => {
    const normalized = normalizeLightSensorReading(0);
    fc.assert(
      fc.property(
        fc.constant(0),
        () => normalized === 0
      ),
      { numRuns: 1 }
    );
  });
});
