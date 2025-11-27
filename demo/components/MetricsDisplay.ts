/**
 * Metrics Display Component
 * Displays real-time system metrics
 */

export interface SystemMetrics {
  cvFPS: number;
  arFPS: number;
  lightLevel: number;
  hazardCount: number;
  memoryUsageMB: number;
}

/**
 * MetricsDisplay updates the metrics panel with real-time system data
 */
export class MetricsDisplay {
  private cvFpsEl: HTMLElement | null = null;
  private arFpsEl: HTMLElement | null = null;
  private lightLevelEl: HTMLElement | null = null;
  private hazardCountEl: HTMLElement | null = null;
  private memoryUsageEl: HTMLElement | null = null;

  /**
   * Initialize the metrics display
   */
  initialize(): void {
    this.cvFpsEl = document.getElementById('cv-fps');
    this.arFpsEl = document.getElementById('ar-fps');
    this.lightLevelEl = document.getElementById('light-level');
    this.hazardCountEl = document.getElementById('hazard-count');
    this.memoryUsageEl = document.getElementById('memory-usage');
  }

  /**
   * Update all metrics
   */
  update(metrics: SystemMetrics): void {
    if (this.cvFpsEl) {
      this.cvFpsEl.textContent = metrics.cvFPS.toFixed(1);
    }
    if (this.arFpsEl) {
      this.arFpsEl.textContent = metrics.arFPS.toFixed(1);
    }
    if (this.lightLevelEl) {
      this.lightLevelEl.textContent = metrics.lightLevel.toFixed(2);
    }
    if (this.hazardCountEl) {
      this.hazardCountEl.textContent = metrics.hazardCount.toString();
    }
    if (this.memoryUsageEl) {
      this.memoryUsageEl.textContent = `${metrics.memoryUsageMB.toFixed(1)} MB`;
    }
  }
}
