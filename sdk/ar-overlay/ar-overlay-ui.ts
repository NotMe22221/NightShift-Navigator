/**
 * AR Overlay UI Implementation
 * Renders augmented reality navigation elements using WebXR and three.js
 */

import * as THREE from 'three';
import type { Route } from '../pathfinding/index.js';
import type { HazardDetection } from '../computer-vision/index.js';
import type { Position, DevicePose } from '../types/index.js';
import type { ARConfig, AROverlayUI, SpectralPathStyle, HazardMarker } from './index.js';
import { createSpectralPath, updateSpectralPathAnimation } from './spectral-path.js';
import { HazardMarkerManager, filterHazardsByDistance } from './hazard-markers.js';
import { createError, type ErrorHandler } from '../error-handling/index.js';

/**
 * AR Overlay UI implementation
 * Manages WebXR session and three.js rendering for AR navigation
 */
export class AROverlay implements AROverlayUI {
  private config: ARConfig;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  private xrSession: XRSession | null = null;
  private xrReferenceSpace: XRReferenceSpace | null = null;
  
  private currentRoute: Route | null = null;
  private currentHazards: HazardDetection[] = [];
  private spectralPathStyle: SpectralPathStyle;
  private lowLightWarningVisible: boolean = false;
  
  private isRunning: boolean = false;
  private frameCount: number = 0;
  private lastFPSUpdate: number = 0;
  private currentFPS: number = 0;
  private lastFrameTime: number = 0;
  
  // Adaptive rendering
  private renderingQuality: 'high' | 'medium' | 'low' = 'high';
  private fpsHistory: number[] = [];
  
  // Three.js objects
  private spectralPathMesh: THREE.Mesh | null = null;
  private hazardMarkerManager: HazardMarkerManager;
  private lowLightWarningElement: HTMLElement | null = null;
  
  // Device pose tracking
  private currentPose: DevicePose | null = null;
  private userPosition: Position = { latitude: 0, longitude: 0 };
  
  // Error handling and fallback
  private errorHandler: ErrorHandler | null = null;
  private fallbackCallback: (() => void) | null = null;
  private consecutiveRenderErrors: number = 0;
  private maxConsecutiveErrors: number = 5;
  private lastErrorTime: number = 0;
  
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.hazardMarkerManager = new HazardMarkerManager();
    
    // Default spectral path style
    this.spectralPathStyle = {
      color: '#00ffff',
      width: 0.5,
      opacity: 0.8,
      glowIntensity: 1.0,
      animationSpeed: 1.0
    };
    
