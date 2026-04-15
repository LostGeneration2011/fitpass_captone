import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';

interface ThemeSettingsProps {
  onClose?: () => void;
}

export default function ThemeSettings({ onClose }: ThemeSettingsProps) {
  const { theme, setTheme, colors, isDark } = useTheme();

  const themes: Array<{ 
    id: 'light' | 'dark' | 'system'; 
    label: string; 
    icon: any; 
    description: string;
    emoji: string;
  }> = [
    { 
      id: 'light', 
      label: 'Sáng', 
      icon: 'sunny', 
      description: 'Giao diện sáng, dễ nhìn ban ngày',
      emoji: '☀️'
    },
    { 
      id: 'dark', 
      label: 'Tối', 
      icon: 'moon', 
      description: 'Bảo vệ mắt, tiết kiệm pin',
      emoji: '🌙'
    },
    { 
      id: 'system', 
      label: 'Hệ Thống', 
      icon: 'contrast', 
      description: 'Theo cài đặt thiết bị',
      emoji: '⚙️'
    },
  ];

  const handleThemeSelect = async (themeId: 'light' | 'dark' | 'system') => {
    await setTheme(themeId);
    // Small delay for visual feedback before closing
    if (onClose) {
      setTimeout(() => onClose(), 300);
    }
  };

  return (
    <View style={styles.container}>
      {themes.map((themeOption, index) => {
        const isSelected = theme === themeOption.id;
        
        return (
          <TouchableOpacity
            key={themeOption.id}
            onPress={() => handleThemeSelect(themeOption.id)}
            activeOpacity={0.7}
            style={[
              styles.themeOption,
              {
                backgroundColor: isSelected 
                  ? (isDark ? '#1e40af' : '#3b82f6')
                  : (isDark ? '#1e293b' : '#f1f5f9'),
                borderColor: isSelected 
                  ? (isDark ? '#2563eb' : '#60a5fa')
                  : 'transparent',
                marginBottom: index < themes.length - 1 ? 12 : 0,
              },
            ]}
          >
            <View style={styles.optionContent}>
              <View
                style={[
                  styles.iconBackground,
                  {
                    backgroundColor: isSelected 
                      ? (isDark ? '#1e3a8a' : '#2563eb')
                      : (isDark ? '#334155' : '#e2e8f0'),
                  },
                ]}
              >
                <Text style={styles.emoji}>{themeOption.emoji}</Text>
              </View>
              
              <View style={styles.textContainer}>
                <Text 
                  style={[
                    styles.themeLabel,
                    { 
                      color: isSelected 
                        ? '#ffffff' 
                        : (isDark ? '#f1f5f9' : '#0f172a')
                    }
                  ]}
                >
                  {themeOption.label}
                </Text>
                <Text 
                  style={[
                    styles.themeDescription,
                    { 
                      color: isSelected 
                        ? '#e0e7ff' 
                        : (isDark ? '#94a3b8' : '#64748b')
                    }
                  ]}
                >
                  {themeOption.description}
                </Text>
              </View>
              
              {isSelected && (
                <View style={styles.checkmark}>
                  <Ionicons 
                    name="checkmark-circle" 
                    size={28} 
                    color="#ffffff"
                  />
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      <View 
        style={[
          styles.footer,
          { 
            borderTopColor: isDark ? '#334155' : '#e2e8f0',
            backgroundColor: isDark ? '#0f172a' : '#f8fafc',
          }
        ]}
      >
        <Ionicons 
          name="information-circle-outline" 
          size={16} 
          color={isDark ? '#64748b' : '#94a3b8'} 
        />
        <Text 
          style={[
            styles.info,
            { color: isDark ? '#64748b' : '#94a3b8' }
          ]}
        >
          Thay đổi có hiệu lực ngay lập tức
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  themeOption: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBackground: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  emoji: {
    fontSize: 28,
  },
  textContainer: {
    flex: 1,
  },
  themeLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  themeDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  checkmark: {
    marginLeft: 12,
  },
  footer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  info: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

