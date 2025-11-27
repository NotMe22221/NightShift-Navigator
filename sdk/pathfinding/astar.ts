/**
 * A* Pathfinding Algorithm Implementation
 * 
 * Implements A* pathfinding with custom cost function for NightShift Navigator.
 */

import { NavigationNode, NavigationEdge, NavigationGraph, Route, Position, PathfindingConfig } from './index';

/**
 * Priority Queue implementation for A* open set
 */
class PriorityQueue<T> {
  private items: Array<{ item: T; priority: number }> = [];

  enqueue(item: T, priority: number): void {
    this.items.push({ item, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }

  dequeue(): T | undefined {
    return this.items.shift()?.item;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }
}

/**
 * Calculate Haversine distance between two positions
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
 * Find the closest node to a given position
 */
function findClosestNode(position: Position, graph: NavigationGraph): NavigationNode | null {
  let closestNode: NavigationNode | null = null;
  let minDistance = Infinity;

  for (const node of graph.nodes.values()) {
    const distance = calculateDistance(position, node.position);
    if (distance < minDistance) {
      minDistance = distance;
      closestNode = node;
    }
  }

  return closestNode;
}

/**
 * Get all edges connected to a node (outgoing edges)
 */
function getOutgoingEdges(nodeId: string, graph: NavigationGraph): NavigationEdge[] {
  const edges: NavigationEdge[] = [];
  for (const edge of graph.edges.values()) {
    if (edge.fromNodeId === nodeId) {
      edges.push(edge);
    }
  }
  return edges;
}

/**
 * Calculate edge cost using weighted cost function
 */
function calculateEdgeCost(
  edge: NavigationEdge,
  config: PathfindingConfig
): number {
  const { distance, visibility, safety } = config.costWeights;
  
  // Cost = w1×distance + w2×(1-visibility) + w3×(1-safety)
  const cost =
    distance * edge.distance +
    visibility * (1 - edge.visibilityScore) * edge.distance +
    safety * (1 - edge.safetyScore) * edge.distance;
  
  return cost;
}

/**
 * Reconstruct path from start to goal using parent map
 */
function reconstructPath(
  cameFrom: Map<string, { nodeId: string; edgeId: string }>,
  startNodeId: string,
  goalNodeId: string,
  graph: NavigationGraph
): { nodes: NavigationNode[]; edges: NavigationEdge[] } {
  const path: NavigationNode[] = [];
  const edges: NavigationEdge[] = [];
  
  let currentNodeId = goalNodeId;
  
  // Build path backwards from goal to start
  while (currentNodeId !== startNodeId) {
    const node = graph.nodes.get(currentNodeId);
    if (!node) break;
    
    path.unshift(node);
    
    const parent = cameFrom.get(currentNodeId);
    if (!parent) break;
    
    const edge = graph.edges.get(parent.edgeId);
    if (edge) {
      edges.unshift(edge);
    }
    
    currentNodeId = parent.nodeId;
  }
  
  // Add start node
  const startNode = graph.nodes.get(startNodeId);
  if (startNode) {
    path.unshift(startNode);
  }
  
  return { nodes: path, edges };
}

/**
 * A* pathfinding algorithm
 * 
 * @param start - Starting position
 * @param goal - Goal position
 * @param graph - Navigation graph
 * @param config - Pathfinding configuration
 * @returns Route from start to goal, or null if no path found
 */
export function astar(
  start: Position,
  goal: Position,
  graph: NavigationGraph,
  config: PathfindingConfig
): Route | null {
  const startTime = Date.now();
  
  // Find closest nodes to start and goal positions
  const startNode = findClosestNode(start, graph);
  const goalNode = findClosestNode(goal, graph);
  
  if (!startNode || !goalNode) {
    return null;
  }
  
  if (startNode.id === goalNode.id) {
    // Start and goal are the same
    return {
      nodes: [startNode],
      edges: [],
      totalDistance: 0,
      totalCost: 0,
      estimatedTimeSeconds: 0,
    };
  }
  
  // Initialize data structures
  const openSet = new PriorityQueue<string>();
  const closedSet = new Set<string>();
  const gScore = new Map<string, number>(); // Cost from start to node
  const fScore = new Map<string, number>(); // Estimated total cost (g + h)
  const cameFrom = new Map<string, { nodeId: string; edgeId: string }>();
  
  // Initialize start node
  gScore.set(startNode.id, 0);
  const heuristic = calculateDistance(startNode.position, goalNode.position);
  fScore.set(startNode.id, heuristic);
  openSet.enqueue(startNode.id, heuristic);
  
  while (!openSet.isEmpty()) {
    // Check timeout
    if (Date.now() - startTime > config.routeCalculationTimeoutMs) {
      return null; // Timeout
    }
    
    const currentNodeId = openSet.dequeue();
    if (!currentNodeId) break;
    
    // Goal reached
    if (currentNodeId === goalNode.id) {
      const pathData = reconstructPath(cameFrom, startNode.id, goalNode.id, graph);
      
      // Calculate total distance and cost
      let totalDistance = 0;
      let totalCost = 0;
      
      for (const edge of pathData.edges) {
        totalDistance += edge.distance;
        totalCost += calculateEdgeCost(edge, config);
      }
      
      // Estimate time (assuming 1.4 m/s walking speed)
      const estimatedTimeSeconds = totalDistance / 1.4;
      
      return {
        nodes: pathData.nodes,
        edges: pathData.edges,
        totalDistance,
        totalCost,
        estimatedTimeSeconds,
      };
    }
    
    closedSet.add(currentNodeId);
    
    // Explore neighbors
    const outgoingEdges = getOutgoingEdges(currentNodeId, graph);
    
    for (const edge of outgoingEdges) {
      const neighborId = edge.toNodeId;
      
      if (closedSet.has(neighborId)) {
        continue;
      }
      
      const tentativeGScore = (gScore.get(currentNodeId) || 0) + calculateEdgeCost(edge, config);
      
      if (!gScore.has(neighborId) || tentativeGScore < (gScore.get(neighborId) || Infinity)) {
        // This path is better
        cameFrom.set(neighborId, { nodeId: currentNodeId, edgeId: edge.id });
        gScore.set(neighborId, tentativeGScore);
        
        const neighbor = graph.nodes.get(neighborId);
        if (neighbor) {
          const h = calculateDistance(neighbor.position, goalNode.position);
          const f = tentativeGScore + h;
          fScore.set(neighborId, f);
          openSet.enqueue(neighborId, f);
        }
      }
    }
  }
  
  // No path found
  return null;
}
