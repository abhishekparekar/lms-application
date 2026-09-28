import React from 'react';
import { 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  ViewStyle, 
  TextStyle,
  StyleProp
} from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const getButtonStyles = (): any[] => {
    const base: any[] = [styles.button];
    
    // Variant styles
    if (variant === 'primary') base.push(styles.primary);
    else if (variant === 'secondary') base.push(styles.secondary);
    else if (variant === 'outline') base.push(styles.outline);
    else if (variant === 'danger') base.push(styles.danger);

    // Size styles
    if (size === 'small') base.push(styles.small);
    else if (size === 'large') base.push(styles.large);

    if (disabled || loading) base.push(styles.disabled);

    return base;
  };

  const getTextStyles = (): any[] => {
    const base: any[] = [styles.text];

    if (variant === 'outline') base.push(styles.textOutline);
    else if (variant === 'secondary') base.push(styles.textSecondary);

    if (size === 'small') base.push(styles.textSmall);
    else if (size === 'large') base.push(styles.textLarge);

    return base;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[getButtonStyles(), style]}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'outline' ? '#4F46E5' : '#ffffff'} 
          size="small" 
        />
      ) : (
        <Text style={[getTextStyles(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: '#4F46E5',
  },
  secondary: {
    backgroundColor: '#EEF2FF',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#4F46E5',
  },
  danger: {
    backgroundColor: '#EF4444',
  },
  small: {
    height: 36,
  },
  medium: {
    height: 48,
  },
  large: {
    height: 56,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  textOutline: {
    color: '#4F46E5',
  },
  textSecondary: {
    color: '#4F46E5',
  },
  textSmall: {
    fontSize: 14,
  },
  textLarge: {
    fontSize: 18,
  },
});
