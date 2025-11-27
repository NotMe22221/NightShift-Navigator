/**
 * Pathfinding Engine Module
 * 
 * Provides navigation graph construction, pathfinding algorithms,
 * and dynamic rerouting capabilities for NightShift Navigator.
 */

export * from './geojson-parser';
export * from './scoring';
export * from './astar';
export * from './rerouting';
export * from './map-cache';
export * from './offline-routing';

export interface Position {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
}

export interface NavigationNode {
  id: string;
  position: Position;
  metadata?: Record<string, any>;
}

export interface NavigationEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  distance: number; // meters
  visibilityScore: number; // 0-1
  safetyScore: number; // 0-1
  metadata?: Record<string, any>;
}

export interface NavigationGraph {
  nodes: Map<string, NavigationNode>;
  edges: Map<string, NavigationEdge>;
}

export interface Route {
  nodes: NavigationNode[];
  edges: NavigationEdge[];
  totalDistance: number;
  totalCost: number;
  estimatedTimeSeconds: number;
}

export interface PathfindingConfig {
  maxGraphNodes: number; // maximum 10,000
  routeCalculationTimeoutMs: number; // maximum 3000
  costWeights: {
    distance: number;
    visibility: number;
    safety: number;
  };
}

/**
 * GraphBuilder - Constructs and manages navigation graphs
 */
export class GraphBuilder {
  private nodes: Map<string, NavigationNode>;
  private edges: Map<string, NavigationEdge>;

  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
  }

  /**
   * Add a node to the graph
   */
  addNode(node: NavigationNode): void {
    this.nodes.set(node.id, node);
  }

  /**
   * Add an edge to the graph
   */
  addEdge(edge: NavigationEdge): void {
    this.edges.set(edge.id, edge);
  }

  /**
   * Remove a node from the graph
   */
  removeNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    // Remove all edges connected to this node
    for (const [edgeId, edge] of this.edges.entries()) {
      if (edge.fromNodeId === nodeId || edge.toNodeId === nodeId) {
        this.edges.delete(edgeId);
      }
    }
  }

  /**
   * Remove an edge from the graph
   */
  removeEdge(edgeId: string): void {
    this.edges.delete(edgeId);
  }

  /**
   * Get the current graph
   */
  getGraph(): NavigationGraph {
    return {
      nodes: new Map(this.nodes),
      edges: new Map(this.edges),
    };
  }

  /**
   * Validate graph integrity
   * Returns true if all edges reference existing nodes
   */
  validateGraph(): boolean {
    for (const edge of this.edges.values()) {
      if (!this.nodes.has(edge.fromNodeId) || !this.nodes.has(edge.toNodeId)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Clear all nodes and edges
   */
  clear(): void {
    this.nodes.clear();
    this.edges.clear();
  }

  /**
   * Get node by ID
   */
  getNode(nodeId: string): NavigationNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Get edge by ID
   */
  getEdge(edgeId: string): NavigationEdge | undefined {
    return this.edges.get(edgeId);
  }

  /**
   * Get all edges connected to a node
   */
  getConnectedEdges(nodeId: string): NavigationEdge[] {
    const connectedEdges: NavigationEdge[] = [];
    for (const edge of this.edges.values()) {
      if (edge.fromNodeId === nodeId || edge.toNodeId === nodeId) {
        connectedEdges.push(edge);
      }
    }
    return connectedEdges;
  }

  /**
   * Get graph statistics
   */
  getStats(): { nodeCount: number; edgeCount: number } {
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
    };
  }
}
