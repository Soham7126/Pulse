import 'expo-router/entry';
import { AppRegistry } from 'react-native';

import { NOTIFICATION_TASK } from './modules/notification-listener';
import { onNotification } from './src/capture/notification-task';

AppRegistry.registerHeadlessTask(NOTIFICATION_TASK, () => onNotification);
