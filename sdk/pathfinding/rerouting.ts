/**
 * Dynamic Rerouting Logic
 * 
 * Detects environmental changes and triggers route recalculation.
 */

import { NavigationGraph, Route, Position, PathfindingConfig } from './index';
import { astar } from './astar';
import type { LightMetrics, HazardDetection } from './scoring';
import { updateEdgeScores } from './scoring';

export interface ReroutingConfig {
  lightChangeThreshold: number; // Minimum change in light level to trigger reroute (0-1)
  hazardProximityThreshold: number; // Distance in meters to consider hazard significant
  minRerouteInterval: number; // Minimum time between reroutes in milliseconds
}

export interface EnvironmentalState {
  lightMetrics: LightMetrics;
  hazards: HazardDetection[];
  timestamp: number;
}

/**
 * RerouteManager - Manages dynamic rerouting based on environmental changes
 */
export class RerouteManager {
  private lastEnvironmentalState: EnvironmentalState | null = null;
  private lastRerouteTime: number = 0;
  private currentRoute: Route | null = null;
  private config: ReroutingConfig;

  constructor(config?: Partial<ReroutingConfig>) {
    this.config = {
      lightChangeThreshold: config?.lightChangeThreshold ?? 0.2,
      hazardProximityThreshold: config?.hazardProximityThreshold ?? 20,
      minRerouteInterval: config?.minRerouteInterval ?? 5000,
      ...config,
    };
  }

  /**
   * Set the current route
   */
  setCurrentRoute(route: Route): void {
    this.currentRoute = route;
  }

  /**
   * Get the current route
   */
  getCurrentRoute(): Route | null {
    return this.currentRoute;
  }

  /**
   * Check if environmental changes are significant enough to trigger rerouting
   */
  shouldReroute(currentState: EnvironmentalState, _currentPosition: Position): boolean {
    // Don't reroute if no current route
    if (!this.currentRoute) {
      return false;
    }

    // Don't reroute too frequently
    const now = Date.now();
    if (now - this.lastRerouteTime < this.config.minRerouteInterval) {
      return false;
    }

    // First time - store state but don't reroute
    if (!this.lastEnvironmentalState) {
      this.lastEnvironmentalState = currentState;
      return false;
    }

    // Check for significant light level change
    const lightChange = Math.abs(
      currentState.lightMetrics.unifiedLightLevel -
        this.lastEnvironmentalState.lightMetrics.unifiedLightLevel
    );

    if (lightChange >= this.config.lightChangeThreshold) {
      return true;
    }

    // Check for new hazards on current route
    const newHazardsOnRoute = this.detectNewHazardsOnRoute(
      currentState.hazards,
      this.lastEnvironmentalState.hazards,
      _currentPosition
    );

    if (newHazardsOnRoute) {
      return true;
    }

    return false;
  }

  /**
   * Detect if there are new hazards on the current route
   */
  private detectNewHazardsOnRoute(
    currentHazards: HazardDetection[],
    previousHazards: HazardDetection[],
    _currentPosition: Position
  ): boolean {
    if (!this.currentRoute) {
      return false;
    }

    // Get IDs of previous hazards
    const previousHazardIds = new Set(previousHazards.map((h) => h.id));

    // Find new hazards (not in previous set)
    const newHazards = currentHazards.filter((h) => !previousHazardIds.has(h.id));

    // Check if any new hazards are near the current route
    for (const hazard of newHazards) {
      if (!hazard.worldPosition) {
        continue;
      }

      // Check if hazard is near any node on the route
      for (const node of this.currentRoute.nodes) {
        const distance = this.calculateDistance(
          { latitude: hazard.worldPosition.latitude, longitude: hazard.worldPosition.longitude },
          node.position
        );

        if (distance <= this.config.hazardProximityThreshold) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculate distance between two positions
   */
  private calculateDistance(pos1: Position, pos2: Position): number {
    const R = 6371000; // Earth's radius in meters
    const lat1 = (pos1.latitude * Math.PI) / 180;
    const lat2 = (pos2.latitude * Math.PI) / 180;
    const deltaLat = ((pos2.latitude - pos1.latitude) * Math.PI) / 180;
    const deltaLon = ((pos2.longitude - pos1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Perform rerouting
   */
  async reroute(
    currentPosition: Position,
    destination: Position,
    graph: NavigationGraph,
    pathfindingConfig: PathfindingConfig,
    currentState: EnvironmentalState
  ): Promise<Route | null> {
    const startTime = Date.now();

    // Update edge scores based on current environmental state
    const updatedGraph = this.updateGraphScores(graph, currentState);

    // Calculate new route
    const newRoute = astar(currentPosition, destination, updatedGraph, pathfindingConfig);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Ensure recalculation completes within 2 seconds
    if (duration > 2000) {
      console.warn(`Reroute took ${duration}ms, exceeding 2 second limit`);
    }

    if (newRoute) {
      this.currentRoute = newRoute;
      this.lastRerouteTime = Date.now();
      this.lastEnvironmentalState = currentState;
    }

    return newRoute;
  }

  /**
   * Update graph edge scores based on current environmental state
   */
  private updateGraphScores(
    graph: NavigationGraph,
    state: EnvironmentalState
  ): NavigationGraph {
    const updatedEdges = new Map<string, any>();

    for (const [edgeId, edge] of graph.edges.entries()) {
      const fromNode = graph.nodes.get(edge.fromNodeId);
      const toNode = graph.nodes.get(edge.toNodeId);

      if (fromNode && toNode) {
        const updatedEdge = updateEdgeScores(
          edge,
          fromNode.position,
          toNode.position,
          state.lightMetrics,
          state.hazards
        );
        updatedEdges.set(edgeId, updatedEdge);
      } else {
        updatedEdges.set(edgeId, edge);
      }
    }

    return {
      nodes: graph.nodes,
      edges: updatedEdges,
    };
  }

  /**
   * Reset the manager state
   */
  reset(): void {
    this.lastEnvironmentalState = null;
    this.lastRerouteTime = 0;
    this.currentRoute = null;
  }
}
