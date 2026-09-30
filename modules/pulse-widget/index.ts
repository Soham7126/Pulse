import { requireNativeModule } from 'expo';

type PulseWidgetNative = {
  /** Saves the display snapshot (JSON from buildWidgetPayload) and redraws every placed Pulse widget. */
  update(json: string): boolean;
  /** Opens the launcher's add-widget prompt; false where pinning isn't supported. */
  requestPin(kind: 'small' | 'medium'): boolean;
};

export const PulseWidget = requireNativeModule<PulseWidgetNative>('PulseWidget');
