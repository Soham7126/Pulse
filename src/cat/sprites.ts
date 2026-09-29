import { AWAKE_SIT } from '../../assets/sprites/awake-sit';
import { SLEEP_CURLED } from '../../assets/sprites/sleep-curled';
import type { PoseId, Sprite } from './sprite';

// ponytail: only the two poses the UI can reach before computePose (M4); the other five get drawn in M4.
export const SPRITES: Partial<Record<PoseId, Sprite>> = {
  awake_sit: AWAKE_SIT,
  sleep_curled: SLEEP_CURLED,
};
