import { requestWidgetUpdate } from 'react-native-android-widget';

import type { RawNotification } from '../../modules/notification-listener';
import { HelloWidget } from '../widget/hello-widget';

// ponytail: in-memory M0 spike state, resets when the process dies; replaced by the DB in M2.
export const spikeState: { count: number; lastPackage?: string } = { count: 0 };

export async function onNotification(n: RawNotification): Promise<void> {
  spikeState.count += 1;
  spikeState.lastPackage = n.packageName;
  // Counts and package only. Never log title/text.
  console.log(`[pulse] notification count=${spikeState.count} pkg=${n.packageName}`);
  await requestWidgetUpdate({
    widgetName: 'Hello',
    renderWidget: () => <HelloWidget {...spikeState} />,
  });
}
