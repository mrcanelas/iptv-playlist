#!/usr/bin/env node
/**
 * Mescla vários arquivos XMLTV (guide) em um único guide.xml.
 * Uso: node merge_epg.js [arquivo1.xml] [arquivo2.xml] ... [--output=guide.xml]
 *
 * Canais com mesmo id são deduplicados (fica o primeiro).
 * Todos os programas de todos os arquivos são incluídos.
 */

const fs = require('fs');
const path = require('path');
const convert = require('xml-js');

const defaultOutput = path.join(__dirname, 'gh-pages', 'guide.xml');

function parseArgs() {
  const args = process.argv.slice(2);
  let output = defaultOutput;
  const files = args.filter(a => {
    if (a.startsWith('--output=')) {
      output = a.slice('--output='.length);
      return false;
    }
    return true;
  });
  return { files, output };
}

function loadXml(filepath) {
  const fullPath = path.resolve(filepath);
  if (!fs.existsSync(fullPath)) {
    console.warn('Arquivo não encontrado:', fullPath);
    return null;
  }
  const xml = fs.readFileSync(fullPath, 'utf8');
  return convert.xml2js(xml, { compact: false });
}

function extractTvChildren(js) {
  const root = js.elements && js.elements[0];
  if (!root || root.name !== 'tv') return { channels: [], programmes: [], date: root && root.attributes && root.attributes.date };
  const elements = root.elements || [];
  const channels = elements.filter(el => el.name === 'channel');
  const programmes = elements.filter(el => el.name === 'programme');
  return { channels, programmes, date: root.attributes && root.attributes.date };
}

function mergeGuides(filePaths, outputPath) {
  const seenChannelIds = new Set();
  const allChannels = [];
  const allProgrammes = [];
  let mergedDate = '';

  for (const filepath of filePaths) {
    const js = loadXml(filepath);
    if (!js) continue;
    const { channels, programmes, date } = extractTvChildren(js);
    if (date) mergedDate = date;
    for (const ch of channels) {
      const id = ch.attributes && ch.attributes.id;
      if (id && !seenChannelIds.has(id)) {
        seenChannelIds.add(id);
        allChannels.push(ch);
      }
    }
    allProgrammes.push(...programmes);
  }

  const tvElement = {
    type: 'element',
    name: 'tv',
    attributes: { date: mergedDate || new Date().toISOString().slice(0, 10).replace(/-/g, '') },
    elements: [...allChannels, ...allProgrammes]
  };
  const merged = {
    declaration: { attributes: { version: '1.0', encoding: 'UTF-8' } },
    elements: [tvElement]
  };

  const xml = convert.js2xml(merged, { compact: false, ignoreComment: true, spaces: 2 });
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, xml, 'utf8');
  console.log('EPG mesclado:', outputPath);
  console.log('  Canais:', allChannels.length, '| Programas:', allProgrammes.length);
}

const { files, output } = parseArgs();
if (files.length === 0) {
  console.log('Uso: node merge_epg.js guide_vivoplay.xml guide_mitv.xml [--output=gh-pages/guide.xml]');
  process.exit(1);
}
mergeGuides(files, output);
