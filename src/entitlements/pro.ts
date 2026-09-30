// Pure: no RevenueCat or RN imports, so it runs under Jest and in the headless task.

/** RevenueCat entitlement that unlocks Pulse AI (architecture H4). Must match the dashboard identifier. */
export const PRO_ENTITLEMENT = 'pro';

/** Features behind Pro. Pulse AI covers classification, Ask Pulse, and the detail screen's interpretation + draft. */
export type Feature = 'ai';

type EntitlementsLike = { entitlements: { active: Record<string, { isActive: boolean } | undefined> } };

export function hasPro(info: EntitlementsLike): boolean {
  return info.entitlements.active[PRO_ENTITLEMENT]?.isActive === true;
}
