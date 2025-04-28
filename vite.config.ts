import { defineConfig } from 'vite';
import fullReload from 'vite-plugin-full-reload';

export default defineConfig({
    plugins: [
        fullReload(['public/teletext.html']) // Watch the specific file
    ],
    server: {
    },
});
