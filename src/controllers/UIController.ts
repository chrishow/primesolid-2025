/**
 * Manages UI interactions and event handling for the TV component
 */
import { TVElements } from '../types/tv';

export class UIController {
  private elements: TVElements;
  private onChannelChange: (channel: number) => void;
  private onPlayClick: () => void;

  constructor(
    elements: TVElements, 
    onChannelChange: (channel: number) => void,
    onPlayClick: () => void
  ) {
    this.elements = elements;
    this.onChannelChange = onChannelChange;
    this.onPlayClick = onPlayClick;
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.setupTVButtons();
    this.setupListingsButtons();
  }

  private setupTVButtons(): void {
    this.elements.tvElement.addEventListener('mousedown', (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('.tv-case button');
      if (button) {
        const channel = parseInt(button.dataset.channel || '1', 10);
        this.handleChannelButtonClick(channel);
      }
    });
  }

  private setupListingsButtons(): void {
    this.elements.listingsButtons.forEach((button) => {
      button.addEventListener('click', (event) => {
        const channel = parseInt((event.target as HTMLButtonElement).dataset.channel || '1', 10);
        this.handleListingsButtonClick(channel);
      });
    });
  }

  private handleChannelButtonClick(channel: number): void {
    this.onPlayClick(); // Play click sound
    this.onChannelChange(channel);
  }

  private handleListingsButtonClick(channel: number): void {
    this.onPlayClick(); // Play click sound
    this.onChannelChange(channel);
    
    // Scroll TV into view
    document.querySelector('.projects')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  /**
   * Updates button states to reflect current channel
   */
  updateButtonStates(currentChannel: number): void {
    // Remove active states from all buttons
    this.elements.listingsButtons.forEach((button) => {
      button.classList.remove('active');
    });
    this.elements.buttons.forEach((button) => {
      button.classList.remove('down');
    });

    // Add active state to current channel buttons
    document.querySelector(`.listings button[data-channel="${currentChannel}"]`)?.classList.add('active');
    document.querySelector(`.tv button[data-channel="${currentChannel}"]`)?.classList.add('down');
  }

  /**
   * Cleanup event listeners
   */
  dispose(): void {
    // Event listeners are attached to elements that will be removed with the component
    // No explicit cleanup needed for these addEventListener calls
  }
}
