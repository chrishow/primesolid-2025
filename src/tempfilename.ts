import vertexShaderSource from './shaders/channel-display.vert?raw';
import fragmentShaderSource from './shaders/channel-display.frag?raw';

export abstract class BaseCrtEffect {
    protected canvas: HTMLCanvasElement;
    protected gl: WebGLRenderingContext;
    protected program: WebGLProgram;
    protected texture: WebGLTexture;
    protected positionBuffer: WebGLBuffer;
    protected positionLocation: number;
    protected resolutionLocation: WebGLUniformLocation | null;
    protected textureLocation: WebGLUniformLocation | null;
    protected curvatureLocation: WebGLUniformLocation | null;

    protected isVisible: boolean = false;
    protected textureNeedsUpdate: boolean = true;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const gl = this.canvas.getContext('webgl', { alpha: true });
        if (!gl) {
            throw new Error('WebGL not supported');
        }
        this.gl = gl;

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);

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
        this.gl.uniform1i(this.textureLocation, 0); // Use texture unit 0

        // Initial resize to set viewport and resolution uniform
        this.resize();

        // Debounced resize handler
        let resizeTimeout: ReturnType<typeof setTimeout>;
        const debouncedResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.resize();
            }, 100); // Adjust debounce delay (ms) as needed
        };

        window.addEventListener('resize', debouncedResize);

        // Optional: Consider cleanup if the effect is ever destroyed
        // this.cleanup = () => {
        //     window.removeEventListener('resize', debouncedResize);
        //     // ... other cleanup ...
        // };
    }

    protected createShader(type: number, source: string): WebGLShader {
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

    protected createProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
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
        // Clean up shaders after linking
        this.gl.detachShader(program, vertexShader);
        this.gl.detachShader(program, fragmentShader);
        this.gl.deleteShader(vertexShader);
        this.gl.deleteShader(fragmentShader);
        return program;
    }

    protected createTexture(): WebGLTexture {
        const texture = this.gl.createTexture()!;
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        // Put a single transparent pixel until content is ready
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        return texture;
    }

    // Abstract method for subclasses to implement their texture update logic
    protected abstract updateTextureContent(): void;

    protected uploadTexture(source: TexImageSource): void {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true); // Flip Y for WebGL convention
        // Premultiply alpha for correct blending of 2D canvas content
        this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, source);
        // Reset pixel store parameters
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);
        this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        this.textureNeedsUpdate = false; // Mark texture as updated
    }


    public show(): void {
        if (!this.isVisible) {
            this.isVisible = true;
            this.canvas.classList.add('visible');
            this.resize(); // Ensure size is correct before first render
            if (this.textureNeedsUpdate) {
                this.updateTextureContent(); // This might be async in subclasses
            } else {
                this.render(); // Render immediately if texture is ready
            }
        }
    }

    public hide(): void {
        if (this.isVisible) {
            this.isVisible = false;
            this.canvas.classList.remove('visible');
            // Optional: Clear the canvas when hiding
            // this.gl.clearColor(0, 0, 0, 0);
            // this.gl.clear(this.gl.COLOR_BUFFER_BIT);
            this.textureNeedsUpdate = true; // Mark that texture needs update next time it's shown
        }
    }

    protected resize(): void {
        const displayWidth = this.canvas.clientWidth;
        const displayHeight = this.canvas.clientHeight;

        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
            // Texture update might be needed if size changes affect content generation
            // this.textureNeedsUpdate = true;
            // if (this.isVisible) this.updateTextureContent();
        }
        // Update resolution uniform regardless of size change, as drawingBuffer might differ
        this.gl.useProgram(this.program); // Ensure program is active
        this.gl.uniform2f(this.resolutionLocation, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

        // Re-render if visible after resize
        if (this.isVisible && !this.textureNeedsUpdate) {
            this.render();
        }
    }

    public render(): void {
        // Render only if visible, context exists, and texture is ready
        if (!this.isVisible || !this.gl || this.textureNeedsUpdate) return;

        this.gl.clearColor(0, 0, 0, 0); // Use transparent clear color
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.useProgram(this.program);

        // Setup vertex buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.enableVertexAttribArray(this.positionLocation);
        this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        // Setup texture
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.uniform1i(this.textureLocation, 0);

        // Set uniforms (resolution is set in resize)
        this.gl.uniform1f(this.curvatureLocation, 0.2); // Example curvature

        // Draw the quad
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
}
