import React, { useState, useRef, useImperativeHandle } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TextInputProps, 
  TouchableOpacity,
  ViewStyle,
  TextStyle
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  inputStyle?: ViewStyle;
  leftIcon?: keyof typeof Ionicons.glyphMap;
}

export const Input = React.forwardRef<TextInput, InputProps>(({
  label,
  error,
  secureTextEntry,
  containerStyle,
  labelStyle,
  inputStyle,
  leftIcon,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Expose the internal text input ref to parent components
  useImperativeHandle(ref, () => inputRef.current as TextInput);

  const showPasswordToggle = secureTextEntry !== undefined;
  const isSecure = secureTextEntry && !isPasswordVisible;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}
      <TouchableOpacity 
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
        style={[
          styles.inputContainer,
          isFocused && styles.focused,
          error ? styles.errorBorder : null,
          inputStyle
        ]}
      >
        {leftIcon && (
          <Ionicons 
            name={leftIcon} 
            size={20} 
            color={isFocused ? '#4F46E5' : '#9CA3AF'} 
            style={{ marginRight: 8 }} 
          />
        )}
        <TextInput
          ref={inputRef}
          style={[styles.textInput, props.multiline ? { textAlignVertical: 'top', paddingTop: 10 } : null]}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={isSecure}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {showPasswordToggle && (
          <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.toggleButton}>
            <Text style={styles.toggleText}>{isPasswordVisible ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    height: 48,
    paddingHorizontal: 12,
  },
  focused: {
    borderColor: '#4F46E5',
    backgroundColor: '#ffffff',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  errorBorder: {
    borderColor: '#EF4444',
  },
  textInput: {
    flex: 1,
    alignSelf: 'stretch',
    color: '#111827',
    fontSize: 16,
    paddingVertical: 0,
  },
  toggleButton: {
    padding: 8,
  },
  toggleText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
});
