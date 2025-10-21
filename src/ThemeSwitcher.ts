const THEME_KEY = 'theme-preference';

export class ThemeSwitcher {
    private themeToggleButton: HTMLButtonElement;
    private themeMenu: HTMLDivElement;
    private iconAuto: HTMLImageElement;
    private iconLight: HTMLImageElement;
    private iconDark: HTMLImageElement;
    private iconDarkest: HTMLImageElement;
    private animationFrameId: number | null = null;
    private lastX: number = 0;
    private lastY: number = 0;

    constructor() {
        this.createSwitcherHTML();
        this.themeToggleButton = document.getElementById('theme-toggle-button') as HTMLButtonElement;
        this.themeMenu = document.getElementById('theme-menu') as HTMLDivElement;
        this.iconAuto = this.themeToggleButton.querySelector('.icon-auto') as HTMLImageElement;
        this.iconLight = this.themeToggleButton.querySelector('.icon-light') as HTMLImageElement;
        this.iconDark = this.themeToggleButton.querySelector('.icon-dark') as HTMLImageElement;
        this.iconDarkest = this.themeToggleButton.querySelector('.icon-darkest') as HTMLImageElement;

        // Bind the trackCursor method to preserve 'this' context
        this.trackCursor = this.trackCursor.bind(this);

        this.initTheme();
        this.addEventListeners();
    }

    private createSwitcherHTML(): void {
        const switcherContainer = document.createElement('div');
        switcherContainer.id = 'theme-switcher';

        this.themeToggleButton = document.createElement('button');
        this.themeToggleButton.id = 'theme-toggle-button';
        this.themeToggleButton.setAttribute('aria-label', 'Toggle theme');
        this.themeToggleButton.title = 'Change theme';

        this.iconAuto = document.createElement('img');
        this.iconAuto.src = '/theme-icon-auto.svg';
        this.iconAuto.alt = 'Auto theme';
        this.iconAuto.classList.add('icon-auto');

        this.iconLight = document.createElement('img');
        this.iconLight.src = '/theme-icon-light.svg';
        this.iconLight.alt = 'Light theme';
        this.iconLight.classList.add('icon-light');
        this.iconLight.style.display = 'none';

        this.iconDark = document.createElement('img');
        this.iconDark.src = '/theme-icon-dark.svg';
        this.iconDark.alt = 'Dark theme';
        this.iconDark.classList.add('icon-dark');
        this.iconDark.style.display = 'none';

        this.iconDarkest = document.createElement('img');
        this.iconDarkest.src = '/theme-icon-darkest.svg';
        this.iconDarkest.alt = 'Darkest theme';
        this.iconDarkest.classList.add('icon-darkest');
        this.iconDarkest.style.display = 'none';

        this.themeToggleButton.appendChild(this.iconAuto);
        this.themeToggleButton.appendChild(this.iconLight);
        this.themeToggleButton.appendChild(this.iconDark);
        this.themeToggleButton.appendChild(this.iconDarkest);

        this.themeMenu = document.createElement('div');
        this.themeMenu.id = 'theme-menu';
        this.themeMenu.classList.add('hidden');

        const themes = [
            { name: 'Auto', value: 'auto', icon: '/theme-icon-auto.svg' },
            { name: 'Light', value: 'light', icon: '/theme-icon-light.svg' },
            { name: 'Dark', value: 'dark', icon: '/theme-icon-dark.svg' },
            { name: 'Darkest', value: 'darkest', icon: '/theme-icon-darkest.svg' },
        ];

        themes.forEach(theme => {
            const button = document.createElement('button');
            button.dataset.theme = theme.value;
            const img = document.createElement('img');
            img.src = theme.icon;
            img.alt = `${theme.name} theme`;
            img.classList.add(`icon-${theme.value}`);
            button.appendChild(img);
            button.appendChild(document.createTextNode(` ${theme.name}`));
            this.themeMenu.appendChild(button);
        });

        switcherContainer.appendChild(this.themeToggleButton);
        switcherContainer.appendChild(this.themeMenu);
        document.body.appendChild(switcherContainer);
    }

    private applyTheme(theme: string): void {
        if (theme === 'auto') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.removeItem(THEME_KEY);
            this.iconAuto.style.display = 'inline-block';
            this.iconLight.style.display = 'none';
            this.iconDark.style.display = 'none';
            this.iconDarkest.style.display = 'none';
        } else {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem(THEME_KEY, theme);
            this.iconAuto.style.display = 'none';
            this.iconLight.style.display = theme === 'light' ? 'inline-block' : 'none';
            this.iconDark.style.display = theme === 'dark' ? 'inline-block' : 'none';
            this.iconDarkest.style.display = theme === 'darkest' ? 'inline-block' : 'none';
        }

        // Handle darkest theme event listeners
        if (theme === 'darkest') {
            document.addEventListener('mousemove', this.trackCursor);
            document.addEventListener('touchmove', this.trackCursor);
        } else {
            document.removeEventListener('mousemove', this.trackCursor);
            document.removeEventListener('touchmove', this.trackCursor);
            // Cancel any pending animation frame
            if (this.animationFrameId !== null) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        }


        document.dispatchEvent(new CustomEvent('themechanged', { detail: { theme } }));
    }

    public trackCursor(e: MouseEvent | TouchEvent): void {
        // Cache touch object to avoid double property access
        const touch = 'touches' in e ? e.touches[0] : null;
        const x = touch ? touch.clientX : (e as MouseEvent).clientX;
        const y = touch ? touch.clientY : (e as MouseEvent).clientY;

        // Store coordinates for RAF update
        this.lastX = x;
        this.lastY = y;

        // Use requestAnimationFrame to throttle DOM updates
        if (this.animationFrameId === null) {
            this.animationFrameId = requestAnimationFrame(() => {
                document.documentElement.style.setProperty('--cursorX', this.lastX + 'px');
                document.documentElement.style.setProperty('--cursorY', this.lastY + 'px');
                this.animationFrameId = null;
            });
        }
    }

    private initTheme(): void {
        const savedTheme = localStorage.getItem(THEME_KEY);
        if (savedTheme) {
            this.applyTheme(savedTheme);
        } else {
            this.applyTheme('auto'); // Default to auto
        }
    }

    private addEventListeners(): void {
        this.themeToggleButton.addEventListener('click', () => {
            this.themeMenu.classList.toggle('hidden');
        });

        this.themeMenu.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            const button = target.closest('button[data-theme]') as HTMLButtonElement | null;
            if (button && button.dataset.theme) {
                this.applyTheme(button.dataset.theme);
                this.themeMenu.classList.add('hidden');

                if (button.dataset.theme === 'darkest') {
                    // Store click position for darkest theme effect
                    document.documentElement.style.setProperty('--cursorX', (event.clientX) + 'px');
                    document.documentElement.style.setProperty('--cursorY', (event.clientY) + 'px');
                }
            }
        });

        document.addEventListener('click', (event) => {
            if (!this.themeMenu.classList.contains('hidden') &&
                !this.themeToggleButton.contains(event.target as Node) &&
                !this.themeMenu.contains(event.target as Node)) {
                this.themeMenu.classList.add('hidden');
            }
        });
    }
}
