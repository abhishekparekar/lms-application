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
      {/* Background Curved Header */}
      <View style={styles.headerBackground} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.max(insets.top + 8, 16), paddingBottom: Math.max(insets.bottom + 30, 40) }
          ]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Top Bar with Back Button */}
          <View style={styles.topBar}>
            {onBack ? (
              <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            ) : <View style={{ width: 40 }} />}
          </View>

          {/* Compact Branding Section */}
          <View style={styles.brandingSection}>
            <View style={styles.logoBadgeContainer}>
              <Image source={require('../../assets/images/logoimg22.png')} style={styles.authLogoImage} resizeMode="contain" />
            </View>
            <Text style={styles.brandTitle}>Ganimi Kava</Text>
            <Text style={styles.brandSubtitle}>Empowering your career journey</Text>
          </View>

          {/* Modern Compact Login Form Card */}
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

            <TouchableOpacity onPress={onForgotPasswordPress} style={styles.forgotBtn} activeOpacity={0.7}>
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
              <TouchableOpacity onPress={() => handleSocialLogin('Google')} style={styles.socialBtn} activeOpacity={0.8}>
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text style={styles.socialBtnText}>Google</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Signup Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>{"Don't have an account? "}</Text>
            <TouchableOpacity onPress={() => setUserTypeModalVisible(true)} activeOpacity={0.7}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── MODAL: User Type Selection Modal ── */}
      <Modal
        visible={userTypeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setUserTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.typeModalContainer}>
            <View style={styles.typeModalAccentBar} />

            <View style={styles.typeModalHeader}>
              <View style={styles.typeModalHeaderIconBox}>
                <Ionicons name="person-add" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.typeModalTitle}>Create Your Account</Text>
              <Text style={styles.typeModalSubtitle}>Choose the account type that suits your needs</Text>
            </View>

            <View style={styles.typeModalOptions}>
              {/* Option: Student */}
              <TouchableOpacity
                style={styles.typeOptionCard}
                onPress={() => {
                  setUserTypeModalVisible(false);
                  onRegisterPress('seeker');
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.typeOptionIconBox, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="school" size={22} color="#4F46E5" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.typeOptionTitle}>I am a Student</Text>
                  <Text style={styles.typeOptionDesc}>
                    Find verified courses and build skills for your career.
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
                      Post requirements and review matching talent profiles.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.typeModalCancelBtn}
              onPress={() => setUserTypeModalVisible(false)}
              activeOpacity={0.7}
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
    backgroundColor: '#F8FAFC',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
    backgroundColor: '#4F46E5',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    height: 40,
  },
  backBtn: {
    padding: 6,
    marginLeft: -6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  brandingSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadgeContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 12,
  },
  authLogoImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 22,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 18,
  },
  inputContainer: {
    marginBottom: 14,
  },
  modernInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 18,
    marginTop: -2,
    paddingVertical: 4,
  },
  forgotText: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 13,
  },
  loginBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    elevation: 3,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  loginBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    width: '100%',
  },
  socialBtnText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  signupText: {
    color: '#64748B',
    fontSize: 14,
  },
  signupLink: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  typeModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
    position: 'relative',
  },
  typeModalAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: '#4F46E5',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  typeModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 6,
  },
  typeModalHeaderIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  typeModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  typeModalSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },
  typeModalOptions: {
    gap: 10,
    marginBottom: 18,
  },
  typeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    gap: 12,
    backgroundColor: '#F8FAFC',
  },
  typeOptionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeOptionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  typeOptionDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 16,
  },
  typeModalCancelBtn: {
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginBottom: 4,
  },
  typeModalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
});

