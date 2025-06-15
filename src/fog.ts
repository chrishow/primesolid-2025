import fragmentSource from './shaders/gl-fog.frag?raw';
import GlslCanvas from 'glslCanvas';

// Helper function to convert hex color to normalized RGB array
function hexToRgbNormalized(hex: string): [number, number, number] {
    // Remove leading # if present
    if (hex.startsWith('#')) {
        hex = hex.slice(1);
    }

    const bigint = parseInt(hex, 16);
    const r = ((bigint >> 16) & 255) / 255;
    const g = ((bigint >> 8) & 255) / 255;
    const b = (bigint & 255) / 255;

    return [r, g, b];
}

// Define color palettes
const lightModeColors = {
    base: '#6495ED', // Cornflower Blue
    lowlight: '#778899', // Light Slate Gray
    midtone: '#E6E6FA', // Lavender
    highlight: '#F0F8FF' // Alice Blue
};

const darkModeColors = {
    base: '#1c2541', // Very Dark Desaturated Blue (Night Sky)
    lowlight: '#3a506b', // Dark Slate Blue (Darker Cloud Parts)
    midtone: '#6c757d', // Gray (Main Cloud Body)
    highlight: '#8d99ae' // Darker Gray (Cloud Highlight/Moonlight - was #adb5bd)
};

export function setupFog(canvas: HTMLCanvasElement) {
    // Set canvas background color immediately to match body background
    const setCanvasBackgroundColor = () => {
        const computedStyle = getComputedStyle(document.documentElement);
        const bgColor = computedStyle.getPropertyValue('--background-color').trim();
        if (bgColor) {
            canvas.style.backgroundColor = bgColor;
        }
    };

    // Set initial background color before any setup
    setCanvasBackgroundColor();

    // Ensure canvas has correct dimensions before initializing shader
    const ensureCanvasSize = () => {
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            // Set canvas internal resolution to match display size
            canvas.width = rect.width;
            canvas.height = rect.height;
        }
    };

    // Set initial size
    ensureCanvasSize();

    // Use requestAnimationFrame to ensure layout is complete
    requestAnimationFrame(() => {
        ensureCanvasSize(); // Double-check size after layout

        const sandbox = new GlslCanvas(canvas);
        sandbox.load(fragmentSource);

        // Set initial theme colors immediately after shader loads
        const initialTheme = localStorage.getItem('theme-preference') || 'auto';
        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        if (initialTheme === 'dark') {
            sandbox.setUniform('u_baseColor', ...hexToRgbNormalized(darkModeColors.base));
            sandbox.setUniform('u_lowlightColor', ...hexToRgbNormalized(darkModeColors.lowlight));
            sandbox.setUniform('u_midtoneColor', ...hexToRgbNormalized(darkModeColors.midtone));
            sandbox.setUniform('u_highlightColor', ...hexToRgbNormalized(darkModeColors.highlight));
        } else if (initialTheme === 'light') {
            sandbox.setUniform('u_baseColor', ...hexToRgbNormalized(lightModeColors.base));
            sandbox.setUniform('u_lowlightColor', ...hexToRgbNormalized(lightModeColors.lowlight));
            sandbox.setUniform('u_midtoneColor', ...hexToRgbNormalized(lightModeColors.midtone));
            sandbox.setUniform('u_highlightColor', ...hexToRgbNormalized(lightModeColors.highlight));
        } else { // 'auto'
            const colors = darkModeMediaQuery.matches ? darkModeColors : lightModeColors;
            sandbox.setUniform('u_baseColor', ...hexToRgbNormalized(colors.base));
            sandbox.setUniform('u_lowlightColor', ...hexToRgbNormalized(colors.lowlight));
            sandbox.setUniform('u_midtoneColor', ...hexToRgbNormalized(colors.midtone));
            sandbox.setUniform('u_highlightColor', ...hexToRgbNormalized(colors.highlight));
        }

        // Move all the shader setup code inside this callback
        setupShaderFunctionality(sandbox, canvas);
    });
}

