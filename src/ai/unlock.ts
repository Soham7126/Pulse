import { isPro } from '../entitlements';
import { unlockPro } from '../entitlements/revenuecat';
import { refreshWidgets } from '../widget/update';
import { classifyPending } from './classify';
import { setAiEnabled } from './client';

/**
 * Every Pulse AI entry point (Apps switch, Ask Pulse, detail screen) goes through here:
 * free user → RevenueCat paywall → test purchase → `pro` active → Pulse AI switched on.
 * Resolves true when Pulse AI is ready to use.
 */
export async function unlockPulseAi(): Promise<boolean> {
  if (!isPro() && !(await unlockPro())) return false;
  setAiEnabled(true);
  // Sort everything captured while AI was locked or off.
  void classifyPending().then((n) => (n > 0 ? refreshWidgets() : undefined));
  return true;
}
