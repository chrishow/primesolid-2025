let currentIntensity = 0.5; // Default intensity (0 to 1)
let animationFrameId: number | null = null; // Store animation frame ID

// Exported function to update the intensity
export function setVCRNoiseIntensity(intensity: number) {
    currentIntensity = Math.max(0, Math.min(1, intensity)); // Clamp between 0 and 1
}

export function generateVCRNoise(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!;

    // Stop any previous animation loop
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
    }

    const animate = () => {
        if (currentIntensity > 0) { // Only render if intensity is > 0
            renderTrackingNoise(canvas, ctx, currentIntensity);
        } else {
            // Clear canvas if intensity is 0
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        animationFrameId = requestAnimationFrame(animate);
    };

    animate(); // Start the animation loop
}

function renderTrackingNoise(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, intensity: number) {
    const radius = 1;
    // Calculate posy1 and number of particles based on intensity
    let posy1: number;
    let num: number;

    if (intensity <= 0.5) {
        // Linear interpolation between (0, 105) and (0.5, 100)
        posy1 = -10 * intensity + 105;
        num = 18 * intensity + 1;
    } else {
        // Linear interpolation between (0.5, 100) and (1, 10)
        posy1 = -180 * (intensity - 0.5) + 100;
        num = 180 * (intensity - 0.5) + 10;
    }
    // Clamp posy1 to a reasonable minimum (e.g., 1) and round
    posy1 = Math.max(1, Math.round(posy1));
    num = Math.round(num); // Round to the nearest integer

    let posy2 = canvas!.height - 10;
    let posy3 = 1;

    const xmax = canvas!.width;

    // Always clear the canvas before drawing (or if not drawing)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (ctx && num > 0) { // Only draw if num > 0
        canvas!.style.filter = `blur(${intensity * 1}px)`; // Optional: adjust blur based on intensity
        ctx.fillStyle = `#fff`;
        // ctx.globalAlpha = intensity * 0.75; // Optional: Adjust global alpha

        ctx.beginPath();
        for (var i = 0; i <= num; i++) {
            var x = (Math.random() * xmax);
            var y1 = getRandomInt(posy1 += 3, posy2);
            var y2 = getRandomInt(0, posy3 -= 3);
            ctx.fillRect(x, y1, radius, radius);
            ctx.fillRect(x, y2, radius, radius);
            ctx.fill();

            renderTail(ctx, x, y1, radius);
            renderTail(ctx, x, y2, radius);
        }
        ctx.closePath();
    }

}

function renderTail(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
    const n = getRandomInt(1, 30);

    const dirs = [1, -1];
    // let rd = radius;
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    for (let i = 0; i < n; i++) {
        // const step = 0.01;
        // let r = getRandomInt((rd -= step), radius);
        let r = 1;
        let dx = getRandomInt(1, 4);

        radius -= 0.1;

        dx *= dir;

        ctx.fillRect((x += dx), y, r, r);
        ctx.fill();
    }
}

function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}