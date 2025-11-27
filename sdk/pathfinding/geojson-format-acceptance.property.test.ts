/**
 * Property-Based Tests for GeoJSON Format Acceptance
 * **Feature: nightshift-navigator, Property 31: GeoJSON format acceptance**
 * **Validates: Requirements 7.1**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseGeoJSON, GeoJSONFeatureCollection } from './geojson-parser';

describe('GeoJSON Format Acceptance Property Tests', () => {
  // Generator for valid coordinates
  const coordinateArbitrary = fc.tuple(
    fc.double({ min: -180, max: 180 }), // longitude
    fc.double({ min: -90, max: 90 })    // latitude
  );

  const coordinate3DArbitrary = fc.tuple(
    fc.double({ min: -180, max: 180 }), // longitude
    fc.double({ min: -90, max: 90 }),   // latitude
    fc.double({ min: -1000, max: 10000 }) // altitude
  );

  // Generator for Point geometry
  const pointGeometryArbitrary = fc.record({
    type: fc.constant('Point' as const),
    coordinates: fc.oneof(coordinateArbitrary, coordinate3DArbitrary),
  });

  // Generator for LineString geometry
  const lineStringGeometryArbitrary = fc.record({
    type: fc.constant('LineString' as const),
    coordinates: fc.array(
      fc.oneof(coordinateArbitrary, coordinate3DArbitrary),
      { minLength: 2, maxLength: 20 }
    ),
  });

  // Generator for Polygon geometry
  const polygonGeometryArbitrary = fc.record({
    type: fc.constant('Polygon' as const),
    coordinates: fc.array(
      fc.array(
        fc.oneof(coordinateArbitrary, coordinate3DArbitrary),
        { minLength: 4, maxLength: 20 }
      ),
      { minLength: 1, maxLength: 5 }
    ),
  });

  // Generator for MultiPoint geometry
  const multiPointGeometryArbitrary = fc.record({
    type: fc.constant('MultiPoint' as const),
    coordinates: fc.array(
      fc.oneof(coordinateArbitrary, coordinate3DArbitrary),
      { minLength: 1, maxLength: 20 }
    ),
  });

  // Generator for MultiLineString geometry
  const multiLineStringGeometryArbitrary = fc.record({
    type: fc.constant('MultiLineString' as const),
    coordinates: fc.array(
      fc.array(
        fc.oneof(coordinateArbitrary, coordinate3DArbitrary),
        { minLength: 2, maxLength: 20 }
      ),
      { minLength: 1, maxLength: 10 }
    ),
  });

  // Generator for MultiPolygon geometry
  const multiPolygonGeometryArbitrary = fc.record({
    type: fc.constant('MultiPolygon' as const),
    coordinates: fc.array(
      fc.array(
        fc.array(
          fc.oneof(coordinateArbitrary, coordinate3DArbitrary),
          { minLength: 4, maxLength: 20 }
        ),
        { minLength: 1, maxLength: 5 }
      ),
      { minLength: 1, maxLength: 5 }
    ),
  });

  // Generator for any geometry type
  const geometryArbitrary = fc.oneof(
    pointGeometryArbitrary,
    lineStringGeometryArbitrary,
    polygonGeometryArbitrary,
    multiPointGeometryArbitrary,
    multiLineStringGeometryArbitrary,
    multiPolygonGeometryArbitrary
  );

  // Generator for GeoJSON Feature
  const featureArbitrary = fc.record({
    type: fc.constant('Feature' as const),
    geometry: geometryArbitrary,
    properties: fc.option(
      fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.double())),
      { nil: undefined }
    ),
    id: fc.option(fc.oneof(fc.string(), fc.integer()), { nil: undefined }),
  });

  // Generator for GeoJSON FeatureCollection
  const featureCollectionArbitrary = fc.record({
    type: fc.constant('FeatureCollection' as const),
    features: fc.array(featureArbitrary, { minLength: 0, maxLength: 20 }),
  });

  it('Property 31: For any valid GeoJSON FeatureCollection, parsing should succeed without errors', () => {
    fc.assert(
      fc.property(featureCollectionArbitrary, (geoJSON) => {
        // Parsing should not throw an error
        let parseSucceeded = false;
        try {
          const result = parseGeoJSON(geoJSON as GeoJSONFeatureCollection);
          parseSucceeded = true;
          
          // Result should have nodes and edges arrays
          expect(Array.isArray(result.nodes)).toBe(true);
          expect(Array.isArray(result.edges)).toBe(true);
        } catch (error) {
          // Should not throw
          parseSucceeded = false;
        }
        
        return parseSucceeded;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 31 (variant): Parsed nodes should have valid positions', () => {
    fc.assert(
      fc.property(featureCollectionArbitrary, (geoJSON) => {
        const result = parseGeoJSON(geoJSON as GeoJSONFeatureCollection);
        
        // All nodes should have valid latitude and longitude
        for (const node of result.nodes) {
          if (
            typeof node.position.latitude !== 'number' ||
            typeof node.position.longitude !== 'number' ||
            node.position.latitude < -90 ||
            node.position.latitude > 90 ||
            node.position.longitude < -180 ||
            node.position.longitude > 180
          ) {
            return false;
          }
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 31 (variant): Parsed edges should reference existing nodes', () => {
    fc.assert(
      fc.property(featureCollectionArbitrary, (geoJSON) => {
        const result = parseGeoJSON(geoJSON as GeoJSONFeatureCollection);
        
        const nodeIds = new Set(result.nodes.map((n) => n.id));
        
        // All edges should reference existing nodes
        for (const edge of result.edges) {
          if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) {
            return false;
          }
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 31 (variant): Point features should create nodes', () => {
    fc.assert(
      fc.property(
        fc.array(pointGeometryArbitrary, { minLength: 1, maxLength: 10 }),
        (geometries) => {
          const geoJSON: GeoJSONFeatureCollection = {
            type: 'FeatureCollection',
            features: geometries.map((geometry) => ({
              type: 'Feature',
              geometry: geometry as any,
            })),
          };
          
          const result = parseGeoJSON(geoJSON);
          
          // Should have at least one node
          return result.nodes.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 31 (variant): LineString features should create nodes and edges', () => {
    fc.assert(
      fc.property(
        fc.array(lineStringGeometryArbitrary, { minLength: 1, maxLength: 5 }),
        (geometries) => {
          const geoJSON: GeoJSONFeatureCollection = {
            type: 'FeatureCollection',
            features: geometries.map((geometry) => ({
              type: 'Feature',
              geometry: geometry as any,
            })),
          };
          
          const result = parseGeoJSON(geoJSON);
          
          // Should have nodes and edges
          return result.nodes.length > 0 && result.edges.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 31 (edge case): Empty FeatureCollection should parse successfully', () => {
    const emptyGeoJSON: GeoJSONFeatureCollection = {
      type: 'FeatureCollection',
      features: [],
    };
    
    const result = parseGeoJSON(emptyGeoJSON);
    
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });
});
