import react from "@vitejs/plugin-react";
import { defineConfig, type PluginOption } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react() as PluginOption],
  server: {
    port: 3000,
  },
});
