# FitPass Theme System - Quick Start Guide

## 5-Minute Setup

### Step 1: Import the theme hook
```tsx
import { useTheme } from '../lib/theme';
```

### Step 2: Get colors from the hook
```tsx
export default function MyScreen() {
  const { colors, isDark } = useTheme();
  
  // Use colors directly in your styles
  return (
    <View style={{ backgroundColor: colors.bg.primary }}>
      <Text style={{ color: colors.text.primary }}>Hello</Text>
    </View>
  );
}
```

## Common Patterns

### Pattern 1: Simple View with Background
```tsx
const { colors } = useTheme();

<View style={{ 
  backgroundColor: colors.bg.primary,
  borderColor: colors.border.light,
  borderWidth: 1,
}}>
  {/* content */}
</View>
```

### Pattern 2: Card Component
```tsx
import Card from '../components/Card';

<Card title="My Card" variant="elevated">
  <Text>Content here</Text>
</Card>
```

### Pattern 3: Button with Theme
```tsx
import Button from '../components/Button';

<Button
  title="Submit"
  variant="primary"
  onPress={handleSubmit}
/>
```

### Pattern 4: Using Memoized Styles
```tsx
const MyScreen = () => {
  const { colors } = useTheme();
  
  const styles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: colors.bg.primary,
      padding: 16,
    },
    text: {
      color: colors.text.primary,
      fontSize: 16,
    },
  }), [colors]);
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>My Text</Text>
    </View>
  );
};
```

## Available Colors

### Background Colors
```tsx
colors.bg.primary       // Main background
colors.bg.secondary     // Secondary background
colors.bg.tertiary      // Tertiary background
colors.bg.inverted      // Inverted color
```

### Text Colors
```tsx
colors.text.primary     // Main text
colors.text.secondary   // Secondary text
colors.text.tertiary    // Tertiary text
colors.text.muted       // Muted text
colors.text.accent      // Accent text
colors.text.success     // Success text
colors.text.warning     // Warning text
colors.text.error       // Error text
```

### Border Colors
```tsx
colors.border.light     // Light border
colors.border.default   // Default border
colors.border.dark      // Dark border
```

### Button Colors
```tsx
colors.button.primary   // Primary button
colors.button.primaryHover
colors.button.secondary // Secondary button
colors.button.success
colors.button.warning
colors.button.error
```

### Input Colors
```tsx
colors.input.bg         // Input background
colors.input.border     // Input border
colors.input.placeholder
colors.input.focus      // Focus border color
```

### Card Colors
```tsx
colors.card.bg          // Card background
colors.card.border      // Card border
colors.card.shadow      // Card shadow color
```

## Component Library

### Button Component
```tsx
<Button
  title="Click me"
  onPress={handlePress}
  variant="primary"     // 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'warning' | 'error'
  size="md"             // 'sm' | 'md' | 'lg'
  disabled={false}
/>
```

### Card Component
```tsx
<Card
  title="Card Title"
  onPress={handlePress}  // Optional - makes it pressable
  variant="default"      // 'default' | 'elevated' | 'filled'
>
  {/* Card content */}
</Card>
```

### Input Component
```tsx
<ThemedInput
  placeholder="Enter text"
  label="Name"
  error={error}
  icon={<Ionicons name="person" />}
/>
```

### Header Component
```tsx
<Header
  title="Screen Title"
  showBack={true}
  onBack={() => navigation.goBack()}
  rightComponent={<ThemeToggle size="sm" />}
/>
```

### Theme Toggle
```tsx
<ThemeToggle size="md" showLabel={false} />
```

## Theme Settings Screen

To add theme preferences to your profile/settings screen:

```tsx
import ThemeSettings from '../components/ThemeSettings';

<ThemeSettings onClose={() => navigation.goBack()} />
```

## Theming Best Practices

### ✅ DO:
- Use theme colors from context
- Create memoized styles when using colors
- Use semantic colors (success, error, warning)
- Test in both light and dark modes
- Provide good contrast ratios

### ❌ DON'T:
- Hardcode colors like '#ffffff' or '#000000'
- Create new StyleSheet objects on every render
- Forget to add colors to dependencies array
- Assume light mode is the default
- Ignore accessibility requirements

## Troubleshooting

**Colors not updating?**
- Check that StyleSheet is using `useMemo` with colors dependency
- Ensure component is inside ThemeProvider
- Verify theme context is accessible

**Dark mode text not visible?**
- Check contrast ratios (aim for 4.5:1 or higher)
- Use `colors.text.primary` for main text
- Test on actual device with dark mode enabled

**Component looks different in dark mode?**
- Review shadow colors (they're darker in dark mode)
- Check border colors and backgrounds
- Test all button variants

## Performance Tips

1. **Memoize styles** when using colors
2. **Use useMemo** to prevent style object recreation
3. **Avoid inline styles** in render - use StyleSheet
4. **Batch theme-dependent calculations** together

## File Locations

- **Theme System**: `lib/theme.tsx`
- **Components**: `components/*.tsx`
- **Documentation**: `THEME_IMPLEMENTATION.md`
- **Example Screens**: `app/student/`, `app/teacher/`, `app/admin/`

## Next Steps

1. ✅ Update your screen to use `useTheme()`
2. ✅ Replace hardcoded colors with theme colors
3. ✅ Create memoized StyleSheet with colors dependency
4. ✅ Test in both light and dark modes
5. ✅ Add ThemeToggle to your settings/profile screen
6. ✅ Verify accessibility and contrast ratios

## Need Help?

- Check existing screens for examples
- Review `THEME_IMPLEMENTATION.md` for detailed guide
- Test with ThemeSettings component
- Verify theme context is properly wrapped in App.tsx
