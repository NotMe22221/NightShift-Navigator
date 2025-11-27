/**
 * Property-Based Tests for Graph Construction Validity
 * **Feature: nightshift-navigator, Property 11: Graph construction validity**
 * **Validates: Requirements 3.1**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { GraphBuilder, NavigationNode, NavigationEdge } from './index';

describe('Graph Construction Validity Property Tests', () => {
  it('Property 11: For any valid graph data, all edges should reference existing nodes', () => {
    // Generator for navigation nodes
    const nodeArbitrary = fc.record({
      id: fc.uuid(),
      position: fc.record({
        latitude: fc.double({ min: -90, max: 90 }),
        longitude: fc.double({ min: -180, max: 180 }),
      }),
    });

    // Generator for a set of nodes
    const nodesArbitrary = fc.array(nodeArbitrary, { minLength: 2, maxLength: 50 });

    // Generator for edges that reference existing nodes
    const graphArbitrary = nodesArbitrary.chain((nodes) => {
      const nodeIds = nodes.map((n) => n.id);
      
      const edgeArbitrary = fc.record({
        id: fc.uuid(),
        fromNodeId: fc.constantFrom(...nodeIds),
        toNodeId: fc.constantFrom(...nodeIds),
        distance: fc.double({ min: 0, max: 10000 }),
        visibilityScore: fc.double({ min: 0, max: 1 }),
        safetyScore: fc.double({ min: 0, max: 1 }),
      });

      return fc.record({
        nodes: fc.constant(nodes),
        edges: fc.array(edgeArbitrary, { minLength: 0, maxLength: 100 }),
      });
    });

    fc.assert(
      fc.property(graphArbitrary, (graphData) => {
        const builder = new GraphBuilder();

        // Add all nodes
        for (const node of graphData.nodes) {
          builder.addNode(node as NavigationNode);
        }

        // Add all edges
        for (const edge of graphData.edges) {
          builder.addEdge(edge as NavigationEdge);
        }

        // Validate: all edges should reference existing nodes
        const graph = builder.getGraph();
        
        for (const edge of graph.edges.values()) {
          if (!graph.nodes.has(edge.fromNodeId) || !graph.nodes.has(edge.toNodeId)) {
            return false;
          }
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 11 (variant): validateGraph() should return true for valid graphs', () => {
    const nodeArbitrary = fc.record({
      id: fc.uuid(),
      position: fc.record({
        latitude: fc.double({ min: -90, max: 90 }),
        longitude: fc.double({ min: -180, max: 180 }),
      }),
    });

    const nodesArbitrary = fc.array(nodeArbitrary, { minLength: 2, maxLength: 50 });

    const graphArbitrary = nodesArbitrary.chain((nodes) => {
      const nodeIds = nodes.map((n) => n.id);
      
      const edgeArbitrary = fc.record({
        id: fc.uuid(),
        fromNodeId: fc.constantFrom(...nodeIds),
        toNodeId: fc.constantFrom(...nodeIds),
        distance: fc.double({ min: 0, max: 10000 }),
        visibilityScore: fc.double({ min: 0, max: 1 }),
        safetyScore: fc.double({ min: 0, max: 1 }),
      });

      return fc.record({
        nodes: fc.constant(nodes),
        edges: fc.array(edgeArbitrary, { minLength: 0, maxLength: 100 }),
      });
    });

    fc.assert(
      fc.property(graphArbitrary, (graphData) => {
        const builder = new GraphBuilder();

        for (const node of graphData.nodes) {
          builder.addNode(node as NavigationNode);
        }

        for (const edge of graphData.edges) {
          builder.addEdge(edge as NavigationEdge);
        }

        // validateGraph should return true for properly constructed graphs
        return builder.validateGraph() === true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 11 (edge case): validateGraph() should return false when edges reference non-existent nodes', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          position: fc.record({
            latitude: fc.double({ min: -90, max: 90 }),
            longitude: fc.double({ min: -180, max: 180 }),
          }),
        }),
        fc.record({
          id: fc.uuid(),
          fromNodeId: fc.uuid(),
          toNodeId: fc.uuid(),
          distance: fc.double({ min: 0, max: 10000 }),
          visibilityScore: fc.double({ min: 0, max: 1 }),
          safetyScore: fc.double({ min: 0, max: 1 }),
        }),
        (node, edge) => {
          const builder = new GraphBuilder();
          
          // Add only one node
          builder.addNode(node as NavigationNode);
          
          // Add edge that references non-existent nodes
          builder.addEdge(edge as NavigationEdge);
          
          // Should return false since edge references non-existent nodes
          return builder.validateGraph() === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 11 (edge case): removing a node should invalidate edges connected to it', () => {
    const nodeArbitrary = fc.record({
      id: fc.uuid(),
      position: fc.record({
        latitude: fc.double({ min: -90, max: 90 }),
        longitude: fc.double({ min: -180, max: 180 }),
      }),
    });

    const nodesArbitrary = fc.array(nodeArbitrary, { minLength: 3, maxLength: 20 });

    fc.assert(
      fc.property(nodesArbitrary, (nodes) => {
        const builder = new GraphBuilder();

        // Add all nodes
        for (const node of nodes) {
          builder.addNode(node as NavigationNode);
        }

        // Create edges between consecutive nodes
        for (let i = 0; i < nodes.length - 1; i++) {
          builder.addEdge({
            id: `edge-${i}`,
            fromNodeId: nodes[i].id,
            toNodeId: nodes[i + 1].id,
            distance: 100,
            visibilityScore: 0.5,
            safetyScore: 0.5,
          });
        }

        // Graph should be valid before removal
        const validBefore = builder.validateGraph();

        // Remove a middle node
        const nodeToRemove = nodes[Math.floor(nodes.length / 2)];
        builder.removeNode(nodeToRemove.id);

        // Graph should still be valid (removeNode should clean up connected edges)
        const validAfter = builder.validateGraph();

        return validBefore === true && validAfter === true;
      }),
      { numRuns: 100 }
    );
  });
});