function setupShaderFunctionality(sandbox: any, canvas: HTMLCanvasElement) {

    // Helper function to update canvas background color
    const updateCanvasBackground = () => {
        const computedStyle = getComputedStyle(document.documentElement);
        const bgColor = computedStyle.getPropertyValue('--background-color').trim();
        if (bgColor) {
            canvas.style.backgroundColor = bgColor;
        }
    };

    const setShaderColors = (colors: typeof lightModeColors) => {
        sandbox.setUniform('u_baseColor', ...hexToRgbNormalized(colors.base));
        sandbox.setUniform('u_lowlightColor', ...hexToRgbNormalized(colors.lowlight));
        sandbox.setUniform('u_midtoneColor', ...hexToRgbNormalized(colors.midtone));
        sandbox.setUniform('u_highlightColor', ...hexToRgbNormalized(colors.highlight));
        // Update canvas background when colors change
        updateCanvasBackground();
    };

    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    let boundOsThemeChangeListener: ((e: MediaQueryListEvent) => void) | null = null;

    // Function to apply colors based on an OS theme change event or current state
    const handleOsThemeChange = (eventOrState: MediaQueryListEvent | { matches: boolean }) => {
        if (eventOrState.matches) {
            setShaderColors(darkModeColors);
        } else {
            setShaderColors(lightModeColors);
        }
    };

    // Enables listening to OS theme changes and applies current OS theme
    const enableAutoThemeUpdates = () => {
        handleOsThemeChange(darkModeMediaQuery); // Apply current OS theme immediately
        if (boundOsThemeChangeListener) { // Remove any existing listener first
            darkModeMediaQuery.removeEventListener('change', boundOsThemeChangeListener);
        }
        boundOsThemeChangeListener = (e) => handleOsThemeChange(e); // Create new bound listener
        darkModeMediaQuery.addEventListener('change', boundOsThemeChangeListener);
    };

    // Disables listening to OS theme changes
    const disableAutoThemeUpdates = () => {
        if (boundOsThemeChangeListener) {
            darkModeMediaQuery.removeEventListener('change', boundOsThemeChangeListener);
            boundOsThemeChangeListener = null;
        }
    };

    // Listen for custom theme changes from main.ts (user interaction with theme switcher)
    document.addEventListener('themechanged', (e: Event) => {
        const event = e as CustomEvent;
        const theme = event.detail.theme;
        if (theme === 'dark') {
            disableAutoThemeUpdates();
            setShaderColors(darkModeColors);
        } else if (theme === 'light') {
            disableAutoThemeUpdates();
            setShaderColors(lightModeColors);
        } else { // 'auto'
            enableAutoThemeUpdates();
        }
    });

    // Initial theme setup based on current preference (including 'auto')
    const initialTheme = localStorage.getItem('theme-preference') || 'auto';
    if (initialTheme === 'dark') {
        setShaderColors(darkModeColors);
        // OS listener not needed for explicit dark theme
    } else if (initialTheme === 'light') {
        setShaderColors(lightModeColors);
        // OS listener not needed for explicit light theme
    } else { // 'auto'
        enableAutoThemeUpdates(); // Apply current OS theme and start listening for OS changes
    }

    // Add the 'visible' class to trigger the fade-in after setup
    // Wait a brief moment to ensure shader has rendered at least one frame
    requestAnimationFrame(() => {
        canvas.classList.add('visible');
    });

    // --- Scroll-based speed control ---
    const defaultSpeed = 1.0;
    const lerpFactor = 0.05; // How quickly to interpolate (adjust for smoothness)
    const scrollVelocityFactor = 0.1; // Adjust to control sensitivity to scroll speed (FORWARD)
    const backwardScrollFactor = 0.2; // Make backward scroll faster
    const maxSpeedIncrease = 10.0; // Maximum speed increase magnitude

    let currentSpeed = defaultSpeed;
    let targetSpeed = defaultSpeed;
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    let customTime = 0;
    let lastTimestamp = 0;
    let lastScrollY = window.scrollY; // Track last scroll position

    // Set the initial custom time
    sandbox.setUniform('u_customTime', customTime);

    // Linear interpolation function
    function lerp(start: number, end: number, amt: number): number {
        return (1 - amt) * start + amt * end;
    }

    // Animation loop to handle both speed and time
    function animationLoop(timestamp: number) {
        if (lastTimestamp === 0) {
            lastTimestamp = timestamp; // Initialize on first frame
        }
        const deltaTime = (timestamp - lastTimestamp) / 1000; // Delta time in seconds
        lastTimestamp = timestamp;

        // Interpolate speed smoothly
        currentSpeed = lerp(currentSpeed, targetSpeed, lerpFactor);

        // Increment custom time based on current speed
        customTime += currentSpeed * deltaTime;

        // Update the custom time uniform in the shader
        sandbox.setUniform('u_customTime', customTime);

        requestAnimationFrame(animationLoop);
    }

    // Start the animation loop
    requestAnimationFrame(animationLoop);

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        const deltaY = currentScrollY - lastScrollY;
        lastScrollY = currentScrollY; // Update for next event

        // Determine the factor based on scroll direction
        const factor = deltaY < 0 ? backwardScrollFactor : scrollVelocityFactor;

        // Calculate speed change based on scroll velocity (signed) and direction-specific factor
        // Clamp the magnitude of the change to avoid excessively high speeds
        const speedChange = Math.sign(deltaY) * Math.min(Math.abs(deltaY) * factor, maxSpeedIncrease);

        // Target speed is now default speed + signed change
        targetSpeed = defaultSpeed + speedChange;

        // Clear any existing timeout
        if (scrollTimeout !== null) {
            clearTimeout(scrollTimeout);
        }

        // Set a timeout to reset target speed back to default after scrolling stops
        scrollTimeout = setTimeout(() => {
            targetSpeed = defaultSpeed;
            scrollTimeout = null; // Clear the timeout ID
        }, 150); // Reset speed 150ms after the last scroll event
    });
    // --- End scroll-based speed control ---
}