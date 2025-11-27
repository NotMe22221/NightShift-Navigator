/**
 * Adaptive Routing Strategy
 * Adjusts pathfinding cost function weights based on power mode
 */

import type { PowerMode } from './index.js';
import type { PathfindingConfig } from '../pathfinding/index.js';

/**
 * Get pathfinding configuration adjusted for current power mode
 * 
 * In low-power and critical modes, the system prioritizes shorter routes
 * over optimally-lit routes to minimize navigation time and battery consumption.
 * 
 * @param baseCon fig - Base pathfinding configuration
 * @param powerMode - Current power mode
 * @returns Adjusted pathfinding configuration
 */
export function getAdaptiveRoutingConfig(
  baseConfig: PathfindingConfig,
  powerMode: PowerMode
): PathfindingConfig {
  const config = { ...baseConfig };

  switch (powerMode.mode) {
    case 'normal':
      // Use optimal routing: balance distance, visibility, and safety
      // Keep the base configuration weights
      break;

    case 'low_power':
    case 'critical':
      // Use shortest-path routing: prioritize distance over visibility/safety
      config.costWeights = {
        distance: 1.0,      // High weight on distance
        visibility: 0.1,    // Low weight on visibility
        safety: 0.2,        // Moderate weight on safety (still avoid hazards)
      };
      break;
  }

  return config;
}

/**
 * Check if routing strategy should be recalculated due to power mode change
 * 
 * @param oldMode - Previous power mode
 * @param newMode - New power mode
 * @returns True if route should be recalculated
 */
export function shouldRecalculateRoute(
  oldMode: PowerMode,
  newMode: PowerMode
): boolean {
  // Recalculate if routing strategy changed
  return oldMode.routingStrategy !== newMode.routingStrategy;
}
