/**
 * Energy Manager Implementation
 * Monitors battery status and manages power modes
 */

import type { Route } from '../pathfinding/index.js';
import type { EnergyConfig, PowerMode, BatteryStatus, EnergyManager } from './index.js';

/**
 * Default power mode configurations
 */
const POWER_MODES: Record<'normal' | 'low_power' | 'critical', PowerMode> = {
  normal: {
    mode: 'normal',
    cvFPS: 10,
    arEnabled: true,
    routingStrategy: 'optimal',
  },
  low_power: {
    mode: 'low_power',
    cvFPS: 5,
    arEnabled: true,
    routingStrategy: 'shortest',
  },
  critical: {
    mode: 'critical',
    cvFPS: 5,
    arEnabled: false,
    routingStrategy: 'shortest',
  },
};

/**
 * Energy Manager implementation
 * Monitors battery levels and transitions between power modes
 */
export class EnergyManagerImpl implements EnergyManager {
  private config: EnergyConfig;
  private currentMode: PowerMode;
  private batteryStatus: BatteryStatus;
  private monitoringInterval: number | null = null;
  private modeChangeCallbacks: Array<(mode: PowerMode) => void> = [];
  private batteryManager: BatteryManager | null = null;
  private drainHistory: Array<{ timestamp: number; percentage: number }> = [];
  private isRunning = false;

  constructor() {
    this.config = {
      lowPowerThreshold: 20,
      criticalPowerThreshold: 10,
      monitoringIntervalMs: 10000,
    };
    this.currentMode = POWER_MODES.normal;
    this.batteryStatus = {
      percentage: 100,
      isCharging: false,
      estimatedMinutesRemaining: 0,
    };
  }

  /**
   * Initialize the energy manager with configuration
   */
  async initialize(config: EnergyConfig): Promise<void> {
    this.config = { ...this.config, ...config };

    // Access Battery Status API if available
    if ('getBattery' in navigator) {
      try {
        this.batteryManager = await (navigator as any).getBattery();
        await this.updateBatteryStatus();
      } catch (error) {
        console.warn('Battery Status API not available:', error);
      }
    }
  }

  /**
   * Start battery monitoring
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Start periodic monitoring
    this.monitoringInterval = window.setInterval(() => {
      this.updateBatteryStatus();
    }, this.config.monitoringIntervalMs);

    // Set up battery event listeners if available
    if (this.batteryManager) {
      this.batteryManager.addEventListener('levelchange', () => {
        this.updateBatteryStatus();
      });
      this.batteryManager.addEventListener('chargingchange', () => {
        this.updateBatteryStatus();
      });
    }
  }

  /**
   * Stop battery monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.monitoringInterval !== null) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Get current power mode
   */
  getCurrentMode(): PowerMode {
    return { ...this.currentMode };
  }

  /**
   * Get current battery status
   */
  getBatteryStatus(): BatteryStatus {
    return { ...this.batteryStatus };
  }

  /**
   * Estimate remaining navigation time based on route and battery drain
   */
  estimateRemainingNavigationTime(route: Route): number {
    const drainRate = this.calculateDrainRate();
    
    if (drainRate <= 0 || this.batteryStatus.isCharging) {
      // If charging or no drain, return a large number
      return Infinity;
    }

    // Estimate time based on current battery and drain rate
    const remainingBatteryMinutes = this.batteryStatus.percentage / drainRate;
    
    // Estimate route time (simplified: assume 1.4 m/s walking speed)
    const routeTimeMinutes = route.totalDistance / (1.4 * 60);
    
    // Return the minimum of battery life and route time
    return Math.min(remainingBatteryMinutes, routeTimeMinutes);
  }

  /**
   * Register callback for mode changes
   */
  onModeChange(callback: (mode: PowerMode) => void): void {
    this.modeChangeCallbacks.push(callback);
  }

  /**
   * Update battery status and check for mode transitions
   */
  private async updateBatteryStatus(): Promise<void> {
    if (this.batteryManager) {
      const percentage = this.batteryManager.level * 100;
      const isCharging = this.batteryManager.charging;
      const dischargingTime = this.batteryManager.dischargingTime;

      this.batteryStatus = {
        percentage,
        isCharging,
        estimatedMinutesRemaining: 
          dischargingTime === Infinity ? 0 : dischargingTime / 60,
      };

      // Record drain history
      this.drainHistory.push({
        timestamp: Date.now(),
        percentage,
      });

      // Keep only last 10 minutes of history
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      this.drainHistory = this.drainHistory.filter(
        (entry) => entry.timestamp > tenMinutesAgo
      );
    }

    // Check for mode transitions
    this.checkModeTransition();
  }

  /**
   * Check if power mode should transition based on battery level
   */
  private checkModeTransition(): void {
    const { percentage, isCharging } = this.batteryStatus;
    let newMode: PowerMode | null = null;

    // Don't change modes while charging
    if (isCharging) {
      if (this.currentMode.mode !== 'normal') {
        newMode = POWER_MODES.normal;
      }
    } else {
      // Transition based on battery thresholds
      if (percentage <= this.config.criticalPowerThreshold) {
        if (this.currentMode.mode !== 'critical') {
          newMode = POWER_MODES.critical;
        }
      } else if (percentage <= this.config.lowPowerThreshold) {
        if (this.currentMode.mode !== 'low_power') {
          newMode = POWER_MODES.low_power;
        }
      } else {
        if (this.currentMode.mode !== 'normal') {
          newMode = POWER_MODES.normal;
        }
      }
    }

    // Apply mode change if needed
    if (newMode) {
      this.currentMode = newMode;
      this.notifyModeChange();
    }
  }

  /**
   * Calculate battery drain rate (percentage per minute)
   */
  private calculateDrainRate(): number {
    if (this.drainHistory.length < 2) {
      return 0;
    }

    // Use linear regression or simple average
    const oldest = this.drainHistory[0];
    const newest = this.drainHistory[this.drainHistory.length - 1];
    
    const timeDiffMinutes = (newest.timestamp - oldest.timestamp) / (60 * 1000);
    const percentageDiff = oldest.percentage - newest.percentage;

    if (timeDiffMinutes <= 0) {
      return 0;
    }

    return percentageDiff / timeDiffMinutes;
  }

  /**
   * Notify all registered callbacks of mode change
   */
  private notifyModeChange(): void {
    for (const callback of this.modeChangeCallbacks) {
      try {
        callback(this.currentMode);
      } catch (error) {
        console.error('Error in mode change callback:', error);
      }
    }
  }
}
