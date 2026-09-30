import type { AiIntent, AiPriority } from '../ai/contract';
import { APP_MAP } from '../capture/packages';

export type Bucket = 'people' | 'work' | 'shopping' | 'quiet';

/** Fields the grouping needs; CaptureRow satisfies this. */
export type Classifiable = {
  package_name: string;
  intent: AiIntent | null;
  priority: AiPriority | null;
  action_required: number | null;
  classifier: 'llm' | null;
  status: 'active' | 'handled';
  posted_at_utc: number;
};

/** Before classification: route by the source app's default intent (A3). */
export function bucketFor(packageName: string): Bucket {
  switch (APP_MAP[packageName]?.defaultIntent) {
    case 'communication':
      return 'people';
    case 'work':
      return 'work';
    case 'shopping':
    case 'delivery':
      return 'shopping';
    default:
      return 'quiet';
  }
}

export function bucketOf(row: Classifiable): Bucket {
  if (!row.classifier || !row.intent) return bucketFor(row.package_name);
  if (row.priority === 'noise' || row.priority === 'low' || row.intent === 'noise') {
    // Low-priority items only surface if they are shopping/delivery updates ("Today & upcoming").
    return row.intent === 'delivery' || row.intent === 'shopping' ? (row.priority === 'noise' ? 'quiet' : 'shopping') : 'quiet';
  }
  if (row.intent === 'communication') return 'people';
  if (row.intent === 'shopping' || row.intent === 'delivery') return 'shopping';
  return 'work';
}

/**
 * "Needs your attention" (Today, widget headline and rows, cat awake): unhandled and either GPT-4o says high priority,
 * or medium with an action expected. Unclassified people/work items count until the classifier answers.
 */
export function needsAttention(row: Classifiable): boolean {
  if (row.status === 'handled') return false;
  if (!row.classifier) {
    const b = bucketFor(row.package_name);
    return b === 'people' || b === 'work';
  }
  return row.priority === 'high' || (row.priority === 'medium' && row.action_required === 1);
}

const PRIORITY_RANK: Record<AiPriority, number> = { high: 0, medium: 1, low: 2, noise: 3 };

/** High priority first, then newest. Unclassified rows sit with medium. */
export function byAttention(a: Classifiable, b: Classifiable): number {
  const pa = PRIORITY_RANK[a.priority ?? 'medium'];
  const pb = PRIORITY_RANK[b.priority ?? 'medium'];
  return pa !== pb ? pa - pb : b.posted_at_utc - a.posted_at_utc;
}

export function groupByBucket<T extends Classifiable>(rows: T[]): Record<Bucket, T[]> {
  const out: Record<Bucket, T[]> = { people: [], work: [], shopping: [], quiet: [] };
  for (const r of rows) out[bucketOf(r)].push(r);
  return out;
}
