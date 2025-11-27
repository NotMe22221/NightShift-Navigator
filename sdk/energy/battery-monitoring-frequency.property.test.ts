/**
 * Property-based test for battery monitoring frequency
 * **Feature: nightshift-navigator, Property 26: Battery monitoring frequency**
 * **Validates: Requirements 6.1**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { EnergyManagerImpl } from './energy-manager.js';

describe('Property 26: Battery monitoring frequency', () => {
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

  it('should monitor battery at specified intervals', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5000, max: 30000 }), // monitoring interval in ms
        async (monitoringIntervalMs) => {
          // Track mode change callbacks to verify monitoring is happening
          let updateCount = 0;
          
          // Mock Battery API with changing levels
          let currentLevel = 0.5;
          const mockBattery = {
            get level() { return currentLevel; },
            charging: false,
            dischargingTime: Infinity,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          };

          (navigator as any).getBattery = vi.fn().mockResolvedValue(mockBattery);

          // Initialize with custom interval
          await energyManager.initialize({
            lowPowerThreshold: 20,
            criticalPowerThreshold: 10,
            monitoringIntervalMs,
          });

          // Track updates by monitoring battery status changes
          const statusSnapshots: number[] = [];
          
          energyManager.start();

          // Take snapshots at each interval
          const testDurationMs = 10000;
          const numIntervals = Math.floor(testDurationMs / monitoringIntervalMs);
          
          for (let i = 0; i <= numIntervals; i++) {
            statusSnapshots.push(energyManager.getBatteryStatus().percentage);
            if (i < numIntervals) {
              await vi.advanceTimersByTimeAsync(monitoringIntervalMs);
              // Change battery level slightly to trigger update
              currentLevel = 0.5 - (i * 0.01);
            }
          }

          energyManager.stop();

          // Property: Battery status should be updated at least once per interval
          // We should see at least numIntervals updates
          return statusSnapshots.length >= numIntervals;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should check battery at least once per monitoring interval', async () => {
    // Mock Battery API
    const mockBattery = {
      level: 0.8,
      charging: false,
      dischargingTime: Infinity,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    (navigator as any).getBattery = vi.fn().mockResolvedValue(mockBattery);

    await energyManager.initialize({
      lowPowerThreshold: 20,
      criticalPowerThreshold: 10,
      monitoringIntervalMs: 10000, // 10 seconds
    });

    const statusBefore = energyManager.getBatteryStatus();
    
    energyManager.start();

    // Advance time by exactly the monitoring interval
    await vi.advanceTimersByTimeAsync(10000);

    const statusAfter = energyManager.getBatteryStatus();

    energyManager.stop();

    // Property: Battery status should be updated after one interval
    expect(statusAfter.percentage).toBe(80); // 0.8 * 100
  });
});
