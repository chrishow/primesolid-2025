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
const baseColorHex = '#050a1a'; // Deep dark blue
const lowlightColorHex = '#2a0a4a'; // Dark purple
const midtoneColorHex = '#000000'; // Black
const highlightColorHex = '#00ffff'; // Bright cyan

sandbox.load(fragmentSource);

// Set the color uniforms, converting hex where needed
sandbox.setUniform('u_baseColor', ...hexToRgbNormalized(baseColorHex));
sandbox.setUniform('u_lowlightColor', ...hexToRgbNormalized(lowlightColorHex));
sandbox.setUniform('u_midtoneColor', ...hexToRgbNormalized(midtoneColorHex));
sandbox.setUniform('u_highlightColor', ...hexToRgbNormalized(highlightColorHex));

// Set the animation speed (1.0 is default, >1 faster, <1 slower)
sandbox.setUniform('u_speed', 2.0);

// Example of how to change a color later using hex
// function changeBaseColor(newHexColor: string) {
//   sandbox.setUniform('u_baseColor', ...hexToRgbNormalized(newHexColor));
// }

setTimeout(() => {
  // changeBaseColor('#FF0000'); // Change base color to red
}, 2000); // Change after 2 seconds
