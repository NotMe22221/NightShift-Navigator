/**
 * Property-Based Tests for Cost Function Application
 * **Feature: nightshift-navigator, Property 14: Cost function application**
 * **Validates: Requirements 3.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { astar } from './astar';
import { GraphBuilder, NavigationNode, NavigationEdge, PathfindingConfig, Position } from './index';

describe('Cost Function Application Property Tests', () => {
  // Generator for positions
  const positionArbitrary = fc.record({
    latitude: fc.double({ min: -90, max: 90, noNaN: true }),
    longitude: fc.double({ min: -180, max: 180, noNaN: true }),
  });

  // Generator for pathfinding config
  const configArbitrary = fc.record({
    maxGraphNodes: fc.constant(10000),
    routeCalculationTimeoutMs: fc.constant(3000),
    costWeights: fc.record({
      distance: fc.double({ min: 0, max: 2, noNaN: true }),
      visibility: fc.double({ min: 0, max: 2, noNaN: true }),
      safety: fc.double({ min: 0, max: 2, noNaN: true }),
    }),
  });

  it('Property 14: For any route calculation, total cost should equal sum of weighted components', () => {
    fc.assert(
      fc.property(
        configArbitrary,
        fc.array(positionArbitrary, { minLength: 3, maxLength: 10 }),
        (config, positions) => {
          // Build a simple linear graph
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
          
          // Create edges between consecutive nodes
          for (let i = 0; i < nodes.length - 1; i++) {
            const edge: NavigationEdge = {
              id: `edge-${i}`,
              fromNodeId: nodes[i].id,
              toNodeId: nodes[i + 1].id,
              distance: 100,
              visibilityScore: 0.7,
              safetyScore: 0.8,
            };
            builder.addEdge(edge);
          }
          
          const graph = builder.getGraph();
          
          // Calculate route
          const route = astar(
            positions[0] as Position,
            positions[positions.length - 1] as Position,
            graph,
            config as PathfindingConfig
          );
          
          if (!route) {
            return true; // No route found is acceptable
          }
          
          // Manually calculate expected cost
          let expectedCost = 0;
          for (const edge of route.edges) {
            const edgeCost =
              config.costWeights.distance * edge.distance +
              config.costWeights.visibility * (1 - edge.visibilityScore) * edge.distance +
              config.costWeights.safety * (1 - edge.safetyScore) * edge.distance;
            expectedCost += edgeCost;
          }
          
          // Allow small floating point error
          const tolerance = 0.01;
          return Math.abs(route.totalCost - expectedCost) < tolerance;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14 (variant): Cost should increase with distance weight', () => {
    fc.assert(
      fc.property(
        fc.array(positionArbitrary, { minLength: 3, maxLength: 5 }),
        fc.double({ min: 0.1, max: 1, noNaN: true }),
        fc.double({ min: 0.1, max: 1, noNaN: true }),
        (positions, visWeight, safetyWeight) => {
          // Build graph
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
          
          // Calculate with low distance weight
          const config1: PathfindingConfig = {
            maxGraphNodes: 10000,
            routeCalculationTimeoutMs: 3000,
            costWeights: {
              distance: 0.5,
              visibility: visWeight,
              safety: safetyWeight,
            },
          };
          
          // Calculate with high distance weight
          const config2: PathfindingConfig = {
            maxGraphNodes: 10000,
            routeCalculationTimeoutMs: 3000,
            costWeights: {
              distance: 1.5,
              visibility: visWeight,
              safety: safetyWeight,
            },
          };
          
          const route1 = astar(
            positions[0] as Position,
            positions[positions.length - 1] as Position,
            graph,
            config1
          );
          
          const route2 = astar(
            positions[0] as Position,
            positions[positions.length - 1] as Position,
            graph,
            config2
          );
          
          if (!route1 || !route2) {
            return true;
          }
          
          // Higher distance weight should give higher cost
          return route2.totalCost >= route1.totalCost;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14 (variant): Cost should increase with visibility weight when visibility is low', () => {
    fc.assert(
      fc.property(
        fc.array(positionArbitrary, { minLength: 3, maxLength: 5 }),
        fc.double({ min: 0.1, max: 1, noNaN: true }),
        fc.double({ min: 0.1, max: 1, noNaN: true }),
        (positions, distWeight, safetyWeight) => {
          // Build graph with low visibility
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
          
          for (let i = 0; i < nodes.length - 1; i++) {
            const edge: NavigationEdge = {
              id: `edge-${i}`,
              fromNodeId: nodes[i].id,
              toNodeId: nodes[i + 1].id,
              distance: 100,
              visibilityScore: 0.2, // Low visibility
              safetyScore: 0.8,
            };
            builder.addEdge(edge);
          }
          
          const graph = builder.getGraph();
          
          // Calculate with low visibility weight
          const config1: PathfindingConfig = {
            maxGraphNodes: 10000,
            routeCalculationTimeoutMs: 3000,
            costWeights: {
              distance: distWeight,
              visibility: 0.5,
              safety: safetyWeight,
            },
          };
          
          // Calculate with high visibility weight
          const config2: PathfindingConfig = {
            maxGraphNodes: 10000,
            routeCalculationTimeoutMs: 3000,
            costWeights: {
              distance: distWeight,
              visibility: 1.5,
              safety: safetyWeight,
            },
          };
          
          const route1 = astar(
            positions[0] as Position,
            positions[positions.length - 1] as Position,
            graph,
            config1
          );
          
          const route2 = astar(
            positions[0] as Position,
            positions[positions.length - 1] as Position,
            graph,
            config2
          );
          
          if (!route1 || !route2) {
            return true;
          }
          
          // Higher visibility weight should give higher cost when visibility is low
          return route2.totalCost >= route1.totalCost;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14 (edge case): Zero weights should give zero cost', () => {
    fc.assert(
      fc.property(
        fc.array(positionArbitrary, { minLength: 3, maxLength: 5 }),
        (positions) => {
          // Build graph
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
          
          // Calculate with zero weights
          const config: PathfindingConfig = {
            maxGraphNodes: 10000,
            routeCalculationTimeoutMs: 3000,
            costWeights: {
              distance: 0,
              visibility: 0,
              safety: 0,
            },
          };
          
          const route = astar(
            positions[0] as Position,
            positions[positions.length - 1] as Position,
            graph,
            config
          );
          
          if (!route) {
            return true;
          }
          
          // Cost should be zero or very close to zero
          return Math.abs(route.totalCost) < 0.01;
        }
      ),
      { numRuns: 100 }
    );
  });
});
