import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { avatarColor, colors, initials, radius, space } from '../lib/theme';

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      {action}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color,
  compact,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  compact?: boolean;
}) {
  const tint = color ?? colors.accent;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        styles.chip,
        compact && styles.chipCompact,
        selected && { backgroundColor: tint + '26', borderColor: tint },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[styles.chipText, compact && styles.chipTextCompact, selected && { color: tint }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        isDisabled && { opacity: 0.45 },
        pressed && !isDisabled && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#0B0D12' : colors.text} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === 'primary' && { color: '#0B0D12' },
            variant === 'danger' && { color: colors.danger },
            variant === 'ghost' && { color: colors.textDim },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export const Field = React.forwardRef<TextInput, TextInputProps & { label?: string }>(
  function Field({ label, style, ...props }, ref) {
    return (
      <View style={{ gap: space.xs }}>
        {label ? <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textFaint}
          {...props}
          style={[styles.input, props.multiline && styles.inputMultiline, style]}
        />
      </View>
    );
  },
);

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const bg = avatarColor(name);
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg + '33', borderColor: bg },
      ]}
    >
      <Text style={{ color: bg, fontWeight: '700', fontSize: size * 0.36 }}>{initials(name)}</Text>
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  sectionTitle: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  chip: {
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  chipCompact: { paddingHorizontal: space.md, paddingVertical: 6 },
  chipText: { color: colors.textDim, fontSize: 15, fontWeight: '600' },
  chipTextCompact: { fontSize: 13 },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonSecondary: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.danger + '66',
  },
  buttonText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  fieldLabel: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  empty: { padding: space.xl, alignItems: 'center', gap: space.xs },
  emptyTitle: { color: colors.textDim, fontSize: 16, fontWeight: '600' },
  emptyBody: { color: colors.textFaint, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
