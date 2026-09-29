import { requestWidgetUpdate } from 'react-native-android-widget';

import type { RawNotification } from '../../modules/notification-listener';
import { dropReason } from '../ingest/filter';
import { HelloWidget } from '../widget/hello-widget';
import { APP_MAP } from './packages';

// ponytail: until the per-app allow/deny screen (M1) lands, only the PRD apps are captured.
const isAllowed = (packageName: string) => packageName in APP_MAP;

// ponytail: in-memory spike state, resets when the process dies; replaced by the DB in M2.
const seenKeys = new Set<string>();
export const spikeState: { count: number; lastApp?: string } = { count: 0 };

export async function onNotification(n: RawNotification): Promise<void> {
  // Metadata only: never title/text, and never the key (WhatsApp keys embed phone numbers).
  const meta = `pkg=${n.packageName} flags=0x${n.flags.toString(16)} category=${n.category}`;
  const reason = dropReason(n, isAllowed);
  if (reason) {
    console.log(`[pulse] drop reason=${reason} ${meta}`);
    return;
  }
  // Same key = the app updated an existing notification (A4), not a new item.
  if (seenKeys.has(n.key)) {
    console.log(`[pulse] update ${meta}`);
    return;
  }
  seenKeys.add(n.key);
  spikeState.count += 1;
  spikeState.lastApp = APP_MAP[n.packageName]?.label ?? n.packageName;
  console.log(`[pulse] notification count=${spikeState.count} ${meta}`);
  await requestWidgetUpdate({
    widgetName: 'Hello',
    renderWidget: () => <HelloWidget {...spikeState} />,
  });
}
