import { defineConfig } from 'vite';
import fullReload from 'vite-plugin-full-reload';
import { resolve } from 'path';

export default defineConfig({
    plugins: [
        fullReload(['public/teletext.html']) // Watch the specific file
    ],
    server: {
        host: '0.0.0.0', // Allow access from any IP
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                404: resolve(__dirname, '404.html')
            }
        }
    }
});
