const axios = require("axios");
const fs = require("fs-extra");
const convert = require("xml-js");
const channelsFile = "./sites/vivoplay.com.br.channels.xml";
const endPoint = "https://mrcanelas.github.io/iptvcat-scraper/brazil.json";
let playlistFileText = "#EXTM3U";

const urlIgnore = [
  "tv.factoryiptv.com",
  "mains.services",
  "dnsl.me:80",
  "185.63.254.200:8080",
  "cdn.us21.live:80",
  "pascaltv.site:8080",
];

function parseName(value) {
  return value.toLowerCase().replace(/ /g, "");
}

async function genPlaylist() {
  const resp = await axios.get(endPoint);
  const xml = fs.readFileSync(channelsFile, { encoding: "utf-8" });
  const result = convert.xml2js(xml);
  const site = result.elements.find((el) => el.name === "site");
  const channels = site.elements.find((el) => el.name === "channels");

  channels.elements.map((el) => {
    const url = resp.data.filter(
      (item) =>
        //        item.Link.includes('factoryiptv') &&
        item.Format == "FHD 2K" &&
        parseName(item.Channel).includes(parseName(el.attributes.xmltv_id)) &&
        item.Status == "Online"
    );
    let itemHeader = "#EXTINF:-1,";

    if (el.attributes.xmltv_id)
      itemHeader += ` tvg-id="${el.attributes.xmltv_id}"`;
    if (el.attributes.logo) itemHeader += ` tvg-logo="${el.attributes.logo}"`;
    if (el.attributes.xmltv_id)
      itemHeader += ` tvg-name="${el.elements[0].text}"`;

    itemHeader += `,${el.elements[0].text}`;
    itemHeader += `\n${url[0] !== undefined ? url[0].Link : ""}`;
    playlistFileText += `\n${itemHeader}`;

  });
  fs.outputFile("./.gh-pages/playlist.m3u", playlistFileText, (err) => {
    console.log("Sucess");
  });
}

genPlaylist();
