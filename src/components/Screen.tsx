import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useInsets } from '../lib/insets';
import { GUTTER, gradient, type } from '../theme';
import { Grain } from './Grain';

type Props = {
  children?: ReactNode;
  /** Centered title row, as in Figma frame "iPhone 16 - 3" (Inter Medium 16 directly under the status bar). */
  title?: string;
  left?: ReactNode;
  right?: ReactNode;
  /** Bottom-anchored block: text + pill, 40px gap, 40px from the bottom edge, like every Figma frame. */
  footer?: ReactNode;
  /** Screens inside the tab navigator: the tab bar owns the bottom inset. */
  tabBar?: boolean;
  bodyStyle?: ViewStyle;
};

export function Screen({ children, title, left, right, footer, tabBar, bodyStyle }: Props) {
  const { top, bottom } = useInsets();
  return (
    <LinearGradient colors={gradient} style={styles.fill}>
      <Grain />
      <View style={[styles.fill, { paddingTop: top }]}>
        {(title || left || right) && (
          <View style={styles.header}>
            <View style={styles.side}>{left}</View>
            {title ? <Text style={[type.title, styles.title]} numberOfLines={1}>{title}</Text> : <View style={{ flex: 1 }} />}
            <View style={[styles.side, { alignItems: 'flex-end' }]}>{right}</View>
          </View>
        )}
        <View style={[styles.fill, bodyStyle]}>{children}</View>
        {footer ? (
          <View style={[styles.footer, { paddingBottom: tabBar ? 24 : bottom + 6 }]}>{footer}</View>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', height: 24, paddingHorizontal: 20, marginTop: -1 },
  side: { width: 48 },
  title: { flex: 1, textAlign: 'center' },
  footer: { alignItems: 'center', gap: 40, paddingHorizontal: GUTTER },
});
