/// <reference types="node" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path' // ← これを追加！

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // ← この部分がポイント！
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [
      "b526-240b-c010-4c0-51a0-4550-c470-4b51-24ae.ngrok-free.app"
    ],
    cors: true
  }
})
