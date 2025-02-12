export default defineBackground(() => {
  browser.alarms.create({ periodInMinutes: 5 });

  function getLocalDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  browser.alarms.onAlarm.addListener(async () => {
    const lastVideoId = await storage.getItem("local:lastVideoId");
    const lastBadgeResetDate = await storage.getItem("local:lastBadgeResetDate");
    const lastVideoDate = await storage.getItem("local:lastVideoDate");
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
      if (isReleasedToday) {
        await storage.setItem("local:lastVideoId", videoId);
        await storage.setItem("local:lastVideoDate", videoDateStr);

        if (lastBadgeResetDate !== today) {
          await browser.action.setBadgeText({ text: "New" });
        }
        return;
      }
    }

    if (lastVideoId && lastVideoDate !== today && lastBadgeResetDate !== today) {
      await browser.action.setBadgeText({ text: "Old" });
    }
  });

  browser.action.onClicked.addListener(async () => {
    const lastVideoId = await storage.getItem("local:lastVideoId");
    if (lastVideoId) {
      await browser.tabs.create({ url: `https://www.youtube.com/watch?v=${lastVideoId}` });

      await storage.removeItem("local:lastVideoId");
      await storage.setItem("local:lastBadgeResetDate", getLocalDate());
      await browser.action.setBadgeText({ text: "" });
    }
  });
})
