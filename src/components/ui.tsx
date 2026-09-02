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
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { avatarInk, fonts, initials, radius, space, type, useTheme } from '../lib/theme';

/** A hairline. The primary organising device — used instead of borders on boxes. */
export function Rule({ style, strong }: { style?: StyleProp<ViewStyle>; strong?: boolean }) {
  const { c } = useTheme();
  return (
    <View
      style={[
        { height: StyleSheet.hairlineWidth, backgroundColor: strong ? c.ruleStrong : c.rule },
        style,
      ]}
    />
  );
}

/** Uppercase mono column heading, optionally with a value at the right. */
export function Eyebrow({
  children,
  right,
  style,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.eyebrowRow, style]}>
      <Text style={[type.eyebrow, { color: c.inkFaint }]}>
        {children}
      </Text>
      {right ? <View style={styles.eyebrowRight}>{right}</View> : null}
    </View>
  );
}

/** A titled section: eyebrow, hairline, then content. */
export function Section({
  title,
  right,
  children,
  style,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ gap: space.md }, style]}>
      <View style={{ gap: space.sm }}>
        <Eyebrow right={right}>{title}</Eyebrow>
        <Rule />
      </View>
      {children}
    </View>
  );
}

/**
 * The one raised surface in the app. Elevation is reserved for the thing you
 * are actively composing, so it still means something when it appears.
 */
export function Panel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, scheme, shape } = useTheme();
  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: c.raised,
          borderColor: c.rule,
          borderRadius: shape.card,
          borderWidth: shape.borderW,
          shadowOpacity: shape.hard ? 1 : scheme === 'dark' ? 0 : 0.05,
          shadowRadius: shape.hard ? 0 : 8,
          shadowOffset: shape.hard ? { width: 3, height: 3 } : { width: 0, height: 2 },
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  tint,
  dashed,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tint?: string;
  dashed?: boolean;
}) {
  const { c, shape } = useTheme();
  const ink = tint ?? c.accent;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          borderRadius: shape.chip,
          borderColor: selected ? c.accentSoft : c.rule,
          backgroundColor: selected ? c.accentSoft : 'transparent',
          borderStyle: dashed ? 'dashed' : 'solid',
        },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          type.small,
          {
            color: selected ? (tint ?? c.accentInk) : c.inkSoft,
            fontFamily: selected ? fonts.sansMedium : fonts.sans,
          },
        ]}
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
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, shape } = useTheme();
  const busy = disabled || loading;

  const surface: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: c.accent, borderColor: c.accent }
      : variant === 'secondary'
        ? { backgroundColor: 'transparent', borderColor: c.ruleStrong }
        : variant === 'danger'
          ? { backgroundColor: 'transparent', borderColor: c.rule }
          : { backgroundColor: 'transparent', borderColor: 'transparent' };

  const label: TextStyle =
    variant === 'primary'
      ? { color: c.onAccent, fontFamily: type.heading.fontFamily }
      : variant === 'danger'
        ? { color: c.danger }
        : variant === 'quiet'
          ? { color: c.inkSoft }
          : { color: c.ink };

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { borderRadius: shape.btn },
        surface,
        busy && { opacity: 0.4 },
        pressed && !busy && { opacity: 0.75 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? c.onAccent : c.inkSoft} />
      ) : (
        <Text style={[type.body, styles.buttonLabel, label]}>{title}</Text>
      )}
    </Pressable>
  );
}

/**
 * Inputs are ruled lines, not boxes — the closest thing on screen to writing on
 * paper, and it keeps the composer from looking like a web form.
 */
export const Field = React.forwardRef<TextInput, TextInputProps & { label?: string }>(
  function Field({ label, style, ...props }, ref) {
    const { c } = useTheme();
    return (
      <View style={{ gap: space.sm }}>
        {label ? <Text style={[type.eyebrow, { color: c.inkFaint }]}>{label}</Text> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={c.inkFaint}
          {...props}
          style={[
            type.prose,
            styles.input,
            { color: c.ink, borderBottomColor: c.rule },
            props.multiline && styles.inputMultiline,
            style,
          ]}
        />
      </View>
    );
  },
);

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const ink = avatarInk(name);
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: ink,
        },
      ]}
    >
      <Text
        style={{
          // The avatar washes are mid-dark in both themes, so the mark stays white.
          color: '#FFFFFF',
          fontFamily: type.eyebrow.fontFamily,
          fontSize: size * 0.32,
          letterSpacing: 0.5,
        }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.empty}>
      <Text style={[type.title, { color: c.inkSoft, textAlign: 'center' }]}>{title}</Text>
      {body ? (
        <Text style={[type.body, { color: c.inkFaint, textAlign: 'center', maxWidth: 320 }]}>
          {body}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrowRight: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  panel: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 7,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  buttonLabel: { fontFamily: type.heading.fontFamily },
  input: {
    paddingHorizontal: 0,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inputMultiline: { minHeight: 92, textAlignVertical: 'top' },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  empty: { paddingVertical: space.xxl, alignItems: 'center', gap: space.sm },
});
