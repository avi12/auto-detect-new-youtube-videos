import {defineConfig} from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: "chrome",
  manifest: {
    name: "Auto Launch YouTube Videos",
    description: "Automatically launch YouTube videos when you open a new tab.",
    action: {},
    permissions: ["alarms", "storage"],
    host_permissions: ["https://www.youtube.com/*"],
  },
  srcDir: "src",
  outDir: "build",
});
