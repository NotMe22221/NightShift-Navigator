# NightShift Navigator SDK

A comprehensive darkness-adaptive navigation system for mobile devices that combines computer vision, sensor fusion, pathfinding, augmented reality, and audio accessibility features.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Modules](#core-modules)
  - [Sensor Fusion](#sensor-fusion)
  - [Computer Vision](#computer-vision)
  - [Pathfinding](#pathfinding)
  - [AR Overlay](#ar-overlay)
  - [Audio Accessibility](#audio-accessibility)
  - [Energy Management](#energy-management)
  - [Plugin API](#plugin-api)
  - [Error Handling](#error-handling)
- [TypeScript Support](#typescript-support)
- [Examples](#examples)
- [API Reference](#api-reference)

## Installation

```bash
npm install nightshift-navigator
```

## Quick Start

```typescript
import {
  SensorFusionLayer,
  CVPipeline,
  GraphBuilder,
  astar,
  AROverlay,
  AudioSystem
} from 'nightshift-navigator';

// Initialize sensor fusion
const sensorFusion = new SensorFusionLayer();
await sensorFusion.initialize({
  cameraEnabled: true,
  lightSensorEnabled: true,
  shadowDetectionEnabled: true,
  updateFrequencyHz: 5,
  weightings: { camera: 0.5, lightSensor: 0.3, shadowDetection: 0.2 }
});

// Initialize computer vision
const cvPipeline = new CVPipeline();
await cvPipeline.initialize({
  targetFPS: 10,
  maxMemoryMB: 150,
  hazardDetectionEnabled: true,
  contrastMapEnabled: true
});

// Start processing
sensorFusion.start();
```

## Core Modules

### Sensor Fusion

Aggregates data from camera, light sensor, and shadow detection to produce unified environmental metrics.

```typescript
import { SensorFusionLayer, type LightMetrics } from 'nightshift-navigator/sensor-fusion';

const sensorFusion = new SensorFusionLayer();

await sensorFusion.initialize({
  cameraEnabled: true,
  lightSensorEnabled: true,
  shadowDetectionEnabled: true,
  updateFrequencyHz: 5,
  weightings: {
    camera: 0.5,
    lightSensor: 0.3,
    shadowDetection: 0.2
  }
});

sensorFusion.onMetricsUpdate((metrics: LightMetrics) => {
  console.log('Light level:', metrics.unifiedLightLevel);
  console.log('Shadow coverage:', metrics.shadowCoverage);
});

sensorFusion.start();
```

**Key Functions:**
- `computeBrightnessHistogram(frame: ImageData): BrightnessHistogram` - Extract brightness histogram from camera frame
- `normalizeLightSensorReading(rawReading: number): number` - Normalize light sensor reading to lux scale
- `detectShadows(frame: ImageData): ShadowDetectionResult` - Detect shadow regions in frame

### Computer Vision

Analyzes camera frames to detect hazards, compute brightness distributions, and generate contrast maps.

```typescript
import { CVPipeline, type CVResult } from 'nightshift-navigator/computer-vision';

const cvPipeline = new CVPipeline();

await cvPipeline.initialize({
  targetFPS: 10,
  maxMemoryMB: 150,
  hazardDetectionEnabled: true,
  contrastMapEnabled: true
});

const frame = /* get camera frame */;
const result: CVResult = await cvPipeline.processFrame(frame);

console.log('Detected hazards:', result.hazards.length);
console.log('Processing time:', result.processingTimeMs, 'ms');
console.log('Current FPS:', cvPipeline.getCurrentFPS());
```

**Key Functions:**
- `detectHazards(frame: ImageData, histogram: BrightnessHistogram): HazardDetection[]` - Detect obstacles and hazards
- `generateContrastMap(frame: ImageData): ContrastMap` - Generate contrast map for edge detection

### Pathfinding

Builds navigation graphs, scores paths based on visibility and safety, and calculates optimal routes.

```typescript
import {
  GraphBuilder,
  parseGeoJSON,
  astar,
  type Route
} from 'nightshift-navigator/pathfinding';

// Build navigation graph
const builder = new GraphBuilder();

// Parse GeoJSON map data
const mapData = /* load GeoJSON */;
const parsed = parseGeoJSON(mapData);

parsed.nodes.forEach(node => builder.addNode(node));
parsed.edges.forEach(edge => builder.addEdge(edge));

// Calculate route
const start = { latitude: 40.7128, longitude: -74.0060 };
const goal = { latitude: 40.7589, longitude: -73.9851 };

const route: Route | null = astar(start, goal, builder.getGraph(), {
  maxGraphNodes: 10000,
  routeCalculationTimeoutMs: 3000,
  costWeights: {
    distance: 1.0,
    visibility: 0.5,
    safety: 0.8
  }
});

if (route) {
  console.log('Route distance:', route.totalDistance, 'meters');
  console.log('Estimated time:', route.estimatedTimeSeconds, 'seconds');
}
```

**Key Functions:**
- `parseGeoJSON(data: GeoJSONFeatureCollection): { nodes, edges }` - Parse GeoJSON map data
- `computeVisibilityScore(lightMetrics: LightMetrics, edge: NavigationEdge): number` - Calculate visibility score
- `computeSafetyScore(hazards: HazardDetection[], edge: NavigationEdge): number` - Calculate safety score
- `astar(start, goal, graph, config): Route | null` - A* pathfinding algorithm

### AR Overlay

Renders augmented reality navigation elements including paths, hazard markers, and warnings.

```typescript
import { AROverlay, type SpectralPathStyle } from 'nightshift-navigator/ar-overlay';

const arOverlay = new AROverlay();

await arOverlay.initialize({
  targetFPS: 30,
  spectralPathEnabled: true,
  hazardMarkersEnabled: true,
  lowLightWarningsEnabled: true,
  maxPositionJitterCm: 5
});

// Update route visualization
arOverlay.updateRoute(route);

// Update hazard markers
arOverlay.updateHazards(hazards);

// Customize path appearance
arOverlay.setSpectralPathStyle({
  color: '#00ff00',
  width: 0.5,
  opacity: 0.8,
  glowIntensity: 1.0,
  animationSpeed: 1.0
});

arOverlay.start();
```

### Audio Accessibility

Provides spoken navigation instructions and directional audio cues for accessibility.

```typescript
import {
  AudioSystem,
  generateNavigationCue,
  generateHazardAudioCue
} from 'nightshift-navigator/audio';

const audioSystem = new AudioSystem();

await audioSystem.initialize({
  speechRate: 1.0,
  volume: 0.8,
  directionalAudioEnabled: true,
  prioritizeSafetyCues: true
});

// Generate navigation cue
const navCue = generateNavigationCue({
  type: 'turn',
  direction: 'left',
  distance: 50
});

audioSystem.queueCue(navCue);

// Generate hazard warning
const hazardCue = generateHazardAudioCue({
  type: 'obstacle',
  distance: 10,
  direction: 45
});

audioSystem.queueCue(hazardCue);

audioSystem.start();
```

### Energy Management

Monitors battery consumption and adapts system behavior to extend battery life.

```typescript
import { EnergyManagerImpl, getAdaptiveRoutingConfig } from 'nightshift-navigator/energy';

const energyManager = new EnergyManagerImpl();

await energyManager.initialize({
  lowPowerThreshold: 20,
  criticalPowerThreshold: 10,
  monitoringIntervalMs: 10000
});

energyManager.onModeChange((mode) => {
  console.log('Power mode changed:', mode.mode);
  console.log('CV FPS:', mode.cvFPS);
  console.log('AR enabled:', mode.arEnabled);
  console.log('Routing strategy:', mode.routingStrategy);
  
  // Adjust system behavior based on power mode
  if (mode.mode === 'low_power') {
    cvPipeline.initialize({ ...cvConfig, targetFPS: mode.cvFPS });
  }
});

energyManager.start();
```

### Plugin API

Allows third-party applications to contribute map data and extend system functionality.

```typescript
import { PluginAPI, type MapDataSubmission } from 'nightshift-navigator/plugin-api';

const pluginAPI = new PluginAPI(
  {
    authenticationRequired: true,
    maxDataSizeMB: 10,
    conflictResolution: 'priority'
  },
  graphBuilder
);

await pluginAPI.initialize();

// Authenticate
const authenticated = await pluginAPI.authenticate({
  apiKey: 'your-api-key-here-32-characters-min',
  appId: 'your-app-id'
});

if (authenticated) {
  // Submit map data
  const result = await pluginAPI.submitMapData({
    format: 'geojson',
    data: geoJsonData,
    priority: 5,
    source: 'your-app-id',
    timestamp: Date.now()
  });
  
  console.log('Nodes added:', result.nodesAdded);
  console.log('Edges added:', result.edgesAdded);
}
```

### Error Handling

Centralized error handling and recovery strategies for robust operation.

```typescript
import {
  DefaultErrorHandler,
  DefaultErrorLogger,
  createError,
  type RecoveryStrategy
} from 'nightshift-navigator/error-handling';

const logger = new DefaultErrorLogger();
const errorHandler = new DefaultErrorHandler(logger);

// Register recovery strategy
const cameraFallbackStrategy: RecoveryStrategy = async (error) => {
  if (error.type === 'sensor_error' && error.component === 'Camera') {
    // Switch to light sensor only mode
    await sensorFusion.initialize({
      ...config,
      cameraEnabled: false,
      lightSensorEnabled: true
    });
    
    return {
      success: true,
      action: 'degraded',
      message: 'Switched to light sensor only mode'
    };
  }
  
  return {
    success: false,
    action: 'failed',
    message: 'No recovery available'
  };
};

errorHandler.registerRecoveryStrategy('sensor_error:Camera', cameraFallbackStrategy);

// Handle errors
try {
  // ... system operation
} catch (err) {
  const error = createError(
    'sensor_error',
    'critical',
    'Camera',
    'Camera access failed',
    { originalError: err }
  );
  
  const result = await errorHandler.handleError(error);
  console.log('Recovery result:', result.action);
}
```

## TypeScript Support

The SDK is written in TypeScript and provides complete type definitions for all APIs.

```typescript
import type {
  SensorFusionConfig,
  LightMetrics,
  CVConfig,
  HazardDetection,
  NavigationNode,
  NavigationEdge,
  Route,
  ARConfig,
  AudioConfig,
  EnergyConfig,
  PowerMode,
  PluginConfig,
  SystemError
} from 'nightshift-navigator';

// All types are fully documented and available for import
```

## Examples

### Complete Navigation System

```typescript
import {
  SensorFusionLayer,
  CVPipeline,
  GraphBuilder,
  parseGeoJSON,
  astar,
  AROverlay,
  AudioSystem,
  EnergyManagerImpl
} from 'nightshift-navigator';

async function initializeNavigationSystem() {
  // 1. Initialize sensor fusion
  const sensorFusion = new SensorFusionLayer();
  await sensorFusion.initialize({
    cameraEnabled: true,
    lightSensorEnabled: true,
    shadowDetectionEnabled: true,
    updateFrequencyHz: 5,
    weightings: { camera: 0.5, lightSensor: 0.3, shadowDetection: 0.2 }
  });

  // 2. Initialize computer vision
  const cvPipeline = new CVPipeline();
  await cvPipeline.initialize({
    targetFPS: 10,
    maxMemoryMB: 150,
    hazardDetectionEnabled: true,
    contrastMapEnabled: true
  });

  // 3. Build navigation graph
  const builder = new GraphBuilder();
  const mapData = await fetch('/api/map-data').then(r => r.json());
  const parsed = parseGeoJSON(mapData);
  parsed.nodes.forEach(node => builder.addNode(node));
  parsed.edges.forEach(edge => builder.addEdge(edge));

  // 4. Initialize AR overlay
  const arOverlay = new AROverlay();
  await arOverlay.initialize({
    targetFPS: 30,
    spectralPathEnabled: true,
    hazardMarkersEnabled: true,
    lowLightWarningsEnabled: true,
    maxPositionJitterCm: 5
  });

  // 5. Initialize audio system
  const audioSystem = new AudioSystem();
  await audioSystem.initialize({
    speechRate: 1.0,
    volume: 0.8,
    directionalAudioEnabled: true,
    prioritizeSafetyCues: true
  });

  // 6. Initialize energy manager
  const energyManager = new EnergyManagerImpl();
  await energyManager.initialize({
    lowPowerThreshold: 20,
    criticalPowerThreshold: 10,
    monitoringIntervalMs: 10000
  });

  // 7. Start all systems
  sensorFusion.start();
  arOverlay.start();
  audioSystem.start();
  energyManager.start();

  // 8. Set up event handlers
  sensorFusion.onMetricsUpdate(async (metrics) => {
    // Process camera frame
    const frame = /* get current frame */;
    const cvResult = await cvPipeline.processFrame(frame);
    
    // Update AR overlay
    arOverlay.updateHazards(cvResult.hazards);
    
    // Check for low light
    if (metrics.unifiedLightLevel < 0.1) {
      arOverlay.setLowLightWarning(true);
    }
  });

  energyManager.onModeChange((mode) => {
    // Adapt system to power mode
    if (mode.mode === 'low_power') {
      cvPipeline.initialize({ targetFPS: mode.cvFPS, maxMemoryMB: 150, hazardDetectionEnabled: true, contrastMapEnabled: false });
    } else if (mode.mode === 'critical') {
      arOverlay.stop();
    }
  });

  return {
    sensorFusion,
    cvPipeline,
    builder,
    arOverlay,
    audioSystem,
    energyManager
  };
}
```

### Calculate and Display Route

```typescript
async function navigateToDestination(
  start: { latitude: number; longitude: number },
  goal: { latitude: number; longitude: number },
  systems: ReturnType<typeof initializeNavigationSystem>
) {
  const { builder, arOverlay, audioSystem } = await systems;

  // Calculate route
  const route = astar(start, goal, builder.getGraph(), {
    maxGraphNodes: 10000,
    routeCalculationTimeoutMs: 3000,
    costWeights: {
      distance: 1.0,
      visibility: 0.5,
      safety: 0.8
    }
  });

  if (!route) {
    console.error('No route found');
    return;
  }

  // Display route in AR
  arOverlay.updateRoute(route);

  // Announce route
  const navCue = {
    id: 'route-start',
    type: 'navigation' as const,
    priority: 5,
    message: `Route calculated. Distance: ${Math.round(route.totalDistance)} meters. Estimated time: ${Math.round(route.estimatedTimeSeconds / 60)} minutes.`,
    timestamp: Date.now()
  };

  audioSystem.queueCue(navCue);
}
```

## API Reference

For complete API documentation, see the TypeScript type definitions included with the package. All public APIs are fully documented with TSDoc comments.

### Module Exports

- `nightshift-navigator` - Main SDK entry point with all modules
- `nightshift-navigator/sensor-fusion` - Sensor fusion module only
- `nightshift-navigator/computer-vision` - Computer vision module only
- `nightshift-navigator/pathfinding` - Pathfinding module only
- `nightshift-navigator/ar-overlay` - AR overlay module only
- `nightshift-navigator/audio` - Audio accessibility module only
- `nightshift-navigator/energy` - Energy management module only
- `nightshift-navigator/plugin-api` - Plugin API module only
- `nightshift-navigator/error-handling` - Error handling module only
- `nightshift-navigator/types` - Common types module only

### Configuration Validation

All configuration objects are validated on initialization. Invalid configurations will throw descriptive errors:

```typescript
try {
  await sensorFusion.initialize({
    cameraEnabled: true,
    lightSensorEnabled: true,
    shadowDetectionEnabled: true,
    updateFrequencyHz: -5, // Invalid: must be positive
    weightings: { camera: 0.5, lightSensor: 0.3, shadowDetection: 0.2 }
  });
} catch (error) {
  console.error('Configuration error:', error.message);
  // "updateFrequencyHz must be a positive number"
}
```

### Async Patterns

The SDK supports both callback-based and Promise-based asynchronous patterns:

```typescript
// Promise-based
const result = await cvPipeline.processFrame(frame);

// Callback-based
sensorFusion.onMetricsUpdate((metrics) => {
  console.log('Metrics updated:', metrics);
});
```

## License

MIT
