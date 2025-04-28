import vertexShaderSource from './shaders/channel-display.vert?raw';
import fragmentShaderSource from './shaders/channel-display.frag?raw';

import { loadLocation } from './loadLocation';
import { loadWeather } from './loadWeather';

import teletextStyle from './teletext.css?inline';

export class TeletextEffect {
    private canvas: HTMLCanvasElement;
    private gl: WebGLRenderingContext;
    private program: WebGLProgram;
    private texture: WebGLTexture;
    private positionBuffer: WebGLBuffer;
    private positionLocation: number;
    private resolutionLocation: WebGLUniformLocation | null;
    private textureLocation: WebGLUniformLocation | null;
    private curvatureLocation: WebGLUniformLocation | null;

    // HTML/SVG rendering related properties
    private htmlContentElement: HTMLElement;
    private htmlCanvas: HTMLCanvasElement;
    private htmlCtx: CanvasRenderingContext2D;
    private svgImage: HTMLImageElement; // Re-add Image element for SVG loading

    private isVisible: boolean = false;
    private textureNeedsUpdate: boolean = true;
    private isContentLoaded: boolean = false;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const gl = this.canvas.getContext('webgl', { alpha: true });
        if (!gl) {
            throw new Error('WebGL not supported');
        }
        this.gl = gl;

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);

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

        // Re-add Image element to load the SVG data URI
        this.svgImage = new Image();

        // Load external HTML content
        this.loadHtmlContent('/teletext.html');

        this.program = this.createProgram(vertexShaderSource, fragmentShaderSource);
        this.gl.useProgram(this.program);

        this.positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.resolutionLocation = this.gl.getUniformLocation(this.program, 'u_resolution');
        this.textureLocation = this.gl.getUniformLocation(this.program, 'u_texture');
        this.curvatureLocation = this.gl.getUniformLocation(this.program, 'u_curvature');

        this.positionBuffer = this.gl.createBuffer()!;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        const positions = [
            -1, -1,
            1, -1,
            -1, 1,
            1, 1,
        ];
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

        this.texture = this.createTexture();
        this.gl.uniform1i(this.textureLocation, 0);
        this.resize();
    }

    private async loadHtmlContent(url: string): Promise<void> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = await response.text();
            this.htmlContentElement.innerHTML = html;

            // Update the date to today's date
            const dateElement = this.htmlContentElement.querySelector('.date');
            if (dateElement) {
                dateElement.textContent = new Date().toLocaleDateString('en-UK', {
                    month: 'short',
                    day: '2-digit',
                });
            }

            // Get the user's location
            const locationData = await loadLocation();
            console.log('Location data:', locationData);
            const locationElement = this.htmlContentElement.querySelector('.location');
            if (locationElement) {
                locationElement.textContent = locationData.city;
            }

            // Get the weather data
            const weatherData = await loadWeather(locationData.lat, locationData.lon);
            console.log('Weather data:', weatherData);
            const data = ['conditions', 'temp', 'feelslike', 'windspeed', 'winddir', 'humidity', 'uvindex'];
            data.forEach((key) => {
                const element = this.htmlContentElement.querySelector(`.${key}`);
                if (element) {
                    element.textContent = weatherData['currentConditions'][key];
                }
            });



            this.isContentLoaded = true;
            // If the effect is already visible when content loads, update the texture
            if (this.isVisible) {
                this.textureNeedsUpdate = true; // Mark for update
                this.updateTexture();
            } else {
                // Otherwise, just mark that it needs update when shown
                this.textureNeedsUpdate = true;
            }
        } catch (error) {
            console.error("Failed to load teletext HTML content:", error);
            // Optionally display an error message in the teletext div
            this.htmlContentElement.innerHTML = '<p style="color: red;">Error loading content.</p>';
            this.isContentLoaded = true; // Mark as loaded (with error) to prevent infinite retries
            if (this.isVisible) {
                this.textureNeedsUpdate = true;
                this.updateTexture();
            } else {
                this.textureNeedsUpdate = true;
            }
        }
    }

    private createShader(type: number, source: string): WebGLShader {
        const shader = this.gl.createShader(type)!;
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Error compiling shader:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            throw new Error('Shader compilation failed');
        }
        return shader;
    }

    private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);
        const program = this.gl.createProgram()!;
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Error linking program:', this.gl.getProgramInfoLog(program));
            this.gl.deleteProgram(program);
            throw new Error('Program linking failed');
        }
        this.gl.deleteShader(vertexShader);
        this.gl.deleteShader(fragmentShader);
        return program;
    }

    private createTexture(): WebGLTexture {
        const texture = this.gl.createTexture()!;
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        // Put a single transparent pixel until image loads
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        return texture;
    }

    private updateTexture() {
        // Only proceed if content is loaded
        if (!this.isContentLoaded) return;

        const htmlString = this.htmlContentElement.innerHTML;
        const svgWidth = this.htmlCanvas.width;
        const svgHeight = this.htmlCanvas.height;

        // 1. Create SVG string with foreignObject containing the HTML
        // Ensure styles from the container are included or applied within the SVG/HTML
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

        // 2. Create base64 data URI from SVG string
        // Use btoa for base64 encoding
        const svgBase64 = btoa(unescape(encodeURIComponent(data)));
        const url = `data:image/svg+xml;base64,${svgBase64}`;

        // 3. Load SVG data URI into the Image element
        this.svgImage.onload = () => {
            // 4. Draw Image onto 2D canvas
            this.htmlCtx.clearRect(0, 0, this.htmlCanvas.width, this.htmlCanvas.height);
            this.htmlCtx.drawImage(this.svgImage, 0, 0, this.htmlCanvas.width, this.htmlCanvas.height);

            // 5. Upload 2D canvas to WebGL texture
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
            this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true); // Flip Y for WebGL
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.htmlCanvas);
            this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);

            this.textureNeedsUpdate = false; // Mark texture as updated
            if (this.isVisible) {
                this.render(); // Re-render if visible
            }
        };
        this.svgImage.onerror = (err) => {
            console.error("Error loading SVG data URI:", err);
            // Handle error - maybe try the direct canvas drawing as a fallback?
        };
        this.svgImage.src = url;
    }


    public show() {
        if (!this.isVisible) {
            this.isVisible = true;
            this.canvas.classList.add('visible');
            this.resize();
            // Update texture only if content is loaded and needs update
            if (this.isContentLoaded && this.textureNeedsUpdate) {
                this.updateTexture();
            } else if (this.isContentLoaded) {
                // If content is loaded but texture is up-to-date, just render
                this.render();
            }
            // If content isn't loaded yet, loadHtmlContent will handle updateTexture/render later
        }
    }

    public hide() {
        if (this.isVisible) {
            this.isVisible = false;
            this.canvas.classList.remove('visible');
            this.gl.clearColor(0, 0, 0, 0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
            this.textureNeedsUpdate = true; // Mark that texture needs update next time it's shown
        }
    }

    private resize() {
        const displayWidth = this.canvas.clientWidth;
        const displayHeight = this.canvas.clientHeight;

        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
            if (this.isVisible) {
                this.render();
            }
        }
        this.gl.uniform2f(this.resolutionLocation, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
    }

    private render() {
        // Render only if visible, context exists, content is loaded, and texture is updated
        if (!this.isVisible || !this.gl || !this.isContentLoaded || this.textureNeedsUpdate) return;

        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.useProgram(this.program);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.enableVertexAttribArray(this.positionLocation);
        this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.uniform1i(this.textureLocation, 0);

        this.gl.uniform2f(this.resolutionLocation, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
        this.gl.uniform1f(this.curvatureLocation, 0.2);

        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
}
