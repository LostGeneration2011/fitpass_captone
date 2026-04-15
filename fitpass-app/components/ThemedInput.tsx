import React, { useRef } from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  TextInputProps,
  Animated,
} from 'react-native';
import { useTheme, COLORS } from '../lib/theme';

interface ThemedInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export default function ThemedInput({
  label,
  error,
  icon,
  ...props
}: ThemedInputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.input.bg,
            borderColor: isFocused ? colors.input.focus : colors.input.border,
            borderWidth: 1,
          },
        ]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <TextInput
          {...props}
          style={[
            styles.input,
            {
              color: colors.text.primary,
              flex: 1,
            },
          ]}
          placeholderTextColor={colors.input.placeholder}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
        />
      </View>
      {error && (
        <Text style={[styles.error, { color: colors.text.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

import { Text } from 'react-native';

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  iconContainer: {
    marginRight: 8,
  },
  input: {
    fontSize: 16,
    paddingVertical: 12,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});
