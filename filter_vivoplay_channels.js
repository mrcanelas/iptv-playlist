#!/usr/bin/env node
/**
 * Remove do sites/vivoplay.com.br.channels.xml os canais que não estão
 * em gh-pages/playlist.m3u.
 *
 * Critério: site_id (XML) = tvg-id (playlist). Só permanecem canais
 * cujo site_id existe como tvg-id na playlist.
 *
 * Uso: node filter_vivoplay_channels.js
 */

const fs = require('fs');
const path = require('path');
const parseM3u = require('iptv-playlist-parser').parse;
const convert = require('xml-js');

const rootDir = __dirname;
const playlistPath = path.join(rootDir, 'gh-pages', 'playlist.m3u');
const channelsXmlPath = path.join(rootDir, 'sites', 'vivoplay.com.br.channels.xml');

/** Retorna o conjunto de tvg-id presentes na playlist (fonte da verdade). */
function getPlaylistTvgIds() {
  const content = fs.readFileSync(playlistPath, 'utf8');
  const parsed = parseM3u(content);
  const tvgIds = new Set();
  for (const item of parsed.items || []) {
    const tvgId = item.tvg?.id;
    if (tvgId != null) tvgIds.add(String(tvgId).trim());
  }
  return tvgIds;
}

function filterChannelsXml(tvgIds) {
  const content = fs.readFileSync(channelsXmlPath, 'utf8');
  const js = convert.xml2js(content, { compact: false });

  const siteEl = js.elements && js.elements[0];
  if (!siteEl || siteEl.name !== 'site') {
    console.error('XML inválido: elemento raiz <site> não encontrado.');
    process.exit(1);
  }

  const channelsWrapper = (siteEl.elements || []).find(el => el.name === 'channels');
  if (!channelsWrapper || !channelsWrapper.elements) {
    console.error('XML inválido: <channels> não encontrado.');
    process.exit(1);
  }

  const originalCount = channelsWrapper.elements.length;
  // Manter só canais em que site_id (XML) = tvg-id (playlist)
  channelsWrapper.elements = channelsWrapper.elements.filter(el => {
    if (el.name !== 'channel') return true;
    const siteId = el.attributes && el.attributes.site_id;
    if (siteId == null) return true;
    const siteIdNorm = String(siteId).trim();
    return tvgIds.has(siteIdNorm);
  });
  const keptCount = channelsWrapper.elements.length;
  const removed = originalCount - keptCount;

  const xml = convert.js2xml(js, { compact: false, spaces: 2 });
  fs.writeFileSync(channelsXmlPath, xml, 'utf8');

  return { originalCount, keptCount, removed };
}

function main() {
  if (!fs.existsSync(playlistPath)) {
    console.error('Playlist não encontrada:', playlistPath);
    process.exit(1);
  }
  if (!fs.existsSync(channelsXmlPath)) {
    console.error('Channels XML não encontrado:', channelsXmlPath);
    process.exit(1);
  }

  const tvgIds = getPlaylistTvgIds();
  console.log('tvg-ids na playlist:', tvgIds.size);

  const { originalCount, keptCount, removed } = filterChannelsXml(tvgIds);
  console.log('vivoplay.com.br.channels.xml:');
  console.log('  Antes:', originalCount, 'canais');
  console.log('  Depois:', keptCount, 'canais');
  console.log('  Removidos:', removed);
}

main();
