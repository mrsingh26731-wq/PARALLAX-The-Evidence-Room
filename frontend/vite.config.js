import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:5000" },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/@xyflow") ||
            id.includes("node_modules/d3-")
          )
            return "graph";
          if (
            id.includes("node_modules/framer-motion") ||
            id.includes("node_modules/motion-")
          )
            return "motion";
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
});
