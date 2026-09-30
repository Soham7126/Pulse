import { bucketFor } from '../classify/buckets';
import { DEFAULT_PALETTE } from '../cat/palette';
import type { PoseId } from '../cat/sprite';
import { SPRITES } from '../cat/sprites';
import type { CaptureRow } from '../db/queries';

type Row = Pick<CaptureRow, 'id' | 'package_name' | 'label' | 'title' | 'text' | 'intent' | 'action_text'>;

export type WidgetRow = { id: number; icon: string; who: string; what: string };

/** Exactly what the native widget displays (architecture §8): never the full notification store. */
export type WidgetPayload = {
  awake: boolean;
  headline: string;
  line: string;
  footer: string;
  rows: WidgetRow[];
  sprite: { fps: number; sequence: number[]; frames: string[][] };
  palette: Record<string, string>;
};

export const MAX_WIDGET_ROWS = 3;

// Plain emoji: the widget can't use the app's icon font.
const ICONS: Record<NonNullable<CaptureRow['intent']>, string> = {
  communication: '💬',
  work: '💼',
  event: '📅',
  delivery: '📦',
  shopping: '🛍️',
  finance: '💳',
  security: '🔐',
  noise: '🔔',
};

function toRow(r: Row): WidgetRow {
  const icon = r.intent ? ICONS[r.intent] : '💬';
  const app = r.label ?? r.package_name;
  // Messages lead with the sender ("Rahul · Send the DBMS file"); other apps lead with the app ("Amazon · Out for delivery").
  const fromPerson = r.intent === 'communication' || bucketFor(r.package_name) === 'people';
  return fromPerson
    ? { id: r.id, icon, who: r.title ?? app, what: r.action_text ?? r.text ?? '' }
    : { id: r.id, icon, who: app, what: r.action_text ?? r.title ?? r.text ?? '' };
}

export function buildWidgetPayload(input: { total: number; attention: Row[]; pose: PoseId }): WidgetPayload {
  const n = input.attention.length;
  const needs = `${n} ${n === 1 ? 'thing needs' : 'things need'} you`;
  const sprite = SPRITES[input.pose] ?? SPRITES.sleep_curled!;
  return {
    awake: n > 0,
    headline: needs,
    line: needs,
    footer: `${input.total} notifications → ${n} important`,
    rows: input.attention.slice(0, MAX_WIDGET_ROWS).map(toRow),
    sprite: { fps: sprite.fps, sequence: sprite.sequence, frames: sprite.frames },
    palette: DEFAULT_PALETTE,
  };
}
