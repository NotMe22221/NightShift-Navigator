/**
 * Optimized Initialization System
 * Provides lazy loading and parallel initialization for SDK modules
 */

/**
 * Module initialization status
 */
export type ModuleStatus = 'not_loaded' | 'loading' | 'loaded' | 'error';

/**
 * Module metadata
 */
export interface ModuleMetadata {
  name: string;
  status: ModuleStatus;
  loadTimeMs?: number;
  error?: Error;
}

/**
 * Lazy module loader
 */
export class LazyModuleLoader {
  private modules: Map<string, ModuleMetadata> = new Map();
  private loaders: Map<string, () => Promise<any>> = new Map();
  private cache: Map<string, any> = new Map();

  /**
   * Register a module for lazy loading
   * @param name - Module name
   * @param loader - Async function that loads the module
   */
  register(name: string, loader: () => Promise<any>): void {
    this.modules.set(name, {
      name,
      status: 'not_loaded',
    });
    this.loaders.set(name, loader);
  }

  /**
   * Load a module on demand
   * @param name - Module name
   * @returns Loaded module
   */
  async load<T = any>(name: string): Promise<T> {
    // Return cached module if already loaded
    if (this.cache.has(name)) {
      return this.cache.get(name);
    }

    const metadata = this.modules.get(name);
    if (!metadata) {
      throw new Error(`Module "${name}" not registered`);
    }

    // Check if already loading
    if (metadata.status === 'loading') {
      // Wait for loading to complete
      return this.waitForLoad(name);
    }

    // Start loading
    metadata.status = 'loading';
    const startTime = performance.now();

    try {
      const loader = this.loaders.get(name);
      if (!loader) {
        throw new Error(`No loader found for module "${name}"`);
      }

      const module = await loader();
      const loadTime = performance.now() - startTime;

      metadata.status = 'loaded';
      metadata.loadTimeMs = loadTime;
      this.cache.set(name, module);

      return module;
    } catch (error) {
      metadata.status = 'error';
      metadata.error = error as Error;
      throw error;
    }
  }

  /**
   * Load multiple modules in parallel
   * @param names - Array of module names
   * @returns Array of loaded modules
   */
  async loadParallel(names: string[]): Promise<any[]> {
    const promises = names.map(name => this.load(name));
    return Promise.all(promises);
  }

  /**
   * Get module status
   * @param name - Module name
   * @returns Module metadata
   */
  getStatus(name: string): ModuleMetadata | undefined {
    return this.modules.get(name);
  }

  /**
   * Get all module statuses
   * @returns Array of module metadata
   */
  getAllStatuses(): ModuleMetadata[] {
    return Array.from(this.modules.values());
  }

  /**
   * Wait for a module to finish loading
   * @param name - Module name
   * @returns Loaded module
   */
  private async waitForLoad(name: string): Promise<any> {
    // Poll until loaded or error
    while (true) {
      const metadata = this.modules.get(name);
      if (!metadata) {
        throw new Error(`Module "${name}" not found`);
      }

      if (metadata.status === 'loaded') {
        return this.cache.get(name);
      }

      if (metadata.status === 'error') {
        throw metadata.error || new Error(`Module "${name}" failed to load`);
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}

/**
 * Global lazy module loader instance
 */
export const moduleLoader = new LazyModuleLoader();

/**
 * Register all SDK modules for lazy loading
 */
export function registerSDKModules(): void {
  // Core modules - lazy loaded
  moduleLoader.register('sensor-fusion', () => import('./sensor-fusion/index.js'));
  moduleLoader.register('computer-vision', () => import('./computer-vision/index.js'));
  moduleLoader.register('pathfinding', () => import('./pathfinding/index.js'));
  moduleLoader.register('ar-overlay', () => import('./ar-overlay/index.js'));
  moduleLoader.register('audio', () => import('./audio/index.js'));
  moduleLoader.register('energy', () => import('./energy/index.js'));
  moduleLoader.register('plugin-api', () => import('./plugin-api/index.js'));
  moduleLoader.register('error-handling', () => import('./error-handling/index.js'));
  moduleLoader.register('security', () => import('./security/index.js'));
}

/**
 * Initialize core SDK modules in parallel
 * @param modules - Array of module names to initialize (defaults to all critical modules)
 * @returns Object containing loaded modules
 */
export async function initializeSDK(
  modules: string[] = ['sensor-fusion', 'computer-vision', 'pathfinding']
): Promise<Record<string, any>> {
  const startTime = performance.now();

  // Register modules if not already registered
  if (moduleLoader.getAllStatuses().length === 0) {
    registerSDKModules();
  }

  // Load modules in parallel
  const loadedModules = await moduleLoader.loadParallel(modules);

  const totalTime = performance.now() - startTime;

  // Create result object
  const result: Record<string, any> = {};
  modules.forEach((name, index) => {
    result[name] = loadedModules[index];
  });

  console.log(`SDK initialized in ${totalTime.toFixed(2)}ms`);

  return result;
}

/**
 * Initialize SDK with optimized loading strategy
 * - Critical modules loaded in parallel
 * - Non-critical modules lazy loaded on demand
 * 
 * @returns Object with module loaders
 */
export async function initializeSDKOptimized(): Promise<{
  critical: Record<string, any>;
  loadModule: (name: string) => Promise<any>;
}> {
  const startTime = performance.now();

  // Register all modules
  registerSDKModules();

  // Load critical modules in parallel
  const criticalModules = ['sensor-fusion', 'computer-vision', 'pathfinding'];
  const critical = await initializeSDK(criticalModules);

  const totalTime = performance.now() - startTime;
  console.log(`Critical modules initialized in ${totalTime.toFixed(2)}ms`);

  // Return critical modules and loader for non-critical modules
  return {
    critical,
    loadModule: (name: string) => moduleLoader.load(name),
  };
}

/**
 * Get initialization performance metrics
 * @returns Performance metrics for all loaded modules
 */
export function getInitializationMetrics(): {
  totalModules: number;
  loadedModules: number;
  totalLoadTimeMs: number;
  averageLoadTimeMs: number;
  modules: ModuleMetadata[];
} {
  const statuses = moduleLoader.getAllStatuses();
  const loadedModules = statuses.filter(m => m.status === 'loaded');
  const totalLoadTime = loadedModules.reduce((sum, m) => sum + (m.loadTimeMs || 0), 0);

  return {
    totalModules: statuses.length,
    loadedModules: loadedModules.length,
    totalLoadTimeMs: totalLoadTime,
    averageLoadTimeMs: loadedModules.length > 0 ? totalLoadTime / loadedModules.length : 0,
    modules: statuses,
  };
}
