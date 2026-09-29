import { APP_MAP } from '../capture/packages';

export type Bucket = 'people' | 'work' | 'shopping' | 'quiet';

// ponytail: routes by the source app's default intent (A3) until the rules classifier (M2) scores each item.
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

export function groupByBucket<T extends { package_name: string }>(rows: T[]): Record<Bucket, T[]> {
  const out: Record<Bucket, T[]> = { people: [], work: [], shopping: [], quiet: [] };
  for (const r of rows) out[bucketFor(r.package_name)].push(r);
  return out;
}
