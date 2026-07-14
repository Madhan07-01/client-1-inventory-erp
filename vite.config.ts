import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react(),
    tsconfigPaths(),
    tailwindcss(),
    {
      name: 'copy-index-to-404',
      writeBundle() {
        const indexHtml = path.resolve(process.cwd(), 'dist', 'index.html');
        const errorHtml = path.resolve(process.cwd(), 'dist', '404.html');
        if (fs.existsSync(indexHtml)) {
          fs.copyFileSync(indexHtml, errorHtml);
          console.log('Copied index.html to 404.html for Vercel SPA routing fallback');
        }
      }
    }
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true
  },
  server: {
    port: 8080,
    strictPort: false
  }
});
