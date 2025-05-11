import fragmentSource from './shaders/gl-fog.frag?raw';
import { setupFog } from './fog';
import { initializeGlitchEffect } from './glitchEffect';
import { TV } from './tv';
import { ThemeSwitcher } from './themeSwitcher';

const canvas = document.getElementById('glslCanvas') as HTMLCanvasElement | null;

if (canvas) {
  setupFog(canvas, fragmentSource);
} else {
  console.error("Could not find canvas element with ID 'glslCanvas'");
}

initializeGlitchEffect('.content >  *:not(div)');

new TV();
new ThemeSwitcher();

