import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { getDb } from '../db/db';
import { widgetSnapshot } from '../db/queries';
import { HelloWidget } from './hello-widget';

export async function widgetTaskHandler({ widgetAction, renderWidget }: WidgetTaskHandlerProps): Promise<void> {
  if (widgetAction === 'WIDGET_DELETED') return;
  renderWidget(<HelloWidget {...widgetSnapshot(getDb())} />);
}
