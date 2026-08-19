//import { defineConfig } from "vite";
//import react from "@vitejs/plugin-react";

//export default defineConfig({
//  plugins: [react()],
//  server: {
//    port: 5173,
//    proxy: {
//      "/api": "http://localhost:4000",
//    },
//  },
//});


import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "https://lrp38v7b-4000.brs.devtunnels.ms",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});