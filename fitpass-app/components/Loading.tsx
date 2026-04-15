import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../lib/theme';

interface LoadingProps {
  message?: string;
  size?: 'small' | 'large';
}

export default function Loading({ message = 'Loading...', size = 'large' }: LoadingProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <ActivityIndicator size={size} color={colors.text.accent} />
      <Text style={[styles.message, { color: colors.text.secondary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  message: {
    fontSize: 16,
  },
});