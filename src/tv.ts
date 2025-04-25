import { generateVCRNoise } from './vcrNoise';

// Define the structure of a channel object
interface Channel {
    number: number;
    name: string;
    type: string; // 'video' or 'teletext'
    video?: string;
    link?: string;
    currentTime?: number; // Optional property to store the current playback time
}

// Extend the Window interface to include our custom 'channels' property
declare global {
    interface Window {
        channels?: Channel[];
    }
}


export class TV {
    private tvElement: HTMLElement;
    private videoElement: HTMLVideoElement;
    private noiseCanvas: HTMLCanvasElement;
    private currentChannel: number = 1;
    private buttons: NodeListOf<HTMLButtonElement>;
    private channelDisplay: HTMLElement;
    private channels: Map<number, Channel> = new Map(); // Changed value type to Channel
    private clickSound: HTMLAudioElement;
    private channelDisplayTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        this.tvElement = document.querySelector('.tv') as HTMLElement;
        this.videoElement = this.tvElement.querySelector('video') as HTMLVideoElement;
        this.noiseCanvas = this.tvElement.querySelector('.noise-canvas') as HTMLCanvasElement;
        this.buttons = this.tvElement.querySelectorAll('.tv-case button') as NodeListOf<HTMLButtonElement>;
        this.channelDisplay = this.tvElement.querySelector('.channel-display') as HTMLElement;

        this.clickSound = new Audio('src/i/click.mp3');
        this.clickSound.preload = 'auto'; // Hint to the browser to load it
        this.clickSound.volume = 0.6; // Set volume to 50%

        this.setupChannels();
        this.changeChannel(this.currentChannel); // Load initial channel video

        generateVCRNoise(this.noiseCanvas);
    }

    private playClickSound() {
        // Reset playback to the beginning in case it's clicked rapidly
        this.clickSound.currentTime = 0;
        this.clickSound.play().catch(error => {
            // Autoplay might be blocked initially, handle potential errors
            console.error("Error playing click sound:", error);
        });
    }

    private changeChannel(channelNumber: number) {
        const channelData = this.channels.get(channelNumber);
        const currentChannelData = this.channels.get(this.currentChannel);

        // Save current time of the video before changing the source
        if (this.videoElement.src) {
            const currentTime = this.videoElement.currentTime;
            currentChannelData!.currentTime = currentTime; // Save the current time to the channel data
        }

        if (channelData && channelData.video) {
            this.videoElement.src = channelData.video;
            if (channelData.currentTime) {
                this.videoElement.currentTime = channelData.currentTime; // Set the video to the saved time
            }
            // this.videoElement.play().catch(e => console.error("Video play failed", e));
        } else {
            // Handle cases where channel data or video source is missing
            console.warn(`Channel ${channelNumber} data or video source not found.`);
            this.videoElement.src = ''; // Clear the video source or show static/default image
        }
        this.channelDisplay.textContent = channelData?.name || '-';
        this.channelDisplay.classList.add('visible');

        this.currentChannel = channelNumber;


        if (this.channelDisplayTimeout) {
            clearTimeout(this.channelDisplayTimeout); // Clear any existing timeout
        }

        this.channelDisplayTimeout = setTimeout(() => {
            this.channelDisplay.classList.remove('visible');
        }, 3000); // Remove after delay
    }


    private setupChannels() {
        // Bind event listeners to buttons
        this.tvElement.addEventListener('mousedown', (e) => {
            const button: HTMLElement = (e.target as Element).closest('.tv-case button')!;
            if (button) { // Check if a button was clicked or something inside it
                const channel = parseInt(button.dataset.channel || '1', 10);
                if (this.currentChannel !== channel) {
                    // Remove 'down' state from all buttons
                    this.buttons.forEach((btn) => {
                        btn.classList.remove('down');
                    });
                    // Add 'down' state to the clicked button
                    button.classList.add('down');

                    this.playClickSound();

                    // Change the channel source
                    this.changeChannel(channel);
                }
            }
        });

        // Load channel data from the global window.channels variable
        if (window.channels && Array.isArray(window.channels)) {
            window.channels.forEach(channel => {
                if (channel.number) { // Check if channel number exists
                    this.channels.set(channel.number, channel); // Store the whole channel object
                } else {
                    console.warn('Skipping channel due to missing number:', channel);
                }
            });
            console.log('Available channels loaded from window.channels:', this.channels);
        } else {
            console.warn("window.channels is not defined or not an array.");
        }
    }
}
