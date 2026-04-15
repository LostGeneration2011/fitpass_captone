import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';

interface ThemeToggleProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function ThemeToggle({ showLabel = false, size = 'md' }: ThemeToggleProps) {
  const { theme, colors, toggleTheme } = useTheme();

  const iconSize = size === 'sm' ? 20 : size === 'lg' ? 28 : 24;
  const buttonSize = size === 'sm' ? 36 : size === 'lg' ? 48 : 40;

  const getIconName = () => {
    if (theme === 'dark') return 'moon';
    if (theme === 'light') return 'sunny';
    return 'contrast'; // system
  };

  const getLabel = () => {
    if (theme === 'dark') return 'Dark';
    if (theme === 'light') return 'Light';
    return 'System';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            backgroundColor: colors.bg.secondary,
            borderColor: colors.border.light,
          },
        ]}
        onPress={toggleTheme}
        activeOpacity={0.7}
      >
        <Ionicons
          name={getIconName()}
          size={iconSize}
          color={colors.text.accent}
        />
      </TouchableOpacity>
      {showLabel && (
        <Text style={[styles.label, { color: colors.text.secondary, marginTop: 8 }]}>
          {getLabel()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
