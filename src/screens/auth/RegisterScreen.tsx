import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';

interface RegisterScreenProps {
  initialRole?: 'seeker' | 'recruiter';
  onLoginPress: () => void;
  onRegisterSuccess: () => void;
  onBack?: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  initialRole,
  onLoginPress,
  onRegisterSuccess,
  onBack,
}) => {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'seeker' | 'recruiter'>(initialRole || 'seeker');

  useEffect(() => {
    if (initialRole) {
      setRole(initialRole);
    }
  }, [initialRole]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const insets = useSafeAreaInsets();
  const emailRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);
  const confirmPasswordRef = useRef<any>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!displayName.trim()) newErrors.displayName = 'Name is required';
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email address';

    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register({ email, password, displayName, role });
      Alert.alert('Registration Successful', 'Welcome to the platform!', [
        { text: 'OK', onPress: onRegisterSuccess }
      ]);
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialRegister = (provider: string) => {
    Alert.alert('Sign Up', `${provider} sign-up is not configured yet.`);
  };

  return (
    <View style={styles.container}>
      {/* Background Header - Deep Blue */}
      <View style={styles.headerBackground} />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContent, 
            { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 24) }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          
          {/* Top Bar with Back Button */}
          <View style={styles.topBar}>
            {onBack ? (
              <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            ) : <View style={{ width: 40 }} />}
          </View>

          {/* Branding Section */}
          <View style={styles.brandingSection}>
            <View style={styles.logoCircle}>
              <Ionicons name="school" size={40} color="#1E3A8A" />
            </View>
            <Text style={styles.brandTitle}>JobSkill</Text>
            <Text style={styles.brandSubtitle}>Empowering your career journey</Text>
          </View>

          {/* Register Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Create Account</Text>
            <Text style={styles.cardDesc}>Join as a Seeker or a Recruiter</Text>

            {/* Role Selector */}
            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[styles.roleOption, role === 'seeker' && styles.roleOptionActive]}
                onPress={() => setRole('seeker')}
                activeOpacity={0.8}
              >
                <Text style={[styles.roleEmoji, role === 'seeker' && styles.roleEmojiActive]}>🎓</Text>
                <Text style={[styles.roleText, role === 'seeker' && styles.roleTextActive]}>Seeker</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleOption, role === 'recruiter' && styles.roleOptionActive]}
                onPress={() => setRole('recruiter')}
                activeOpacity={0.8}
              >
                <Text style={[styles.roleEmoji, role === 'recruiter' && styles.roleEmojiActive]}>🏢</Text>
                <Text style={[styles.roleText, role === 'recruiter' && styles.roleTextActive]}>Recruiter</Text>
              </TouchableOpacity>
            </View>

            <Input
              label="Full Name"
              placeholder="John Doe"
              value={displayName}
              onChangeText={(text) => {
                setDisplayName(text);
                if (errors.displayName) setErrors({ ...errors, displayName: '' });
              }}
              error={errors.displayName}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              containerStyle={styles.inputContainer}
              inputStyle={styles.modernInput}
            />

            <Input
              ref={emailRef}
              label="Email Address"
              placeholder="name@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              containerStyle={styles.inputContainer}
              inputStyle={styles.modernInput}
            />

            <Input
              ref={passwordRef}
              label="Password"
              placeholder="At least 6 characters"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              error={errors.password}
              secureTextEntry
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              containerStyle={styles.inputContainer}
              inputStyle={styles.modernInput}
            />

            <Input
              ref={confirmPasswordRef}
              label="Confirm Password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
              }}
              error={errors.confirmPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              containerStyle={styles.inputContainer}
              inputStyle={styles.modernInput}
            />

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              style={styles.loginBtn}
              textStyle={styles.loginBtnText}
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or sign up with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity onPress={() => handleSocialRegister('Google')} style={styles.socialBtn}>
                <Ionicons name="logo-google" size={22} color="#DB4437" />
                <Text style={styles.socialBtnText}>Google</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Login Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Already have an account? </Text>
            <TouchableOpacity onPress={onLoginPress}>
              <Text style={styles.signupLink}>Sign In</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Light gray background
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: '#1E3A8A', // Deep Trustworthy Blue
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    height: 44,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  brandingSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  roleOption: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
  },
  roleOptionActive: {
    borderColor: '#1E3A8A',
    backgroundColor: '#EFF6FF', // Light blue tint
  },
  roleEmoji: {
    fontSize: 16,
    opacity: 0.6,
  },
  roleEmojiActive: {
    opacity: 1,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  roleTextActive: {
    color: '#1E3A8A',
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 12,
  },
  modernInput: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
  },
  loginBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#1E3A8A',
    elevation: 2,
    marginTop: 10,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9CA3AF',
    fontSize: 14,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    width: '100%',
  },
  socialBtnText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  signupText: {
    color: '#6B7280',
    fontSize: 15,
  },
  signupLink: {
    color: '#1E3A8A',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
