/**
 * Energy-Aware Routing Module
 * Monitors battery and adapts system behavior
 */

import type { Route } from '../pathfinding/index.js';

/**
 * Configuration for energy management
 * Controls battery monitoring and power mode thresholds
 */
export interface EnergyConfig {
  lowPowerThreshold: number; // percentage, default 20
  criticalPowerThreshold: number; // percentage, default 10
  monitoringIntervalMs: number; // default 10000
}

/**
 * Power mode configuration
 * Defines system behavior for different battery levels
 */
export interface PowerMode {
  mode: 'normal' | 'low_power' | 'critical';
  cvFPS: number;
  arEnabled: boolean;
  routingStrategy: 'optimal' | 'shortest';
}

/**
 * Battery status information
 * Provides current battery state and estimates
 */
export interface BatteryStatus {
  percentage: number;
  isCharging: boolean;
  estimatedMinutesRemaining: number;
}

/**
 * Energy manager interface
 * Manages battery monitoring and adaptive power modes
 */
export interface EnergyManager {
  initialize(config: EnergyConfig): Promise<void>;
  start(): void;
  stop(): void;
  getCurrentMode(): PowerMode;
  getBatteryStatus(): BatteryStatus;
  estimateRemainingNavigationTime(route: Route): number;
  onModeChange(callback: (mode: PowerMode) => void): void;
}

export { EnergyManagerImpl } from './energy-manager.js';
export { getAdaptiveRoutingConfig, shouldRecalculateRoute } from './adaptive-routing.js';
