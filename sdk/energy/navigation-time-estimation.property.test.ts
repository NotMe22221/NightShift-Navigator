/**
 * Property-based test for navigation time estimation
 * **Feature: nightshift-navigator, Property 30: Navigation time estimation**
 * **Validates: Requirements 6.5**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { EnergyManagerImpl } from './energy-manager.js';
import type { Route } from '../pathfinding/index.js';

describe('Property 30: Navigation time estimation', () => {
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

  it('should estimate navigation time based on route distance and battery drain', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: Math.fround(100), max: Math.fround(5000), noNaN: true }), // route distance in meters
        fc.float({ min: Math.fround(0.3), max: Math.fround(0.9), noNaN: true }), // initial battery level
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.05), noNaN: true }), // drain rate per check
        async (routeDistance, initialBattery, drainPerCheck) => {
          // Create a mock route
          const mockRoute: Route = {
            nodes: [],
            edges: [],
            totalDistance: routeDistance,
            totalCost: routeDistance,
            estimatedTimeSeconds: routeDistance / 1.4, // 1.4 m/s walking speed
          };

          // Set up battery with declining levels to establish drain rate
          let currentLevel = initialBattery;
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

          // Simulate battery drain over multiple checks to establish drain rate
          for (let i = 0; i < 5; i++) {
            await vi.advanceTimersByTimeAsync(5000);
            currentLevel -= drainPerCheck;
          }

          const estimatedTime = energyManager.estimateRemainingNavigationTime(mockRoute);

          energyManager.stop();

          // Property: Estimated time should be a positive number (or Infinity if charging)
          return estimatedTime > 0 || estimatedTime === Infinity;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return Infinity when device is charging', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: Math.fround(100), max: Math.fround(5000), noNaN: true }), // route distance
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true }), // battery level
        async (routeDistance, batteryLevel) => {
          const mockRoute: Route = {
            nodes: [],
            edges: [],
            totalDistance: routeDistance,
            totalCost: routeDistance,
            estimatedTimeSeconds: routeDistance / 1.4,
          };

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

          const estimatedTime = energyManager.estimateRemainingNavigationTime(mockRoute);

          energyManager.stop();

          // Property: When charging, estimated time should be Infinity
          return estimatedTime === Infinity;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should consider both battery life and route time', async () => {
    // Create a scenario where battery will last longer than route time
    const shortRoute: Route = {
      nodes: [],
      edges: [],
      totalDistance: 100, // 100 meters
      totalCost: 100,
      estimatedTimeSeconds: 100 / 1.4, // ~71 seconds
    };

    let currentLevel = 0.8; // 80% battery
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

    // Simulate slow drain (battery will last a long time)
    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(5000);
      currentLevel -= 0.001; // Very slow drain
    }

    const estimatedTime = energyManager.estimateRemainingNavigationTime(shortRoute);

    energyManager.stop();

    // Property: Estimated time should be finite and positive
    expect(estimatedTime).toBeGreaterThan(0);
    expect(estimatedTime).toBeLessThan(Infinity);
  });

  it('should return Infinity when no drain history is available', async () => {
    const mockRoute: Route = {
      nodes: [],
      edges: [],
      totalDistance: 1000,
      totalCost: 1000,
      estimatedTimeSeconds: 1000 / 1.4,
    };

    const mockBattery = {
      level: 0.5,
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

    // Don't advance time - no drain history yet
    const estimatedTime = energyManager.estimateRemainingNavigationTime(mockRoute);

    energyManager.stop();

    // Property: Without drain history, should return Infinity (can't estimate)
    expect(estimatedTime).toBe(Infinity);
  });

  it('should produce consistent estimates for the same route and drain rate', async () => {
    const mockRoute: Route = {
      nodes: [],
      edges: [],
      totalDistance: 1000,
      totalCost: 1000,
      estimatedTimeSeconds: 1000 / 1.4,
    };

    let currentLevel = 0.6;
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

    // Establish drain rate
    for (let i = 0; i < 4; i++) {
      await vi.advanceTimersByTimeAsync(5000);
      currentLevel -= 0.02; // 2% per 5 seconds
    }

    const estimate1 = energyManager.estimateRemainingNavigationTime(mockRoute);
    const estimate2 = energyManager.estimateRemainingNavigationTime(mockRoute);

    energyManager.stop();

    // Property: Multiple calls with same inputs should produce same result
    expect(estimate1).toBe(estimate2);
  });
});
