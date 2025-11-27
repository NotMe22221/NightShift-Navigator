/**
 * Plugin API Module
 * 
 * Provides external interface for third-party applications to contribute
 * map data and extend NightShift Navigator functionality.
 */

import { GraphBuilder, NavigationGraph } from '../pathfinding';
import { GeoJSONFeatureCollection, parseGeoJSON } from '../pathfinding/geojson-parser';

/**
 * Plugin configuration
 */
export interface PluginConfig {
  authenticationRequired: boolean;
  maxDataSizeMB: number;
  conflictResolution: 'priority' | 'merge' | 'reject';
}

/**
 * Plugin authentication credentials
 */
export interface PluginAuth {
  apiKey: string;
  appId: string;
}

/**
 * Map data submission from external plugin
 */
export interface MapDataSubmission {
  format: 'geojson';
  data: GeoJSONFeatureCollection;
  priority: number; // 0-10
  source: string;
  timestamp: number;
}

/**
 * Result of map data submission
 */
export interface SubmissionResult {
  success: boolean;
  message: string;
  nodesAdded: number;
  edgesAdded: number;
}

/**
 * Geographic bounds for querying map data
 */
export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Plugin API - External interface for third-party map data integration
 */
export class PluginAPI {
  private config: PluginConfig;
  private graphBuilder: GraphBuilder;
  private authenticatedApps: Map<string, PluginAuth>;
  private submissionMetadata: Map<string, { priority: number; source: string; timestamp: number }>;

  constructor(config: PluginConfig, graphBuilder: GraphBuilder) {
    this.config = config;
    this.graphBuilder = graphBuilder;
    this.authenticatedApps = new Map();
    this.submissionMetadata = new Map();
  }

  /**
   * Initialize the Plugin API
   */
  async initialize(): Promise<void> {
    // Initialization logic (if needed)
    return Promise.resolve();
  }

  /**
   * Authenticate a plugin application
   * 
   * @param auth - Authentication credentials
   * @returns Promise resolving to true if authenticated, false otherwise
   */
  async authenticate(auth: PluginAuth): Promise<boolean> {
    if (!this.config.authenticationRequired) {
      return true;
    }

    // Validate credentials
    if (!auth.apiKey || !auth.appId) {
      return false;
    }

    // Simple validation: API key must be at least 32 characters
    // App ID must be alphanumeric
    if (auth.apiKey.length < 32) {
      return false;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(auth.appId)) {
      return false;
    }

    // Store authenticated app
    this.authenticatedApps.set(auth.appId, auth);
    return true;
  }

  /**
   * Check if an app is authenticated
   */
  isAuthenticated(appId: string): boolean {
    if (!this.config.authenticationRequired) {
      return true;
    }
    return this.authenticatedApps.has(appId);
  }

  /**
   * Submit map data to the navigation system
   * 
   * @param submission - Map data submission
   * @returns Promise resolving to submission result
   */
  async submitMapData(submission: MapDataSubmission): Promise<SubmissionResult> {
    const startTime = Date.now();

    // Validate authentication
    if (this.config.authenticationRequired && !this.isAuthenticated(submission.source)) {
      return {
        success: false,
        message: 'Authentication required. Please authenticate before submitting data.',
        nodesAdded: 0,
        edgesAdded: 0,
      };
    }

    // Validate data size
    const dataSizeMB = this.estimateDataSize(submission.data);
    if (dataSizeMB > this.config.maxDataSizeMB) {
      return {
        success: false,
        message: `Data size (${dataSizeMB.toFixed(2)} MB) exceeds maximum allowed (${this.config.maxDataSizeMB} MB)`,
        nodesAdded: 0,
        edgesAdded: 0,
      };
    }

    // Validate GeoJSON format
    const validationErrors = this.validateGeoJSON(submission.data);
    if (validationErrors.length > 0) {
      return {
        success: false,
        message: `Validation failed: ${validationErrors.map(e => `${e.field}: ${e.message}`).join('; ')}`,
        nodesAdded: 0,
        edgesAdded: 0,
      };
    }

    // Parse GeoJSON and incorporate into graph
    try {
      const parsedData = parseGeoJSON(submission.data);
      
      // Get current graph size
      const beforeStats = this.graphBuilder.getStats();
      
      // Handle conflicts based on configuration
      const incorporated = await this.incorporateData(
        parsedData.nodes,
        parsedData.edges,
        submission
      );
      
      // Get new graph size
      const afterStats = this.graphBuilder.getStats();
      
      const incorporationTime = Date.now() - startTime;
      
      return {
        success: true,
        message: `Data incorporated successfully in ${incorporationTime}ms`,
        nodesAdded: afterStats.nodeCount - beforeStats.nodeCount,
        edgesAdded: afterStats.edgeCount - beforeStats.edgeCount,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to incorporate data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nodesAdded: 0,
        edgesAdded: 0,
      };
    }
  }

