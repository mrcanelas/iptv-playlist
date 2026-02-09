#!/usr/bin/env node
/**
 * Aplica EPG (tvg-id, tvg-logo, tvg-name) dos channelFiles a um M3U.
 * Uso: node apply_epg_to_m3u.js [arquivo.m3u ou URL]
 *
 * Fluxo recomendado:
 * 1. Gerar o M3U com o stremio-m3u (Python): https://github.com/fnsc/stremio-m3u
 *    python stremio_to_m3u.py  → playlist.m3u
 * 2. Rodar este script: node apply_epg_to_m3u.js playlist.m3u
 *
 * Ou usar a playlist pública: node apply_epg_to_m3u.js "https://raw.githubusercontent.com/newclews/iptvlist/11b6928efdca347a19e0c6c8c87470296921f82f/iptv.m3u"
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const convert = require('xml-js');
const { parse } = require('iptv-playlist-parser');

const channelFiles = [
  path.join(__dirname, 'sites', 'vivoplay.com.br.channels.xml'),
//  path.join(__dirname, 'sites', 'clarotvmais.com.br.channels.xml'),
  path.join(__dirname, 'sites', 'mi.tv_br.channels.xml'),
];
const fixedChannelsFile = path.join(__dirname, 'fixedChannels.m3u');
const OUTPUT_FILE = path.join(__dirname, 'gh-pages', 'playlist.m3u');

function parseName(name) {
  if (!name || typeof name !== 'string') return '';
  const match = name.match(/\((.*?)\)/);
  const nomeExtraido = match ? match[1] : name;
  return nomeExtraido.toLowerCase()
    .replace(/\[h265\]|\[h265\]/gi, '')
    .replace(/\buhd\b/g, '')
    .replace(/\b4k\b/g, '')
    .replace(/\bfhd\b/g, '')
    .replace(/\bhd\b/g, '')
    .replace(/\bsd\b/g, '')
    .replace(/²/g, '')
    .replace(/&/g, '&amp;')
    .replace(/ cam/g, '')
    .replace(/biz/g, 'bis')
    .replace(/clubes/g, '')
    .replace(/band sp/g, 'band')
    .replace(/\s+/g, '')
    .trim();
}

function getQualityLevel(name) {
  if (!name || typeof name !== 'string') return 0;
  const n = name.toLowerCase();
  if (/\buhd\b/.test(n) || /\b4k\b/.test(n)) return 5;
  if (/\bfhd\b/.test(n)) return 4;
  if (/\bhd\b/.test(n)) return 3;
  if (/\bsd\b/.test(n)) return 1;
  return 2;
}

function parseAllChannels(files) {
  const allChannelsMap = new Map();
  files.forEach(file => {
    if (!fs.existsSync(file)) return;
    const xml = fs.readFileSync(file, { encoding: 'utf-8' });
    const result = convert.xml2js(xml);
    const site = result.elements?.find(el => el.name === 'site');
    const channelsElement = site?.elements?.find(el => el.name === 'channels');
    if (channelsElement?.elements?.length) {
      channelsElement.elements.forEach(channel => {
        const id = channel.attributes?.xmltv_id?.toLowerCase()?.trim();
        if (id && !allChannelsMap.has(id)) {
          allChannelsMap.set(id, channel);
        }
      });
    }
  });
  return [...allChannelsMap.values()];
}

function escapeAttr(str) {
  if (str == null || str === '') return '';
  return String(str).replace(/"/g, "'").trim();
}

function isTestChannel(name) {
  return name && String(name).toLowerCase().includes('teste');
}

/** Remove indicadores de qualidade do nome (4K, UHD, FHD, HD, SD) – qualidade não faz parte do nome do canal. */
function stripQualityFromName(name) {
  if (name == null || typeof name !== 'string') return '';
  return name
    .replace(/\b4k\b/gi, '')
    .replace(/\buhd\b/gi, '')
    .replace(/\bfhd\b/gi, '')
    .replace(/\bhd\b/gi, '')
    .replace(/\bsd\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const LOG_EVERY = 30000;

/** Índice do XML: exato + lista ordenada por tamanho para match por prefixo (evita recalcular 259k vezes). */
function buildXmlIndex(allChannels) {
  const exact = new Map();
  const withKey = [];
  for (const el of allChannels) {
    const key = parseName(el.attributes?.xmltv_id);
    if (!key) continue;
    exact.set(key, el);
    withKey.push({ key, el });
  }
  withKey.sort((a, b) => b.key.length - a.key.length);
  return { exact, withKey };
}

/** Encontra canal no XML: exato ou por prefixo. Usa índice pré-calculado. */
function findXmlChannel(stremioKey, xmlIndex) {
  if (!stremioKey) return null;
  const exact = xmlIndex.exact.get(stremioKey);
  if (exact) return exact;
  const found = xmlIndex.withKey.find(
    ({ key }) => key.length >= 2 && (stremioKey.startsWith(key) || key.startsWith(stremioKey))
  );
  return found ? found.el : null;
}

async function loadM3u(input) {
  let content;
  if (/^https?:\/\//i.test(input)) {
    console.log('Baixando M3U...');
    const { data } = await axios.get(input, { timeout: 120000, responseType: 'text', maxContentLength: Infinity });
    content = data;
  } else {
    content = await fs.readFile(path.resolve(input), 'utf8');
  }
  console.log('Parseando M3U...');
  return parse(content);
}

async function main() {
  const input = process.argv[2] || process.env.INPUT_M3U || 'https://raw.githubusercontent.com/newclews/iptvlist/11b6928efdca347a19e0c6c8c87470296921f82f/iptv.m3u';
  console.log('EPG (XML) → M3U');
  console.log('Entrada:', input);

  const allChannels = parseAllChannels(channelFiles);
  console.log('Canais nos XMLs (EPG):', allChannels.length);
  const xmlIndex = buildXmlIndex(allChannels);

  // 1) Preferência: canais fixos (links já testados) – preencher primeiro
  const byXmlKey = new Map();
  const fixedOnly = []; // canais no fixed que não estão no XML – adicionar mesmo assim
  const xmlNormalizedNames = new Set(allChannels.map(el => parseName(el.attributes?.xmltv_id)).filter(Boolean));
  let fixedChannels = { items: [] };
  if (fs.existsSync(fixedChannelsFile)) {
    const fixedContent = await fs.readFile(fixedChannelsFile, 'utf8');
    fixedChannels = parse(fixedContent);
    console.log('Canais fixos (fixedChannels.m3u):', (fixedChannels.items || []).length, '(prioridade)');

    for (const el of allChannels) {
      if (isTestChannel(el.attributes?.xmltv_id)) continue;
      const key = parseName(el.attributes?.xmltv_id);
      if (!key) continue;
      const fixedItem = (fixedChannels.items || []).find(
        ch => parseName(ch.tvg?.name || ch.name) === key
      );
      if (!fixedItem) continue;
      const a = el.attributes;
      byXmlKey.set(key, {
        tvgId: escapeAttr(a.site_id),
        tvgLogo: escapeAttr(fixedItem.tvg?.logo || a.logo),
        tvgName: escapeAttr(a.xmltv_id),
        groupTitle: escapeAttr(fixedItem.group?.title || ''),
        url: fixedItem.url || '',
        httpReferrer: fixedItem.http?.referrer || '',
      });
    }
    // Canais do fixed que não batem com nenhum XML → incluir mesmo assim (com metadata do próprio fixed), mesmo sem URL
    for (const fixedItem of (fixedChannels.items || [])) {
      const key = parseName(fixedItem.tvg?.name || fixedItem.name);
      if (!key || xmlNormalizedNames.has(key)) continue; // já está em byXmlKey
      fixedOnly.push({
        tvgId: escapeAttr(fixedItem.tvg?.id),
        tvgLogo: escapeAttr(fixedItem.tvg?.logo),
        tvgName: escapeAttr(fixedItem.tvg?.name || fixedItem.name),
        groupTitle: escapeAttr(fixedItem.group?.title || ''),
        url: fixedItem.url || '',
        httpReferrer: fixedItem.http?.referrer || '',
      });
    }
  }

  const fixedCount = byXmlKey.size;

  // 2) M3U de entrada (Stremio/outra lista): só para canais do XML que ainda não têm link (não sobrescreve fixed)
  const parsed = await loadM3u(input);
  const items = parsed.items || [];
  console.log('Entradas no M3U:', items.length);
  const totalItems = items.length;

  console.log('Agrupando por nome (melhor qualidade)...');
  const byKey = new Map();
  for (let i = 0; i < items.length; i++) {
    if (totalItems > LOG_EVERY && i > 0 && i % LOG_EVERY === 0) {
      process.stdout.write(`\r  ${i}/${totalItems}...`);
    }
    const item = items[i];
    const name = item.name || item.tvg?.name || '';
    const key = parseName(name);
    if (!key) continue;
    const current = byKey.get(key);
    const q = getQualityLevel(name);
    if (!current || getQualityLevel(current.name) < q) {
      byKey.set(key, { ...item, name, key, quality: q });
    }
  }
  if (totalItems > LOG_EVERY) process.stdout.write('\r' + ' '.repeat(40) + '\r');
  console.log('Chaves únicas (melhor qualidade):', byKey.size);

  console.log('Procurando match com XML (só onde não há fixed)...');
  const byKeyEntries = [...byKey.entries()];
  for (let i = 0; i < byKeyEntries.length; i++) {
    if (byKeyEntries.length > LOG_EVERY && i > 0 && i % LOG_EVERY === 0) {
      process.stdout.write(`\r  ${i}/${byKeyEntries.length}...`);
    }
    const [, item] = byKeyEntries[i];
    if (!item.url) continue;
    const channelFileMeta = findXmlChannel(item.key, xmlIndex);
    if (!channelFileMeta?.attributes) continue;
    const a = channelFileMeta.attributes;
    if (isTestChannel(a.xmltv_id)) continue;
    const xmlKey = parseName(a.xmltv_id);
    if (byXmlKey.has(xmlKey)) continue; // mantém o link do fixed, não sobrescreve
    byXmlKey.set(xmlKey, {
      tvgId: escapeAttr(a.site_id),
      tvgLogo: escapeAttr(a.logo),
      tvgName: escapeAttr(a.xmltv_id),
      groupTitle: escapeAttr(item.group?.title || ''),
      url: item.url,
      httpReferrer: item.http?.referrer || '',
    });
  }

  const stremioCount = byXmlKey.size - fixedCount;

  // Canais do XML (Stremio ou fixo) + canais só do fixed (sem XML); depois ordenar alfabeticamente
  const toOutput = [];
  for (const el of allChannels) {
    if (isTestChannel(el.attributes?.xmltv_id)) continue;
    const xmlKey = parseName(el.attributes?.xmltv_id);
    if (!xmlKey) continue;
    const entry = byXmlKey.get(xmlKey);
    if (!entry) continue;
    toOutput.push(entry);
  }
  toOutput.push(...fixedOnly);
  // Deduplicar: mesmo canal com outro sufixo de qualidade (ex: "Sportv 4K 2" e "Sportv 2") → fica um só
  const seenKey = new Set();
  const toOutputDeduped = toOutput.filter(ch => {
    const key = parseName(ch.tvgName || '');
    if (!key || seenKey.has(key)) return false;
    seenKey.add(key);
    return true;
  });
  toOutputDeduped.sort((a, b) => (stripQualityFromName(a.tvgName) || '').localeCompare(stripQualityFromName(b.tvgName) || '', 'pt-BR'));

  const lines = ['#EXTM3U'];
  for (const ch of toOutputDeduped) {
    const displayName = stripQualityFromName(ch.tvgName || '') || ch.tvgName || '';
    const parts = ['#EXTINF:-1'];
    if (ch.tvgId) parts.push(`tvg-id="${ch.tvgId}"`);
    if (ch.tvgLogo) parts.push(`tvg-logo="${ch.tvgLogo}"`);
    if (ch.groupTitle) parts.push(`group-title="${ch.groupTitle}"`);
    parts.push(`tvg-name="${escapeAttr(displayName)}"`);
    parts.push(`,` + displayName);
    lines.push(parts.join(' '));
    if (ch.httpReferrer) lines.push('#EXTVLCOPT:http-referrer=' + ch.httpReferrer);
    lines.push(ch.url);
  }

  await fs.outputFile(OUTPUT_FILE, lines.join('\n'), 'utf8');
  console.log('Saída:', OUTPUT_FILE);
  console.log('Total:', toOutputDeduped.length, 'canais (' + fixedCount + ' fixos no XML, ' + stremioCount + ' da lista, ' + fixedOnly.length + ' fixos sem XML)');
}

main().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
