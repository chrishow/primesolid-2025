export function generateVCRNoise(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!;

    const fps = 61;
    let vcrInterval: any = null;

    if (fps >= 60) {
        if (vcrInterval) {
            cancelAnimationFrame(vcrInterval);
        }
        const animate = () => {
            renderTrackingNoise(canvas, ctx);
            vcrInterval = requestAnimationFrame(animate);
        };

        animate();
    } else {
        if (vcrInterval) {
            clearInterval(vcrInterval);
        }
        vcrInterval = setInterval(() => {
            renderTrackingNoise(canvas, ctx);
        }, 1000 / fps);
    }
}

function renderTrackingNoise(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const radius = 1;
    let posy1 = 100;
    let posy2 = canvas!.height - 10;
    let posy3 = 1;
    const num = 4;

    const xmax = canvas!.width;

    if (ctx) {
        canvas!.style.filter = `blur(1px)`;
        ctx.clearRect(0, 0, canvas!.width, canvas!.height);
        ctx.fillStyle = `#fff`;

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