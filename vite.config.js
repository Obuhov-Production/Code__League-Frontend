import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const frontendPort = Number(env.VITE_FRONTEND_PORT || 3000)
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:3001'

  return {
    plugins: [react(), svgr()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@assets': path.resolve(__dirname, './src/assets'),
        '@components': path.resolve(__dirname, './src/components'),
        '@styles': path.resolve(__dirname, './src/assets/styles'),
        '@images': path.resolve(__dirname, './src/assets/images'),
        '@scripts': path.resolve(__dirname, './src/assets/scripts'),
        '@utils': path.resolve(__dirname, './src/assets/scripts/utils'),
        '@constants': path.resolve(__dirname, './src/assets/scripts/constants'),
      },
    },
    server: {
      port: frontendPort,
      open: true,
      host: true,
      fs: {
        allow: [
          __dirname,
          path.resolve(__dirname, '..'),
        ],
      },
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/tests/setup.js',
      css: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        reportsDirectory: './coverage',
        include: ['src/**/*.{js,jsx}'],
        exclude: ['src/main.jsx', 'src/tests/**'],
      },
    },
  }
})
