import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, COLORS } from '../lib/theme';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightComponent?: React.ReactNode;
}

export default function Header({
  title,
  showBack = false,
  onBack,
  rightComponent
}: HeaderProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
      <View style={[
        styles.container,
        {
          backgroundColor: colors.bg.primary,
          borderBottomColor: colors.border.light,
          shadowColor: colors.card.shadow,
        }
      ]}>
        <View style={styles.leftSection}>
          {showBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          )}
          <Text style={[styles.title, { color: colors.text.primary }]}>
            {title}
          </Text>
        </View>
        {rightComponent}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    borderBottomWidth: 1,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 8,
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
});