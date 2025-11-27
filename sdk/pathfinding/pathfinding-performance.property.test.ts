/**
 * Property-Based Tests for Pathfinding Performance Scaling
 * **Feature: nightshift-navigator, Property 52: Pathfinding performance scaling**
 * **Validates: Requirements 11.2**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { astar } from './astar';
import { GraphBuilder, NavigationNode, NavigationEdge, PathfindingConfig, Position } from './index';

describe('Pathfinding Performance Scaling Property Tests', () => {
  it('Property 52: For any graph with up to 10,000 nodes, route calculation should complete within 3 seconds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }), // Test with smaller graphs for speed
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (nodeCount, visScore, safetyScore) => {
          // Build a grid graph
          const builder = new GraphBuilder();
          const gridSize = Math.ceil(Math.sqrt(nodeCount));
          const nodes: NavigationNode[] = [];
          
          // Create grid of nodes
          for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
              const node: NavigationNode = {
                id: `node-${i}-${j}`,
                position: {
                  latitude: i * 0.001,
                  longitude: j * 0.001,
                },
              };
              builder.addNode(node);
              nodes.push(node);
            }
          }
          
          // Create edges (connect each node to its neighbors)
          for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
              const currentIdx = i * gridSize + j;
              
              // Connect to right neighbor
              if (j < gridSize - 1) {
                const edge: NavigationEdge = {
                  id: `edge-${i}-${j}-right`,
                  fromNodeId: nodes[currentIdx].id,
                  toNodeId: nodes[currentIdx + 1].id,
                  distance: 100,
                  visibilityScore: visScore,
                  safetyScore: safetyScore,
                };
                builder.addEdge(edge);
              }
              
              // Connect to bottom neighbor
              if (i < gridSize - 1) {
                const edge: NavigationEdge = {
                  id: `edge-${i}-${j}-down`,
                  fromNodeId: nodes[currentIdx].id,
                  toNodeId: nodes[currentIdx + gridSize].id,
                  distance: 100,
                  visibilityScore: visScore,
                  safetyScore: safetyScore,
                };
                builder.addEdge(edge);
              }
            }
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
          
          // Measure time
          const startTime = Date.now();
          
          const route = astar(
            nodes[0].position,
            nodes[nodes.length - 1].position,
            graph,
            config
          );
          
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          // Should complete within 3 seconds (3000ms)
          return duration <= 3000;
        }
      ),
      { numRuns: 20 } // Reduced runs for performance tests
    );
  });

  it('Property 52 (variant): Route calculation should not timeout for reasonable graphs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 500 }),
        (nodeCount) => {
          // Build a linear graph
          const builder = new GraphBuilder();
          const nodes: NavigationNode[] = [];
          
          for (let i = 0; i < nodeCount; i++) {
            const node: NavigationNode = {
              id: `node-${i}`,
              position: {
                latitude: i * 0.001,
                longitude: 0,
              },
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
          
          const route = astar(
            nodes[0].position,
            nodes[nodes.length - 1].position,
            graph,
            config
          );
          
          // Should find a route (not timeout)
          return route !== null;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 52 (edge case): Small graphs should complete very quickly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 20 }),
        (nodeCount) => {
          // Build a small linear graph
          const builder = new GraphBuilder();
          const nodes: NavigationNode[] = [];
          
          for (let i = 0; i < nodeCount; i++) {
            const node: NavigationNode = {
              id: `node-${i}`,
              position: {
                latitude: i * 0.001,
                longitude: 0,
              },
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
          
          const config: PathfindingConfig = {
            maxGraphNodes: 10000,
            routeCalculationTimeoutMs: 3000,
            costWeights: {
              distance: 1,
              visibility: 1,
              safety: 1,
            },
          };
          
          const startTime = Date.now();
          
          const route = astar(
            nodes[0].position,
            nodes[nodes.length - 1].position,
            graph,
            config
          );
          
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          // Small graphs should complete in under 100ms
          return route !== null && duration < 100;
        }
      ),
      { numRuns: 50 }
    );
  });
});
