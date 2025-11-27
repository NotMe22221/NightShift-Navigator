/**
 * Property-based test for low-power mode activation
 * **Feature: nightshift-navigator, Property 27: Low-power mode activation**
 * **Validates: Requirements 6.2**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { EnergyManagerImpl } from './energy-manager.js';

describe('Property 27: Low-power mode activation', () => {
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

  it('should activate low-power mode when battery drops below 20%', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: Math.fround(0.11), max: Math.fround(0.19), noNaN: true }), // battery level below 20% but above 10%
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

          // Property: For any battery level below 20% (but above 10%), 
          // the system should be in low_power mode
          return mode.mode === 'low_power' && mode.cvFPS === 5;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reduce CV frame rate to 5 fps in low-power mode', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: Math.fround(0.11), max: Math.fround(0.19), noNaN: true }), // battery level in low-power range
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

          // Property: In low-power mode, CV FPS should be reduced to 5
          return mode.mode === 'low_power' && mode.cvFPS === 5;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should transition from normal to low-power mode when crossing threshold', async () => {
    // Start with battery above 20%
    let currentLevel = 0.25;
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
    expect(modeBefore.mode).toBe('normal');

    // Drop battery below 20%
    currentLevel = 0.18;
    await vi.advanceTimersByTimeAsync(5000);

    const modeAfter = energyManager.getCurrentMode();

    energyManager.stop();

    // Property: Crossing from above 20% to below 20% should trigger low-power mode
    expect(modeAfter.mode).toBe('low_power');
    expect(modeAfter.cvFPS).toBe(5);
  });

  it('should not activate low-power mode while charging', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.19), noNaN: true }), // battery level below 20%
        async (batteryLevel) => {
          const mockBattery = {
            level: batteryLevel,
            charging: true, // Device is charging
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

          // Property: While charging, system should remain in normal mode
          // regardless of battery level
          return mode.mode === 'normal';
        }
      ),
      { numRuns: 100 }
    );
  });
});
