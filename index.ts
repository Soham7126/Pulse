import 'expo-router/entry';
import { AppRegistry } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { NOTIFICATION_TASK } from './modules/notification-listener';
import { onNotification } from './src/capture/notification-task';
import { widgetTaskHandler } from './src/widget/widget-task-handler';

registerWidgetTaskHandler(widgetTaskHandler);
AppRegistry.registerHeadlessTask(NOTIFICATION_TASK, () => onNotification);
