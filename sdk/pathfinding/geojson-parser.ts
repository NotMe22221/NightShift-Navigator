/**
 * GeoJSON Parser for Map Data
 * 
 * Parses GeoJSON FeatureCollection into navigation graph nodes and edges.
 */

import { NavigationNode, NavigationEdge, Position } from './index';

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: GeoJSONGeometry;
  properties?: Record<string, any>;
  id?: string | number;
}

export type GeoJSONGeometry =
  | GeoJSONPoint
  | GeoJSONLineString
  | GeoJSONPolygon
  | GeoJSONMultiPoint
  | GeoJSONMultiLineString
  | GeoJSONMultiPolygon;

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number] | [number, number, number];
}

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: Array<[number, number] | [number, number, number]>;
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: Array<Array<[number, number] | [number, number, number]>>;
}

export interface GeoJSONMultiPoint {
  type: 'MultiPoint';
  coordinates: Array<[number, number] | [number, number, number]>;
}

export interface GeoJSONMultiLineString {
  type: 'MultiLineString';
  coordinates: Array<Array<[number, number] | [number, number, number]>>;
}

export interface GeoJSONMultiPolygon {
  type: 'MultiPolygon';
  coordinates: Array<Array<Array<[number, number] | [number, number, number]>>>;
}

export interface ParsedGraphData {
  nodes: NavigationNode[];
  edges: NavigationEdge[];
}

/**
 * Calculate distance between two positions using Haversine formula
 */
function calculateDistance(pos1: Position, pos2: Position): number {
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
 * Generate a unique ID for a position
 */
function generateNodeId(lon: number, lat: number): string {
  return `node_${lon.toFixed(6)}_${lat.toFixed(6)}`;
}

/**
 * Convert GeoJSON coordinates to Position
 */
function coordinatesToPosition(coords: [number, number] | [number, number, number]): Position {
  return {
    longitude: coords[0],
    latitude: coords[1],
    altitude: coords[2],
  };
}

/**
 * Parse GeoJSON FeatureCollection into graph nodes and edges
 */
export function parseGeoJSON(geoJSON: GeoJSONFeatureCollection): ParsedGraphData {
  const nodesMap = new Map<string, NavigationNode>();
  const edges: NavigationEdge[] = [];

  for (const feature of geoJSON.features) {
    const geometry = feature.geometry;
    const properties = feature.properties || {};

    switch (geometry.type) {
      case 'Point':
        parsePoint(geometry, properties, nodesMap);
        break;
      case 'LineString':
        parseLineString(geometry, properties, nodesMap, edges);
        break;
      case 'Polygon':
        parsePolygon(geometry, properties, nodesMap, edges);
        break;
      case 'MultiPoint':
        parseMultiPoint(geometry, properties, nodesMap);
        break;
      case 'MultiLineString':
        parseMultiLineString(geometry, properties, nodesMap, edges);
        break;
      case 'MultiPolygon':
        parseMultiPolygon(geometry, properties, nodesMap, edges);
        break;
    }
  }

  return {
    nodes: Array.from(nodesMap.values()),
    edges,
  };
}

function parsePoint(
  geometry: GeoJSONPoint,
  properties: Record<string, any>,
  nodesMap: Map<string, NavigationNode>
): void {
  const position = coordinatesToPosition(geometry.coordinates);
  const nodeId = generateNodeId(position.longitude, position.latitude);

  if (!nodesMap.has(nodeId)) {
    nodesMap.set(nodeId, {
      id: nodeId,
      position,
      metadata: properties,
    });
  }
}

function parseLineString(
  geometry: GeoJSONLineString,
  properties: Record<string, any>,
  nodesMap: Map<string, NavigationNode>,
  edges: NavigationEdge[]
): void {
  const coordinates = geometry.coordinates;

  for (let i = 0; i < coordinates.length; i++) {
    const position = coordinatesToPosition(coordinates[i]);
    const nodeId = generateNodeId(position.longitude, position.latitude);

    if (!nodesMap.has(nodeId)) {
      nodesMap.set(nodeId, {
        id: nodeId,
        position,
        metadata: {},
      });
    }

    // Create edge to next point
    if (i < coordinates.length - 1) {
      const nextPosition = coordinatesToPosition(coordinates[i + 1]);
      const nextNodeId = generateNodeId(nextPosition.longitude, nextPosition.latitude);

      const distance = calculateDistance(position, nextPosition);

      edges.push({
        id: `edge_${nodeId}_${nextNodeId}`,
        fromNodeId: nodeId,
        toNodeId: nextNodeId,
        distance,
        visibilityScore: 0.5, // Default value
        safetyScore: 0.5, // Default value
        metadata: properties,
      });
    }
  }
}

function parsePolygon(
  geometry: GeoJSONPolygon,
  properties: Record<string, any>,
  nodesMap: Map<string, NavigationNode>,
  edges: NavigationEdge[]
): void {
  // Parse each ring as a LineString
  for (const ring of geometry.coordinates) {
    parseLineString(
      { type: 'LineString', coordinates: ring },
      properties,
      nodesMap,
      edges
    );
  }
}

function parseMultiPoint(
  geometry: GeoJSONMultiPoint,
  properties: Record<string, any>,
  nodesMap: Map<string, NavigationNode>
): void {
  for (const coords of geometry.coordinates) {
    parsePoint({ type: 'Point', coordinates: coords }, properties, nodesMap);
  }
}

function parseMultiLineString(
  geometry: GeoJSONMultiLineString,
  properties: Record<string, any>,
  nodesMap: Map<string, NavigationNode>,
  edges: NavigationEdge[]
): void {
  for (const lineCoords of geometry.coordinates) {
    parseLineString(
      { type: 'LineString', coordinates: lineCoords },
      properties,
      nodesMap,
      edges
    );
  }
}

function parseMultiPolygon(
  geometry: GeoJSONMultiPolygon,
  properties: Record<string, any>,
  nodesMap: Map<string, NavigationNode>,
  edges: NavigationEdge[]
): void {
  for (const polygonCoords of geometry.coordinates) {
    parsePolygon(
      { type: 'Polygon', coordinates: polygonCoords },
      properties,
      nodesMap,
      edges
    );
  }
}
