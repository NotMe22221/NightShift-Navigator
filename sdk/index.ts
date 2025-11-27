/**
 * NightShift Navigator SDK
 * Main entry point for the darkness-adaptive navigation system
 * 
 * @packageDocumentation
 * 
 * The NightShift Navigator SDK provides a comprehensive solution for darkness-adaptive
 * navigation on mobile devices. It combines computer vision, sensor fusion, pathfinding,
 * augmented reality, and audio accessibility features into a modular, extensible platform.
 * 
 * ## Core Modules
 * 
 * - **Sensor Fusion**: Aggregates camera, light sensor, and shadow detection data
 * - **Computer Vision**: Analyzes frames to detect hazards and compute brightness
 * - **Pathfinding**: Builds navigation graphs and calculates optimal routes
 * - **AR Overlay**: Renders augmented reality navigation elements
 * - **Audio**: Provides spoken navigation and directional audio cues
 * - **Energy Management**: Monitors battery and adapts system behavior
 * - **Plugin API**: Allows third-party map data integration
 * - **Error Handling**: Centralized error handling and recovery
 * 
 * ## Usage Example
 * 
 * ```typescript
 * import { SensorFusionLayer, CVPipeline, PathfindingEngine } from '@nightshift/navigator';
 * 
 * // Initialize sensor fusion
 * const sensorFusion = new SensorFusionLayer();
 * await sensorFusion.initialize({
 *   cameraEnabled: true,
 *   lightSensorEnabled: true,
 *   shadowDetectionEnabled: true,
 *   updateFrequencyHz: 5,
 *   weightings: { camera: 0.5, lightSensor: 0.3, shadowDetection: 0.2 }
 * });
 * 
 * // Initialize computer vision
 * const cvPipeline = new CVPipeline();
 * await cvPipeline.initialize({
 *   targetFPS: 10,
 *   maxMemoryMB: 150,
 *   hazardDetectionEnabled: true,
 *   contrastMapEnabled: true
 * });
 * ```
 * 
 * @module @nightshift/navigator
 */

// Core modules
export * from './sensor-fusion/index.js';
export * from './computer-vision/index.js';
export * from './pathfinding/index.js';
export * from './ar-overlay/index.js';
export * from './audio/index.js';
export * from './energy/index.js';
export * from './plugin-api/index.js';
export * from './error-handling/index.js';
export * from './security/index.js';
export * from './types/index.js';

// Configuration validation
export * from './config-validation.js';

// Async pattern utilities
export * from './async-patterns.js';

// Optimized initialization
export * from './initialization.js';
