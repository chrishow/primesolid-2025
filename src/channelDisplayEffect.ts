import vertexShaderSource from './shaders/channel-display.vert?raw';
import fragmentShaderSource from './shaders/channel-display.frag?raw';

export class ChannelDisplayEffect {
    private canvas: HTMLCanvasElement;
    private gl: WebGLRenderingContext;
    private program: WebGLProgram;
    private textCanvas: HTMLCanvasElement;
    private textCtx: CanvasRenderingContext2D;
    private texture: WebGLTexture;
    private positionBuffer: WebGLBuffer;
    private positionLocation: number;
    private resolutionLocation: WebGLUniformLocation | null;
    private textureLocation: WebGLUniformLocation | null;
    private curvatureLocation: WebGLUniformLocation | null;

    private currentText: string = '';
    private isVisible: boolean = false;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        // Request alpha channel for transparency
        const gl = this.canvas.getContext('webgl', { alpha: true });
        if (!gl) {
            throw new Error('WebGL not supported');
        }
        this.gl = gl;

        // Enable blending for transparency
        this.gl.enable(this.gl.BLEND);
        // Use blend function suitable for premultiplied alpha
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);

        // Create offscreen canvas for rendering text
        this.textCanvas = document.createElement('canvas');
        // Set dimensions based on target display size or desired texture resolution
        this.textCanvas.width = 512; // Adjust as needed
        this.textCanvas.height = 256; // Adjust as needed
        const textCtx = this.textCanvas.getContext('2d');
        if (!textCtx) {
            throw new Error('Could not get 2D context for text rendering');
        }
        this.textCtx = textCtx;

        this.program = this.createProgram(vertexShaderSource, fragmentShaderSource);
        this.gl.useProgram(this.program);

        // Look up attribute and uniform locations
        this.positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.resolutionLocation = this.gl.getUniformLocation(this.program, 'u_resolution');
        this.textureLocation = this.gl.getUniformLocation(this.program, 'u_texture');
        this.curvatureLocation = this.gl.getUniformLocation(this.program, 'u_curvature');

        // Create buffer for a unit quad (covers the entire canvas)
        this.positionBuffer = this.gl.createBuffer()!;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        const positions = [
            -1, -1,
            1, -1,
            -1, 1,
            1, 1,
        ];
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

        // Create texture
        this.texture = this.createTexture();
        this.updateTexture(); // Initial texture update (blank)

        // Set texture unit 0
        this.gl.uniform1i(this.textureLocation, 0);

        // Initial setup
        this.resize(); // Set initial viewport and resolution
        // Optional: Add resize listener if canvas size can change
        // window.addEventListener('resize', this.resize.bind(this));
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
        // Shaders no longer needed after linking
        this.gl.deleteShader(vertexShader);
        this.gl.deleteShader(fragmentShader);
        return program;
    }

    private createTexture(): WebGLTexture {
        const texture = this.gl.createTexture()!;
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        // Set parameters for non-power-of-two textures
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        // Revert back to LINEAR filtering for anti-aliasing
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        return texture;
    }

    private updateTexture() {
        const ctx = this.textCtx;
        const width = this.textCanvas.width;
        const height = this.textCanvas.height;

        // Clear previous text
        ctx.clearRect(0, 0, width, height);

        // Style the text (match CSS if possible)
        ctx.fillStyle = 'lime';
        ctx.font = 'bold 36px "Share Tech Mono", monospace'; // Adjust size/family
        // Align text to top-left
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Draw the text at top-left (with small padding)
        const padding = 10;
        ctx.fillText(this.currentText, padding, padding);

        // Upload the 2D canvas content to the WebGL texture
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        // Tell WebGL to premultiply alpha during texture upload
        this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.textCanvas);
        // Reset pixel store parameter to default
        this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    }

    public setText(text: string) {
        if (text !== this.currentText) {
            this.currentText = text;
            this.updateTexture();
            // If visible, trigger a re-render
            if (this.isVisible) {
                this.render();
            }
        }
    }

    public show() {
        if (!this.isVisible) {
            this.isVisible = true;
            this.canvas.classList.add('visible');
            // Render once when shown
            this.render();
        }
    }

    public hide() {
        if (this.isVisible) {
            this.isVisible = false;
            this.canvas.classList.remove('visible');
            // No need to render when hiding
        }
    }

    private resize() {
        const displayWidth = this.canvas.clientWidth;
        const displayHeight = this.canvas.clientHeight;

        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
            // If visible, trigger a re-render after resize
            if (this.isVisible) {
                this.render();
            }
        }
        // Update resolution uniform (can stay here, happens before render)
        this.gl.uniform2f(this.resolutionLocation, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
    }

    private render() {
        // Only render if visible and context exists
        if (!this.isVisible || !this.gl) return;

        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.useProgram(this.program);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.enableVertexAttribArray(this.positionLocation);
        this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.uniform1i(this.textureLocation, 0);

        // Update uniforms that might change (resolution is handled in resize)
        this.gl.uniform2f(this.resolutionLocation, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
        this.gl.uniform1f(this.curvatureLocation, 0.2);

        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
}
