import { MEMORY_DAYS } from '../config/constants';
import { getDb } from '../db/db';
import { listPendingClassification, saveClassification } from '../db/queries';
import { deviceZone } from '../time/format';
import { aiConfigured, aiEnabled, callProxy } from './client';
import { MAX_CLASSIFY_BATCH, isClassifyResponse } from './contract';
import { toAiItem } from './payload';

const MAX_BATCHES_PER_RUN = 3;
let running: Promise<number> | null = null;

/**
 * Classifies captures that GPT-4o hasn't seen yet (new ones, backlog from while AI was off/offline).
 * Returns how many rows were classified. Failures leave rows pending; the source-app fallback shows meanwhile.
 * One run at a time: the headless task and the app can both trigger it.
 */
export function classifyPending(): Promise<number> {
  if (!aiEnabled() || !aiConfigured()) return Promise.resolve(0);
  running ??= run().finally(() => {
    running = null;
  });
  return running;
}

async function run(): Promise<number> {
  const db = getDb();
  const zone = deviceZone();
  const since = Date.now() - MEMORY_DAYS * 24 * 60 * 60 * 1000;
  let done = 0;
  for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch++) {
    const rows = listPendingClassification(db, since, MAX_CLASSIFY_BATCH);
    if (rows.length === 0) break;
    try {
      const { results } = await callProxy('/classify', { items: rows.map((r) => toAiItem(r, zone)) }, isClassifyResponse);
      const ids = new Set(rows.map((r) => String(r.id)));
      for (const c of results) {
        if (ids.has(c.id)) {
          saveClassification(db, Number(c.id), c);
          done++;
        }
      }
      console.log(`[pulse] classified ${results.length}/${rows.length}`);
      // The model skipped some ids: stop rather than loop on the same rows.
      if (results.length < rows.length) break;
    } catch (e) {
      console.log(`[pulse] classify failed: ${e instanceof Error ? e.message : 'unknown'}`);
      break;
    }
  }
  return done;
}
