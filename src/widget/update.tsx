import { requestWidgetUpdate, type WidgetInfo } from 'react-native-android-widget';

import { SPRITES } from '../cat/sprites';
import { MEDIUM_WIDGET, PulseMediumWidget, PulseSmallWidget, SMALL_WIDGET } from './pulse-widgets';
import { readWidgetSnapshot, type WidgetSnapshot } from './snapshot';

const BURST_FRAME_MS = 350;

export function renderFor(info: Pick<WidgetInfo, 'widgetName' | 'width' | 'height'>, snapshot: WidgetSnapshot, frame = 0) {
  const size = { width: info.width, height: info.height };
  return info.widgetName === MEDIUM_WIDGET ? (
    <PulseMediumWidget snapshot={snapshot} frame={frame} size={size} />
  ) : (
    <PulseSmallWidget snapshot={snapshot} frame={frame} size={size} />
  );
}

async function updateAll(snapshot: WidgetSnapshot, frame: number): Promise<void> {
  await Promise.all(
    [SMALL_WIDGET, MEDIUM_WIDGET].map((widgetName) =>
      requestWidgetUpdate({ widgetName, renderWidget: (info) => renderFor(info, snapshot, frame) }),
    ),
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Event-driven animation: widgets can't loop, so each new notification plays the pose's frames once
 * (e.g. tail sway → blink) and settles on frame 0. Continuous idle loops stay in-app (locked design).
 */
export async function refreshWidgets(withBurst: boolean): Promise<void> {
  const snapshot = readWidgetSnapshot();
  const sprite = SPRITES[snapshot.pose];
  if (withBurst && sprite) {
    for (let f = sprite.frames.length - 1; f > 0; f--) {
      await updateAll(snapshot, f);
      await sleep(BURST_FRAME_MS);
    }
  }
  await updateAll(snapshot, 0);
}
