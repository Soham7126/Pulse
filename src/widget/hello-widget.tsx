import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

// M0 spike: wall + floor + a white block, to check SvgWidget keeps crispEdges before real sprites (M4/M5).
const TEST_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" width="64" height="64" shape-rendering="crispEdges">' +
  '<rect width="8" height="5" fill="#E8DCC8"/><rect y="5" width="8" height="3" fill="#8B5A2B"/>' +
  '<rect x="3" y="3" width="2" height="2" fill="#FFFFFF"/></svg>';

type Props = { count: number; lastPackage?: string };

export function HelloWidget({ count, lastPackage }: Props) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E8DCC8',
      }}
    >
      <SvgWidget svg={TEST_SVG} style={{ width: 64, height: 64 }} />
      <TextWidget
        text={count > 0 ? `${count} · ${lastPackage}` : 'hello'}
        style={{ fontSize: 12, color: '#3B2A1A' }}
        maxLines={1}
        truncate="END"
      />
    </FlexWidget>
  );
}