    this.config = {
      targetFPS: 30,
      spectralPathEnabled: true,
      hazardMarkersEnabled: true,
      lowLightWarningsEnabled: true,
      maxPositionJitterCm: 5
    };
  }
  
  /**
   * Set error handler for AR failures
   */
  setErrorHandler(errorHandler: ErrorHandler): void {
    this.errorHandler = errorHandler;
  }
  
  /**
   * Set fallback callback to be invoked when AR fails
   * This callback should switch the system to audio-only mode
   */
  setFallbackCallback(callback: () => void): void {
    this.fallbackCallback = callback;
  }
  
  /**
   * Initialize the AR overlay with WebXR and three.js
   */
  async initialize(config: ARConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    
    try {
      // Check WebXR support
      if (!navigator.xr) {
        throw new Error('WebXR not supported in this browser');
      }
      
      const isARSupported = await navigator.xr.isSessionSupported('immersive-ar');
      if (!isARSupported) {
        throw new Error('AR mode not supported on this device');
      }
    } catch (error) {
      // Log AR initialization failure
      if (this.errorHandler) {
        const systemError = createError(
          'rendering_error',
          'critical',
          'AROverlay',
          `AR initialization failed: ${error}`,
          { error }
        );
        await this.errorHandler.handleError(systemError);
      }
      
      // Trigger fallback to audio-only mode
      this.triggerFallback('AR initialization failed');
      throw error;
    }
    
    // Initialize three.js renderer
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    
    // Set up scene lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 10);
    this.scene.add(directionalLight);
    
    // Create low-light warning element
    if (this.config.lowLightWarningsEnabled) {
      this.createLowLightWarningElement();
    }
  }
  
  /**
   * Start the AR session and rendering loop
   */
  async start(): Promise<void> {
    if (!this.renderer) {
      throw new Error('AR overlay not initialized');
    }
    
    if (this.isRunning) {
      return;
    }
    
    try {
      // Request AR session
      this.xrSession = await navigator.xr!.requestSession('immersive-ar', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['dom-overlay']
      });
      
      // Set up XR reference space
      this.xrReferenceSpace = await this.xrSession.requestReferenceSpace('local-floor');
      
      // Configure renderer for XR
      await this.renderer.xr.setSession(this.xrSession);
      
      // Set up animation loop
      this.renderer.setAnimationLoop(this.render.bind(this));
      
      this.isRunning = true;
      this.lastFPSUpdate = performance.now();
      
      // Handle session end
      this.xrSession.addEventListener('end', () => {
        this.isRunning = false;
        this.xrSession = null;
        this.xrReferenceSpace = null;
      });
      
    } catch (error) {
      // Log AR session start failure
      if (this.errorHandler) {
        const systemError = createError(
          'rendering_error',
          'critical',
          'AROverlay',
          `Failed to start AR session: ${error}`,
          { error }
        );
        await this.errorHandler.handleError(systemError);
      }
      
      // Trigger fallback to audio-only mode
      this.triggerFallback('AR session start failed');
      throw new Error(`Failed to start AR session: ${error}`);
    }
  }
  
  /**
   * Stop the AR session and rendering
   */
  stop(): void {
    if (this.xrSession) {
      this.xrSession.end();
    }
    
    if (this.renderer) {
      this.renderer.setAnimationLoop(null);
    }
    
    // Clear hazard markers
    this.hazardMarkerManager.clear(this.scene);
    
    this.isRunning = false;
  }
  
  /**
   * Update the navigation route
   */
  updateRoute(route: Route): void {
    this.currentRoute = route;
    
    if (this.config.spectralPathEnabled) {
      this.updateSpectralPath();
    }
  }
  
  /**
   * Update hazard markers
   */
  updateHazards(hazards: HazardDetection[]): void {
    this.currentHazards = hazards;
    
    if (this.config.hazardMarkersEnabled) {
      this.updateHazardMarkers();
    }
  }
  
  /**
   * Set low-light warning visibility
   */
  setLowLightWarning(visible: boolean): void {
    this.lowLightWarningVisible = visible;
    
    if (this.lowLightWarningElement) {
      this.lowLightWarningElement.style.display = visible ? 'block' : 'none';
    }
  }
  
  /**
   * Set spectral path style
   */
  setSpectralPathStyle(style: SpectralPathStyle): void {
    this.spectralPathStyle = { ...this.spectralPathStyle, ...style };
    
    if (this.spectralPathMesh) {
      this.updateSpectralPath();
    }
  }
  
  /**
   * Get current rendering FPS
   */
  getCurrentFPS(): number {
    return this.currentFPS;
  }
  
  /**
   * Main rendering loop
   */
  private render(timestamp: number, frame?: XRFrame): void {
    if (!this.renderer || !this.xrSession || !this.xrReferenceSpace) {
      return;
    }
    
    try {
      // Calculate delta time
      const deltaTime = this.lastFrameTime > 0 ? (timestamp - this.lastFrameTime) / 1000 : 0;
      this.lastFrameTime = timestamp;
      
      // Update FPS counter
      this.frameCount++;
      const elapsed = timestamp - this.lastFPSUpdate;
      if (elapsed >= 1000) {
        this.currentFPS = (this.frameCount * 1000) / elapsed;
        this.frameCount = 0;
        this.lastFPSUpdate = timestamp;
        
        // Track FPS history for adaptive rendering
        this.fpsHistory.push(this.currentFPS);
        if (this.fpsHistory.length > 5) {
          this.fpsHistory.shift();
        }
        
        // Adjust rendering quality based on FPS
        this.adjustRenderingQuality();
      }
      
      // Get device pose from XR frame
      if (frame) {
        const pose = frame.getViewerPose(this.xrReferenceSpace);
        if (pose) {
          this.updateDevicePose(pose);
        }
      }
      
      // Update animations
      if (this.spectralPathMesh && deltaTime > 0) {
        updateSpectralPathAnimation(this.spectralPathMesh, deltaTime);
      }
      
      // Render the scene
      this.renderer.render(this.scene, this.camera);
      
      // Reset error counter on successful render
      this.consecutiveRenderErrors = 0;
      
    } catch (error) {
      // Handle rendering errors
      this.handleRenderError(error);
    }
  }
  
  /**
   * Update device pose from XR viewer pose
   */
  private updateDevicePose(viewerPose: XRViewerPose): void {
    const transform = viewerPose.transform;
    const position = transform.position;
    const orientation = transform.orientation;
    
    // Convert quaternion to Euler angles
    const euler = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion(orientation.x, orientation.y, orientation.z, orientation.w)
    );
    
    this.currentPose = {
      position: {
        latitude: 0, // Will be updated with GPS data
        longitude: 0,
        altitude: position.y
      },
      orientation: {
        pitch: THREE.MathUtils.radToDeg(euler.x),
        yaw: THREE.MathUtils.radToDeg(euler.y),
        roll: THREE.MathUtils.radToDeg(euler.z)
      },
      timestamp: performance.now()
    };
  }
  
  /**
   * Update spectral path visualization
   */
  private updateSpectralPath(): void {
    // Remove existing path
    if (this.spectralPathMesh) {
      this.scene.remove(this.spectralPathMesh);
      this.spectralPathMesh = null;
    }
    
    if (!this.currentRoute || this.currentRoute.nodes.length < 2) {
      return;
    }
    
    try {
      // Create new spectral path mesh
      this.spectralPathMesh = createSpectralPath(this.currentRoute, this.spectralPathStyle);
      this.scene.add(this.spectralPathMesh);
    } catch (error) {
      console.error('Failed to create spectral path:', error);
    }
  }
  
  /**
   * Update hazard markers
   */
  private updateHazardMarkers(): void {
    if (!this.currentRoute || this.currentRoute.nodes.length === 0) {
      return;
    }
    
    // Filter hazards within 20 meters
    const nearbyHazards = filterHazardsByDistance(
      this.currentHazards,
      this.userPosition,
      20 // 20 meters
    );
    
    // Use first route node as origin for coordinate conversion
    const origin = this.currentRoute.nodes[0].position;
    
    // Update markers with Kalman filtering
    this.hazardMarkerManager.updateMarkers(
      nearbyHazards,
      this.userPosition,
      origin,
      this.scene,
      this.config.maxPositionJitterCm
    );
  }
  
  /**
   * Create low-light warning UI element
   */
  private createLowLightWarningElement(): void {
    this.lowLightWarningElement = document.createElement('div');
    this.lowLightWarningElement.id = 'low-light-warning';
    this.lowLightWarningElement.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 165, 0, 0.9);
      color: white;
      padding: 15px 30px;
      border-radius: 10px;
      font-size: 18px;
      font-weight: bold;
      display: none;
      z-index: 1000;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    `;
    this.lowLightWarningElement.textContent = '⚠️ Low Light Conditions';
    
    document.body.appendChild(this.lowLightWarningElement);
  }
  
  /**
   * Adjust rendering quality based on FPS performance
   */
  private adjustRenderingQuality(): void {
    if (!this.renderer) {
      return;
    }
    
    // Calculate average FPS from history
    const avgFPS = this.fpsHistory.length > 0
      ? this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length
      : this.currentFPS;
    
    // Adjust quality based on FPS thresholds
    if (avgFPS < 30 && this.renderingQuality !== 'low') {
      this.renderingQuality = 'low';
      this.applyRenderingQuality();
    } else if (avgFPS >= 30 && avgFPS < 45 && this.renderingQuality !== 'medium') {
      this.renderingQuality = 'medium';
      this.applyRenderingQuality();
    } else if (avgFPS >= 45 && this.renderingQuality !== 'high') {
      this.renderingQuality = 'high';
      this.applyRenderingQuality();
    }
  }
  
  /**
   * Apply rendering quality settings
   */
  private applyRenderingQuality(): void {
    if (!this.renderer) {
      return;
    }
    
    switch (this.renderingQuality) {
      case 'low':
        // Reduce pixel ratio (antialiasing is set at initialization)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio * 0.5, 1));
        
        // Reduce spectral path segments if present
        if (this.spectralPathMesh) {
          const material = this.spectralPathMesh.material as THREE.MeshStandardMaterial;
          material.emissiveIntensity *= 0.7;
        }
        break;
        
      case 'medium':
        // Use moderate pixel ratio
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio * 0.75, 1.5));
        break;
        
      case 'high':
        // Use full quality
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // Restore spectral path intensity if present
        if (this.spectralPathMesh) {
          const material = this.spectralPathMesh.material as THREE.MeshStandardMaterial;
          material.emissiveIntensity = this.spectralPathStyle.glowIntensity;
        }
        break;
    }
  }
  
  /**
   * Implement level-of-detail for distant objects
   */
  private applyLevelOfDetail(): void {
    if (!this.currentPose) {
      return;
    }
    
    const cameraPosition = new THREE.Vector3(
      this.currentPose.position.longitude,
      this.currentPose.position.altitude || 0,
      this.currentPose.position.latitude
    );
    
    // Apply LOD to hazard markers
    for (const marker of this.hazardMarkerManager['markers'].values()) {
      const distance = marker.position.distanceTo(cameraPosition);
      
      // Reduce detail for distant markers
      if (distance > 10) {
        marker.visible = this.renderingQuality !== 'low';
      } else if (distance > 5) {
        marker.scale.setScalar(this.renderingQuality === 'high' ? 1 : 0.7);
      } else {
        marker.visible = true;
        marker.scale.setScalar(1);
      }
    }
  }
  
  /**
   * Handle rendering errors and trigger fallback if necessary
   */
  private handleRenderError(error: any): void {
    const now = Date.now();
    
    // Increment consecutive error counter
    this.consecutiveRenderErrors++;
    
    // Log the error
    if (this.errorHandler) {
      const systemError = createError(
        'rendering_error',
        this.consecutiveRenderErrors >= this.maxConsecutiveErrors ? 'critical' : 'warning',
        'AROverlay',
        `Rendering error: ${error}`,
        { 
          error,
          consecutiveErrors: this.consecutiveRenderErrors,
          timeSinceLastError: this.lastErrorTime > 0 ? now - this.lastErrorTime : 0
        }
      );
      
      // Fire and forget - don't await to avoid blocking render loop
      this.errorHandler.handleError(systemError).catch(console.error);
    }
    
    this.lastErrorTime = now;
    
    // If we've had too many consecutive errors, trigger fallback
    if (this.consecutiveRenderErrors >= this.maxConsecutiveErrors) {
      this.triggerFallback('Too many consecutive rendering errors');
    }
  }
  
  /**
   * Trigger fallback to audio-only mode
   */
  private triggerFallback(reason: string): void {
    console.warn(`AR fallback triggered: ${reason}`);
    
    // Stop AR rendering
    try {
      this.stop();
    } catch (error) {
      console.error('Error stopping AR during fallback:', error);
    }
    
    // Invoke fallback callback if registered
    if (this.fallbackCallback) {
      try {
        this.fallbackCallback();
      } catch (error) {
        console.error('Error invoking fallback callback:', error);
      }
    }
    
    // Log fallback event
    if (this.errorHandler) {
      const systemError = createError(
        'rendering_error',
        'critical',
        'AROverlay',
        `AR fallback to audio-only mode: ${reason}`,
        { reason, consecutiveErrors: this.consecutiveRenderErrors }
      );
      
      this.errorHandler.handleError(systemError).catch(console.error);
    }
  }
}
