export default defineBackground(async () => {
  browser.alarms.create({periodInMinutes: 5,});
  browser.alarms.onAlarm.addListener(async () => {
    const body = await (await fetch("https://www.youtube.com/@KAN11/videos")).text();
    const json = JSON.parse(body.match(/ytInitialData\s*=\s*({.+?})\s*;/)![1]);
    for (let i = 0; i < json.contents.twoColumnBrowseResultsRenderer.tabs[1].tabRenderer.content.richGridRenderer.contents.length; i++) {
      const {
        videoId,
        title
      } = json.contents.twoColumnBrowseResultsRenderer.tabs[1].tabRenderer.content.richGridRenderer.contents[i].richItemRenderer.content.videoRenderer;
      const {text} = title.runs[0];
      if (!text.includes("מהצד השני")) {
        continue;
      }
      const dateText = text.match(/\d+\.\d+\.\d{4}/)[0];
      const [day, month, year] = dateText.split(".");
      const dateVideo = new Date(year, month - 1, day);
      const dateToday = new Date();
      const isReleasedToday = dateVideo.getDate() === dateToday.getDate();
      const videoIdLast = await storage.getItem("local:lastVideoId");
      if (isReleasedToday) {
        await storage.setItem("local:lastVideoId", videoId);
        await browser.action.setBadgeText({text: "New Video"})
      } else if (videoIdLast) {
        await browser.action.setBadgeText({text: "Old Video"})
      }
    }
  });

  browser.action.onClicked.addListener(async () => {
    const lastVideoId = await storage.getItem("local:lastVideoId");
    if (lastVideoId) {
      await browser.tabs.create({url: `https://www.youtube.com/watch?v=${lastVideoId}`});
      await storage.removeItem("local:lastVideoId");
      await browser.action.setBadgeText({text: ""})
    }
  })
})
