import {readFile, readdir, mkdir, writeFile, chmod} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {validateNeed} from './evidencecard.js';

export const defaultCaseDirectory = fileURLToPath(new URL('../.local/generated/', import.meta.url));
const staticIds = new Set(['01', '02', '03']);
const generatedIdPattern = /^save-[a-f0-9]{12}$/;
const hostPattern = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

export function validCaseId(id) {
  return staticIds.has(id) || generatedIdPattern.test(id);
}

function cleanUrl(value) {
  try {
    const url = new URL(String(value));
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function rejectSecrets(value, path = '') {
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (/^(apikey|authorization|secret|password|credential)$/i.test(key)) throw new Error(`案卷不能包含凭据字段：${path}${key}`);
    rejectSecrets(item, `${path}${key}.`);
  }
}

export async function saveGeneratedCase(input, directory = defaultCaseDirectory) {
  rejectSecrets(input);
  const claim = String(input.claim || '').trim();
  const domain = String(input.domain || '').trim().toLowerCase();
  const needCheck = validateNeed(input.need);
  if (claim.length < 4 || claim.length > 500) throw new Error('案卷说法须为 4—500 字。');
  if (!needCheck.valid) throw new Error(needCheck.error);
  if (domain && !hostPattern.test(domain)) throw new Error('案卷官方域名格式无效。');
  if (!Array.isArray(input.rounds) || input.rounds.length < 1 || input.rounds.length > 3) throw new Error('案卷须包含 1—3 轮真实查询。');
  if (!input.card || !Array.isArray(input.card.claims) || input.card.claims.length < 1 || input.card.claims.length > 3) throw new Error('证据卡须包含 1—3 项可验证承诺。');
  const rounds = input.rounds.map((round, index) => {
    if (!['success', 'error'].includes(round.status)) throw new Error(`第 ${index + 1} 轮状态无效。`);
    const pages = (Array.isArray(round.pages) ? round.pages : []).slice(0, 20).map(page => {
      const url = cleanUrl(page.url);
      if (!url) return null;
      return {
        title: String(page.title || new URL(url).hostname).slice(0, 300),
        url,
        passage: String(page.passage || '').slice(0, 480),
        date: String(page.date || '').slice(0, 80),
        site: String(page.site || new URL(url).hostname).slice(0, 120)
      };
    }).filter(Boolean);
    return {
      label: String(round.label || `第 ${index + 1} 轮`).slice(0, 120),
      query: String(round.query || '').slice(0, 700),
      ...(round.site ? {site: String(round.site).slice(0, 120)} : {}),
      status: round.status,
      requestId: round.requestId ? String(round.requestId).slice(0, 160) : null,
      ...(round.error ? {error: String(round.error).slice(0, 300)} : {}),
      pages
    };
  });
  const id = `save-${randomBytes(6).toString('hex')}`;
  const generatedAt = new Date().toISOString();
  const card = structuredClone(input.card);
  card.cardId = id;
  card.caseId = id;
  const record = {
    caseId: id,
    claim,
    domain,
    need: needCheck.value,
    startedAt: input.startedAt || generatedAt,
    completedAt: input.completedAt || generatedAt,
    generatedAt,
    outcome: 'researched',
    verdict: 'unreviewed',
    rounds,
    card,
    ...(input.analysis ? {analysis: structuredClone(input.analysis)} : {})
  };
  await mkdir(directory, {recursive: true, mode: 0o700});
  await chmod(directory, 0o700);
  const file = join(directory, `${id}.json`);
  await writeFile(file, JSON.stringify(record, null, 2) + '\n', {mode: 0o600});
  await chmod(file, 0o600);
  return record;
}

export async function readGeneratedCase(id, directory = defaultCaseDirectory) {
  if (!generatedIdPattern.test(String(id))) return null;
  try {
    const record = JSON.parse(await readFile(join(directory, `${id}.json`), 'utf8'));
    return {...record, caseId: id, generated: true};
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function listGeneratedCases(directory = defaultCaseDirectory) {
  let names;
  try {
    names = await readdir(directory);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const records = [];
  for (const name of names) {
    const id = name.replace(/\.json$/, '');
    if (name !== `${id}.json` || !generatedIdPattern.test(id)) continue;
    const record = await readGeneratedCase(id, directory);
    if (record) records.push({id, claim: record.claim, startedAt: record.startedAt, hasCard: Boolean(record.card), generated: true});
  }
  return records.sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
}
