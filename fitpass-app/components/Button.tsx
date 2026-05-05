import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme, COLORS } from '../lib/theme';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
  textStyle,
}: CustomButtonProps) {
  const { colors } = useTheme();

  const variantStyles = useMemo(() => {
    const baseVariants: Record<string, { bg: string; border: string; text: string }> = {
      primary: {
        bg: colors.button.primary,
        border: colors.button.primary,
        text: '#ffffff',
      },
      secondary: {
        bg: colors.bg.secondary,
        border: colors.border.default,
        text: colors.text.primary,
      },
      outline: {
        bg: 'transparent',
        border: colors.button.primary,
        text: colors.button.primary,
      },
      ghost: {
        bg: 'transparent',
        border: 'transparent',
        text: colors.button.primary,
      },
      success: {
        bg: colors.button.success,
        border: colors.button.success,
        text: '#ffffff',
      },
      warning: {
        bg: colors.button.warning,
        border: colors.button.warning,
        text: '#ffffff',
      },
      error: {
        bg: colors.button.error,
        border: colors.button.error,
        text: '#ffffff',
      },
    };
    return baseVariants[variant] || baseVariants.primary;
  }, [variant, colors]);

  const disabledStyles = useMemo(() => ({
    bg: colors.text.muted,
    border: colors.text.muted,
    text: colors.bg.primary,
  }), [colors]);

  const buttonStyle = [
    styles.base,
    styles[size as keyof typeof styles] as ViewStyle,
    {
      backgroundColor: disabled ? disabledStyles.bg : variantStyles.bg,
      borderColor: disabled ? disabledStyles.border : variantStyles.border,
    },
    style,
  ] as ViewStyle[];

  const textStyles = [
    styles.text,
    styles[`text${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof typeof styles],
    {
      color: disabled ? disabledStyles.text : variantStyles.text,
    },
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={textStyles}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  lg: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  text: {
    fontWeight: '600',
  },
  textSm: {
    fontSize: 14,
  },
  textMd: {
    fontSize: 16,
  },
  textLg: {
    fontSize: 18,
  },
});