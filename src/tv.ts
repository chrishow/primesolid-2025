import { generateVCRNoise } from './vcrNoise';
import { ChannelDisplayEffect } from './ChannelDisplayEffect';
import { TeletextEffect } from './TeletextEffect';
import { channels as channelData } from './channelConfig';
import { TVElements } from './types/tv';
import { 
  AudioManager, 
  ChannelManager, 
  EffectsController, 
  KnobController, 
  UIController 
} from './controllers';

/**
 * Main TV component that coordinates all TV functionality
 * This class now acts as a coordinator between specialized controllers
 */
export class TV {
    private elements: TVElements;
    private channelDisplayEffect: ChannelDisplayEffect;
    private teletextEffect: TeletextEffect;
    
    // Controllers
    private audioManager: AudioManager;
    private channelManager: ChannelManager;
    private effectsController: EffectsController;
    private knobController: KnobController;
    private uiController: UIController;

    constructor() {
        // Initialize DOM elements
        this.elements = this.initializeElements();
        
        // Initialize WebGL effects
        this.channelDisplayEffect = new ChannelDisplayEffect(this.elements.channelDisplayCanvas);
        this.teletextEffect = new TeletextEffect(this.elements.teletextCanvas);
        
        // Initialize controllers
        this.audioManager = new AudioManager();
        this.channelManager = new ChannelManager(
            this.elements.videoElement,
            this.teletextEffect,
            this.channelDisplayEffect,
            this.elements.listingsButtons,
            this.elements.buttons
        );
        this.effectsController = new EffectsController(this.elements.movieElement);
        this.knobController = new KnobController(
            this.elements.knobElement,
            (angle) => this.handleKnobAngleChange(angle)
        );
        this.uiController = new UIController(
            this.elements,
            (channel) => this.handleChannelChange(channel),
            () => this.audioManager.playClick()
        );
        
        // Setup initial state
        this.channelManager.loadChannels(channelData);
        this.channelManager.changeChannel(1); // Load initial channel
        generateVCRNoise(this.elements.noiseCanvas);
        
        // Initialize effects with current knob position
        this.handleKnobAngleChange(this.knobController.getCurrentAngle());
    }

    private initializeElements(): TVElements {
        const tvElement = document.querySelector('.tv') as HTMLElement;
        if (!tvElement) {
            throw new Error('TV element not found');
        }

        const teletextCanvas = tvElement.querySelector('.teletext-canvas') as HTMLCanvasElement;
        if (!teletextCanvas) {
            throw new Error('Teletext canvas element not found');
        }

        return {
            tvElement,
            videoElement: tvElement.querySelector('video') as HTMLVideoElement,
            noiseCanvas: tvElement.querySelector('.noise-canvas') as HTMLCanvasElement,
            movieElement: tvElement.querySelector('.movie') as HTMLElement,
            teletextCanvas,
            channelDisplayCanvas: tvElement.querySelector('.channel-display-canvas') as HTMLCanvasElement,
            knobElement: tvElement.querySelector('.knob-spot') as HTMLElement,
            buttons: tvElement.querySelectorAll('.tv-case button') as NodeListOf<HTMLButtonElement>,
            listingsButtons: document.querySelectorAll('.listings button') as NodeListOf<HTMLButtonElement>,
        };
    }

    private handleKnobAngleChange(_angle: number): void {
        // Safety check to ensure controllers are initialized
        if (!this.knobController || !this.effectsController) {
            return;
        }
        
        const intensity = this.knobController.getNormalizedIntensity();
        this.effectsController.updateEffects(intensity);
    }

    private handleChannelChange(channel: number): void {
        const currentChannel = this.channelManager.getCurrentChannel();
        if (currentChannel !== channel) {
            this.channelManager.changeChannel(channel);
        }
    }

    /**
     * Cleanup resources when TV component is destroyed
     */
    dispose(): void {
        this.audioManager.dispose();
        this.channelManager.dispose();
        this.effectsController.dispose();
        this.knobController.dispose();
        this.uiController.dispose();
    }
}
