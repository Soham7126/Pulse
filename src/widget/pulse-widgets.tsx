// Widgets are rendered as plain functions; React Compiler output uses hooks, which the widget renderer rejects.
'use no memo';

import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import { DEFAULT_PALETTE } from '../cat/palette';
import { renderSceneSvg, SCENE_ROWS } from '../cat/scene';
import { SPRITES } from '../cat/sprites';
import type { WidgetSnapshot } from './snapshot';

export const SMALL_WIDGET = 'PulseSmall';
export const MEDIUM_WIDGET = 'PulseMedium';

// Font files bundled by the widget config plugin (app.json → fonts), referenced by file name.
const SANS_BOLD = 'PlusJakartaSans_700Bold';
const SANS_SEMI = 'PlusJakartaSans_600SemiBold';
const SANS = 'PlusJakartaSans_400Regular';
const MONO = 'JetBrainsMono_500Medium';

const C = {
  shell: '#FBF8F3',
  wall: '#F5EFE6',
  row: '#FFFFFF',
  ink: '#1B1B1E',
  inkSoft: '#4E453D',
  label: '#705A3E',
  dot: '#39674B',
  divider: '#E8DFD3',
  arrowBg: '#FCDEBB',
  arrowFg: '#281804',
} as const;

type Size = { width: number; height: number };
type Props = { snapshot: WidgetSnapshot; frame: number; size: Size };

function Scene({ snapshot, frame, size, radius }: Props & { radius: number }) {
  const sprite = SPRITES[snapshot.pose] ?? SPRITES.sleep_curled!;
  const f = sprite.frames[frame] ?? sprite.frames[0];
  const cols = (SCENE_ROWS * size.width) / Math.max(1, size.height);
  return (
    <FlexWidget style={{ width: size.width, height: size.height, borderRadius: radius, backgroundColor: C.wall, overflow: 'hidden' }}>
      <SvgWidget svg={renderSceneSvg(f, DEFAULT_PALETTE, cols)} style={{ width: size.width, height: size.height }} />
    </FlexWidget>
  );
}

/** 2×2: scene + cat, one short line only when the cat is awake. */
export function PulseSmallWidget({ snapshot, frame, size }: Props) {
  const awake = snapshot.worth > 0;
  const lineH = awake ? 30 : 0;
  const pad = 8;
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={awake ? `Pulse: ${snapshot.worth} things need you` : 'Pulse: all quiet'}
      style={{ width: 'match_parent', height: 'match_parent', backgroundColor: C.shell, borderRadius: 24, padding: pad, flexGap: 6 }}
    >
      <Scene
        snapshot={snapshot}
        frame={frame}
        radius={18}
        size={{ width: size.width - pad * 2, height: size.height - pad * 2 - (awake ? lineH + 6 : 0) }}
      />
      {awake ? (
        <FlexWidget style={{ height: lineH, width: 'match_parent', backgroundColor: C.row, borderRadius: 15, paddingHorizontal: 10, justifyContent: 'center' }}>
          <TextWidget
            text={`${snapshot.worth} ${snapshot.worth === 1 ? 'thing needs' : 'things need'} you`}
            style={{ fontFamily: MONO, fontSize: 12, color: C.ink }}
            maxLines={1}
            truncate="END"
          />
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

/** 4×2: scene panel left; summary panel right (headline, 3 rows, footer). Scene only while the cat sleeps. */
export function PulseMediumWidget({ snapshot, frame, size }: Props) {
  const pad = 12;
  const inner = { width: size.width - pad * 2, height: size.height - pad * 2 };
  const awake = snapshot.worth > 0;
  if (!awake) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        accessibilityLabel="Pulse: all quiet"
        style={{ width: 'match_parent', height: 'match_parent', backgroundColor: C.shell, borderRadius: 28, padding: pad }}
      >
        <Scene snapshot={snapshot} frame={frame} size={inner} radius={22} />
      </FlexWidget>
    );
  }
  const sceneW = Math.round(inner.width * 0.36);
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={`Pulse: ${snapshot.worth} things need you`}
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: C.shell,
        borderRadius: 28,
        padding: pad,
        flexDirection: 'row',
        flexGap: 12,
      }}
    >
      <Scene snapshot={snapshot} frame={frame} size={{ width: sceneW, height: inner.height }} radius={22} />
      <FlexWidget style={{ flex: 1, height: 'match_parent', flexGap: 5 }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 6 }}>
          <FlexWidget style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.dot }} />
          <TextWidget text="PULSE" style={{ fontFamily: MONO, fontSize: 10, color: C.label, letterSpacing: 0.1 }} />
        </FlexWidget>
        <TextWidget
          text={`${snapshot.worth} ${snapshot.worth === 1 ? 'thing needs' : 'things need'} you`}
          style={{ fontFamily: SANS_BOLD, fontSize: 18, color: C.ink }}
          maxLines={1}
          truncate="END"
        />
        {snapshot.top.map((r, i) => (
          <FlexWidget
            key={i}
            style={{
              width: 'match_parent',
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: C.row,
              borderRadius: 14,
              paddingHorizontal: 10,
              paddingVertical: 4,
              flexGap: 6,
            }}
          >
            <TextWidget text={r.icon} style={{ fontSize: 12 }} />
            <TextWidget text={r.who} style={{ fontFamily: SANS_SEMI, fontSize: 12, color: C.ink }} maxLines={1} truncate="END" />
            <FlexWidget style={{ flex: 1 }}>
              <TextWidget
                text={r.what ? `· ${r.what}` : ''}
                style={{ fontFamily: SANS, fontSize: 12, color: C.inkSoft }}
                maxLines={1}
                truncate="END"
              />
            </FlexWidget>
          </FlexWidget>
        ))}
        <FlexWidget style={{ flex: 1 }} />
        <FlexWidget style={{ width: 'match_parent', height: 1, backgroundColor: C.divider }} />
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', flexGap: 6 }}>
          <TextWidget
            text={`${snapshot.total} notifications → ${snapshot.worth} worth a look`}
            style={{ fontFamily: MONO, fontSize: 10, color: C.inkSoft }}
            maxLines={2}
          />
          <FlexWidget style={{ flex: 1 }} />
          <FlexWidget
            clickAction="OPEN_APP"
            accessibilityLabel="Open Pulse"
            style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.arrowBg, alignItems: 'center', justifyContent: 'center' }}
          >
            <TextWidget text="→" style={{ fontFamily: SANS_BOLD, fontSize: 13, color: C.arrowFg }} />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
