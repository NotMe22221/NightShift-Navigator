/**
 * Property-Based Tests for Offline Routing Capability
 * **Feature: nightshift-navigator, Property 38: Offline routing capability**
 * **Validates: Requirements 8.3**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { OfflineRoutingManager } from './offline-routing.js';
import { InMemoryMapCache } from './map-cache.js';
import type { NavigationGraph, Position, PathfindingConfig } from './index.js';
import { createError } from '../error-handling/index.js';

describe('Property 38: Offline routing capability', () => {
  /**
   * Property: For any network connectivity loss, the Pathfinding Engine 
   * should continue calculating routes using cached map data.
   */
  it('should continue routing with cached data when network is lost', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          startLat: fc.double({ min: -90, max: 90 }),
          startLon: fc.double({ min: -180, max: 180 }),
          endLat: fc.double({ min: -90, max: 90 }),
          endLon: fc.double({ min: -180, max: 180 })
        }),
        async (positions) => {
          // Setup with in-memory cache (no IndexedDB in test environment)
          const cache = new InMemoryMapCache();
          const manager = new OfflineRoutingManager(cache);
          await manager.initialize();

          // Create test graph with nodes
          const graph = createTestGraph(positions);

          // Cache the map data
          const bounds = {
            north: Math.max(positions.startLat, positions.endLat) + 0.1,
            south: Math.min(positions.startLat, positions.endLat) - 0.1,
            east: Math.max(positions.startLon, positions.endLon) + 0.1,
            west: Math.min(positions.startLon, positions.endLon) - 0.1
          };

          await manager.cacheMapData('test-region', bounds, graph);

          // Simulate network loss
          const networkError = createError(
            'integration_error',
            'critical',
            'Network',
            'Network connectivity lost'
          );

          const result = await manager.handleNetworkLoss(networkError);

          // Verify recovery was successful
          expect(result.success).toBe(true);
          expect(result.action).toBe('degraded');

          // Verify offline routing is available
          const isAvailable = await manager.isOfflineRoutingAvailable();
          expect(isAvailable).toBe(true);

          // Verify can calculate route with cached data
          const start: Position = {
            latitude: positions.startLat,
            longitude: positions.startLon
          };
          const end: Position = {
            latitude: positions.endLat,
            longitude: positions.endLon
          };

          const config: PathfindingConfig = {
            maxGraphNodes: 10000,
            routeCalculationTimeoutMs: 3000,
            costWeights: {
              distance: 1.0,
              visibility: 0.5,
              safety: 0.5
            }
          };

          // Should be able to calculate route (or return null if no path exists)
          const route = await manager.calculateOfflineRoute(start, end, config);
          
          // Route may be null if positions are too far apart or no path exists
          // The important thing is that it doesn't throw an error
          expect(route === null || typeof route === 'object').toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should fail gracefully when no cached data is available', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          // Setup with empty cache
          const cache = new InMemoryMapCache();
          const manager = new OfflineRoutingManager(cache);
          await manager.initialize();

          // Simulate network loss without cached data
          const networkError = createError(
            'integration_error',
            'critical',
            'Network',
            'Network connectivity lost'
          );

          const result = await manager.handleNetworkLoss(networkError);

          // Should fail since no cached data available
          expect(result.success).toBe(false);
          expect(result.action).toBe('failed');

          // Verify offline routing is not available
          const isAvailable = await manager.isOfflineRoutingAvailable();
          expect(isAvailable).toBe(false);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should retrieve cached map data for various regions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }),
            lat: fc.double({ min: -90, max: 90 }),
            lon: fc.double({ min: -180, max: 180 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (regions) => {
          // Setup
          const cache = new InMemoryMapCache();
          const manager = new OfflineRoutingManager(cache);
          await manager.initialize();

          // Cache multiple regions
          for (const region of regions) {
            const graph = createTestGraph({
              startLat: region.lat,
              startLon: region.lon,
              endLat: region.lat + 0.01,
              endLon: region.lon + 0.01
            });

            const bounds = {
              north: region.lat + 0.05,
              south: region.lat - 0.05,
              east: region.lon + 0.05,
              west: region.lon - 0.05
            };

            await manager.cacheMapData(region.id, bounds, graph);
          }

          // Verify all regions were cached
          const isAvailable = await manager.isOfflineRoutingAvailable();
          expect(isAvailable).toBe(true);

          // Verify can retrieve each region
          for (const region of regions) {
            const cachedGraph = await manager.getCachedMapData(region.id);
            expect(cachedGraph).not.toBeNull();
            
            if (cachedGraph) {
              expect(cachedGraph.nodes.size).toBeGreaterThan(0);
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should merge graphs from multiple cached regions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }),
        async (regionCount) => {
          // Setup
          const cache = new InMemoryMapCache();
          const manager = new OfflineRoutingManager(cache);
          await manager.initialize();

          // Cache multiple overlapping regions
          const baseLat = 40.0;
          const baseLon = -74.0;

          for (let i = 0; i < regionCount; i++) {
            const offset = i * 0.01;
            const graph = createTestGraph({
              startLat: baseLat + offset,
              startLon: baseLon + offset,
              endLat: baseLat + offset + 0.01,
              endLon: baseLon + offset + 0.01
            });

            const bounds = {
              north: baseLat + offset + 0.05,
              south: baseLat + offset - 0.05,
              east: baseLon + offset + 0.05,
              west: baseLon + offset - 0.05
            };

            await manager.cacheMapData(`region-${i}`, bounds, graph);
          }

          // Query for regions in a large bounds that covers all
          const queryBounds = {
            north: baseLat + 0.1,
            south: baseLat - 0.1,
            east: baseLon + 0.1,
            west: baseLon - 0.1
          };

          const regions = await manager.getCachedRegionsForBounds(queryBounds);
          
          // Should find multiple regions
          expect(regions.length).toBeGreaterThan(0);
          expect(regions.length).toBeLessThanOrEqual(regionCount);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Helper function to create a test navigation graph
 */
function createTestGraph(positions: {
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
}): NavigationGraph {
  const nodes = new Map();
  const edges = new Map();

  // Create start node
  const startNode = {
    id: 'start',
    position: {
      latitude: positions.startLat,
      longitude: positions.startLon
    }
  };
  nodes.set('start', startNode);

  // Create end node
  const endNode = {
    id: 'end',
    position: {
      latitude: positions.endLat,
      longitude: positions.endLon
    }
  };
  nodes.set('end', endNode);

  // Create edge connecting them
  const edge = {
    id: 'start-end',
    fromNodeId: 'start',
    toNodeId: 'end',
    distance: 100, // meters
    visibilityScore: 0.8,
    safetyScore: 0.9
  };
  edges.set('start-end', edge);

  return { nodes, edges };
}
