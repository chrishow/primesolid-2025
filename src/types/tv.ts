/**
 * TV-related type definitions and interfaces
 */

import { ChannelConfig } from '../channelConfig';

export interface TVElements {
  tvElement: HTMLElement;
  videoElement: HTMLVideoElement;
  noiseCanvas: HTMLCanvasElement;
  movieElement: HTMLElement;
  teletextCanvas: HTMLCanvasElement;
  channelDisplayCanvas: HTMLCanvasElement;
  knobElement: HTMLElement;
  buttons: NodeListOf<HTMLButtonElement>;
  listingsButtons: NodeListOf<HTMLButtonElement>;
}

export interface KnobState {
  currentAngle: number;
  isDragging: boolean;
  previousDragAngle: number;
  minAngle: number;
  maxAngle: number;
}

export interface EffectIntensity {
  noiseIntensity: number;
  glitchDelay: number;
}

export interface TVState {
  currentChannel: number;
  isGlitching: boolean;
  channels: Map<number, ChannelConfig>;
}
