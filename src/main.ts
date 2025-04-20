import './style.css'
import GlslCanvas from 'glslCanvas';
import fragmentSource from './gl-fog.frag?raw';

const canvas = document.getElementById('glslCanvas') as HTMLCanvasElement;
const sandbox = new GlslCanvas(canvas);

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

// Define your colors using hex strings
const baseColorHex = '#051a1a'; // Deep dark blue
const lowlightColorHex = '#2a0a4a'; // Dark purple
const midtoneColorHex = '#000000'; // Black
const highlightColorHex = '#00ffff'; // Bright cyan

sandbox.load(fragmentSource);

// Set the color uniforms, converting hex where needed
sandbox.setUniform('u_baseColor', ...hexToRgbNormalized(baseColorHex));
sandbox.setUniform('u_lowlightColor', ...hexToRgbNormalized(lowlightColorHex));
sandbox.setUniform('u_midtoneColor', ...hexToRgbNormalized(midtoneColorHex));
sandbox.setUniform('u_highlightColor', ...hexToRgbNormalized(highlightColorHex));

// Add the 'visible' class to trigger the fade-in after setup
canvas.classList.add('visible');

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

// // Example of how to change a color later using hex
// function changeBaseColor(newHexColor: string) {
//   sandbox.setUniform('u_baseColor', ...hexToRgbNormalized(newHexColor));
// }

setTimeout(() => {
  // changeBaseColor('#FF0000'); // Change base color to red
}, 2000); // Change after 2 seconds
