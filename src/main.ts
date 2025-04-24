import fragmentSource from './gl-fog.frag?raw';
import { setupCanvas } from './canvasSetup';
import { initializeGlitchEffect } from './glitchEffect';

const canvas = document.getElementById('glslCanvas') as HTMLCanvasElement | null;

if (canvas) {
  setupCanvas(canvas, fragmentSource);
} else {
  console.error("Could not find canvas element with ID 'glslCanvas'");
}

initializeGlitchEffect('.content >  *:not(div)');
