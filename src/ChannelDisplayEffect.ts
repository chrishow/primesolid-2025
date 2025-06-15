import { BaseCrtEffect } from './BaseCrtEffect';

export class ChannelDisplayEffect extends BaseCrtEffect {
    private textCanvas: HTMLCanvasElement;
    private textCtx: CanvasRenderingContext2D;
    private currentText: string = '';

    constructor(canvas: HTMLCanvasElement) {
        super(canvas); // Call the base class constructor

        // Create offscreen canvas for rendering text
        this.textCanvas = document.createElement('canvas');
        // Set dimensions based on target display size or desired texture resolution
        this.textCanvas.width = 533; // Adjust as needed
        this.textCanvas.height = 395; // Adjust as needed
        canvas.style.opacity = '0'; // Hide the canvas visually
        const textCtx = this.textCanvas.getContext('2d');
        if (!textCtx) {
            throw new Error('Could not get 2D context for text rendering');
        }
        this.textCtx = textCtx;


        setTimeout(() => {  // Delay to ensure font is ready  
            this.updateTextureContent();
            canvas.style.opacity = '';
        }, 100);
    }

    // Implement the abstract method from BaseCRTEffect
    protected updateTextureContent(): void {
        const ctx = this.textCtx;
        const width = this.textCanvas.width;
        const height = this.textCanvas.height;

        // Clear previous text
        ctx.clearRect(0, 0, width, height);

        // Style the text (match CSS if possible)
        ctx.fillStyle = 'lime';
        ctx.font = 'normal 36px "VCR", monospace'; // Adjust size/family
        // Align text to top-left
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Draw the text at top-left (with small padding)
        const padding = 10;
        ctx.fillText(this.currentText, padding, padding);

        // Upload the 2D canvas content to the WebGL texture using the base class method
        this.uploadTexture(this.textCanvas);

        // If visible, trigger a re-render immediately after texture update
        if (this.isVisible) {
            this.render();
        }
    }

    public setText(text: string): void {
        if (text !== this.currentText) {
            this.currentText = text;
            this.textureNeedsUpdate = true; // Mark texture as needing update
            if (this.isVisible) {
                this.updateTextureContent();
            }
        }
    }

    // Override show to ensure texture is updated if needed
    public show(): void {
        super.show(); // Call base class show logic
        // Base class show() already handles calling updateTextureContent if textureNeedsUpdate is true
    }

    // Override hide if specific cleanup is needed, otherwise base class is fine
    // public hide(): void {
    //     super.hide();
    //     // Add any specific cleanup for ChannelDisplayEffect here
    // }

    // Override resize if text rendering depends on size, otherwise base class is fine
    protected resize(): void {
        super.resize();
        // If text layout needs recalculation based on size, do it here
        this.textureNeedsUpdate = true;
        if (this.isVisible) this.updateTextureContent();
    }

    // render() is inherited from BaseCRTEffect
}
