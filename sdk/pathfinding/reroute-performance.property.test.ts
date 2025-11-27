/**
 * Property-Based Tests for Reroute Performance
 * **Feature: nightshift-navigator, Property 15: Reroute performance**
 * **Validates: Requirements 3.5**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { RerouteManager, EnvironmentalState } from './rerouting';
import { GraphBuilder, NavigationNode, NavigationEdge, PathfindingConfig, Position } from './index';
import type { LightMetrics, HazardDetection } from './scoring';

describe('Reroute Performance Property Tests', () => {
  // Generator for positions
  const positionArbitrary = fc.record({
    latitude: fc.double({ min: -90, max: 90, noNaN: true }),
    longitude: fc.double({ min: -180, max: 180, noNaN: true }),
  });

  // Generator for light metrics
  const lightMetricsArbitrary = fc.record({
    meanLuminance: fc.double({ min: 0, max: 255, noNaN: true }),
    ambientLux: fc.double({ min: 0, max: 100000, noNaN: true }),
    shadowCoverage: fc.double({ min: 0, max: 1, noNaN: true }),
    unifiedLightLevel: fc.double({ min: 0, max: 1, noNaN: true }),
    timestamp: fc.integer({ min: 0 }),
  });

  // Generator for hazards
  const hazardArbitrary = fc.record({
    id: fc.uuid(),
    type: fc.constantFrom('obstacle', 'uneven_surface', 'drop_off', 'unknown'),
    confidence: fc.double({ min: 0, max: 1, noNaN: true }),
    boundingBox: fc.record({
      x: fc.double({ min: 0, max: 1920, noNaN: true }),
      y: fc.double({ min: 0, max: 1080, noNaN: true }),
      width: fc.double({ min: 10, max: 500, noNaN: true }),
      height: fc.double({ min: 10, max: 500, noNaN: true }),
    }),
    worldPosition: fc.option(
      fc.record({
        latitude: fc.double({ min: -90, max: 90, noNaN: true }),
        longitude: fc.double({ min: -180, max: 180, noNaN: true }),
        distance: fc.double({ min: 0, max: 100, noNaN: true }),
      }),
      { nil: undefined }
    ),
  });

  it('Property 15: For any environmental change triggering rerouting, new route should be calculated within 2 seconds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(positionArbitrary, { minLength: 10, maxLength: 50 }),
        lightMetricsArbitrary,
        fc.array(hazardArbitrary, { maxLength: 10 }),
        async (positions, lightMetrics, hazards) => {
          // Build a graph
          const builder = new GraphBuilder();
          const nodes: NavigationNode[] = [];
          
          for (let i = 0; i < positions.length; i++) {
            const node: NavigationNode = {
              id: `node-${i}`,
              position: positions[i] as Position,
            };
            builder.addNode(node);
            nodes.push(node);
          }
          
          // Create edges
          for (let i = 0; i < nodes.length - 1; i++) {
            const edge: NavigationEdge = {
              id: `edge-${i}`,
              fromNodeId: nodes[i].id,
              toNodeId: nodes[i + 1].id,
              distance: 100,
              visibilityScore: 0.5,
              safetyScore: 0.5,
            };
            builder.addEdge(edge);
          }
          
          const graph = builder.getGraph();
          
          const config: PathfindingConfig = {
            maxGraphNodes: 10000,
            routeCalculationTimeoutMs: 3000,
            costWeights: {
              distance: 1,
              visibility: 1,
              safety: 1,
            },
          };
          
          const manager = new RerouteManager();
          
          const currentState: EnvironmentalState = {
            lightMetrics: lightMetrics as LightMetrics,
            hazards: hazards as HazardDetection[],
            timestamp: Date.now(),
          };
          
          // Measure reroute time
          const startTime = Date.now();
          
          const newRoute = await manager.reroute(
            positions[0] as Position,
            positions[positions.length - 1] as Position,
            graph,
            config,
            currentState
          );
          
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          // Should complete within 2 seconds (2000ms)
          return duration <= 2000;
        }
      ),
      { numRuns: 20 } // Reduced runs for performance tests
    );
  });

  it('Property 15 (variant): Rerouting should detect significant light changes', () => {
    fc.assert(
      fc.property(
        positionArbitrary,
        fc.double({ min: 0, max: 0.5, noNaN: true }),
        (position, initialLightLevel) => {
          const manager = new RerouteManager({
            lightChangeThreshold: 0.2,
          });
          
          // Set initial route
          manager.setCurrentRoute({
            nodes: [{ id: 'node-1', position: position as Position }],
            edges: [],
            totalDistance: 0,
            totalCost: 0,
            estimatedTimeSeconds: 0,
          });
          
          // Initial state
          const initialState: EnvironmentalState = {
            lightMetrics: {
              meanLuminance: 128,
              ambientLux: 50000,
              shadowCoverage: 0.5,
              unifiedLightLevel: initialLightLevel,
              timestamp: Date.now(),
            },
            hazards: [],
            timestamp: Date.now(),
          };
          
          // Significant light change
          const changedState: EnvironmentalState = {
            lightMetrics: {
              meanLuminance: 128,
              ambientLux: 50000,
              shadowCoverage: 0.5,
              unifiedLightLevel: initialLightLevel + 0.3, // Change > threshold
              timestamp: Date.now() + 10000,
            },
            hazards: [],
            timestamp: Date.now() + 10000,
          };
          
          // First call - should not reroute (no previous state)
          const shouldReroute1 = manager.shouldReroute(initialState, position as Position);
          
          // Wait for minimum interval
          const now = Date.now();
          while (Date.now() - now < 10) {
            // Small delay
          }
          
          // Second call - should reroute (significant change)
          const shouldReroute2 = manager.shouldReroute(changedState, position as Position);
          
          return shouldReroute1 === false && shouldReroute2 === true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 15 (variant): Rerouting should detect new hazards on route', () => {
    fc.assert(
      fc.property(
        fc.array(positionArbitrary, { minLength: 3, maxLength: 10 }),
        (positions) => {
          const manager = new RerouteManager({
            hazardProximityThreshold: 20,
          });
          
          // Create a route
          const nodes = positions.map((pos, i) => ({
            id: `node-${i}`,
            position: pos as Position,
          }));
          
          manager.setCurrentRoute({
            nodes,
            edges: [],
            totalDistance: 0,
            totalCost: 0,
            estimatedTimeSeconds: 0,
          });
          
          // Initial state with no hazards
          const initialState: EnvironmentalState = {
            lightMetrics: {
              meanLuminance: 128,
              ambientLux: 50000,
              shadowCoverage: 0.5,
              unifiedLightLevel: 0.5,
              timestamp: Date.now(),
            },
            hazards: [],
            timestamp: Date.now(),
          };
          
          // State with new hazard near route
          const hazardNearRoute: HazardDetection = {
            id: 'hazard-1',
            type: 'obstacle',
            confidence: 0.9,
            boundingBox: { x: 0, y: 0, width: 100, height: 100 },
            worldPosition: {
              latitude: (positions[1] as Position).latitude,
              longitude: (positions[1] as Position).longitude,
              distance: 10,
            },
          };
          
          const changedState: EnvironmentalState = {
            lightMetrics: {
              meanLuminance: 128,
              ambientLux: 50000,
              shadowCoverage: 0.5,
              unifiedLightLevel: 0.5,
              timestamp: Date.now() + 10000,
            },
            hazards: [hazardNearRoute],
            timestamp: Date.now() + 10000,
          };
          
          // First call
          manager.shouldReroute(initialState, positions[0] as Position);
          
          // Wait for minimum interval
          const now = Date.now();
          while (Date.now() - now < 10) {
            // Small delay
          }
          
          // Second call - should reroute (new hazard)
          const shouldReroute = manager.shouldReroute(changedState, positions[0] as Position);
          
          return shouldReroute === true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 15 (edge case): Should not reroute too frequently', () => {
    fc.assert(
      fc.property(
        positionArbitrary,
        lightMetricsArbitrary,
        (position, lightMetrics) => {
          const manager = new RerouteManager({
            minRerouteInterval: 5000,
          });
          
          manager.setCurrentRoute({
            nodes: [{ id: 'node-1', position: position as Position }],
            edges: [],
            totalDistance: 0,
            totalCost: 0,
            estimatedTimeSeconds: 0,
          });
          
          const state: EnvironmentalState = {
            lightMetrics: lightMetrics as LightMetrics,
            hazards: [],
            timestamp: Date.now(),
          };
          
          // First call
          manager.shouldReroute(state, position as Position);
          
          // Immediate second call - should not reroute (too soon)
          const shouldReroute = manager.shouldReroute(state, position as Position);
          
          return shouldReroute === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});
