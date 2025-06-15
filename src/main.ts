import { setupFog } from './fog';
import { initializeGlitchEffect } from './glitchEffect';
import { TV } from './tv';
import { ThemeSwitcher } from './ThemeSwitcher';

const canvas = document.getElementById('glslCanvas') as HTMLCanvasElement;

setupFog(canvas);

initializeGlitchEffect('.content >  *:not(div)');

if (document.querySelector('.tv')) {
  new TV();
}
new ThemeSwitcher();

