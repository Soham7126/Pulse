import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { readWidgetSnapshot } from './snapshot';
import { renderFor } from './update';

export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps): Promise<void> {
  if (widgetAction === 'WIDGET_DELETED') return;
  renderWidget(renderFor(widgetInfo, readWidgetSnapshot()));
}
