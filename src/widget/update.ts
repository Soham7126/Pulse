import { PulseWidget } from '../../modules/pulse-widget';
import { deviceZone, readToday } from '../ui/pulse-data';
import { buildWidgetPayload } from './payload';

/**
 * Pushes today's display snapshot to the native widgets. The cat's idle loop then runs natively (ViewFlipper),
 * so this only needs calling when the data changes: new capture, classification, handled, app open.
 */
export function refreshWidgets(nowUtc = Date.now()): void {
  const { rows, attention, pose } = readToday(nowUtc, deviceZone());
  PulseWidget.update(JSON.stringify(buildWidgetPayload({ total: rows.length, attention, pose })));
}
