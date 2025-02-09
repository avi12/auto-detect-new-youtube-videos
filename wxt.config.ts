import {defineConfig} from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: "chrome",
  manifest: {
    name: "Auto Detect New YouTube Videos",
    description: "Automatically detect new YouTube videos.",
    action: {},
    permissions: ["alarms", "storage"],
    host_permissions: ["https://www.youtube.com/*"],
  },
  srcDir: "src",
  outDir: "build",
});
