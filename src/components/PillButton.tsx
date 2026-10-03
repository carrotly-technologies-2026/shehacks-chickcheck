import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fonts } from '../theme';
import { Icon, IconName } from './Icon';

type Props = {
  label: string;
  onPress: () => void;
  icon?: IconName | null;
  leadingIcon?: IconName;
  /** m = Figma "Button" (48px), s = compact selector pill (36px) */
  size?: 'm' | 's';
  selected?: boolean;
  style?: ViewStyle;
};

/** Figma component "Button": 999px radius, 1px white border, Host Grotesk Medium label, trailing arrow. */
export function PillButton({ label, onPress, icon = 'arrow-right', leadingIcon, size = 'm', selected, style }: Props) {
  const s = size === 's';
  const ink = selected ? colors.ink : colors.white;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.btn,
        s && styles.small,
        selected && styles.selected,
        hovered && !selected && { backgroundColor: colors.w08 },
        pressed && { opacity: 0.6 },
        style,
      ]}
    >
      {leadingIcon ? <Icon name={leadingIcon} size={s ? 16 : 20} color={ink} /> : null}
      <View style={s ? styles.labelS : styles.label}>
        <Text style={[styles.text, s && styles.textS, { color: ink }]}>{label}</Text>
      </View>
      {icon ? <Icon name={icon} size={s ? 18 : 24} color={ink} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, alignSelf: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.white,
  },
  small: { paddingHorizontal: 12, paddingVertical: 6, borderColor: colors.w40 },
  selected: { backgroundColor: colors.white, borderColor: colors.white },
  label: { paddingHorizontal: 8 },
  labelS: { paddingHorizontal: 4 },
  text: { fontFamily: fonts.button, fontSize: 16, lineHeight: 24 },
  textS: { fontSize: 14, lineHeight: 22 },
});
