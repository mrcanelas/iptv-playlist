const axios = require("axios");
const fs = require("fs-extra");
const parser = require("iptv-playlist-parser");
const endPoint = "https://mrcanelas.github.io/iptvcat-scraper/brazil.json";
let playlistFileText = '#EXTM3U'

const urlIgnore = [
  "tv.factoryiptv.com",
  "mains.services",
  "dnsl.me:80",
  "185.63.254.200:8080",
  "cdn.us21.live:80",
  "pascaltv.site:8080",
];

async function genPlaylist() {
  const resp = await axios.get(endPoint);
  const playlist = fs.readFileSync("./example.m3u", { encoding: "utf-8" });
  const result = parser.parse(playlist);

  result.items.map((el) => {
    const url = resp.data.filter(
      (item) => item.Channel.includes(el.name) && item.Status == "Online"
    );
    let itemHeader = '#EXTINF:-1,'

      if (el.tvg.id) itemHeader += ` tvg-id="${el.tvg.id}"`
      if (el.tvg.logo) itemHeader += ` tvg-logo="${el.tvg.logo}"`
      if (el.tvg.name) itemHeader += ` tvg-name="${el.tvg.name}"`
      if (el.group.title) itemHeader += ` group-title="${el.group.title}"`

      itemHeader += `,${el.name}`
      itemHeader += `\n${url[0] !== undefined ? url[0].Link : ''}`
      playlistFileText += `\n${itemHeader}`
  });
  fs.outputFile("./gh-page/playlist.m3u", playlistFileText, (err) => {
    console.log("Sucess");
  });
}

genPlaylist();
