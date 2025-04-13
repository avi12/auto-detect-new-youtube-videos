import {storage} from "#imports";

export default defineBackground(() => {

  const VIEW_STATE_VIEWED = "viewed";
  const VIEW_STATE_UNVIEWED = "unviewed";
  // Define storage items inside the background script scope
  const latestVideoIdStorage = storage.defineItem<string | null>("local:latestVideoId", {fallback: null});
  const viewStateStorage = storage.defineItem<typeof VIEW_STATE_VIEWED | typeof VIEW_STATE_UNVIEWED | null>("local:viewState", {fallback: null});

  // Alarm creation is now handled in the startup logic below
  // browser.alarms.create({periodInMinutes: 5});

    // Minimal interface for the expected structure of YouTube's initial data
    interface VideoRenderer {
        videoId?: string;
        title?: {
            runs?: { text?: string }[];
        };
    }

    interface RichItemRenderer {
        content?: {
            videoRenderer?: VideoRenderer;
        };
    }

    interface VideoItem {
        richItemRenderer?: RichItemRenderer;
    }

    interface RichGridRenderer {
        contents?: VideoItem[];
    }

    interface TabRenderer {
        content?: {
            richGridRenderer?: RichGridRenderer;
        };
    }

    interface Tab {
        tabRenderer?: TabRenderer;
    }

    interface TwoColumnBrowseResultsRenderer {
        tabs?: Tab[];
    }

    interface YouTubeInitialData {
        contents?: {
            twoColumnBrowseResultsRenderer?: TwoColumnBrowseResultsRenderer;
        };
    }

    function getLocalDate() {
      const date = new Date();
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    // Define the video checking logic as a reusable function
    async function checkVideos() {
      console.log("Running video check...");

      const latestVideoId = await latestVideoIdStorage.getValue();
      // No need to get viewState here, it's checked later if needed
      const today = getLocalDate();

      const body = await (await fetch("https://www.youtube.com/@KAN11/videos")).text();

      const match = body.match(/ytInitialData\s*=\s*({.+?})\s*;/);
      if (!match || !match[1]) {
        console.error("Could not find ytInitialData in YouTube page source.");
        return;
      }

      const jsonData = JSON.parse(match[1]) as YouTubeInitialData;


      // Navigate safely through the potentially complex structure
      const tabs = jsonData?.contents?.twoColumnBrowseResultsRenderer?.tabs;
      const videosTab = tabs?.[1]?.tabRenderer?.content?.richGridRenderer?.contents;

      if (!Array.isArray(videosTab)) {
        console.error("Could not find videos array in parsed JSON data.");
        return;
      }

      let foundRelevantVideo = false;
      for (const videoItem of videosTab) {
        // Ensure the expected structure exists before accessing deeper properties
        const videoRenderer = videoItem?.richItemRenderer?.content?.videoRenderer;
        const videoId = videoRenderer?.videoId;
        const videoTitleText = videoRenderer?.title?.runs?.[0]?.text;

        if (!videoId || !videoTitleText) {
          // console.warn('Skipping video item due to missing ID or title text.', videoItem);
          continue; // Skip if essential data is missing
        }

        // videoId and videoTitleText are now guaranteed to be strings
        if (!videoTitleText.includes("מהצד השני")) {
          continue;
        }

        const dateMatch = videoTitleText.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        if (!dateMatch) {
          console.warn(`Could not extract date from title: ${videoTitleText}`);
          continue;
        }

        // Pad day and month for consistent formatting
        const day = dateMatch[1].padStart(2, "0");
        const month = dateMatch[2].padStart(2, "0");
        const year = dateMatch[3];
        const videoDateStr = `${year}-${month}-${day}`;
        const isReleasedToday = videoDateStr === today;

        console.log(`Found relevant video: ${videoTitleText} (ID: ${videoId}, Date: ${videoDateStr})`);
        foundRelevantVideo = true;


        // Handle existing video first
        if (videoId === latestVideoId) { // Check if it's NOT new
          const currentViewState = await viewStateStorage.getValue();
          let badgeText = ""; // Default empty if viewed/null
          if (currentViewState === VIEW_STATE_UNVIEWED) {
            badgeText = isReleasedToday ? "New" : "Old";
          }
          await browser.action.setBadgeText({text: badgeText});
          break; // Found the relevant video, stop checking
        }

        console.log(`New video found (ID: ${videoId}). Updating storage.`);
        await latestVideoIdStorage.setValue(videoId);
        await viewStateStorage.setValue(VIEW_STATE_UNVIEWED);
        await browser.action.setBadgeText({text: "New"});

        break; // Found the relevant video, stop checking
      }

      // If a relevant video was found in the loop, we already handled the badge and broke the loop.
      // If we reach here, no relevant video was found in the fetch results.
      if (foundRelevantVideo) {
        return; // Should not happen due to break, but safe guard.
      }

      console.log("No relevant videos found in the latest check.");
      // Check if there's an existing unviewed video to determine badge state.
      const currentViewState = await viewStateStorage.getValue();
      const badgeText = currentViewState === VIEW_STATE_UNVIEWED ? "Old" : "";
      await browser.action.setBadgeText({text: badgeText});


    }

    browser.alarms.onAlarm.addListener(async (alarm) => {
      // Optional: Check if it's the correct alarm if multiple alarms are used
      if (alarm.name === "video-check") {
        console.log("Alarm triggered video check.");
        await checkVideos();
      }
    });

    browser.action.onClicked.addListener(async () => {
      const latestVideoId = await latestVideoIdStorage.getValue();
      if (latestVideoId) {
        console.log(`Action clicked. Opening video ID: ${latestVideoId}`);
        await browser.tabs.create({url: `https://www.youtube.com/watch?v=${latestVideoId}`});

        // Mark as viewed
        await viewStateStorage.setValue(VIEW_STATE_VIEWED);
        await browser.action.setBadgeText({text: ""});
      } else {
        console.log("Action clicked, but no latest video ID found in storage.");
        // Optional: Open the channel page if no specific video is stored?
        // await browser.tabs.create({ url: "https://www.youtube.com/@KAN11/videos" });
      }
    });

    // Setup alarm and run initial check on startup
    async function setupAlarmAndRunInitialCheck() {
      const alarmName = "video-check";
      const existingAlarm = await browser.alarms.get(alarmName);
      if (!existingAlarm) {
        console.log(`Creating alarm '${alarmName}'...`);
        browser.alarms.create(alarmName, {periodInMinutes: 5}); // Check every 5 minutes
      } else {
        console.log(`Alarm '${alarmName}' already exists.`);
      }
      // Run the check immediately after setup/verification
      console.log("Running initial video check on startup...");
      await checkVideos();

    }

    setupAlarmAndRunInitialCheck();

});
