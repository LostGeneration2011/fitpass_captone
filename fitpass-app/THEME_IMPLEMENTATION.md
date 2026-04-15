# FitPass App - Light & Dark Mode Implementation Guide

## Overview

The FitPass mobile app now features comprehensive light and dark mode support with system preference detection. The theme system is built on React Context API and provides a complete color palette for both light and dark modes.

## Features

✅ **Light Mode** - Clean, bright interface optimized for daylight usage
✅ **Dark Mode** - Eye-friendly interface for low-light environments  
✅ **System Mode** - Automatically follows device appearance settings
✅ **Persistent Preferences** - Theme choice is saved to AsyncStorage
✅ **Smooth Transitions** - All components respect theme changes in real-time
✅ **Comprehensive Theming** - Colors, shadows, borders, and spacing all theme-aware

## Theme System Architecture

### Color Palette

The theme system includes separate color palettes for light and dark modes:

#### Light Mode Colors
- **Background**: White primary, light slate backgrounds
- **Text**: Dark slate primary text, gray secondary text
- **Accents**: Blue primary accent color
- **Status**: Green (success), Orange (warning), Red (error)

#### Dark Mode Colors
- **Background**: Dark slate primary, darker slate backgrounds
- **Text**: Light slate primary text, gray secondary text
- **Accents**: Cyan primary accent color
- **Status**: Light green (success), Light orange (warning), Light red (error)

### Core Files

```
lib/
  ├── theme.tsx           # Theme provider and context
  ├── api.ts              # API client
  └── auth.ts             # Authentication
  
components/
  ├── Card.tsx            # Themed card component
  ├── Button.tsx          # Themed button with variants
  ├── Header.tsx          # Themed header with back button
  ├── ThemedInput.tsx     # Themed text input
  ├── ThemeToggle.tsx     # Quick theme toggle button
  ├── ThemeSettings.tsx   # Full theme settings UI
  └── Loading.tsx         # Themed loading indicator
```

## Usage

### Using the Theme Hook

```tsx
import { useTheme } from '../lib/theme';

export default function MyComponent() {
  const { colors, isDark, theme, setTheme, toggleTheme } = useTheme();

  return (
    <View style={{ backgroundColor: colors.bg.primary }}>
      <Text style={{ color: colors.text.primary }}>My Text</Text>
      <Button title="Toggle Theme" onPress={toggleTheme} />
    </View>
  );
}
```

### Using Theme Classes (NativeWind)

```tsx
import { useThemeClasses } from '../lib/theme';

export default function MyScreen() {
  const { isDark, screen, card, textPrimary } = useThemeClasses();

  return (
    <View className={screen}>
      <View className={card}>
        <Text className={textPrimary}>Content</Text>
      </View>
    </View>
  );
}
```

### Theme Toggle Component

Add a theme toggle button to your headers or settings:

```tsx
import ThemeToggle from '../components/ThemeToggle';

// Quick toggle in header
<ThemeToggle size="md" />

// With label
<ThemeToggle size="md" showLabel={true} />
```

### Full Theme Settings

Display comprehensive theme options:

```tsx
import ThemeSettings from '../components/ThemeSettings';

<ThemeSettings onClose={() => navigation.goBack()} />
```

## Color System Reference

### Primary Colors

```typescript
// Light Mode
colors.button.primary       // #0284c7 (Blue)
colors.text.accent          // #0284c7 (Blue)

// Dark Mode  
colors.button.primary       // #06b6d4 (Cyan)
colors.text.accent          // #06b6d4 (Cyan)
```

### Semantic Colors

```typescript
colors.button.success       // Success states
colors.button.warning       // Warning states
colors.button.error         // Error states

colors.text.success         // Success text
colors.text.warning         // Warning text
colors.text.error           // Error text
```

### Typography

```typescript
colors.text.primary         // Main text
colors.text.secondary       // Secondary text
colors.text.tertiary        // Tertiary text
colors.text.muted           // Muted/disabled text
```

## Component Examples

### Themed Card

```tsx
<Card variant="default" title="My Card">
  <Text>Card content here</Text>
</Card>
```

Variants: `'default'`, `'elevated'`, `'filled'`

