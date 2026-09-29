import { requestWidgetUpdate } from 'react-native-android-widget';

import type { RawNotification } from '../../modules/notification-listener';
import { getDb } from '../db/db';
import { ensureAppRule, upsertCapture, widgetSnapshot } from '../db/queries';
import { dropReason } from '../ingest/filter';
import { redact } from '../ingest/redact';
import { HelloWidget } from '../widget/hello-widget';
import { APP_MAP } from './packages';

export async function onNotification(n: RawNotification): Promise<void> {
  // Metadata only: never title/text, and never the key (WhatsApp keys embed phone numbers).
  const meta = `pkg=${n.packageName} flags=0x${n.flags.toString(16)} category=${n.category}`;
  const db = getDb();
  const label = APP_MAP[n.packageName]?.label ?? n.appLabel;
  // Rule lookup runs only after the hard-block check inside dropReason, so blocked apps leave no trace.
  const reason = dropReason(n, (pkg) => ensureAppRule(db, pkg, label) === 'allow');
  if (reason) {
    console.log(`[pulse] drop reason=${reason} ${meta}`);
    return;
  }
  const isNew = upsertCapture(db, {
    key: n.key,
    package_name: n.packageName,
    title: redact(n.title),
    text: redact(n.text),
    posted_at_utc: n.postTime,
  });
  const snapshot = widgetSnapshot(db);
  console.log(`[pulse] ${isNew ? 'new' : 'update'} count=${snapshot.count} ${meta}`);
  await requestWidgetUpdate({ widgetName: 'Hello', renderWidget: () => <HelloWidget {...snapshot} /> });
}
