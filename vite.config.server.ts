import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  build: {
    ssr: true,
    outDir: "dist/server",
    rollupOptions: {
      input: "./server/index.ts",
      output: {
        entryFileNames: "node-build.mjs",
        format: "es",
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  ssr: {
    noExternal: ["express"],
  },
});