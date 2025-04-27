import vertexShaderSource from './shaders/channel-display.vert?raw';
import fragmentShaderSource from './shaders/channel-display.frag?raw';

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

    private image!: HTMLImageElement; // Add definite assignment assertion
    private isVisible: boolean = false;
    private imageLoaded: boolean = false;

    constructor(canvas: HTMLCanvasElement, imageUrl: string) {
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
        this.loadImage(imageUrl);

        this.gl.uniform1i(this.textureLocation, 0);

        this.resize();
    }

    private loadImage(url: string) {
        this.image = new Image();
        this.image.crossOrigin = "anonymous"; // Handle potential CORS issues if image is remote
        this.image.onload = () => {
            this.imageLoaded = true;
            this.updateTexture();
            if (this.isVisible) {
                this.render(); // Re-render if visible when image loads
            }
        };
        this.image.onerror = (err) => {
            console.error("Error loading teletext image:", err);
        };
        this.image.src = url;
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
        if (!this.imageLoaded) return;

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.image);
    }

    public show() {
        if (!this.isVisible) {
            this.isVisible = true;
            this.canvas.classList.add('visible');
            this.resize(); // Ensure size is correct before first render
            this.render();
        }
    }

    public hide() {
        if (this.isVisible) {
            this.isVisible = false;
            this.canvas.classList.remove('visible');
            // Clear the canvas when hiding
            this.gl.clearColor(0, 0, 0, 0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
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
        // Update resolution uniform regardless of visibility
        this.gl.uniform2f(this.resolutionLocation, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
    }

    private render() {
        if (!this.isVisible || !this.gl || !this.imageLoaded) return;

        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.useProgram(this.program);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.enableVertexAttribArray(this.positionLocation);
        this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.uniform1i(this.textureLocation, 0);

        // Update uniforms
        this.gl.uniform2f(this.resolutionLocation, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
        this.gl.uniform1f(this.curvatureLocation, 0.2); // Same curvature as channel display

        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
}
