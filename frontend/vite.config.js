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
    // Permite que Vite acepte la conexión externa de Ngrok sin dar error de red
    allowedHosts: true, 
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
      // NUEVO: Redirige la búsqueda de imágenes/documentos hacia tu backend
      "/uploads": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      }
    },
  },
});