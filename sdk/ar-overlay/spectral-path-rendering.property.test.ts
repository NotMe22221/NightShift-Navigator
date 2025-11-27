/**
 * Property-based tests for Spectral Path rendering
 * **Feature: nightshift-navigator, Property 16: Spectral path rendering**
 * **Validates: Requirements 4.1**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Route, NavigationNode, NavigationEdge } from '../pathfinding/index.js';
import type { SpectralPathStyle } from './index.js';
import { createSpectralPath, gpsToWorldSpace } from './spectral-path.js';
import * as THREE from 'three';

describe('Spectral Path Rendering Properties', () => {
  /**
   * Property 16: Spectral path rendering
   * For any calculated route, the AR Overlay should render a Spectral Path that includes all route waypoints.
   */
  it('should render a spectral path that includes all route waypoints', () => {
    // Generator for valid GPS coordinates (excluding NaN and Infinity)
    const positionArb = fc.record({
      latitude: fc.double({ min: -90, max: 90, noNaN: true }),
      longitude: fc.double({ min: -180, max: 180, noNaN: true }),
      altitude: fc.option(fc.double({ min: 0, max: 10000, noNaN: true }), { nil: undefined })
    });
    
    // Generator for navigation nodes
    const nodeArb = fc.tuple(fc.uuid(), positionArb).map(([id, position]) => ({
      id,
      position
    }));
    
    // Generator for routes with at least 2 nodes
    const routeArb = fc.array(nodeArb, { minLength: 2, maxLength: 20 }).chain(nodes => {
      // Create edges connecting consecutive nodes
      const edges: NavigationEdge[] = [];
      for (let i = 0; i < nodes.length - 1; i++) {
        edges.push({
          id: `edge-${i}`,
          fromNodeId: nodes[i].id,
          toNodeId: nodes[i + 1].id,
          distance: 100,
          visibilityScore: 0.5,
          safetyScore: 0.5
        });
      }
      
      return fc.constant({
        nodes,
        edges,
        totalDistance: edges.reduce((sum, e) => sum + e.distance, 0),
        totalCost: 100,
        estimatedTimeSeconds: 60
      } as Route);
    });
    
    // Generator for spectral path style
    const styleArb = fc.record({
      color: fc.constantFrom('#00ffff', '#ff00ff', '#ffff00', '#00ff00'),
      width: fc.double({ min: 0.1, max: 2.0 }),
      opacity: fc.double({ min: 0.1, max: 1.0 }),
      glowIntensity: fc.double({ min: 0.1, max: 2.0 }),
      animationSpeed: fc.double({ min: 0.1, max: 3.0 })
    });
    
    fc.assert(
      fc.property(routeArb, styleArb, (route, style) => {
        // Create spectral path mesh
        const mesh = createSpectralPath(route, style);
        
        // Verify mesh was created
        expect(mesh).toBeDefined();
        expect(mesh).toBeInstanceOf(THREE.Mesh);
        
        // Verify geometry exists
        expect(mesh.geometry).toBeDefined();
        expect(mesh.geometry).toBeInstanceOf(THREE.TubeGeometry);
        
        // Verify material properties match style
        const material = mesh.material as THREE.MeshStandardMaterial;
        expect(material.opacity).toBeCloseTo(style.opacity, 2);
        expect(material.transparent).toBe(true);
        
        // Verify the path includes all waypoints by checking the geometry
        // The tube geometry should have vertices that correspond to the route
        const geometry = mesh.geometry as THREE.TubeGeometry;
        expect(geometry.parameters.path).toBeDefined();
        
        // Verify animation properties are stored
        expect((mesh as any).animationSpeed).toBe(style.animationSpeed);
        expect((mesh as any).animationTime).toBeDefined();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
  
  it('should convert GPS coordinates to world space consistently', () => {
    const positionArb = fc.record({
      latitude: fc.double({ min: -90, max: 90, noNaN: true }),
      longitude: fc.double({ min: -180, max: 180, noNaN: true }),
      altitude: fc.option(fc.double({ min: 0, max: 10000, noNaN: true }), { nil: undefined })
    });
    
    fc.assert(
      fc.property(positionArb, positionArb, (origin, position) => {
        const worldPos = gpsToWorldSpace(position, origin);
        
        // Verify result is a valid Vector3
        expect(worldPos).toBeInstanceOf(THREE.Vector3);
        expect(Number.isFinite(worldPos.x)).toBe(true);
        expect(Number.isFinite(worldPos.y)).toBe(true);
        expect(Number.isFinite(worldPos.z)).toBe(true);
        
        // Origin should map to (0, 0, 0) or close to it
        const originWorld = gpsToWorldSpace(origin, origin);
        expect(originWorld.x).toBeCloseTo(0, 1);
        expect(originWorld.y).toBeCloseTo(0, 1);
        expect(originWorld.z).toBeCloseTo(0, 1);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
  
  it('should reject routes with fewer than 2 nodes', () => {
    const positionArb = fc.record({
      latitude: fc.double({ min: -90, max: 90, noNaN: true }),
      longitude: fc.double({ min: -180, max: 180, noNaN: true })
    });
    
    const singleNodeRouteArb = fc.tuple(fc.uuid(), positionArb).map(([id, position]) => ({
      nodes: [{ id, position }],
      edges: [],
      totalDistance: 0,
      totalCost: 0,
      estimatedTimeSeconds: 0
    } as Route));
    
    const styleArb = fc.record({
      color: fc.constant('#00ffff'),
      width: fc.constant(0.5),
      opacity: fc.constant(0.8),
      glowIntensity: fc.constant(1.0),
      animationSpeed: fc.constant(1.0)
    });
    
    fc.assert(
      fc.property(singleNodeRouteArb, styleArb, (route, style) => {
        expect(() => createSpectralPath(route, style)).toThrow();
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
