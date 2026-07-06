import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/services/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect } from 'react';

interface LoginScreenProps {
  onRegisterPress: (role?: 'seeker' | 'recruiter') => void;
  onLoginSuccess: () => void;
  onForgotPasswordPress: () => void;
  onBack?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onRegisterPress,
  onLoginSuccess,
  onForgotPasswordPress,
  onBack,
}) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userTypeModalVisible, setUserTypeModalVisible] = useState(false);
  const [isJobsVisible, setIsJobsVisible] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'lms_config', 'tabs_visibility'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setIsJobsVisible(data.jobs !== false);
        }
      },
      (err) => {
        console.warn('Error listening to tabs visibility in LoginScreen:', err);
      }
    );
    return () => unsub();
  }, []);

  const insets = useSafeAreaInsets();
  const passwordRef = useRef<any>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Enter a valid email';

    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Must be at least 6 characters';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login({ email, password });
      onLoginSuccess();
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    Alert.alert('Sign In', `${provider} sign-in is not configured yet.`);
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

          {/* Login Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardDesc}>Sign in to your account to continue</Text>

            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              error={errors.email}
              keyboardType="email-address"
              leftIcon="mail-outline"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              containerStyle={styles.inputContainer}
              inputStyle={styles.modernInput}
            />

            <Input
              ref={passwordRef}
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              error={errors.password}
              leftIcon="lock-closed-outline"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              containerStyle={styles.inputContainer}
              inputStyle={styles.modernInput}
            />

            <TouchableOpacity onPress={onForgotPasswordPress} style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginBtn}
              textStyle={styles.loginBtnText}
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity onPress={() => handleSocialLogin('Google')} style={styles.socialBtn}>
                <Ionicons name="logo-google" size={22} color="#DB4437" />
                <Text style={styles.socialBtnText}>Google</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Signup Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>{"Don't have an account? "}</Text>
            <TouchableOpacity onPress={() => setUserTypeModalVisible(true)}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── MODAL: User Type Selection Modal (Web style popup) ── */}
      <Modal
        visible={userTypeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setUserTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.typeModalContainer}>
            {/* Top decorative accent bar */}
            <View style={styles.typeModalAccentBar} />

            <View style={styles.typeModalHeader}>
              <View style={styles.typeModalHeaderIconBox}>
                <Ionicons name="person-add" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.typeModalTitle}>Create Your Account</Text>
              <Text style={styles.typeModalSubtitle}>Choose the account type that suits your needs</Text>
            </View>

            <View style={styles.typeModalOptions}>
              {/* Option: Job Seeker */}
              <TouchableOpacity
                style={styles.typeOptionCard}
                onPress={() => {
                  setUserTypeModalVisible(false);
                  onRegisterPress('seeker');
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.typeOptionIconBox, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="briefcase" size={22} color="#4F46E5" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.typeOptionTitle}>I am a Student </Text>
                  <Text style={styles.typeOptionDesc}>
                    Find verified courses for your skills.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Option: Employer / Recruiter */}
              {isJobsVisible && (
                <TouchableOpacity
                  style={styles.typeOptionCard}
                  onPress={() => {
                    setUserTypeModalVisible(false);
                    onRegisterPress('recruiter');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.typeOptionIconBox, { backgroundColor: '#FFF7ED' }]}>
                    <Ionicons name="business" size={22} color="#EA580C" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.typeOptionTitle}>I am an Employer</Text>
                    <Text style={styles.typeOptionDesc}>
                      Post requirements, review matching profiles, and hire top talent directly.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.typeModalCancelBtn}
              onPress={() => setUserTypeModalVisible(false)}
            >
              <Text style={styles.typeModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    marginBottom: 20,
    height: 44,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  brandingSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  brandTitle: {
    fontSize: 26,
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
    elevation: 4, // Clean elevation for Android
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
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  modernInput: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderWidth: 1,
    height: 52,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    color: '#1E3A8A',
    fontWeight: '600',
    fontSize: 14,
  },
  loginBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#1E3A8A',
    elevation: 2,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  typeModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
    position: 'relative',
  },
  typeModalAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#1E3A8A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  typeModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  typeModalHeaderIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  typeModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  typeModalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  typeModalOptions: {
    gap: 12,
    marginBottom: 20,
  },
  typeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    gap: 14,
    backgroundColor: '#F9FAFB',
  },
  typeOptionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeOptionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  typeOptionDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    lineHeight: 16,
  },
  typeModalCancelBtn: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  typeModalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
});
