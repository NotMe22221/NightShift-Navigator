/**
 * Mock Light Sensor Implementation
 * Provides simulated ambient light readings for testing
 */

import type { LightSensorInterface } from './index.js';

/**
 * Configuration options for MockLightSensor
 */
export interface MockLightSensorConfig {
  updateFrequencyHz?: number;
  initialLux?: number; // Initial lux value
  variationRange?: number; // Random variation range in lux
}

/**
 * Mock light sensor implementation for testing
 * Generates synthetic ambient light readings with configurable properties
 */
export class MockLightSensor implements LightSensorInterface {
  private config: Required<MockLightSensorConfig>;
  private isRunning: boolean = false;
  private intervalId: number | null = null;
  private currentReading: number;
  private readingCallbacks: Array<(reading: number) => void> = [];

  constructor(config: MockLightSensorConfig = {}) {
    this.config = {
      updateFrequencyHz: config.updateFrequencyHz ?? 10,
      initialLux: config.initialLux ?? 100,
      variationRange: config.variationRange ?? 10,
    };
    this.currentReading = this.config.initialLux;
  }

  /**
   * Initialize the mock light sensor
   */
  async initialize(): Promise<void> {
    // Set initial reading
    this.currentReading = this.config.initialLux;
  }

  /**
   * Start generating light readings at configured frequency
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    const intervalMs = 1000 / this.config.updateFrequencyHz;

    this.intervalId = setInterval(() => {
      this.currentReading = this.generateReading();
      this.notifyReadingCallbacks(this.currentReading);
    }, intervalMs) as unknown as number;
  }

  /**
   * Stop generating light readings
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Get the most recent light reading in lux
   */
  getCurrentReading(): number {
    return this.currentReading;
  }

  /**
   * Register a callback for reading updates
   */
  onReading(callback: (reading: number) => void): void {
    this.readingCallbacks.push(callback);
  }

  /**
   * Check if light sensor is running
   */
  isRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Set the base lux value
   */
  setLux(lux: number): void {
    this.config.initialLux = Math.max(0, lux);
    this.currentReading = this.config.initialLux;
  }

  /**
   * Set the variation range for readings
   */
  setVariationRange(range: number): void {
    this.config.variationRange = Math.max(0, range);
  }

  /**
   * Generate a synthetic light reading with variation
   */
  private generateReading(): number {
    const { initialLux, variationRange } = this.config;
    
    // Add random variation around the base lux value
    const variation = (Math.random() * 2 - 1) * variationRange;
    const reading = initialLux + variation;

    // Ensure reading is non-negative
    return Math.max(0, reading);
  }

  /**
   * Notify all registered callbacks of a new reading
   */
  private notifyReadingCallbacks(reading: number): void {
    for (const callback of this.readingCallbacks) {
      callback(reading);
    }
  }
}
