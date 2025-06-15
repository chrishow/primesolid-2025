import { setupFog } from './fog';
import { initializeGlitchEffect } from './glitchEffect';
import { TV } from './tv';
import { ThemeSwitcher } from './ThemeSwitcher';

const canvas = document.getElementById('glslCanvas') as HTMLCanvasElement | null;

if (canvas) {
  setupFog(canvas);
}

initializeGlitchEffect('.content >  *:not(div)');

new TV();
new ThemeSwitcher();

