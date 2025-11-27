/**
 * Property-based test for critical power mode activation
 * **Feature: nightshift-navigator, Property 28: Critical power mode activation**
 * **Validates: Requirements 6.3**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { EnergyManagerImpl } from './energy-manager.js';

describe('Property 28: Critical power mode activation', () => {
  let energyManager: EnergyManagerImpl;

  beforeEach(() => {
    energyManager = new EnergyManagerImpl();
    vi.useFakeTimers();
  });

  afterEach(() => {
    energyManager.stop();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should activate critical mode when battery drops below 10%', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.09), noNaN: true }), // battery level below 10%
        async (batteryLevel) => {
          // Mock Battery API
          const mockBattery = {
            level: batteryLevel,
            charging: false,
            dischargingTime: Infinity,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          };

          (navigator as any).getBattery = vi.fn().mockResolvedValue(mockBattery);

          await energyManager.initialize({
            lowPowerThreshold: 20,
            criticalPowerThreshold: 10,
            monitoringIntervalMs: 10000,
          });

          energyManager.start();

          // Advance time to trigger battery check
          await vi.advanceTimersByTimeAsync(10000);

          const mode = energyManager.getCurrentMode();

          energyManager.stop();

          // Property: For any battery level below 10%, the system should be in critical mode
          return mode.mode === 'critical';
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should disable AR rendering in critical mode', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.09), noNaN: true }), // battery level below 10%
        async (batteryLevel) => {
          const mockBattery = {
            level: batteryLevel,
            charging: false,
            dischargingTime: Infinity,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          };

          (navigator as any).getBattery = vi.fn().mockResolvedValue(mockBattery);

          await energyManager.initialize({
            lowPowerThreshold: 20,
            criticalPowerThreshold: 10,
            monitoringIntervalMs: 10000,
          });

          energyManager.start();
          await vi.advanceTimersByTimeAsync(10000);

          const mode = energyManager.getCurrentMode();

          energyManager.stop();

          // Property: In critical mode, AR should be disabled
          return mode.mode === 'critical' && mode.arEnabled === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain CV at 5 fps in critical mode', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.09), noNaN: true }), // battery level below 10%
        async (batteryLevel) => {
          const mockBattery = {
            level: batteryLevel,
            charging: false,
            dischargingTime: Infinity,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          };

          (navigator as any).getBattery = vi.fn().mockResolvedValue(mockBattery);

          await energyManager.initialize({
            lowPowerThreshold: 20,
            criticalPowerThreshold: 10,
            monitoringIntervalMs: 10000,
          });

          energyManager.start();
          await vi.advanceTimersByTimeAsync(10000);

          const mode = energyManager.getCurrentMode();

          energyManager.stop();

          // Property: In critical mode, CV FPS should be 5
          return mode.mode === 'critical' && mode.cvFPS === 5;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should transition from low-power to critical mode when crossing threshold', async () => {
    // Start with battery in low-power range (15%)
    let currentLevel = 0.15;
    const mockBattery = {
      get level() { return currentLevel; },
      charging: false,
      dischargingTime: Infinity,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    (navigator as any).getBattery = vi.fn().mockResolvedValue(mockBattery);

    await energyManager.initialize({
      lowPowerThreshold: 20,
      criticalPowerThreshold: 10,
      monitoringIntervalMs: 5000,
    });

    energyManager.start();
    await vi.advanceTimersByTimeAsync(5000);

    const modeBefore = energyManager.getCurrentMode();
    expect(modeBefore.mode).toBe('low_power');

    // Drop battery below 10%
    currentLevel = 0.08;
    await vi.advanceTimersByTimeAsync(5000);

    const modeAfter = energyManager.getCurrentMode();

    energyManager.stop();

    // Property: Crossing from above 10% to below 10% should trigger critical mode
    expect(modeAfter.mode).toBe('critical');
    expect(modeAfter.arEnabled).toBe(false);
  });

  it('should use shortest routing strategy in critical mode', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.09), noNaN: true }), // battery level below 10%
        async (batteryLevel) => {
          const mockBattery = {
            level: batteryLevel,
            charging: false,
            dischargingTime: Infinity,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          };

          (navigator as any).getBattery = vi.fn().mockResolvedValue(mockBattery);

          await energyManager.initialize({
            lowPowerThreshold: 20,
            criticalPowerThreshold: 10,
            monitoringIntervalMs: 10000,
          });

          energyManager.start();
          await vi.advanceTimersByTimeAsync(10000);

          const mode = energyManager.getCurrentMode();

          energyManager.stop();

          // Property: In critical mode, routing strategy should be 'shortest'
          return mode.mode === 'critical' && mode.routingStrategy === 'shortest';
        }
      ),
      { numRuns: 100 }
    );
  });
});
