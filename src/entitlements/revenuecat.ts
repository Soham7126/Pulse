import { Platform } from 'react-native';
import Purchases, { type CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { PRO_ACTIVE_KEY } from '../config/constants';
import { getDb } from '../db/db';
import { setSetting } from '../db/queries';
import { hasPro } from './pro';

// RevenueCat public SDK key (Test Store key for the demo). Client-side by design, unlike the OpenAI key.
const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
let configured = false;

const cache = (info: CustomerInfo): boolean => {
  const pro = hasPro(info);
  setSetting(getDb(), PRO_ACTIVE_KEY, pro ? '1' : '0');
  return pro;
};

export const purchasesConfigured = (): boolean => configured;

/** Call once from the app (not the headless task). Keeps the cached Pro flag in sync with RevenueCat. */
export function configurePurchases(): void {
  if (configured || !API_KEY || Platform.OS !== 'android') return;
  Purchases.configure({ apiKey: API_KEY });
  Purchases.addCustomerInfoUpdateListener(cache);
  configured = true;
  void Purchases.getCustomerInfo()
    .then(cache)
    .catch(() => undefined);
}

/** Free user → paywall → purchase → entitlement active. Resolves true once Pro is active. */
export async function unlockPro(): Promise<boolean> {
  if (!configured) return false;
  const result = await RevenueCatUI.presentPaywall({ displayCloseButton: true });
  if (result !== PAYWALL_RESULT.PURCHASED && result !== PAYWALL_RESULT.RESTORED) return false;
  // Don't trust the paywall result alone: confirm the entitlement with RevenueCat.
  return cache(await Purchases.getCustomerInfo());
}

export async function restorePro(): Promise<boolean> {
  if (!configured) return false;
  return cache(await Purchases.restorePurchases());
}

/**
 * Demo only (dev builds): switch to a fresh anonymous RevenueCat user so the free → paywall → purchase flow
 * can be recorded again. Test Store purchases belong to the old user and stay there.
 */
export async function resetToFreeForDemo(): Promise<void> {
  if (!configured || !__DEV__) return;
  const { customerInfo } = await Purchases.logIn(`pulse-demo-${Date.now().toString(36)}`);
  cache(customerInfo);
}
