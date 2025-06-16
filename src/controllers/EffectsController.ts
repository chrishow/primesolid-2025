/**
 * Manages visual effects like VCR noise and glitch animations
 */
import { setVCRNoiseIntensity } from '../vcrNoise';

export class EffectsController {
  private movieElement: HTMLElement;
  private isGlitching: boolean = false;
  private glitchTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // Effect configuration
  private readonly MIN_GLITCH_DELAY = 200; // ms (frequent glitch)
  private readonly MAX_GLITCH_DELAY = 5000; // ms (infrequent glitch)
  private readonly GLITCH_ANIMATION_DURATION = 300; // ms

  constructor(movieElement: HTMLElement) {
    this.movieElement = movieElement;
  }

  /**
   * Updates all effects based on the knob intensity (0-1)
   */
  updateEffects(normalizedIntensity: number): void {
    this.updateVCRNoise(normalizedIntensity);
    this.updateGlitchFrequency(normalizedIntensity);
  }

  private updateVCRNoise(intensity: number): void {
    setVCRNoiseIntensity(intensity);
  }

  private updateGlitchFrequency(intensity: number): void {
    // Clear existing glitch timeout
    if (this.glitchTimeout) {
      clearTimeout(this.glitchTimeout);
      this.glitchTimeout = null;
    }

    if (intensity <= 0.01) {
      // If intensity is near zero, ensure glitch classes are removed
      this.stopGlitch();
      return;
    }

    // Schedule the next glitch if not already glitching
    if (!this.isGlitching) {
      const glitchDelay = this.calculateGlitchDelay(intensity);
      this.glitchTimeout = setTimeout(() => {
        this.triggerGlitch();
      }, glitchDelay);
    }
  }

  private calculateGlitchDelay(intensity: number): number {
    // Map intensity (0-1) to delay (e.g., 5s to 0.2s)
    const glitchDelayRange = this.MAX_GLITCH_DELAY - this.MIN_GLITCH_DELAY;
    // Invert intensity so 0 intensity = max delay, 1 intensity = min delay
    return this.MAX_GLITCH_DELAY - (intensity * glitchDelayRange);
  }

  private triggerGlitch(): void {
    if (this.isGlitching) return; // Don't trigger if already running

    this.isGlitching = true;

    // Randomly choose glitch type (1 or 2)
    const glitchType = Math.random() < 0.5 ? 1 : 2;
    const glitchClass = `is-glitching-${glitchType}`;

    this.movieElement.classList.add(glitchClass);

    // Remove the class after the animation completes
    setTimeout(() => {
      this.movieElement.classList.remove(glitchClass);
      this.isGlitching = false;
      // Note: The knob controller will call updateEffects again to schedule next glitch
    }, this.GLITCH_ANIMATION_DURATION);
  }

  private stopGlitch(): void {
    this.movieElement.classList.remove('is-glitching-1', 'is-glitching-2');
    this.isGlitching = false;
  }

  /**
   * Gets the current glitch state
   */
  isCurrentlyGlitching(): boolean {
    return this.isGlitching;
  }

  /**
   * Forces a glitch effect (for testing or manual triggering)
   */
  forceGlitch(): void {
    if (!this.isGlitching) {
      this.triggerGlitch();
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.glitchTimeout) {
      clearTimeout(this.glitchTimeout);
    }
    this.stopGlitch();
  }
}
