export default defineBackground(() => {
  browser.alarms.create({periodInMinutes: 5});

  function getLocalDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  browser.alarms.onAlarm.addListener(async () => {
    const latestVideoId = await storage.getItem("local:latestVideoId");
    const viewState = await storage.getItem("local:viewState");
    const today = getLocalDate();

    const body = await (await fetch("https://www.youtube.com/@KAN11/videos")).text();
    const match = body.match(/ytInitialData\s*=\s*({.+?})\s*;/);
    if (!match) {
      return;
    }

    const json = JSON.parse(match[1]);
    const videos = json.contents.twoColumnBrowseResultsRenderer.tabs[1].tabRenderer.content.richGridRenderer.contents;

    for (const videoItem of videos) {
      const video = videoItem.richItemRenderer?.content?.videoRenderer;
      if (!video) {
        continue;
      }

      const videoId = video.videoId;
      const videoTitle = video.title.runs[0].text;

      if (!videoTitle.includes("מהצד השני")) {
        continue;
      }

      const dateMatch = videoTitle.match(/\d+\.\d+\.\d{4}/)[0];
      const [day, month, year] = dateMatch.split(".");
      const videoDateStr = `${year}-${month}-${day}`;
      const isReleasedToday = videoDateStr === today;

      const isNewVideo = videoId !== latestVideoId;
      if (isNewVideo) {
        await storage.setItem("local:latestVideoId", videoId);
        await storage.setItem("local:viewState", "unviewed");
      }

      if (viewState === "unviewed") {
        if (isReleasedToday) {
          await browser.action.setBadgeText({text: "New"});
        } else {
          await browser.action.setBadgeText({text: "Old"});
        }
      }

      return;
    }
  });

  browser.action.onClicked.addListener(async () => {
    const latestVideoId = await storage.getItem("local:latestVideoId");
    if (latestVideoId) {
      await browser.tabs.create({url: `https://www.youtube.com/watch?v=${latestVideoId}`});

      // Mark as viewed
      await storage.setItem("local:viewState", "viewed");
      await browser.action.setBadgeText({text: ""});
    }
  });
})
