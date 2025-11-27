/**
 * Property-based test for low-power routing strategy
 * **Feature: nightshift-navigator, Property 29: Low-power routing strategy**
 * **Validates: Requirements 6.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getAdaptiveRoutingConfig, shouldRecalculateRoute } from './adaptive-routing.js';
import type { PowerMode } from './index.js';
import type { PathfindingConfig } from '../pathfinding/index.js';

describe('Property 29: Low-power routing strategy', () => {
  it('should prioritize distance over visibility in low-power mode', () => {
    fc.assert(
      fc.property(
        fc.record({
          distance: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true }),
          visibility: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true }),
          safety: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true }),
        }),
        (baseWeights) => {
          const baseConfig: PathfindingConfig = {
            maxGraphNodes: 10000,
            routeCalculationTimeoutMs: 3000,
            costWeights: baseWeights,
          };

          const lowPowerMode: PowerMode = {
            mode: 'low_power',
            cvFPS: 5,
            arEnabled: true,
            routingStrategy: 'shortest',
          };

          const adaptedConfig = getAdaptiveRoutingConfig(baseConfig, lowPowerMode);

          // Property: In low-power mode, distance weight should be higher than visibility weight
          return adaptedConfig.costWeights.distance > adaptedConfig.costWeights.visibility;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should use shortest routing strategy in low-power mode', () => {
    fc.assert(
      fc.property(
        fc.record({
          distance: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true }),
          visibility: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true }),
          safety: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true }),
        }),
        (baseWeights) => {
          const baseConfig: PathfindingConfig = {
            maxGraphNodes: 10000,
            routeCalculationTimeoutMs: 3000,
            costWeights: baseWeights,
          };

          const lowPowerMode: PowerMode = {
            mode: 'low_power',
            cvFPS: 5,
            arEnabled: true,
            routingStrategy: 'shortest',
          };

          const adaptedConfig = getAdaptiveRoutingConfig(baseConfig, lowPowerMode);

          // Property: In low-power mode, distance weight should be 1.0 (maximum priority)
          return adaptedConfig.costWeights.distance === 1.0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should use shortest routing strategy in critical mode', () => {
    fc.assert(
      fc.property(
        fc.record({
          distance: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true }),
          visibility: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true }),
          safety: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true }),
        }),
        (baseWeights) => {
          const baseConfig: PathfindingConfig = {
            maxGraphNodes: 10000,
            routeCalculationTimeoutMs: 3000,
            costWeights: baseWeights,
          };

          const criticalMode: PowerMode = {
            mode: 'critical',
            cvFPS: 5,
            arEnabled: false,
            routingStrategy: 'shortest',
          };

          const adaptedConfig = getAdaptiveRoutingConfig(baseConfig, criticalMode);

          // Property: In critical mode, distance weight should be 1.0 (maximum priority)
          return adaptedConfig.costWeights.distance === 1.0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve base config in normal mode', () => {
    fc.assert(
      fc.property(
        fc.record({
          distance: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true }),
          visibility: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true }),
          safety: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true }),
        }),
        (baseWeights) => {
          const baseConfig: PathfindingConfig = {
            maxGraphNodes: 10000,
            routeCalculationTimeoutMs: 3000,
            costWeights: baseWeights,
          };

          const normalMode: PowerMode = {
            mode: 'normal',
            cvFPS: 10,
            arEnabled: true,
            routingStrategy: 'optimal',
          };

          const adaptedConfig = getAdaptiveRoutingConfig(baseConfig, normalMode);

          // Property: In normal mode, weights should remain unchanged
          return (
            adaptedConfig.costWeights.distance === baseWeights.distance &&
            adaptedConfig.costWeights.visibility === baseWeights.visibility &&
            adaptedConfig.costWeights.safety === baseWeights.safety
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should trigger recalculation when routing strategy changes', () => {
    const normalMode: PowerMode = {
      mode: 'normal',
      cvFPS: 10,
      arEnabled: true,
      routingStrategy: 'optimal',
    };

    const lowPowerMode: PowerMode = {
      mode: 'low_power',
      cvFPS: 5,
      arEnabled: true,
      routingStrategy: 'shortest',
    };

    // Property: Changing from optimal to shortest should trigger recalculation
    expect(shouldRecalculateRoute(normalMode, lowPowerMode)).toBe(true);
  });

  it('should not trigger recalculation when routing strategy stays the same', () => {
    const lowPowerMode1: PowerMode = {
      mode: 'low_power',
      cvFPS: 5,
      arEnabled: true,
      routingStrategy: 'shortest',
    };

    const criticalMode: PowerMode = {
      mode: 'critical',
      cvFPS: 5,
      arEnabled: false,
      routingStrategy: 'shortest',
    };

    // Property: Both use 'shortest' strategy, so no recalculation needed
    expect(shouldRecalculateRoute(lowPowerMode1, criticalMode)).toBe(false);
  });

  it('should reduce visibility weight in low-power modes', () => {
    fc.assert(
      fc.property(
        fc.record({
          distance: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true }),
          visibility: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true }),
          safety: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true }),
        }),
        (baseWeights) => {
          const baseConfig: PathfindingConfig = {
            maxGraphNodes: 10000,
            routeCalculationTimeoutMs: 3000,
            costWeights: baseWeights,
          };

          const lowPowerMode: PowerMode = {
            mode: 'low_power',
            cvFPS: 5,
            arEnabled: true,
            routingStrategy: 'shortest',
          };

          const adaptedConfig = getAdaptiveRoutingConfig(baseConfig, lowPowerMode);

          // Property: Visibility weight should be significantly reduced (< 0.2)
          return adaptedConfig.costWeights.visibility < 0.2;
        }
      ),
      { numRuns: 100 }
    );
  });
});
