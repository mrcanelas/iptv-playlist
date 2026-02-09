#!/usr/bin/env node
/**
 * Roda o epg-grabber para vários sites (Vivo Play, mi.tv, etc.) e mescla
 * os guides em um único guide.xml.
 *
 * Uso: node run_epg_multi.js
 *      node run_epg_multi.js --sites=vivoplay,mitv
 *
 * Sites disponíveis: vivoplay, mitv
 * (Claro: precisa de sites/clarotvmais.com.br.config.js para incluir)
 */

const path = require('path');
const { pathToFileURL } = require('url');
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');

const rootDir = __dirname;
const ghPages = path.join(rootDir, 'gh-pages');
const epgTemp = path.join(rootDir, 'epg-temp');

const SITES = {
  vivoplay: {
    config: path.join(rootDir, 'sites', 'vivoplay.com.br.config.js'),
    channels: path.join(rootDir, 'sites', 'vivoplay.com.br.channels.xml'),
    output: path.join(epgTemp, 'guide_vivoplay.xml')
  },
  mitv: {
    config: path.join(rootDir, 'sites', 'mi.tv.config.js'),
    channels: path.join(rootDir, 'sites', 'mi.tv.channels.xml'),
    output: path.join(epgTemp, 'guide_mitv.xml')
  }
};

function parseArgs() {
  const args = process.argv.slice(2);
  let sites = ['vivoplay', 'mitv'];
  for (const a of args) {
    if (a.startsWith('--sites=')) {
      sites = a.slice('--sites='.length).split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return sites;
}

function runGrabber(siteKey) {
  const site = SITES[siteKey];
  if (!site || !fs.existsSync(site.config)) {
    console.warn('Site ignorado (config não encontrado):', siteKey);
    return null;
  }
  console.log('\n--- EPG:', siteKey, '---');
  // No Windows o ESM exige file://; no Linux o epg-grabber quebra com file://
  const configPath = process.platform === 'win32' ? pathToFileURL(site.config).href : site.config;
  const channelsArg = site.channels && fs.existsSync(site.channels) ? ` --channels "${site.channels}"` : '';
  const cmd = `npx epg-grabber -c "${configPath}" -o "${site.output}"${channelsArg}`;
  try {
    execSync(cmd, { cwd: rootDir, stdio: 'inherit' });
    return site.output;
  } catch (err) {
    console.error('Erro ao rodar grabber para', siteKey, err.message);
    return fs.existsSync(site.output) ? site.output : null;
  }
}

function main() {
  fs.mkdirSync(epgTemp, { recursive: true });

  const sitesToRun = parseArgs();
  console.log('Sites:', sitesToRun.join(', '));

  const outputs = [];
  for (const key of sitesToRun) {
    const out = runGrabber(key);
    if (out) outputs.push(out);
  }

  if (outputs.length === 0) {
    console.error('Nenhum guide gerado.');
    process.exit(1);
  }

  console.log('\n--- Mesclando guides ---');
  const mergeScript = path.join(rootDir, 'merge_epg.js');
  const mergedOutput = path.join(ghPages, 'guide.xml');
  const mergeArgs = [...outputs.map(p => path.resolve(p)), '--output=' + path.resolve(mergedOutput)];
  const mergeResult = spawnSync(process.execPath, [mergeScript, ...mergeArgs], { cwd: rootDir, stdio: 'inherit' });
  if (mergeResult.status !== 0) {
    process.exit(mergeResult.status || 1);
  }
  console.log('\nConcluído. Guide unificado:', mergedOutput);
}

main();
