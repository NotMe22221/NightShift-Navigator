/**
 * Offline Routing Capability
 * Enables routing when network is unavailable using cached map data
 */

import type { NavigationGraph, Position, Route, PathfindingConfig } from './index.js';
import type { MapCache, CachedRegion, GeoBounds } from './map-cache.js';
import { createMapCache } from './map-cache.js';
import { findPath } from './astar.js';
import { createError, type SystemError, type RecoveryResult } from '../error-handling/index.js';

/**
 * Network status
 */
export type NetworkStatus = 'online' | 'offline' | 'unknown';

/**
 * Offline routing manager
 */
export class OfflineRoutingManager {
  private cache: MapCache;
  private networkStatus: NetworkStatus = 'unknown';
  private isInitialized = false;

  constructor(cache?: MapCache) {
    this.cache = cache || createMapCache();
  }

  /**
   * Initialize the offline routing manager
   */
  async initialize(): Promise<void> {
    await this.cache.initialize();
    this.updateNetworkStatus();
    this.setupNetworkListeners();
    this.isInitialized = true;
  }

  /**
   * Cache map data for a region
   */
  async cacheMapData(
    id: string,
    bounds: GeoBounds,
    graph: NavigationGraph,
    source: string = 'user'
  ): Promise<void> {
    const region: CachedRegion = {
      id,
      bounds,
      graph,
      timestamp: Date.now(),
      source
    };

    await this.cache.cacheRegion(region);
  }

  /**
   * Get cached map data for a region
   */
  async getCachedMapData(id: string): Promise<NavigationGraph | null> {
    const region = await this.cache.getRegion(id);
    return region ? region.graph : null;
  }

  /**
   * Get all cached regions that cover the given bounds
   */
  async getCachedRegionsForBounds(bounds: GeoBounds): Promise<CachedRegion[]> {
    return await this.cache.getRegionsInBounds(bounds);
  }

  /**
   * Calculate route using cached data
   */
  async calculateOfflineRoute(
    start: Position,
    end: Position,
    config: PathfindingConfig
  ): Promise<Route | null> {
    // Get cached regions that might contain the route
    const bounds = this.calculateBounds(start, end);
    const regions = await this.getCachedRegionsForBounds(bounds);

    if (regions.length === 0) {
      return null;
    }

    // Merge graphs from all relevant regions
    const mergedGraph = this.mergeGraphs(regions.map(r => r.graph));

    // Find path using A* algorithm
    try {
      const route = findPath(start, end, mergedGraph, config);
      return route;
    } catch (error) {
      console.error('Failed to calculate offline route', error);
      return null;
    }
  }

  /**
   * Handle network connectivity loss
   */
  async handleNetworkLoss(error: SystemError): Promise<RecoveryResult> {
    if (!this.isInitialized) {
      return {
        success: false,
        action: 'failed',
        message: 'Offline routing not initialized'
      };
    }

    // Check if we have cached data
    const allRegions = await this.cache.getAllRegions();
    
    if (allRegions.length === 0) {
      return {
        success: false,
        action: 'failed',
        message: 'No cached map data available for offline routing'
      };
    }

    // Switch to offline mode
    this.networkStatus = 'offline';

    return {
      success: true,
      action: 'degraded',
      message: `Switched to offline routing with ${allRegions.length} cached regions`
    };
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): NetworkStatus {
    return this.networkStatus;
  }

  /**
   * Check if offline routing is available
   */
  async isOfflineRoutingAvailable(): Promise<boolean> {
    const regions = await this.cache.getAllRegions();
    return regions.length > 0;
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    await this.cache.clearCache();
  }

  /**
   * Update network status
   */
  private updateNetworkStatus(): void {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      this.networkStatus = navigator.onLine ? 'online' : 'offline';
    } else {
      this.networkStatus = 'unknown';
    }
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.networkStatus = 'online';
        console.log('Network connection restored');
      });

      window.addEventListener('offline', () => {
        this.networkStatus = 'offline';
        console.log('Network connection lost, switching to offline mode');
      });
    }
  }

  /**
   * Calculate bounds that encompass both positions
   */
  private calculateBounds(start: Position, end: Position): GeoBounds {
    const padding = 0.01; // ~1km padding

    return {
      north: Math.max(start.latitude, end.latitude) + padding,
      south: Math.min(start.latitude, end.latitude) - padding,
      east: Math.max(start.longitude, end.longitude) + padding,
      west: Math.min(start.longitude, end.longitude) - padding
    };
  }

  /**
   * Merge multiple graphs into one
   */
  private mergeGraphs(graphs: NavigationGraph[]): NavigationGraph {
    const mergedNodes = new Map();
    const mergedEdges = new Map();

    for (const graph of graphs) {
      // Merge nodes
      for (const [id, node] of graph.nodes) {
        if (!mergedNodes.has(id)) {
          mergedNodes.set(id, node);
        }
      }

      // Merge edges
      for (const [id, edge] of graph.edges) {
        if (!mergedEdges.has(id)) {
          mergedEdges.set(id, edge);
        }
      }
    }

    return {
      nodes: mergedNodes,
      edges: mergedEdges
    };
  }
}
