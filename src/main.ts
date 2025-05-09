import fragmentSource from './shaders/gl-fog.frag?raw';
import { setupFog } from './fog';
import { initializeGlitchEffect } from './glitchEffect';
import { TV } from './tv';

const canvas = document.getElementById('glslCanvas') as HTMLCanvasElement | null;

if (canvas) {
  setupFog(canvas, fragmentSource);
} else {
  console.error("Could not find canvas element with ID 'glslCanvas'");
}

initializeGlitchEffect('.content >  *:not(div)');

new TV();

// Theme switcher logic
const themeToggleButton = document.getElementById('theme-toggle-button') as HTMLButtonElement | null;
const themeMenu = document.getElementById('theme-menu') as HTMLDivElement | null;
const iconAuto = themeToggleButton?.querySelector('.icon-auto') as HTMLElement | null;
const iconLight = themeToggleButton?.querySelector('.icon-light') as HTMLElement | null;
const iconDark = themeToggleButton?.querySelector('.icon-dark') as HTMLElement | null;

const THEME_KEY = 'theme-preference';

const applyTheme = (theme: string) => {
  if (theme === 'auto') {
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem(THEME_KEY);
    if (iconAuto) iconAuto.style.display = 'inline-block';
    if (iconLight) iconLight.style.display = 'none';
    if (iconDark) iconDark.style.display = 'none';
  } else {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    if (iconAuto) iconAuto.style.display = 'none';
    if (iconLight) iconLight.style.display = theme === 'light' ? 'inline-block' : 'none';
    if (iconDark) iconDark.style.display = theme === 'dark' ? 'inline-block' : 'none';
  }
  // Potentially dispatch an event for other components (like fog.ts) to listen to
  document.dispatchEvent(new CustomEvent('themechanged', { detail: { theme } }));
};

const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme) {
  applyTheme(savedTheme);
} else {
  applyTheme('auto'); // Default to auto
}

themeToggleButton?.addEventListener('click', () => {
  themeMenu?.classList.toggle('hidden');
});

themeMenu?.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest('button[data-theme]') as HTMLButtonElement | null;
  if (button && button.dataset.theme) {
    applyTheme(button.dataset.theme);
    themeMenu.classList.add('hidden');
  }
});

// Close menu if clicking outside
document.addEventListener('click', (event) => {
  if (themeMenu && !themeMenu.classList.contains('hidden') &&
    !themeToggleButton?.contains(event.target as Node) &&
    !themeMenu.contains(event.target as Node)) {
    themeMenu.classList.add('hidden');
  }
});

