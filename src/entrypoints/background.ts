export default defineBackground(async () => {
  browser.alarms.create({periodInMinutes: 5});

  function getLocalDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  browser.alarms.onAlarm.addListener(async () => {
    const videoIdLast = await storage.getItem("local:lastVideoId");
    const lastBadgeResetDate = await storage.getItem("local:lastBadgeResetDate");
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

      const {videoId, title} = video;
      const {text} = title.runs[0];

      if (!text.includes("מהצד השני")) {
        continue;
      }

      const dateMatch = text.match(/\d+\.\d+\.\d{4}/);
      if (!dateMatch) {
        continue;
      }

      const [day, month, year] = dateMatch[0].split(".");
      const dateVideo = new Date(year, month - 1, day);

      const isReleasedToday =
        dateVideo.getDate() === new Date().getDate() &&
        dateVideo.getMonth() === new Date().getMonth() &&
        dateVideo.getFullYear() === new Date().getFullYear();

      if (isReleasedToday) {
        await storage.setItem("local:lastVideoId", videoId);

        if (lastBadgeResetDate !== today) {
          await browser.action.setBadgeText({text: "New"});
        }
        return;
      }
    }

    if (videoIdLast && lastBadgeResetDate !== today) {
      await browser.action.setBadgeText({text: "Old"});
    }
  });

  browser.action.onClicked.addListener(async () => {
    const lastVideoId = await storage.getItem("local:lastVideoId");

    if (lastVideoId) {
      await browser.tabs.create({url: `https://www.youtube.com/watch?v=${lastVideoId}`});

      await storage.setItem("local:lastBadgeResetDate", getLocalDate());
      await browser.action.setBadgeText({text: ""});
    }
  });

})
