import { Tabs } from 'expo-router';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, IconName } from '../../components/Icon';
import { useInsets } from '../../lib/insets';
import { colors, fonts } from '../../theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, { icon: IconName; label: string }> = {
  home: { icon: 'home', label: 'Start' },
  log: { icon: 'calendar', label: 'Dziennik' },
  tips: { icon: 'bulb', label: 'Porady' },
};

/** Minimal bar sitting on the bottom gradient stop, hairline divider, active item marked with a dot. */
function TabBar({ state, navigation }: TabBarProps) {
  const { bottom } = useInsets();
  return (
    <View style={[styles.bar, { paddingBottom: bottom }]}>
      {state.routes.map((route, i) => {
        const meta = ICONS[route.name];
        if (!meta) return null;
        const on = state.index === i;
        const c = on ? colors.white : colors.w64;
        return (
          <Pressable key={route.key} style={styles.item} onPress={() => !on && navigation.navigate(route.name)} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Icon name={meta.icon} size={22} color={c} />
            <Text style={[styles.label, { color: c }]}>{meta.label}</Text>
            <View style={[styles.dot, on && { backgroundColor: colors.white }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bottom } }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="log" />
      <Tabs.Screen name="tips" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', backgroundColor: colors.bottom, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.w40,
  },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  label: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
});
