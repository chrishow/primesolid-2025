/**
 * Manages audio effects for the TV component
 */
export class AudioManager {
  private clickSound: HTMLAudioElement;

  constructor() {
    this.clickSound = new Audio('/click.mp3');
    this.clickSound.preload = 'auto';
    this.clickSound.volume = 0.6;
  }

  /**
   * Plays the click sound effect
   */
  playClick(): void {
    // Reset playback to the beginning in case it's clicked rapidly
    this.clickSound.currentTime = 0;
    this.clickSound.play().catch(error => {
      console.warn('Failed to play click sound:', error);
    });
  }

  /**
   * Sets the volume for audio effects
   */
  setVolume(volume: number): void {
    this.clickSound.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Cleanup audio resources
   */
  dispose(): void {
    this.clickSound.pause();
    this.clickSound.src = '';
  }
}
