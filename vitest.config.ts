import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/tests/setup.ts'],
        include: ['src/tests/**/*.{test,spec}.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov', 'html'],
            reportsDirectory: './coverage',
            include: [
                'src/components/screens/**',
                'src/pages/**',
                'src/stores/**',
                'src/services/**',
                'src/translations/**',
            ],
            exclude: [
                'src/components/ui/**',  // shadcn — not authored here
                'src/**/*.d.ts',
                'src/main.tsx',
            ],
        },
    },
});
