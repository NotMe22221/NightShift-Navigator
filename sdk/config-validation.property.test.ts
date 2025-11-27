/**
 * Property-Based Tests for Configuration Validation
 * 
 * **Feature: nightshift-navigator, Property 44: Configuration validation**
 * **Validates: Requirements 9.4**
 * 
 * Property: Configuration validation
 * For any invalid configuration parameter, the SDK should reject initialization 
 * and provide a clear error message.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateSensorFusionConfig,
  validateCVConfig,
  validatePathfindingConfig,
  validateARConfig,
  validateAudioConfig,
  validateEnergyConfig,
  validatePluginConfig,
  validateOrThrow,
  formatValidationErrors,
  type ValidationResult
} from './config-validation.js';

describe('Property 44: Configuration validation', () => {
  describe('SensorFusionConfig validation', () => {
    it('property: valid configurations should pass validation', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          fc.integer({ min: 5, max: 60 }),
          fc.record({
            camera: fc.double({ min: 0, max: 1, noNaN: true }),
            lightSensor: fc.double({ min: 0, max: 1, noNaN: true }),
            shadowDetection: fc.double({ min: 0, max: 1, noNaN: true })
          }),
          (cameraEnabled, lightSensorEnabled, shadowDetectionEnabled, updateFrequencyHz, weightings) => {
            const config = {
              cameraEnabled,
              lightSensorEnabled,
              shadowDetectionEnabled,
              updateFrequencyHz,
              weightings
            };
            
            const result = validateSensorFusionConfig(config);
            
            // Valid configurations should pass
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            
            return result.valid && result.errors.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: invalid updateFrequencyHz should be rejected with clear error', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ max: 0 }), // negative or zero
            fc.integer({ min: 1, max: 4 }) // below minimum of 5 Hz
          ),
          (invalidFrequency) => {
            const config = {
              updateFrequencyHz: invalidFrequency
            };
            
            const result = validateSensorFusionConfig(config);
            
            // Invalid configurations should fail
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            // Error message should be clear and descriptive
            const errorMessage = formatValidationErrors(result.errors);
            expect(errorMessage).toContain('updateFrequencyHz');
            expect(errorMessage.length).toBeGreaterThan(0);
            
            return !result.valid && result.errors.length > 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: invalid weightings should be rejected with clear error', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.double({ min: -10, max: -0.01 }), // negative
            fc.double({ min: 1.01, max: 10 }) // above 1
          ),
          (invalidWeight) => {
            const config = {
              weightings: {
                camera: invalidWeight,
                lightSensor: 0.5,
                shadowDetection: 0.5
              }
            };
            
            const result = validateSensorFusionConfig(config);
            
            // Invalid configurations should fail
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            // Error message should mention the specific field
            const errorMessage = formatValidationErrors(result.errors);
            expect(errorMessage).toContain('weightings');
            
            return !result.valid && result.errors.length > 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('CVConfig validation', () => {
    it('property: valid CV configurations should pass validation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 60 }),
          fc.integer({ min: 1, max: 150 }),
          fc.boolean(),
          fc.boolean(),
          (targetFPS, maxMemoryMB, hazardDetectionEnabled, contrastMapEnabled) => {
            const config = {
              targetFPS,
              maxMemoryMB,
              hazardDetectionEnabled,
              contrastMapEnabled
            };
            
            const result = validateCVConfig(config);
            
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            
            return result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: invalid targetFPS should be rejected with clear error', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ max: 0 }),
            fc.integer({ min: 1, max: 9 }) // below minimum of 10 fps
          ),
          (invalidFPS) => {
            const config = { targetFPS: invalidFPS };
            
            const result = validateCVConfig(config);
            
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            const errorMessage = formatValidationErrors(result.errors);
            expect(errorMessage).toContain('targetFPS');
            
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: invalid maxMemoryMB should be rejected with clear error', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ max: 0 }),
            fc.integer({ min: 151, max: 1000 }) // above maximum of 150 MB
          ),
          (invalidMemory) => {
            const config = { maxMemoryMB: invalidMemory };
            
            const result = validateCVConfig(config);
            
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            const errorMessage = formatValidationErrors(result.errors);
            expect(errorMessage).toContain('maxMemoryMB');
            
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('PathfindingConfig validation', () => {
    it('property: valid pathfinding configurations should pass validation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 1, max: 3000 }),
          fc.record({
            distance: fc.double({ min: 0, max: 10, noNaN: true }),
            visibility: fc.double({ min: 0, max: 10, noNaN: true }),
            safety: fc.double({ min: 0, max: 10, noNaN: true })
          }),
          (maxGraphNodes, routeCalculationTimeoutMs, costWeights) => {
            const config = {
              maxGraphNodes,
              routeCalculationTimeoutMs,
              costWeights
            };
            
            const result = validatePathfindingConfig(config);
            
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            
            return result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: invalid maxGraphNodes should be rejected with clear error', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ max: 0 }),
            fc.integer({ min: 10001, max: 100000 }) // above maximum of 10,000
          ),
          (invalidNodes) => {
            const config = { maxGraphNodes: invalidNodes };
            
            const result = validatePathfindingConfig(config);
            
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            const errorMessage = formatValidationErrors(result.errors);
            expect(errorMessage).toContain('maxGraphNodes');
            
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: invalid routeCalculationTimeoutMs should be rejected with clear error', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ max: 0 }),
            fc.integer({ min: 3001, max: 10000 }) // above maximum of 3000 ms
          ),
          (invalidTimeout) => {
            const config = { routeCalculationTimeoutMs: invalidTimeout };
            
            const result = validatePathfindingConfig(config);
            
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            const errorMessage = formatValidationErrors(result.errors);
            expect(errorMessage).toContain('routeCalculationTimeoutMs');
            
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: negative cost weights should be rejected with clear error', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -10, max: -0.01 }),
          (negativeWeight) => {
            const config = {
              costWeights: {
                distance: negativeWeight,
                visibility: 1.0,
                safety: 1.0
              }
            };
            
            const result = validatePathfindingConfig(config);
            
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            const errorMessage = formatValidationErrors(result.errors);
            expect(errorMessage).toContain('costWeights');
            
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('ARConfig validation', () => {
    it('property: valid AR configurations should pass validation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 30, max: 120 }),
          fc.double({ min: 0.1, max: 5, noNaN: true }),
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          (targetFPS, maxPositionJitterCm, spectralPathEnabled, hazardMarkersEnabled, lowLightWarningsEnabled) => {
            const config = {
              targetFPS,
              maxPositionJitterCm,
              spectralPathEnabled,
              hazardMarkersEnabled,
              lowLightWarningsEnabled
            };
            
            const result = validateARConfig(config);
            
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            
            return result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: invalid AR targetFPS should be rejected with clear error', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ max: 0 }),
            fc.integer({ min: 1, max: 29 }) // below minimum of 30 fps
          ),
          (invalidFPS) => {
            const config = { targetFPS: invalidFPS };
            
            const result = validateARConfig(config);
            
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            const errorMessage = formatValidationErrors(result.errors);
            expect(errorMessage).toContain('targetFPS');
            
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: invalid maxPositionJitterCm should be rejected with clear error', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.double({ min: -10, max: 0 }),
            fc.double({ min: 5.01, max: 100 }) // above maximum of 5 cm
          ),
          (invalidJitter) => {
            const config = { maxPositionJitterCm: invalidJitter };
            
            const result = validateARConfig(config);
            
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            const errorMessage = formatValidationErrors(result.errors);
            expect(errorMessage).toContain('maxPositionJitterCm');
            
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('AudioConfig validation', () => {
    it('property: valid audio configurations should pass validation', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.5, max: 2.0 }),
          fc.double({ min: 0, max: 1 }),
          fc.boolean(),
          fc.boolean(),
          (speechRate, volume, directionalAudioEnabled, prioritizeSafetyCues) => {
            const config = {
              speechRate,
              volume,
              directionalAudioEnabled,
              prioritizeSafetyCues
            };
            
            const result = validateAudioConfig(config);
            
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            
            return result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: invalid speechRate should be rejected with clear error', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.double({ min: 0, max: 0.49, noNaN: true }), // below minimum of 0.5x
            fc.double({ min: 2.01, max: 10, noNaN: true }) // above maximum of 2.0x
          ),
          (invalidRate) => {
            const config = { speechRate: invalidRate };
            
            const result = validateAudioConfig(config);
            
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            const errorMessage = formatValidationErrors(result.errors);
            expect(errorMessage).toContain('speechRate');
            
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: invalid volume should be rejected with clear error', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.double({ min: -10, max: -0.01, noNaN: true }),
            fc.double({ min: 1.01, max: 10, noNaN: true })
          ),
          (invalidVolume) => {
            const config = { volume: invalidVolume };
            
            const result = validateAudioConfig(config);
            
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            const errorMessage = formatValidationErrors(result.errors);
            expect(errorMessage).toContain('volume');
            
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('EnergyConfig validation', () => {
    it('property: valid energy configurations should pass validation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 11, max: 100 }), // lowPowerThreshold
          fc.integer({ min: 1, max: 10 }), // criticalPowerThreshold (must be less than low)
          fc.integer({ min: 1000, max: 60000 }),
          (lowPowerThreshold, criticalPowerThreshold, monitoringIntervalMs) => {
            const config = {
              lowPowerThreshold,
              criticalPowerThreshold,
              monitoringIntervalMs
            };
            
            const result = validateEnergyConfig(config);
            
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            
            return result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: invalid power thresholds should be rejected with clear error', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ min: -100, max: -1 }),
            fc.integer({ min: 101, max: 200 })
          ),
          (invalidThreshold) => {
            const config = { lowPowerThreshold: invalidThreshold };
            
            const result = validateEnergyConfig(config);
            
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            const errorMessage = formatValidationErrors(result.errors);
            expect(errorMessage).toContain('lowPowerThreshold');
            
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: criticalPowerThreshold >= lowPowerThreshold should be rejected', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 50 }),
          (threshold) => {
            const config = {
              lowPowerThreshold: threshold,
              criticalPowerThreshold: threshold + 5 // critical should be less than low
            };
            
            const result = validateEnergyConfig(config);
            
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            const errorMessage = formatValidationErrors(result.errors);
            expect(errorMessage).toContain('criticalPowerThreshold');
            expect(errorMessage).toContain('less than');
            
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: invalid monitoringIntervalMs should be rejected with clear error', () => {
      fc.assert(
        fc.property(
          fc.integer({ max: 0 }),
          (invalidInterval) => {
            const config = { monitoringIntervalMs: invalidInterval };
            
            const result = validateEnergyConfig(config);
            
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            const errorMessage = formatValidationErrors(result.errors);
            expect(errorMessage).toContain('monitoringIntervalMs');
            
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('PluginConfig validation', () => {
    it('property: valid plugin configurations should pass validation', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.integer({ min: 1, max: 100 }),
          fc.constantFrom('priority', 'merge', 'reject'),
          (authenticationRequired, maxDataSizeMB, conflictResolution) => {
            const config = {
              authenticationRequired,
              maxDataSizeMB,
              conflictResolution
            };
            
            const result = validatePluginConfig(config);
            
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            
            return result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: invalid maxDataSizeMB should be rejected with clear error', () => {
      fc.assert(
        fc.property(
          fc.integer({ max: 0 }),
          (invalidSize) => {
            const config = { maxDataSizeMB: invalidSize };
            
            const result = validatePluginConfig(config);
            
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            const errorMessage = formatValidationErrors(result.errors);
            expect(errorMessage).toContain('maxDataSizeMB');
            
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: invalid conflictResolution strategy should be rejected with clear error', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !['priority', 'merge', 'reject'].includes(s)),
          (invalidStrategy) => {
            const config = { conflictResolution: invalidStrategy as any };
            
            const result = validatePluginConfig(config);
            
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            const errorMessage = formatValidationErrors(result.errors);
            expect(errorMessage).toContain('conflictResolution');
            
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('validateOrThrow utility', () => {
    it('property: validateOrThrow should throw for invalid configs with clear message', () => {
      fc.assert(
        fc.property(
          fc.integer({ max: 4 }), // invalid frequency (below 5 Hz)
          (invalidFrequency) => {
            const config = { updateFrequencyHz: invalidFrequency };
            
            expect(() => {
              validateOrThrow(config, validateSensorFusionConfig, 'SensorFusionConfig');
            }).toThrow();
            
            try {
              validateOrThrow(config, validateSensorFusionConfig, 'SensorFusionConfig');
              return false; // Should not reach here
            } catch (error) {
              const errorMessage = (error as Error).message;
              
              // Error message should be clear and descriptive
              expect(errorMessage).toContain('SensorFusionConfig');
              expect(errorMessage).toContain('validation failed');
              expect(errorMessage).toContain('updateFrequencyHz');
              expect(errorMessage.length).toBeGreaterThan(20);
              
              return true;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: validateOrThrow should not throw for valid configs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 60 }),
          (validFrequency) => {
            const config = { updateFrequencyHz: validFrequency };
            
            expect(() => {
              validateOrThrow(config, validateSensorFusionConfig, 'SensorFusionConfig');
            }).not.toThrow();
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('formatValidationErrors utility', () => {
    it('property: error messages should be clear and descriptive', () => {
      fc.assert(
        fc.property(
          fc.integer({ max: 0 }),
          (invalidValue) => {
            const config = { targetFPS: invalidValue };
            const result = validateCVConfig(config);
            
            if (!result.valid) {
              const errorMessage = formatValidationErrors(result.errors);
              
              // Error message should contain field name
              expect(errorMessage).toContain('targetFPS');
              
              // Error message should be descriptive (not just field name)
              expect(errorMessage.length).toBeGreaterThan(10);
              
              // Error message should indicate validation failure
              expect(errorMessage.toLowerCase()).toMatch(/validation|failed|error|invalid/);
              
              return true;
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: multiple errors should all be included in message', () => {
      const config = {
        targetFPS: -5, // invalid
        maxMemoryMB: 200 // invalid (above 150)
      };
      
      const result = validateCVConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      
      const errorMessage = formatValidationErrors(result.errors);
      
      // Both field names should appear in the error message
      expect(errorMessage).toContain('targetFPS');
      expect(errorMessage).toContain('maxMemoryMB');
    });
  });
});
