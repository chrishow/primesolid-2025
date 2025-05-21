import { BaseCrtEffect } from './BaseCrtEffect';
import { loadWeather } from './loadWeather';

import teletextStyle from './teletext.css?inline';

export class TeletextEffect extends BaseCrtEffect {
    // HTML/SVG rendering related properties
    private htmlContentElement: HTMLElement;
    private htmlCanvas: HTMLCanvasElement;
    private htmlCtx: CanvasRenderingContext2D;
    private svgImage: HTMLImageElement;

    private isContentLoaded: boolean = false;
    private isLoadingContent: boolean = false; // Prevent multiple loads
    private needsDelayedSafariUpdate: boolean;

    constructor(canvas: HTMLCanvasElement) {
        super(canvas); // Call base class constructor

        // Get HTML content element
        this.htmlContentElement = document.querySelector('.teletext-html-content') as HTMLElement;
        if (!this.htmlContentElement) {
            throw new Error('Required HTML content element .teletext-html-content not found');
        }

        // Create offscreen canvas for rendering the SVG image
        this.htmlCanvas = document.createElement('canvas');
        // Use dimensions from the HTML content element's style or defaults
        this.htmlCanvas.width = parseInt(this.htmlContentElement.style.width) || 533;
        this.htmlCanvas.height = parseInt(this.htmlContentElement.style.height) || 395;
        const htmlCtx = this.htmlCanvas.getContext('2d');
        if (!htmlCtx) {
            throw new Error('Could not get 2D context for HTML rendering');
        }
        this.htmlCtx = htmlCtx;

        // Image element to load the SVG data URI
        this.svgImage = new Image();

        // Initialize Safari-specific flag
        this.needsDelayedSafariUpdate = navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');

        // Load external HTML content asynchronously
        this.loadHtmlContent('/teletext.html');
    }

    private async loadHtmlContent(url: string): Promise<void> {
        if (this.isLoadingContent || this.isContentLoaded) return; // Don't load if already loading or loaded
        this.isLoadingContent = true;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = await response.text();
            this.htmlContentElement.innerHTML = html;

            // Update the date
            const dateElement = this.htmlContentElement.querySelector('.date');
            if (dateElement) {
                dateElement.textContent = new Date().toLocaleDateString('en-UK', {
                    month: 'short',
                    day: '2-digit',
                });
            }

            // Get location and weather data
            const weatherData = await loadWeather();

            if (weatherData.city) {
                this.htmlContentElement.querySelector('.city')!.textContent = weatherData.city;
            }

            const dataKeys = ['conditions', 'temp', 'precipprob', 'windspeed', 'winddir', 'humidity', 'uvindex'];
            dataKeys.forEach((key) => {
                const element = this.htmlContentElement.querySelector(`.${key}`);
                if (element && weatherData.currentConditions) {
                    element.textContent = weatherData.currentConditions[key];
                }
            });

            this.isContentLoaded = true;
            this.textureNeedsUpdate = true; // Mark texture for update now that content is ready
            // If the effect is already visible when content loads, update the texture
            if (this.isVisible) {
                this.updateTextureContent();
            }
        } catch (error) {
            console.error("Failed to load teletext HTML content:", error);
            this.htmlContentElement.innerHTML = '<p style="color: red;">Error loading content.</p>';
            this.isContentLoaded = true; // Mark as loaded (with error)
            this.textureNeedsUpdate = true;
            if (this.isVisible) {
                this.updateTextureContent(); // Attempt to render the error message
            }
        } finally {
            this.isLoadingContent = false;
        }
    }

    // Implement the abstract method from BaseCRTEffect
    protected updateTextureContent(): void {
        // Only proceed if content is loaded (or an error message is set)
        if (!this.isContentLoaded) return;

        const htmlString = this.htmlContentElement.innerHTML;
        const svgWidth = this.htmlCanvas.width;
        const svgHeight = this.htmlCanvas.height;

        // 1. Create SVG string
        const data = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">
                        <style><![CDATA[
                            ${teletextStyle}
                        ]]></style>
                        <foreignObject width="100%" height="100%">
                          <div xmlns="http://www.w3.org/1999/xhtml" style="width: ${svgWidth}px; height: ${svgHeight}px;">
                            ${htmlString}
                          </div>
                        </foreignObject>
                      </svg>`;

        // 2. Create base64 data URI
        const svgBase64 = btoa(unescape(encodeURIComponent(data)));
        const url = `data:image/svg+xml;base64,${svgBase64}`;

        // 3. Load SVG data URI into the Image element (asynchronous)
        this.svgImage.onload = () => {
            // 4. Draw Image onto 2D canvas
            this.htmlCtx.clearRect(0, 0, this.htmlCanvas.width, this.htmlCanvas.height);
            this.htmlCtx.drawImage(this.svgImage, 0, 0, this.htmlCanvas.width, this.htmlCanvas.height);

            // 5. Upload 2D canvas to WebGL texture using base class method
            this.uploadTexture(this.htmlCanvas); // This might set textureNeedsUpdate = false

            // If visible, trigger a re-render immediately after texture update
            if (this.isVisible) {
                this.render();
            }

            // Safari-specific: attempt a delayed re-render on first successful load after show
            if (this.needsDelayedSafariUpdate) {
                this.needsDelayedSafariUpdate = false; // Consume the flag for this show cycle
                setTimeout(() => {
                    if (this.isVisible && this.isContentLoaded) { // Check if still relevant
                        console.log("Safari: Attempting delayed re-render of Teletext content.");
                        this.textureNeedsUpdate = true; // Ensure the update isn't skipped
                        this.updateTextureContent();
                    }
                }, 100); // 100ms delay
            }
        };
        this.svgImage.onerror = (err) => {
            console.error("Error loading SVG data URI:", err);
            // Handle error - maybe display a fallback texture?
            // For now, we just won't update the texture.
            this.textureNeedsUpdate = true; // Keep flag set if loading failed
        };
        this.svgImage.src = url;
    }

    // Override show to handle content loading state
    public show(): void {
        super.show(); // Call base class show logic
        // Base class show() handles calling updateTextureContent if textureNeedsUpdate is true
        // If content isn't loaded yet, loadHtmlContent completion will trigger updateTextureContent
    }

    // Override hide if specific cleanup is needed, otherwise base class is fine
    public hide(): void {
        super.hide();
        // If it's Safari, reset the flag so the delayed update occurs on next show
        if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
            this.needsDelayedSafariUpdate = true;
        }
        // Add any specific cleanup for TeletextEffect here
    }

    // Override resize if HTML/SVG rendering depends on size, otherwise base class is fine
    // protected resize(): void {
    //     super.resize();
    //     // If SVG/HTML layout needs recalculation based on size, do it here
    //     this.textureNeedsUpdate = true;
    //     if (this.isVisible) this.updateTextureContent();
    // }

    // render() is inherited from BaseCRTEffect
}
