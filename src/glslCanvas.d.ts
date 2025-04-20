declare module 'glslCanvas' {
    export default class GlslCanvas {
        constructor(canvas: HTMLCanvasElement);
        load(fragmentSource: string): void;
        setUniform(name: string, ...values: any[]): void;
        // Add other methods you might use here
    }
}
