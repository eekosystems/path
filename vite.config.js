import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: "src/main/main.ts",
        vite: {
          build: {
            rollupOptions: {
              external: ['keytar', 'node-machine-id']
            }
          }
        }
      },
      {
        entry: "src/main/preload.ts",
        onstart(options) {
          // Reload the renderer process when the preload script is rebuilt
          options.reload()
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: { 
    outDir: "dist/renderer",
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
  }
});
