import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // 使用 automatic runtime（React 17+ 默认）
      jsxRuntime: "automatic",
      babel: {
        plugins: [
          ["@babel/plugin-proposal-decorators", { legacy: true }],
          ["@babel/plugin-transform-class-properties", { loose: true }],
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "@member": path.resolve(__dirname, "./src/member"),
      "@admin": path.resolve(__dirname, "./src/admin"),
      "@features": path.resolve(__dirname, "./src/member/modules"),
      "@mocks": path.resolve(__dirname, "./src/mocks"),
    },
    extensions: [".jsx", ".js", ".json"],
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: process.env.VITE_API_BASE_URL || "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query", "axios"],
          "vendor-state": ["zustand"],
          "vendor-i18n": ["react-i18next", "i18next"],
          "vendor-charts": ["echarts", "echarts-for-react"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
  },
});
