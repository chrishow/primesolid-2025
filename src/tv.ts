import { generateVCRNoise, setVCRNoiseIntensity } from './vcrNoise';
import { ChannelDisplayEffect } from './channelDisplayEffect'; // Import the new class
import { TeletextEffect } from './teletextEffect'; // Import the Teletext effect class

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
    private movieElement: HTMLElement;
    private teletextCanvas: HTMLCanvasElement; // Reference to the new teletext canvas
    private currentChannel: number = 4;
    private buttons: NodeListOf<HTMLButtonElement>;
    private channelDisplayCanvas: HTMLCanvasElement; // Reference to the new canvas
    private channelDisplayEffect: ChannelDisplayEffect; // Instance of the effect class
    private teletextEffect: TeletextEffect; // Instance of the Teletext effect class
    private channels: Map<number, Channel> = new Map(); // Changed value type to Channel
    private clickSound: HTMLAudioElement;
    private channelDisplayTimeout: ReturnType<typeof setTimeout> | null = null;
    private glitchTimeout: ReturnType<typeof setTimeout> | null = null; // Added for glitch control
    private isGlitching: boolean = false; // Track if glitch animation is active

    // Knob related properties
    private knobElement: HTMLElement;
    private isDraggingKnob: boolean = false;
    private knobPreviousDragAngle: number = 0; // Angle during the previous move event
    private knobCurrentAngle: number = 0; // Current rotation angle of the knob
    private minKnobAngle: number = -90; // Minimum rotation angle
    private maxKnobAngle: number = 90;  // Maximum rotation angle (180 degree range)

    constructor() {
        this.tvElement = document.querySelector('.tv') as HTMLElement;
        this.videoElement = this.tvElement.querySelector('video') as HTMLVideoElement;
        this.noiseCanvas = this.tvElement.querySelector('.noise-canvas') as HTMLCanvasElement;
        this.movieElement = this.tvElement.querySelector('.movie') as HTMLElement;
        this.teletextCanvas = this.tvElement.querySelector('.teletext-canvas') as HTMLCanvasElement; // Re-add this line
        this.buttons = this.tvElement.querySelectorAll('.tv-case button') as NodeListOf<HTMLButtonElement>;
        this.channelDisplayCanvas = this.tvElement.querySelector('.channel-display-canvas') as HTMLCanvasElement;
        this.knobElement = this.tvElement.querySelector('.knob-spot') as HTMLElement;

        // Instantiate the effect controllers
        this.channelDisplayEffect = new ChannelDisplayEffect(this.channelDisplayCanvas);
        // Check if teletextCanvas was found before creating the effect
        if (!this.teletextCanvas) {
            console.error("Failed to find .teletext-canvas element!");
            // Handle the error appropriately, maybe throw or return
            throw new Error("Teletext canvas element not found.");
        }
        this.teletextEffect = new TeletextEffect(this.teletextCanvas);

        this.clickSound = new Audio('src/i/click.mp3');
        this.clickSound.preload = 'auto'; // Hint to the browser to load it
        this.clickSound.volume = 0.6; // Set volume to 50%

        this.setupChannels();
        this.setupKnob(); // Add this line to setup the knob
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

    private setupKnob() {
        // Set initial rotation back to the middle of the range (0 degrees)
        this.knobCurrentAngle = (this.minKnobAngle + this.maxKnobAngle) / 2; // Reverted to midpoint
        this.knobElement.style.transform = `rotate(${this.knobCurrentAngle}deg)`; // Initialize rotation

        this.knobElement.addEventListener('mousedown', this.knobMouseDown.bind(this));
        // Add touch events for mobile compatibility
        this.knobElement.addEventListener('touchstart', (e) => this.knobMouseDown(e as any), { passive: false });

        // Add mousemove and mouseup listeners to the document to handle dragging outside the knob
        document.addEventListener('mousemove', this.knobMouseMove.bind(this));
        document.addEventListener('mouseup', this.knobMouseUp.bind(this));
        // Add touchmove and touchend listeners
        document.addEventListener('touchmove', (e) => this.knobMouseMove(e as any), { passive: false });
        document.addEventListener('touchend', this.knobMouseUp.bind(this));
        this.updateEffectsBasedOnKnob(); // Initial effect settings based on default knob position
    }

    private getAngle(event: MouseEvent | TouchEvent): number {
        const knobRect = this.knobElement.getBoundingClientRect();
        const centerX = knobRect.left + knobRect.width / 2;
        const centerY = knobRect.top + knobRect.height / 2;

        let clientX, clientY;
        if (event instanceof MouseEvent) {
            clientX = event.clientX;
            clientY = event.clientY;
        } else { // TouchEvent
            // Use the first touch point
            if (event.touches.length === 0) return this.knobCurrentAngle; // No touches, return current angle
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        }


        const deltaX = clientX - centerX;
        const deltaY = clientY - centerY;
        // Calculate angle in degrees (atan2 returns radians)
        let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        // Adjust angle to be 0-360 degrees (optional, depends on desired behavior)
        // angle = (angle + 360) % 360;
        return angle;
    }


    private knobMouseDown(event: MouseEvent | TouchEvent) {
        // Prevent default drag behavior (e.g., image dragging)
        if (event instanceof MouseEvent) {
            event.preventDefault();
        } else { // TouchEvent
            // Prevent scrolling while dragging the knob
            event.preventDefault();
        }

        this.isDraggingKnob = true;
        // Store the angle at the start of the drag
        this.knobPreviousDragAngle = this.getAngle(event);
        // Calculate the offset between the initial click angle and the current knob angle
        // this.knobStartAngle = this.knobPreviousDragAngle - this.knobCurrentAngle; // Removed unused variable assignment
        this.knobElement.classList.add('dragging'); // Optional: Add class for styling
    }

    private knobMouseMove(event: MouseEvent | TouchEvent) {
        if (!this.isDraggingKnob) return;

        if (event instanceof TouchEvent) {
            event.preventDefault();
        }

        const currentDragAngle = this.getAngle(event);
        let deltaAngle = currentDragAngle - this.knobPreviousDragAngle;

        // Handle angle wrap-around (-180 to 180 degrees)
        if (deltaAngle > 180) {
            deltaAngle -= 360;
        } else if (deltaAngle < -180) {
            deltaAngle += 360;
        }

        // Update the knob's current angle by the change
        let newAngle = this.knobCurrentAngle + deltaAngle;

        // Clamp the angle to the defined range
        newAngle = Math.max(this.minKnobAngle, Math.min(this.maxKnobAngle, newAngle));

        // Update the current angle and the previous angle for the next move
        this.knobCurrentAngle = newAngle;
        this.knobPreviousDragAngle = currentDragAngle;

        this.knobElement.style.transform = `rotate(${this.knobCurrentAngle}deg)`;

        // Update effects based on the new knob angle
        this.updateEffectsBasedOnKnob();

        // Dispatch a custom event with the current angle
        const rotateEvent = new CustomEvent('knob-rotate', {
            detail: { angle: this.knobCurrentAngle },
            bubbles: true,
            cancelable: true
        });
        this.knobElement.dispatchEvent(rotateEvent);
    }

    private knobMouseUp() {
        if (!this.isDraggingKnob) return;
        this.isDraggingKnob = false;
        this.knobElement.classList.remove('dragging'); // Optional: Remove styling class
        // You might want to snap to specific values or perform final actions here
    }


    private changeChannel(channelNumber: number) {
        const channelData = this.channels.get(channelNumber);
        const currentChannelData = this.channels.get(this.currentChannel);

        // Save current time of the video before changing the source
        if (this.videoElement.src && currentChannelData?.type === 'video') { // Only save if it was a video channel
            const currentTime = this.videoElement.currentTime;
            currentChannelData!.currentTime = currentTime; // Save the current time to the channel data
        }

        if (channelData) {
            // Handle Teletext visibility using the new effect class
            if (channelData.type === 'teletext') {
                this.teletextEffect.show(); // Show the WebGL teletext
                this.videoElement.style.display = 'none';
                this.videoElement.pause();
            } else {
                this.teletextEffect.hide(); // Hide the WebGL teletext
                this.videoElement.style.display = '';
            }

            // Handle video source
            if (channelData.type === 'video' && channelData.video) {
                this.videoElement.src = channelData.video;
                if (channelData.currentTime) {
                    this.videoElement.currentTime = channelData.currentTime; // Set the video to the saved time
                }
                // this.videoElement.play().catch(e => console.error("Video play failed", e));
            } else if (channelData.type !== 'teletext') {
                // Handle cases where channel data or video source is missing for non-teletext
                console.warn(`Channel ${channelNumber} data or video source not found.`);
                this.videoElement.src = ''; // Clear the video source or show static/default image
            }
        } else {
            // Handle case where channel data is missing entirely
            console.warn(`Channel ${channelNumber} data not found.`);
            this.videoElement.src = '';
            this.teletextEffect.hide(); // Hide the WebGL teletext
            this.videoElement.style.display = '';
        }


        // Use the new effect class to display the text
        const channelName = channelData?.name || '-';
        this.channelDisplayEffect.setText(channelName);
        this.channelDisplayEffect.show();
        // Remove direct manipulation of the old div's visibility/text
        // this.channelDisplay.textContent = channelData?.name || '-';
        // this.channelDisplay.classList.add('visible');

        this.currentChannel = channelNumber;

        if (this.channelDisplayTimeout) {
            clearTimeout(this.channelDisplayTimeout); // Clear any existing timeout
        }

        // Use the effect class to hide after delay
        this.channelDisplayTimeout = setTimeout(() => {
            this.channelDisplayEffect.hide();
            // this.channelDisplay.classList.remove('visible');
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
            // console.log('Available channels loaded from window.channels:', this.channels);
        } else {
            console.warn("window.channels is not defined or not an array.");
        }
    }

    private updateEffectsBasedOnKnob() {
        // Map knob angle (-90 to 90) to intensity (0 to 1)
        const totalRange = this.maxKnobAngle - this.minKnobAngle;
        const normalizedAngle = (this.knobCurrentAngle - this.minKnobAngle) / totalRange;

        // --- VCR Noise Intensity ---
        // Use the normalized angle directly for linear intensity scaling
        const noiseIntensity = normalizedAngle;
        setVCRNoiseIntensity(noiseIntensity);

        // --- Glitch Frequency ---
        // Map intensity (0-1) to delay (e.g., 10s to 0.5s)
        const minGlitchDelay = 200; // ms (frequent glitch)
        const maxGlitchDelay = 5000; // ms (infrequent glitch)
        const glitchDelayRange = maxGlitchDelay - minGlitchDelay;
        // Invert intensity so 0 intensity = max delay, 1 intensity = min delay
        const currentGlitchDelay = maxGlitchDelay - (normalizedAngle * glitchDelayRange);

        // Clear existing glitch timeout
        if (this.glitchTimeout) {
            clearTimeout(this.glitchTimeout);
            this.glitchTimeout = null;
        }

        // Schedule the next glitch if intensity > 0 and not already glitching
        if (normalizedAngle > 0.01 && !this.isGlitching) { // Add a small threshold
            this.glitchTimeout = setTimeout(() => {
                this.triggerGlitch();
            }, currentGlitchDelay);
        } else if (normalizedAngle <= 0.01) {
            // If intensity is zero, ensure glitch class is removed
            this.movieElement.classList.remove('is-glitching-1'); // Remove both possible classes
            this.movieElement.classList.remove('is-glitching-2');
            this.isGlitching = false;
        }
    }

    private triggerGlitch() {
        if (this.isGlitching) return; // Don't trigger if already running

        this.isGlitching = true;

        // Randomly choose glitch type (1 or 2)
        const glitchType = Math.random() < 0.5 ? 1 : 2;
        const glitchClass = `is-glitching-${glitchType}`;

        this.movieElement.classList.add(glitchClass);
        // console.log(`Glitch effect triggered: ${glitchClass}`);

        // Animation duration (should be consistent for both animations)
        const animationDuration = 300;

        // Use setTimeout to remove the class after the animation completes
        setTimeout(() => {
            this.movieElement.classList.remove(glitchClass); // Remove the specific class that was added
            this.isGlitching = false;
            // Schedule the next glitch after the current one finishes
            this.updateEffectsBasedOnKnob();
        }, animationDuration);
    }
}
