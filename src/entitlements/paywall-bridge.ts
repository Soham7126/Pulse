import { router } from 'expo-router';

// Lets unlockPro() await the paywall screen: the screen resolves with whether Pro ended up active.
let pending: ((pro: boolean) => void) | null = null;

export function openPaywall(): Promise<boolean> {
  pending?.(false);
  return new Promise((resolve) => {
    pending = resolve;
    router.push('/paywall');
  });
}

/** Called by the paywall screen when it closes (purchase, restore, or dismissed). */
export function settlePaywall(pro: boolean): void {
  pending?.(pro);
  pending = null;
}
