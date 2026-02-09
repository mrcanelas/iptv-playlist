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

/** Escapa & que não faz parte de entidade XML válida (para o parser não perder canais). */
function escapeAmpersands(xmlString) {
  return xmlString.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#)/g, '&amp;');
}

function filterChannelsXml(tvgIds) {
  let content = fs.readFileSync(channelsXmlPath, 'utf8');
  content = escapeAmpersands(content); // corrigir antes de parsear para não perder canais com & inválido
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
  // Manter canal se site_id OU xmltv_id (XML) estiver na playlist (tvg-id)
  channelsWrapper.elements = channelsWrapper.elements.filter(el => {
    if (el.name !== 'channel') return true;
    const attrs = el.attributes || {};
    const siteIdNorm = attrs.site_id != null ? String(attrs.site_id).trim() : '';
    const xmltvIdNorm = attrs.xmltv_id != null ? String(attrs.xmltv_id).trim() : '';
    return (siteIdNorm && tvgIds.has(siteIdNorm)) || (xmltvIdNorm && tvgIds.has(xmltvIdNorm));
  });
  const keptCount = channelsWrapper.elements.length;
  const removed = originalCount - keptCount;

  let xml = convert.js2xml(js, { compact: false, spaces: 2 });
  xml = escapeAmpersands(xml); // garantir saída válida para o epg-grabber
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
