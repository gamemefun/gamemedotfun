import path from "path";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  return {
    server: {
      host: "0.0.0.0",
      allowedHosts: ["4b55f8760307.ngrok-free.app"],
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./main"),
      },
    },
  };
});
