/**
 * Scenario Manager Component
 * Manages test scenarios and simulations
 * Implements Requirements 1.1, 2.2, 3.1
 */

import type { EnergyMode, Scenario } from './ControlPanel';
import type { SystemMetrics } from './MetricsDisplay';
import { computeBrightnessHistogram } from '../../sdk/sensor-fusion/brightness-histogram';
import { TEST_SCENARIOS, generateRandomHazard, applyScenarioEffects, type SimulatedHazard, type ScenarioConfig } from '../scenarios/TestScenarios';
import type { CameraController } from './CameraController';

/**
 * ScenarioManager handles test scenarios and simulations
 */
export class ScenarioManager {
  private metricsCallbacks: ((metrics: SystemMetrics) => void)[] = [];
  private metricsInterval: number | null = null;
  private frameCount = 0;
  private lastFrameTime = Date.now();
  private currentFPS = 0;
  private currentLightLevel = 0;
  private currentHazardCount = 0;
  private currentScenario: ScenarioConfig | null = null;
  private activeHazards: SimulatedHazard[] = [];
  private isRouteActive = false;
  private cameraController: CameraController | null = null;

  /**
   * Initialize the scenario manager
   */
  initialize(cameraController?: CameraController): void {
    this.cameraController = cameraController || null;
    
    // Start metrics update loop
    this.metricsInterval = window.setInterval(() => {
      this.updateMetrics();
    }, 100); // Update every 100ms
  }

  /**
   * Apply a test scenario
   */
  applyScenario(scenario: Scenario): void {
    if (scenario === 'none') {
      this.currentScenario = null;
      this.activeHazards = [];
      this.currentHazardCount = 0;
      return;
    }

    const scenarioConfig = TEST_SCENARIOS[scenario];
    if (!scenarioConfig) {
      console.warn('Unknown scenario:', scenario);
      return;
    }

    this.currentScenario = scenarioConfig;
    this.activeHazards = [...scenarioConfig.hazards];
    this.currentHazardCount = this.activeHazards.length;

    // Draw hazards on overlay
    this.drawHazardsOverlay();
  }

  /**
   * Set energy mode
   * Simulates different power modes affecting system behavior
   */
  setEnergyMode(mode: EnergyMode): void {
    console.log('Energy mode changed to:', mode);
    
    // In a real implementation, this would:
    // - Adjust CV processing frame rate
    // - Enable/disable AR rendering
    // - Change routing strategy
    
    // For demo purposes, we just log the change
    // The actual energy management is handled by the EnergyManager in the SDK
  }

  /**
   * Set battery level
   * Simulates battery level changes
   */
  setBatteryLevel(level: number): void {
    console.log('Battery level set to:', level);
    
    // In a real implementation, this would trigger power mode changes:
    // - Below 20%: low power mode
    // - Below 10%: critical mode
    
    // For demo purposes, we just log the change
  }

  /**
   * Start navigation route
   */
  startRoute(): void {
    this.isRouteActive = true;
    
    // If a scenario is active, draw the route
    if (this.currentScenario && this.currentScenario.route) {
      this.drawRouteOverlay();
    }
  }

  /**
   * Stop navigation route
   */
  stopRoute(): void {
    this.isRouteActive = false;
    
    // Redraw overlay without route
    this.drawHazardsOverlay();
  }

  /**
   * Simulate a hazard
   */
  simulateHazard(): void {
    const newHazard = generateRandomHazard();
    this.activeHazards.push(newHazard);
    this.currentHazardCount = this.activeHazards.length;
    
    // Redraw overlay with new hazard
    if (this.isRouteActive) {
      this.drawRouteOverlay();
    } else {
      this.drawHazardsOverlay();
    }
  }

  /**
   * Process a camera frame
   * Integrates with CV pipeline to analyze brightness and detect hazards
   */
  processFrame(frame: ImageData): void {
    try {
      // Update FPS calculation
      this.frameCount++;
      const now = Date.now();
      const elapsed = now - this.lastFrameTime;
      
      if (elapsed >= 1000) {
        this.currentFPS = (this.frameCount / elapsed) * 1000;
        this.frameCount = 0;
        this.lastFrameTime = now;
      }

      // Apply scenario effects if active
      let processedFrame = frame;
      if (this.currentScenario) {
        // Create a copy to avoid modifying original
        const frameCopy = new ImageData(
          new Uint8ClampedArray(frame.data),
          frame.width,
          frame.height
        );
        processedFrame = applyScenarioEffects(frameCopy, this.currentScenario);
      }

      // Compute brightness histogram
      const histogram = computeBrightnessHistogram(processedFrame);
      
      // Normalize mean luminance to 0-1 scale
      this.currentLightLevel = histogram.mean / 255;

      // Hazard count from active hazards
      this.currentHazardCount = this.activeHazards.length;
    } catch (error) {
      console.error('Error processing frame:', error);
    }
  }

