import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// base relativa: a build funciona servida em qualquer subpasta (ex.: /studio/)
export default defineConfig({
  base: "./",
  plugins: [react()],
  test: {
    environment: "node",
  },
});
