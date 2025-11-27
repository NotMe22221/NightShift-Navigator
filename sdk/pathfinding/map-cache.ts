/**
 * Map Data Caching for Offline Routing
 * Stores map data in IndexedDB for offline access
 */

import type { NavigationGraph } from './index.js';

/**
 * Geographic bounds
 */
export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Cached region data
 */
export interface CachedRegion {
  id: string;
  bounds: GeoBounds;
  graph: NavigationGraph;
  timestamp: number;
  source: string;
}

/**
 * Map cache interface
 */
export interface MapCache {
  initialize(): Promise<void>;
  cacheRegion(region: CachedRegion): Promise<void>;
  getRegion(id: string): Promise<CachedRegion | null>;
  getRegionsInBounds(bounds: GeoBounds): Promise<CachedRegion[]>;
  getAllRegions(): Promise<CachedRegion[]>;
  clearCache(): Promise<void>;
  isAvailable(): boolean;
}

/**
 * IndexedDB-based map cache implementation
 */
export class IndexedDBMapCache implements MapCache {
  private dbName = 'nightshift-map-cache';
  private storeName = 'regions';
  private version = 1;
  private db: IDBDatabase | null = null;

  /**
   * Initialize the IndexedDB database
   */
  async initialize(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('IndexedDB not available');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
          
          // Create indexes for efficient querying
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('source', 'source', { unique: false });
        }
      };
    });
  }

  /**
   * Cache a region
   */
  async cacheRegion(region: CachedRegion): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      
      const request = objectStore.put(region);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to cache region'));
    });
  }

  /**
   * Get a cached region by ID
   */
  async getRegion(id: string): Promise<CachedRegion | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      
      const request = objectStore.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(new Error('Failed to get region'));
    });
  }

  /**
   * Get all regions that intersect with the given bounds
   */
  async getRegionsInBounds(bounds: GeoBounds): Promise<CachedRegion[]> {
    const allRegions = await this.getAllRegions();
    
    return allRegions.filter(region => {
      return this.boundsIntersect(region.bounds, bounds);
    });
  }

  /**
   * Get all cached regions
   */
  async getAllRegions(): Promise<CachedRegion[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      
      const request = objectStore.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(new Error('Failed to get all regions'));
    });
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      
      const request = objectStore.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear cache'));
    });
  }

  /**
   * Check if IndexedDB is available
   */
  isAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Check if two bounds intersect
   */
  private boundsIntersect(bounds1: GeoBounds, bounds2: GeoBounds): boolean {
    return !(
      bounds1.east < bounds2.west ||
      bounds1.west > bounds2.east ||
      bounds1.north < bounds2.south ||
      bounds1.south > bounds2.north
    );
  }
}

/**
 * In-memory fallback cache for environments without IndexedDB
 */
export class InMemoryMapCache implements MapCache {
  private regions: Map<string, CachedRegion> = new Map();

  async initialize(): Promise<void> {
    // No initialization needed for in-memory cache
  }

  async cacheRegion(region: CachedRegion): Promise<void> {
    this.regions.set(region.id, region);
  }

  async getRegion(id: string): Promise<CachedRegion | null> {
    return this.regions.get(id) || null;
  }

  async getRegionsInBounds(bounds: GeoBounds): Promise<CachedRegion[]> {
    const allRegions = Array.from(this.regions.values());
    
    return allRegions.filter(region => {
      return this.boundsIntersect(region.bounds, bounds);
    });
  }

  async getAllRegions(): Promise<CachedRegion[]> {
    return Array.from(this.regions.values());
  }

  async clearCache(): Promise<void> {
    this.regions.clear();
  }

  isAvailable(): boolean {
    return true;
  }

  private boundsIntersect(bounds1: GeoBounds, bounds2: GeoBounds): boolean {
    return !(
      bounds1.east < bounds2.west ||
      bounds1.west > bounds2.east ||
      bounds1.north < bounds2.south ||
      bounds1.south > bounds2.north
    );
  }
}

/**
 * Create appropriate map cache based on environment
 */
export function createMapCache(): MapCache {
  if (typeof indexedDB !== 'undefined') {
    return new IndexedDBMapCache();
  } else {
    return new InMemoryMapCache();
  }
}
