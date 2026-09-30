import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesError, type PurchasesPackage } from 'react-native-purchases';

import { PRO_ACTIVE_KEY } from '../config/constants';
import { getDb } from '../db/db';
import { setSetting } from '../db/queries';
import { openPaywall } from './paywall-bridge';
import { hasPro } from './pro';

// RevenueCat public SDK key (Test Store key for the demo). Client-side by design, unlike the OpenAI key.
const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
const MONTHLY = '$rc_monthly';
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
  // Dev builds: full RevenueCat logs for debugging the purchase flow.
  if (__DEV__) void Purchases.setLogLevel(LOG_LEVEL.DEBUG);
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

/** The package the Pulse paywall sells: `$rc_monthly` from the current (`default`) offering. */
export async function loadProPackage(): Promise<PurchasesPackage | null> {
  if (!configured) return null;
  const { current } = await Purchases.getOfferings();
  return current?.availablePackages.find((p) => p.identifier === MONTHLY) ?? current?.availablePackages[0] ?? null;
}

/** Test Store / Play purchase through RevenueCat. Resolves the entitlement state; 'cancelled' if the user backed out. */
export async function purchasePro(pkg: PurchasesPackage): Promise<'pro' | 'not_pro' | 'cancelled'> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    // The entitlement is the source of truth; refresh once if the returned info lags the purchase.
    return cache(customerInfo) || (await refreshPro()) ? 'pro' : 'not_pro';
  } catch (e) {
    if ((e as Partial<PurchasesError>).userCancelled) return 'cancelled';
    throw e;
  }
}

/**
 * Free user → Pulse paywall → purchase → entitlement active. Resolves true once Pro is active.
 * The paywall is Pulse's own screen (src/app/paywall.tsx): RevenueCat's hosted paywall opened with an
 * empty offering on this SDK (served via a Workflow), so its Continue button had nothing to buy.
 */
export async function unlockPro(): Promise<boolean> {
  if (!configured) return false;
  return openPaywall();
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