  /**
   * Register callback for metrics updates
   */
  onMetricsUpdate(callback: (metrics: SystemMetrics) => void): void {
    this.metricsCallbacks.push(callback);
  }

  /**
   * Update and emit metrics
   */
  private updateMetrics(): void {
    // Get memory usage if available
    let memoryUsageMB = 0;
    if (performance && (performance as any).memory) {
      memoryUsageMB = (performance as any).memory.usedJSHeapSize / (1024 * 1024);
    }

    const metrics: SystemMetrics = {
      cvFPS: this.currentFPS,
      arFPS: 0, // Will be implemented in task 17.4
      lightLevel: this.currentLightLevel,
      hazardCount: this.currentHazardCount,
      memoryUsageMB,
    };

    this.metricsCallbacks.forEach(cb => cb(metrics));
  }

  /**
   * Draw hazards on the camera overlay
   */
  private drawHazardsOverlay(): void {
    if (!this.cameraController) {
      return;
    }

    this.cameraController.drawOverlay((ctx, width, height) => {
      // Draw each hazard
      this.activeHazards.forEach(hazard => {
        const x = hazard.position.x * width;
        const y = hazard.position.y * height;
        const size = hazard.size * Math.min(width, height);

        // Choose color based on hazard type
        let color = 'rgba(255, 0, 0, 0.6)';
        switch (hazard.type) {
          case 'obstacle':
            color = 'rgba(255, 100, 0, 0.6)';
            break;
          case 'uneven_surface':
            color = 'rgba(255, 200, 0, 0.6)';
            break;
          case 'drop_off':
            color = 'rgba(255, 0, 0, 0.8)';
            break;
          case 'unknown':
            color = 'rgba(150, 150, 150, 0.6)';
            break;
        }

        // Draw hazard marker
        ctx.fillStyle = color;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw confidence indicator
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '12px monospace';
        ctx.fillText(
          `${Math.round(hazard.confidence * 100)}%`,
          x - 15,
          y + size / 2 + 15
        );
      });
    });
  }

  /**
   * Draw route and hazards on the camera overlay
   */
  private drawRouteOverlay(): void {
    if (!this.cameraController || !this.currentScenario || !this.currentScenario.route) {
      return;
    }

    this.cameraController.drawOverlay((ctx, width, height) => {
      const route = this.currentScenario!.route!;

      // Draw route path
      ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 5]);

      ctx.beginPath();
      route.waypoints.forEach((waypoint, index) => {
        const x = waypoint.x * width;
        const y = waypoint.y * height;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw waypoints
      route.waypoints.forEach((waypoint, index) => {
        const x = waypoint.x * width;
        const y = waypoint.y * height;

        // Draw waypoint marker
        ctx.fillStyle = index === 0 ? 'rgba(0, 255, 0, 0.8)' : 
                        index === route.waypoints.length - 1 ? 'rgba(255, 0, 0, 0.8)' :
                        'rgba(0, 150, 255, 0.8)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(waypoint.label, x + 12, y + 5);
      });

      // Draw hazards on top
      this.activeHazards.forEach(hazard => {
        const x = hazard.position.x * width;
        const y = hazard.position.y * height;
        const size = hazard.size * Math.min(width, height);

        let color = 'rgba(255, 0, 0, 0.6)';
        switch (hazard.type) {
          case 'obstacle':
            color = 'rgba(255, 100, 0, 0.6)';
            break;
          case 'uneven_surface':
            color = 'rgba(255, 200, 0, 0.6)';
            break;
          case 'drop_off':
            color = 'rgba(255, 0, 0, 0.8)';
            break;
          case 'unknown':
            color = 'rgba(150, 150, 150, 0.6)';
            break;
        }

        ctx.fillStyle = color;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.metricsInterval !== null) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }
}
