import { runtimeDataset } from '../persistence/runtime-data.js';

const loadCharter = () => runtimeDataset('data/governance/constitutional-template.json');

export function validateCharter(charterInput=getCharter()) {
  const errors=[];
  if (!charterInput.charterId) errors.push('Missing charterId');
  if (!Array.isArray(charterInput.articles) || !charterInput.articles.length) errors.push('Charter has no articles');
  for (const a of charterInput.articles ?? []) {
    if (!a.articleId || !a.title || !a.type) errors.push(`Invalid article: ${JSON.stringify(a)}`);
  }
  return { valid: errors.length===0, errors };
}

export function getCharter() { return loadCharter(); }
