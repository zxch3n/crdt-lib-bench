import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { resolve } from "path";
import { readFileSync } from "fs";

// Read package.json to extract CRDT library versions
const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));
const loroVersion = packageJson.dependencies["loro-crdt"] || "";
const automergeVersion = packageJson.dependencies["@automerge/automerge"] || "";
const yjsVersion = packageJson.dependencies["yjs"] || "";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  define: {
    // Expose library versions as global constants
    __LORO_VERSION__: JSON.stringify(loroVersion.replace("^", "")),
    __YJS_VERSION__: JSON.stringify(yjsVersion.replace("^", "")),
    __AUTOMERGE_VERSION__: JSON.stringify(automergeVersion.replace("^", "")),
  },
  worker: {
    format: "es",
    plugins: () => [
      wasm(),
      topLevelAwait(),
    ],
  },
});
