/**
 * Property-Based Tests for Initialization Performance
 * **Feature: nightshift-navigator, Property 55: Initialization performance**
 * **Validates: Requirements 11.5**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  LazyModuleLoader,
  initializeSDK,
  initializeSDKOptimized,
  getInitializationMetrics,
  registerSDKModules,
  moduleLoader,
} from './initialization.js';

describe('Initialization Performance Property Tests', () => {
  beforeEach(() => {
    // Clear module loader state between tests
    const loader = new LazyModuleLoader();
    Object.assign(moduleLoader, loader);
  });

  /**
   * Property 55: Initialization performance
   * For any application launch, all core modules should initialize within 2 seconds
   */
  it('should initialize all core modules within 2 seconds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          ['sensor-fusion', 'computer-vision', 'pathfinding'],
          ['sensor-fusion', 'computer-vision'],
          ['sensor-fusion', 'pathfinding'],
          ['computer-vision', 'pathfinding']
        ),
        async (modules) => {
          const startTime = performance.now();

          // Initialize SDK with specified modules
          await initializeSDK(modules);

          const totalTime = performance.now() - startTime;

          // Property: Initialization should complete within 2000ms
          return totalTime < 2000;
        }
      ),
      { numRuns: 10 } // Reduced runs for performance tests
    );
  }, 30000); // 30 second timeout

  /**
   * Property: Optimized initialization performance
   * The optimized initialization should complete within 2 seconds
   */
  it('should complete optimized initialization within 2 seconds', async () => {
    const startTime = performance.now();

    await initializeSDKOptimized();

    const totalTime = performance.now() - startTime;

    // Property: Optimized initialization should be fast
    expect(totalTime).toBeLessThan(2000);
  }, 30000);

  /**
   * Property: Parallel loading works correctly
   * Loading multiple modules in parallel should succeed
   */
  it('should load multiple modules in parallel successfully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          ['sensor-fusion', 'computer-vision'],
          ['sensor-fusion', 'pathfinding'],
          ['computer-vision', 'pathfinding']
        ),
        async (modules) => {
          // Clear and register modules
          const loader = new LazyModuleLoader();
          Object.assign(moduleLoader, loader);
          registerSDKModules();
          
          const startTime = performance.now();
          const results = await moduleLoader.loadParallel(modules);
          const totalTime = performance.now() - startTime;

          // Property: All modules should be loaded
          const allLoaded = results.every(r => r !== null && r !== undefined);

          // Property: Should complete in reasonable time
          const reasonableTime = totalTime < 2000;

          return allLoaded && reasonableTime;
        }
      ),
      { numRuns: 5 } // Reduced runs for performance tests
    );
  }, 30000); // 30 second timeout

  /**
   * Property: Lazy loading doesn't load until requested
   * Modules should not be loaded until explicitly requested
   */
  it('should not load modules until requested', async () => {
    const loader = new LazyModuleLoader();

    // Register a mock module
    let loaded = false;
    loader.register('test-module', async () => {
      loaded = true;
      return { test: true };
    });

    // Property: Module should not be loaded yet
    expect(loaded).toBe(false);
    expect(loader.getStatus('test-module')?.status).toBe('not_loaded');

    // Load the module
    await loader.load('test-module');

    // Property: Module should now be loaded
    expect(loaded).toBe(true);
    expect(loader.getStatus('test-module')?.status).toBe('loaded');
  });

  /**
   * Property: Module caching
   * Loading the same module twice should return cached result
   */
  it('should cache loaded modules and return them instantly on subsequent loads', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('sensor-fusion', 'computer-vision', 'pathfinding'),
        async (moduleName) => {
          // Clear and register modules
          const loader = new LazyModuleLoader();
          Object.assign(moduleLoader, loader);
          registerSDKModules();

          // First load
          const firstStart = performance.now();
          const firstResult = await moduleLoader.load(moduleName);
          const firstTime = performance.now() - firstStart;

          // Second load (should be cached)
          const secondStart = performance.now();
          const secondResult = await moduleLoader.load(moduleName);
          const secondTime = performance.now() - secondStart;

          // Property: Second load should be faster (cached)
          // We use a more lenient check since timing can vary
          const isFaster = secondTime < firstTime;

          // Property: Results should be the same object (cached)
          const sameObject = firstResult === secondResult;

          return isFaster && sameObject;
        }
      ),
      { numRuns: 10 }
    );
  }, 30000);

  /**
   * Property: Initialization metrics accuracy
   * Metrics should accurately reflect loaded modules
   */
  it('should provide accurate initialization metrics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }),
        async (moduleCount) => {
          // Clear and register modules
          const loader = new LazyModuleLoader();
          Object.assign(moduleLoader, loader);
          registerSDKModules();

          const modules = ['sensor-fusion', 'computer-vision', 'pathfinding'].slice(0, moduleCount);

          await initializeSDK(modules);

          const metrics = getInitializationMetrics();

          // Property: Loaded module count should be at least the requested count
          const countOk = metrics.loadedModules >= moduleCount;

          // Property: Total load time should be positive
          const timePositive = metrics.totalLoadTimeMs > 0;

          // Property: Average load time should be reasonable
          const avgReasonable = metrics.averageLoadTimeMs > 0 && metrics.averageLoadTimeMs < 2000;

          return countOk && timePositive && avgReasonable;
        }
      ),
      { numRuns: 10 }
    );
  }, 30000);

  /**
   * Property: Error handling
   * Failed module loads should be tracked correctly
   */
  it('should handle module load errors correctly', async () => {
    const loader = new LazyModuleLoader();

    // Register a module that fails to load
    loader.register('failing-module', async () => {
      throw new Error('Intentional failure');
    });

    // Property: Loading should throw error
    await expect(loader.load('failing-module')).rejects.toThrow('Intentional failure');

    // Property: Status should be 'error'
    expect(loader.getStatus('failing-module')?.status).toBe('error');

    // Property: Error should be recorded
    expect(loader.getStatus('failing-module')?.error).toBeDefined();
  });

  /**
   * Property: Concurrent load requests
   * Multiple concurrent requests for the same module should not cause issues
   */
  it('should handle concurrent load requests for the same module', async () => {
    const loader = new LazyModuleLoader();

    let loadCount = 0;
    loader.register('concurrent-module', async () => {
      loadCount++;
      await new Promise(resolve => setTimeout(resolve, 100));
      return { value: loadCount };
    });

    // Start multiple concurrent loads
    const promises = [
      loader.load('concurrent-module'),
      loader.load('concurrent-module'),
      loader.load('concurrent-module'),
    ];

    const results = await Promise.all(promises);

    // Property: Module should only be loaded once
    expect(loadCount).toBe(1);

    // Property: All results should be the same (cached)
    expect(results[0]).toBe(results[1]);
    expect(results[1]).toBe(results[2]);
  });
});
