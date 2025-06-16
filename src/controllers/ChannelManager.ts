/**
 * Manages TV channel switching, configuration, and video playback
 */
import { ChannelConfig } from '../channelConfig';
import { TeletextEffect } from '../TeletextEffect';
import { ChannelDisplayEffect } from '../ChannelDisplayEffect';

export class ChannelManager {
  private channels: Map<number, ChannelConfig> = new Map();
  private currentChannel: number = 1;
  private videoElement: HTMLVideoElement;
  private teletextEffect: TeletextEffect;
  private channelDisplayEffect: ChannelDisplayEffect;
  private listingsButtons: NodeListOf<HTMLButtonElement>;
  private tvButtons: NodeListOf<HTMLButtonElement>;
  private channelDisplayTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    videoElement: HTMLVideoElement,
    teletextEffect: TeletextEffect,
    channelDisplayEffect: ChannelDisplayEffect,
    listingsButtons: NodeListOf<HTMLButtonElement>,
    tvButtons: NodeListOf<HTMLButtonElement>
  ) {
    this.videoElement = videoElement;
    this.teletextEffect = teletextEffect;
    this.channelDisplayEffect = channelDisplayEffect;
    this.listingsButtons = listingsButtons;
    this.tvButtons = tvButtons;
  }

  /**
   * Loads channel data from configuration
   */
  loadChannels(channelData: ChannelConfig[]): void {
    channelData.forEach(channel => {
      if (channel.number) {
        this.channels.set(channel.number, channel);
      } else {
        console.warn('Skipping channel due to missing number:', channel);
      }
    });
  }

  /**
   * Changes to the specified channel
   */
  changeChannel(channelNumber: number): void {
    const channelData = this.channels.get(channelNumber);
    const currentChannelData = this.channels.get(this.currentChannel);

    // Save current time of the video before changing the source
    if (this.videoElement.src && currentChannelData?.type === 'video') {
      const currentTime = this.videoElement.currentTime;
      currentChannelData.currentTime = currentTime;
    }

    if (channelData) {
      this.handleChannelContent(channelData);
    } else {
      console.warn(`Channel ${channelNumber} data not found.`);
      this.setDefaultState();
    }

    this.updateChannelDisplay(channelData?.name || '-');
    this.updateChannelButtons(channelNumber);
    this.currentChannel = channelNumber;
  }

  private handleChannelContent(channelData: ChannelConfig): void {
    if (channelData.type === 'teletext') {
      this.showTeletext();
    } else {
      this.showVideo(channelData);
    }
  }

  private showTeletext(): void {
    this.teletextEffect.show();
    this.videoElement.style.display = 'none';
    this.videoElement.pause();
  }

  private showVideo(channelData: ChannelConfig): void {
    this.teletextEffect.hide();
    this.videoElement.style.display = '';
    
    if (channelData.video) {
      this.videoElement.src = channelData.video;
      // Restore saved time if available
      this.videoElement.currentTime = channelData.currentTime ?? 0;
    } else {
      console.warn(`Channel ${channelData.number} is type 'video' but missing video source.`);
      this.videoElement.src = '';
    }
  }

  private setDefaultState(): void {
    this.videoElement.src = '';
    this.teletextEffect.hide();
    this.videoElement.style.display = '';
  }

  private updateChannelDisplay(channelName: string): void {
    this.channelDisplayEffect.setText(channelName);
    this.channelDisplayEffect.show();

    // Clear existing timeout
    if (this.channelDisplayTimeout) {
      clearTimeout(this.channelDisplayTimeout);
    }

    // Hide display after delay
    this.channelDisplayTimeout = setTimeout(() => {
      this.channelDisplayEffect.hide();
    }, 3000);
  }

  private updateChannelButtons(channelNumber: number): void {
    // Update listings buttons
    this.listingsButtons.forEach(button => {
      button.classList.remove('active');
    });
    document.querySelector(`.listings button[data-channel="${channelNumber}"]`)?.classList.add('active');

    // Update TV case buttons
    this.tvButtons.forEach(button => {
      button.classList.remove('down');
    });
    document.querySelector(`.tv button[data-channel="${channelNumber}"]`)?.classList.add('down');
  }

  /**
   * Gets the current channel number
   */
  getCurrentChannel(): number {
    return this.currentChannel;
  }

  /**
   * Gets channel data for a specific channel
   */
  getChannelData(channelNumber: number): ChannelConfig | undefined {
    return this.channels.get(channelNumber);
  }

  /**
   * Gets all available channels
   */
  getAllChannels(): Map<number, ChannelConfig> {
    return new Map(this.channels);
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.channelDisplayTimeout) {
      clearTimeout(this.channelDisplayTimeout);
    }
  }
}