### Themed Button

```tsx
<Button
  title="Click me"
  onPress={() => {}}
  variant="primary"
  size="md"
/>
```

Variants: `'primary'`, `'secondary'`, `'outline'`, `'ghost'`, `'success'`, `'warning'`, `'error'`
Sizes: `'sm'`, `'md'`, `'lg'`

### Themed Input

```tsx
<ThemedInput
  placeholder="Enter text"
  label="Name"
  error={error ? "This field is required" : undefined}
/>
```

### Themed Header

```tsx
<Header
  title="My Screen"
  showBack={true}
  onBack={() => navigation.goBack()}
  rightComponent={<ThemeToggle size="sm" />}
/>
```

## Updating Existing Screens

To update an existing screen to support themes:

1. **Import the hook**
   ```tsx
   import { useTheme, useThemeClasses } from '../lib/theme';
   ```

2. **Use the colors in StyleSheet**
   ```tsx
   const { colors } = useTheme();
   
   const styles = useMemo(() => StyleSheet.create({
     container: {
       backgroundColor: colors.bg.primary,
     },
     text: {
       color: colors.text.primary,
     },
   }), [colors]);
   ```

3. **Or use theme classes**
   ```tsx
   const { screen, card, textPrimary } = useThemeClasses();
   ```

## Best Practices

### 1. Always Use Context Colors
❌ **Don't hardcode colors:**
```tsx
<View style={{ backgroundColor: '#ffffff' }} />
```

✅ **Do use theme colors:**
```tsx
const { colors } = useTheme();
<View style={{ backgroundColor: colors.bg.primary }} />
```

### 2. Create Responsive Styles
```tsx
const styles = useMemo(() => {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.bg.primary,
      borderColor: colors.border.light,
    },
  });
}, [colors]); // Re-create when colors change
```

### 3. Use Semantic Colors
```tsx
// For status indicators
<Text style={{ color: colors.text.success }}>Success</Text>
<Text style={{ color: colors.text.error }}>Error</Text>
```

### 4. Consistent Spacing and Shadows
```tsx
shadowColor: colors.card.shadow,
shadowOpacity: 0.1,
elevation: 3,
```

### 5. Accessibility
- Ensure sufficient color contrast in both modes
- Test text readability in low-light conditions
- Use semantic colors for status indication

## Testing Dark Mode

### Android
1. Open Settings > Display > Dark theme
2. Toggle dark mode

### iOS
1. Open Settings > Display & Brightness
2. Select Dark mode

### Manual Testing
Use the ThemeToggle component or Theme Settings to cycle through:
- Light Mode
- Dark Mode
- System Mode

## Performance Considerations

- Theme context is optimized with `useMemo` to prevent unnecessary re-renders
- Colors are re-created only when theme or colors change
- StyleSheet objects are memoized per component

## Migration Checklist

- [ ] Update all screen components to use `useTheme()`
- [ ] Replace hardcoded colors with theme colors
- [ ] Update all custom components to accept theme props
- [ ] Test all screens in both light and dark modes
- [ ] Add ThemeToggle to settings or profile screen
- [ ] Test on both iOS and Android
- [ ] Verify accessibility (contrast ratios)

## Troubleshooting

### Colors not changing when toggling theme?
- Ensure component is wrapped with `useTheme()` hook
- Check that StyleSheet is using `useMemo` with colors dependency
- Verify colors are actually changing in theme context

### Components appear white/invisible?
- Check text color contrasts
- Ensure background colors are set from theme
- Verify border colors are set for light backgrounds

### Shadows not visible in dark mode?
- Dark mode uses darker shadow color
- Ensure elevation/shadowOpacity is high enough
- Test on actual device (shadow rendering differs)

## Future Enhancements

- [ ] Add custom color picker for user preferences
- [ ] Support theme scheduling (time-based switching)
- [ ] Add more theme variants (e.g., warm, cool tones)
- [ ] Implement theme animations/transitions
- [ ] Add theme export/import functionality

## Contact & Support

For issues or questions about the theme system:
1. Check this documentation
2. Review component examples in `/components/`
3. Test with the ThemeSettings component
4. Check device settings (System Mode tracking)
