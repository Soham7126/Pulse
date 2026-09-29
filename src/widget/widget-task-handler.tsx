import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { spikeState } from '../capture/notification-task';
import { HelloWidget } from './hello-widget';

export async function widgetTaskHandler({ widgetAction, renderWidget }: WidgetTaskHandlerProps): Promise<void> {
  if (widgetAction === 'WIDGET_DELETED') return;
  renderWidget(<HelloWidget {...spikeState} />);
}
