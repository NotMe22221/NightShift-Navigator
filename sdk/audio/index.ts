/**
 * Audio Accessibility Layer
 * Provides spoken navigation and directional audio cues
 */

export interface AudioConfig {
  speechRate: number; // 0.5-2.0x
  volume: number; // 0-1
  directionalAudioEnabled: boolean;
  prioritizeSafetyCues: boolean;
}

export interface AudioCue {
  id: string;
  type: 'navigation' | 'hazard' | 'waypoint' | 'warning';
  priority: number; // 0-10, higher = more important
  message?: string; // for spoken cues
  direction?: number; // degrees, for directional pings
  timestamp: number;
}

export interface AudioAccessibilityLayer {
  initialize(config: AudioConfig): Promise<void>;
  start(): void;
  stop(): void;
  queueCue(cue: AudioCue): void;
  setSpeechRate(rate: number): void;
  setVolume(volume: number): void;
  clearQueue(): void;
}

export { AudioSystem } from './audio-system.js';
export {
  generateNavigationCue,
  generateRerouteCue,
  generateArrivalCue,
  type RouteChange,
} from './navigation-cues.js';
export {
  generateHazardAudioCue,
  generateWarningCue,
  generateHazardCues,
  type HazardInfo,
} from './hazard-audio.js';
export {
  WaypointTracker,
  generateWaypointDistanceCue,
  updatePositionAndGenerateAnnouncements,
  calculateDistance,
  type Position,
  type Waypoint,
} from './waypoint-announcements.js';