  /**
   * Query map data within geographic bounds
   * 
   * @param bounds - Geographic bounds
   * @returns Promise resolving to GeoJSON FeatureCollection
   */
  async queryMapData(bounds: GeoBounds): Promise<GeoJSONFeatureCollection> {
    const graph = this.graphBuilder.getGraph();
    const features: any[] = [];

    // Filter nodes within bounds
    for (const node of graph.nodes.values()) {
      const { latitude, longitude } = node.position;
      
      if (
        latitude >= bounds.south &&
        latitude <= bounds.north &&
        longitude >= bounds.west &&
        longitude <= bounds.east
      ) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          properties: node.metadata || {},
          id: node.id,
        });
      }
    }

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  /**
   * Estimate data size in MB
   */
  private estimateDataSize(data: any): number {
    const jsonString = JSON.stringify(data);
    const bytes = new Blob([jsonString]).size;
    return bytes / (1024 * 1024);
  }

  /**
   * Validate GeoJSON format
   */
  private validateGeoJSON(data: GeoJSONFeatureCollection): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check type
    if (data.type !== 'FeatureCollection') {
      errors.push({
        field: 'type',
        message: 'Must be "FeatureCollection"',
      });
      return errors;
    }

    // Check features array
    if (!Array.isArray(data.features)) {
      errors.push({
        field: 'features',
        message: 'Must be an array',
      });
      return errors;
    }

    // Validate each feature
    for (let i = 0; i < data.features.length; i++) {
      const feature = data.features[i];
      
      if (feature.type !== 'Feature') {
        errors.push({
          field: `features[${i}].type`,
          message: 'Must be "Feature"',
        });
      }

      if (!feature.geometry) {
        errors.push({
          field: `features[${i}].geometry`,
          message: 'Geometry is required',
        });
        continue;
      }

      // Validate geometry
      const geometryErrors = this.validateGeometry(feature.geometry, `features[${i}].geometry`);
      errors.push(...geometryErrors);
    }

    return errors;
  }

  /**
   * Validate geometry object
   */
  private validateGeometry(geometry: any, path: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const validTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];

    if (!validTypes.includes(geometry.type)) {
      errors.push({
        field: `${path}.type`,
        message: `Must be one of: ${validTypes.join(', ')}`,
      });
      return errors;
    }

    if (!geometry.coordinates) {
      errors.push({
        field: `${path}.coordinates`,
        message: 'Coordinates are required',
      });
      return errors;
    }

    // Validate coordinates based on type
    const coordErrors = this.validateCoordinates(geometry.coordinates, geometry.type, `${path}.coordinates`);
    errors.push(...coordErrors);

    return errors;
  }

  /**
   * Validate coordinates array
   */
  private validateCoordinates(coords: any, type: string, path: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!Array.isArray(coords)) {
      errors.push({
        field: path,
        message: 'Coordinates must be an array',
      });
      return errors;
    }

    switch (type) {
      case 'Point':
        if (!this.isValidCoordinate(coords)) {
          errors.push({
            field: path,
            message: 'Invalid coordinate format. Expected [longitude, latitude] or [longitude, latitude, altitude]',
          });
        }
        break;

      case 'LineString':
      case 'MultiPoint':
        if (coords.length < 2 && type === 'LineString') {
          errors.push({
            field: path,
            message: 'LineString must have at least 2 coordinates',
          });
        }
        for (let i = 0; i < coords.length; i++) {
          if (!this.isValidCoordinate(coords[i])) {
            errors.push({
              field: `${path}[${i}]`,
              message: 'Invalid coordinate format',
            });
          }
        }
        break;

      case 'Polygon':
      case 'MultiLineString':
        for (let i = 0; i < coords.length; i++) {
          if (!Array.isArray(coords[i])) {
            errors.push({
              field: `${path}[${i}]`,
              message: 'Must be an array of coordinates',
            });
            continue;
          }
          if (type === 'Polygon' && coords[i].length < 4) {
            errors.push({
              field: `${path}[${i}]`,
              message: 'Polygon ring must have at least 4 coordinates',
            });
          }
          for (let j = 0; j < coords[i].length; j++) {
            if (!this.isValidCoordinate(coords[i][j])) {
              errors.push({
                field: `${path}[${i}][${j}]`,
                message: 'Invalid coordinate format',
              });
            }
          }
        }
        break;

      case 'MultiPolygon':
        for (let i = 0; i < coords.length; i++) {
          if (!Array.isArray(coords[i])) {
            errors.push({
              field: `${path}[${i}]`,
              message: 'Must be an array of polygon rings',
            });
            continue;
          }
          for (let j = 0; j < coords[i].length; j++) {
            if (!Array.isArray(coords[i][j])) {
              errors.push({
                field: `${path}[${i}][${j}]`,
                message: 'Must be an array of coordinates',
              });
              continue;
            }
            if (coords[i][j].length < 4) {
              errors.push({
                field: `${path}[${i}][${j}]`,
                message: 'Polygon ring must have at least 4 coordinates',
              });
            }
            for (let k = 0; k < coords[i][j].length; k++) {
              if (!this.isValidCoordinate(coords[i][j][k])) {
                errors.push({
                  field: `${path}[${i}][${j}][${k}]`,
                  message: 'Invalid coordinate format',
                });
              }
            }
          }
        }
        break;
    }

    return errors;
  }

  /**
   * Check if a coordinate is valid
   */
  private isValidCoordinate(coord: any): boolean {
    if (!Array.isArray(coord)) {
      return false;
    }

    if (coord.length < 2 || coord.length > 3) {
      return false;
    }

    const [lon, lat, alt] = coord;

    // Validate longitude (-180 to 180)
    if (typeof lon !== 'number' || lon < -180 || lon > 180) {
      return false;
    }

    // Validate latitude (-90 to 90)
    if (typeof lat !== 'number' || lat < -90 || lat > 90) {
      return false;
    }

    // Validate altitude if present
    if (alt !== undefined && typeof alt !== 'number') {
      return false;
    }

    return true;
  }

  /**
   * Incorporate parsed data into the graph
   */
  private async incorporateData(
    nodes: any[],
    edges: any[],
    submission: MapDataSubmission
  ): Promise<void> {
    // Handle conflict resolution
    if (this.config.conflictResolution === 'reject') {
      // Check for conflicts
      const graph = this.graphBuilder.getGraph();
      for (const node of nodes) {
        if (graph.nodes.has(node.id)) {
          throw new Error(`Conflict detected: Node ${node.id} already exists`);
        }
      }
      for (const edge of edges) {
        if (graph.edges.has(edge.id)) {
          throw new Error(`Conflict detected: Edge ${edge.id} already exists`);
        }
      }
    }

    // Add nodes and edges
    for (const node of nodes) {
      if (this.config.conflictResolution === 'priority') {
        // Check if node exists and compare priorities
        const existingMetadata = this.submissionMetadata.get(node.id);
        if (existingMetadata && existingMetadata.priority > submission.priority) {
          continue; // Skip this node, existing has higher priority
        }
      }

      this.graphBuilder.addNode(node);
      this.submissionMetadata.set(node.id, {
        priority: submission.priority,
        source: submission.source,
        timestamp: submission.timestamp,
      });
    }

    for (const edge of edges) {
      if (this.config.conflictResolution === 'priority') {
        // Check if edge exists and compare priorities
        const existingMetadata = this.submissionMetadata.get(edge.id);
        if (existingMetadata && existingMetadata.priority > submission.priority) {
          continue; // Skip this edge, existing has higher priority
        }
      }

      this.graphBuilder.addEdge(edge);
      this.submissionMetadata.set(edge.id, {
        priority: submission.priority,
        source: submission.source,
        timestamp: submission.timestamp,
      });
    }

    // Validate graph integrity
    if (!this.graphBuilder.validateGraph()) {
      throw new Error('Graph validation failed after data incorporation');
    }
  }

  /**
   * Get submission metadata for a node or edge
   */
  getSubmissionMetadata(id: string): { priority: number; source: string; timestamp: number } | undefined {
    return this.submissionMetadata.get(id);
  }

  /**
   * Clear all submission metadata
   */
  clearMetadata(): void {
    this.submissionMetadata.clear();
  }
}
