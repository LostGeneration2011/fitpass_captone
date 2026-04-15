import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme, COLORS } from '../lib/theme';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'filled';
}

export default function Card({ title, children, onPress, variant = 'default' }: CardProps) {
  const { colors } = useTheme();

  const containerStyle = [
    styles.card,
    {
      backgroundColor: colors.card.bg,
      borderColor: colors.card.border,
      shadowColor: colors.card.shadow,
    },
    variant === 'elevated' && styles.elevated,
    variant === 'filled' && styles.filled,
  ];

  const titleStyle = [
    styles.title,
    { color: colors.text.primary },
  ];

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component 
      style={containerStyle} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {title && (
          <Text style={titleStyle}>
            {title}
          </Text>
        )}
        {children}
      </View>
    </Component>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  elevated: {
    shadowOpacity: 0.2,
    elevation: 5,
  },
  filled: {
    borderWidth: 0,
    shadowOpacity: 0.15,
    elevation: 4,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
});