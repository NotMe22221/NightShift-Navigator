/**
 * Audio System Core
 * Manages Web Audio API context and priority queue for audio cues
 */

import { AudioConfig, AudioCue, AudioAccessibilityLayer } from './index.js';

/**
 * Priority queue for managing audio cues
 * Higher priority cues are processed first
 */
class PriorityQueue<T extends { priority: number }> {
  private items: T[] = [];

  enqueue(item: T): void {
    if (this.items.length === 0) {
      this.items.push(item);
      return;
    }

    // Insert item in priority order (higher priority first)
    let inserted = false;
    for (let i = 0; i < this.items.length; i++) {
      if (item.priority > this.items[i].priority) {
        this.items.splice(i, 0, item);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.items.push(item);
    }
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  peek(): T | undefined {
    return this.items[0];
  }

  get length(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }

  toArray(): T[] {
    return [...this.items];
  }
}

/**
 * Audio System implementation
 * Provides text-to-speech and spatial audio capabilities
 */
/**
 * Audio system implementation for accessibility
 * Provides spoken navigation cues and directional audio pings
 */
export class AudioSystem implements AudioAccessibilityLayer {
  private config: AudioConfig;
  private audioContext: AudioContext | null = null;
  private cueQueue: PriorityQueue<AudioCue>;
  private isActive: boolean = false;
  private isProcessing: boolean = false;
  private speechSynthesis: SpeechSynthesis | null = null;

  constructor() {
    this.config = {
      speechRate: 1.0,
      volume: 1.0,
      directionalAudioEnabled: true,
      prioritizeSafetyCues: true,
    };
    this.cueQueue = new PriorityQueue<AudioCue>();
  }

  async initialize(config: AudioConfig): Promise<void> {
    // Validate configuration
    if (config.speechRate < 0.5 || config.speechRate > 2.0) {
      throw new Error('Speech rate must be between 0.5 and 2.0');
    }
    if (config.volume < 0 || config.volume > 1) {
      throw new Error('Volume must be between 0 and 1');
    }

    this.config = { ...config };

    // Initialize Web Audio API context
    if (typeof AudioContext !== 'undefined') {
      this.audioContext = new AudioContext();
    } else if (typeof (window as any).webkitAudioContext !== 'undefined') {
      this.audioContext = new (window as any).webkitAudioContext();
    } else {
      throw new Error('Web Audio API not supported');
    }

    // Initialize Speech Synthesis API
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
    } else {
      throw new Error('Speech Synthesis API not supported');
    }
  }

  start(): void {
    if (!this.audioContext || !this.speechSynthesis) {
      throw new Error('Audio system not initialized');
    }

    this.isActive = true;

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Start processing queue
    this.processQueue();
  }

  stop(): void {
    this.isActive = false;

    // Cancel any ongoing speech
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }

    // Suspend audio context
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }

  queueCue(cue: AudioCue): void {
    this.cueQueue.enqueue(cue);

    // If not currently processing, start processing
    if (this.isActive && !this.isProcessing) {
      this.processQueue();
    }
  }

  setSpeechRate(rate: number): void {
    if (rate < 0.5 || rate > 2.0) {
      throw new Error('Speech rate must be between 0.5 and 2.0');
    }
    this.config.speechRate = rate;
  }

  setVolume(volume: number): void {
    if (volume < 0 || volume > 1) {
      throw new Error('Volume must be between 0 and 1');
    }
    this.config.volume = volume;
  }

  clearQueue(): void {
    this.cueQueue.clear();
  }

  /**
   * Get the current queue length
   */
  getQueueLength(): number {
    return this.cueQueue.length;
  }

  /**
   * Get the audio context (for testing)
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Process the cue queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isActive) {
      return;
    }

    this.isProcessing = true;

    while (this.isActive && this.cueQueue.length > 0) {
      const cue = this.cueQueue.dequeue();
      if (cue) {
        await this.processCue(cue);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Process a single audio cue
   */
  private async processCue(cue: AudioCue): Promise<void> {
    if (cue.message) {
      // Spoken cue
      await this.speakMessage(cue.message);
    }

    if (cue.direction !== undefined && this.config.directionalAudioEnabled) {
      // Directional audio ping
      await this.playDirectionalPing(cue.direction, cue.type);
    }
  }

  /**
   * Speak a message using text-to-speech
   */
  private async speakMessage(message: string): Promise<void> {
    if (!this.speechSynthesis) {
      return;
    }

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = this.config.speechRate;
      utterance.volume = this.config.volume;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve(); // Resolve even on error to continue processing

      this.speechSynthesis!.speak(utterance);
    });
  }

  /**
   * Play a directional audio ping
   */
  private async playDirectionalPing(
    direction: number,
    cueType: AudioCue['type']
  ): Promise<void> {
    if (!this.audioContext) {
      return;
    }

    // Create oscillator for ping sound
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const panner = this.audioContext.createPanner();

    // Configure panner for spatial audio
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 10000;
    panner.rolloffFactor = 1;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 0;
    panner.coneOuterGain = 0;

    // Convert direction (degrees) to 3D position
    const radians = (direction * Math.PI) / 180;
    const distance = 5; // meters
    const x = Math.sin(radians) * distance;
    const z = -Math.cos(radians) * distance;
    panner.setPosition(x, 0, z);

    // Set frequency based on cue type
    let frequency = 440; // Default A4
    switch (cueType) {
      case 'hazard':
        frequency = 880; // A5 - higher pitch for hazards
        break;
      case 'warning':
        frequency = 660; // E5 - medium-high pitch for warnings
        break;
      case 'waypoint':
        frequency = 523; // C5 - medium pitch for waypoints
        break;
      case 'navigation':
        frequency = 440; // A4 - standard pitch for navigation
        break;
    }

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    // Configure envelope
    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.config.volume * 0.3, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.audioContext.destination);

    // Play ping
    oscillator.start(now);
    oscillator.stop(now + 0.3);

    // Wait for ping to complete
    return new Promise((resolve) => {
      setTimeout(resolve, 300);
    });
  }
}
