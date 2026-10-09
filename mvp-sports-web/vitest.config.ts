import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    include: ['**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@/services/firebase': path.resolve(__dirname, './tests/__mocks__/firebase.ts'),
      '@/context/AuthContext': path.resolve(__dirname, './tests/__mocks__/AuthContext.tsx'),
      '@/components/ui/DashboardWidgets': path.resolve(__dirname, './tests/__mocks__/DashboardWidgets.tsx'),
    },
  },
});
