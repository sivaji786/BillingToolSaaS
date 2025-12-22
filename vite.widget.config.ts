import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/widget-loader.tsx'),
            name: 'TicketingWidget',
            fileName: (format) => `ticketing-widget.${format}.js`,
            formats: ['umd'],
        },
        rollupOptions: {
            // Define external dependencies that shouldn't be bundled
            // For a standalone widget, we might want to bundle everything except React if the host has it,
            // but to be truly "any project", we should probably bundle everything or expect the user to provide React.
            // For simplicity, let's bundle everything.
        },
        outDir: 'public/widget',
    },
    define: {
        'process.env': {},
    },
});
