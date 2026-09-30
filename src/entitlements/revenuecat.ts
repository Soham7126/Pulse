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

/** Asks RevenueCat for the entitlement; if it isn't there yet, drops the SDK cache and asks once more. */
export async function refreshPro(): Promise<boolean> {
  if (!configured) return false;
  if (cache(await Purchases.getCustomerInfo())) return true;
  await Purchases.invalidateCustomerInfoCache();
  return cache(await Purchases.getCustomerInfo());
}

/** Free user → paywall → purchase → entitlement active. Resolves true once Pro is active. */
export async function unlockPro(): Promise<boolean> {
  if (!configured) return false;
  const result = await RevenueCatUI.presentPaywall({ displayCloseButton: true });
  console.log(`[pulse] paywall result=${result}`);
  if (result === PAYWALL_RESULT.ERROR) return false;
  // The entitlement is the source of truth, not the paywall's result code (it can close with CANCELLED
  // after a completed purchase, and the SDK cache can lag the purchase by a moment).
  const pro = await refreshPro();
  console.log(`[pulse] pro active=${pro}`);
  return pro;
}

export async function restorePro(): Promise<boolean> {
  if (!configured) return false;
  return cache(await Purchases.restorePurchases());
}

/**
 * Demo only (dev builds): become a brand-new anonymous RevenueCat user with no purchases, so the
 * free → paywall → purchase flow can be recorded again. Logging *in* would carry the anonymous user's
 * purchases over (RevenueCat merges them), and logOut() refuses while anonymous, so: park the current
 * purchases on a throwaway demo user, then log out to a fresh anonymous one. Resolves the new Pro state.
 */
export async function resetToFreeForDemo(): Promise<boolean> {
  if (!configured || !__DEV__) return false;
  if (await Purchases.isAnonymous()) await Purchases.logIn(`pulse-demo-${Date.now().toString(36)}`);
  return cache(await Purchases.logOut());
}
