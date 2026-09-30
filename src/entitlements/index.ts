import { PRO_ACTIVE_KEY } from '../config/constants';
import { getDb } from '../db/db';
import { getSetting } from '../db/queries';
import type { Feature } from './pro';

export type { Feature } from './pro';

/**
 * The single seam every gated feature calls (CLAUDE.md). Reads the entitlement cached by the app's RevenueCat
 * listener, because the headless notification task can't talk to the SDK.
 */
export const isPro = (): boolean => getSetting(getDb(), PRO_ACTIVE_KEY) === '1';

export const canUse = (_feature: Feature): boolean => isPro();
