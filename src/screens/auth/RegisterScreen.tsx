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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/services/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';

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
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState<'jobseeker' | 'employer' | 'agent'>('jobseeker');
  const [referralCode, setReferralCode] = useState('');
  const [isJobsVisible, setIsJobsVisible] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'lms_config', 'tabs_visibility'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const visible = data.jobs !== false;
          setIsJobsVisible(visible);
          if (!visible) {
            setUserType((prev) => (prev === 'employer' ? 'jobseeker' : prev));
          }
        }
      },
      (err) => {
        console.warn('Error listening to tabs visibility in RegisterScreen:', err);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (initialRole) {
      if (initialRole === 'recruiter' && !isJobsVisible) {
        setUserType('jobseeker');
      } else {
        setUserType(initialRole === 'recruiter' ? 'employer' : 'jobseeker');
      }
    }
  }, [initialRole, isJobsVisible]);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const insets = useSafeAreaInsets();
  
  const lastNameRef = useRef<any>(null);
  const emailRef = useRef<any>(null);
  const phoneRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);
  const confirmPasswordRef = useRef<any>(null);
  const referralRef = useRef<any>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!firstName.trim()) {
      newErrors.firstName = 'First Name is required';
    } else if (firstName.trim().length < 2) {
      newErrors.firstName = 'Must be at least 2 characters';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last Name is required';
    } else if (lastName.trim().length < 2) {
      newErrors.lastName = 'Must be at least 2 characters';
    }

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(phone)) {
      newErrors.phone = 'Must be a 10-digit number';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Must be at least 6 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Must contain 1 uppercase, 1 lowercase & 1 number';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        userType,
        referralCode: referralCode.trim() || undefined
      } as any);
      
      Alert.alert('Registration Successful', 'Welcome to the platform!', [
        { text: 'OK', onPress: onRegisterSuccess }
      ]);
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
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
            { paddingTop: Math.max(insets.top + 8, 14), paddingBottom: Math.max(insets.bottom + 30, 40) }
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

          {/* Register Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Create Account</Text>
            <Text style={styles.cardDesc}>Fill in your details below to get started</Text>

            {/* Role/UserType Selector */}
            <Text style={styles.fieldLabel}>Join As</Text>
            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[styles.roleOption, userType === 'jobseeker' && styles.roleOptionActive]}
                onPress={() => setUserType('jobseeker')}
                activeOpacity={0.8}
              >
                <Text style={[styles.roleEmoji, userType === 'jobseeker' && styles.roleEmojiActive]}>🎓</Text>
                <Text style={[styles.roleText, userType === 'jobseeker' && styles.roleTextActive]}>Student</Text>
              </TouchableOpacity>

              {isJobsVisible && (
                <TouchableOpacity
                  style={[styles.roleOption, userType === 'employer' && styles.roleOptionActive]}
                  onPress={() => setUserType('employer')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.roleEmoji, userType === 'employer' && styles.roleEmojiActive]}>🏢</Text>
                  <Text style={[styles.roleText, userType === 'employer' && styles.roleTextActive]}>Employer</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.roleOption, userType === 'agent' && styles.roleOptionActive]}
                onPress={() => setUserType('agent')}
                activeOpacity={0.8}
              >
                <Text style={[styles.roleEmoji, userType === 'agent' && styles.roleEmojiActive]}>💼</Text>
                <Text style={[styles.roleText, userType === 'agent' && styles.roleTextActive]}>Agent</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.rowInputs}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Input
                  label="First Name"
                  placeholder="Rahul"
                  value={firstName}
                  onChangeText={(text) => {
                    setFirstName(text);
                    if (errors.firstName) setErrors({ ...errors, firstName: '' });
                  }}
                  error={errors.firstName}
                  leftIcon="person-outline"
                  returnKeyType="next"
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                  containerStyle={styles.inputContainer}
                  inputStyle={styles.modernInput}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  ref={lastNameRef}
                  label="Last Name"
                  placeholder="Sharma"
                  value={lastName}
                  onChangeText={(text) => {
                    setLastName(text);
                    if (errors.lastName) setErrors({ ...errors, lastName: '' });
                  }}
                  error={errors.lastName}
                  leftIcon="person-outline"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  containerStyle={styles.inputContainer}
                  inputStyle={styles.modernInput}
                />
              </View>
            </View>

            <Input
              ref={emailRef}
              label="Email Address"
              placeholder="rahul@email.com"
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
              onSubmitEditing={() => phoneRef.current?.focus()}
              containerStyle={styles.inputContainer}
              inputStyle={styles.modernInput}
            />

            <Input
              ref={phoneRef}
              label="Phone Number"
              placeholder="10-digit number"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (errors.phone) setErrors({ ...errors, phone: '' });
              }}
              error={errors.phone}
              leftIcon="call-outline"
              keyboardType="number-pad"
              maxLength={10}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              containerStyle={styles.inputContainer}
              inputStyle={styles.modernInput}
            />

            <Input
              ref={passwordRef}
              label="Password"
              placeholder="At least 6 chars (A-z, 0-9)"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              error={errors.password}
              leftIcon="lock-closed-outline"
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
              leftIcon="shield-checkmark-outline"
              secureTextEntry
              returnKeyType="next"
              onSubmitEditing={() => referralRef.current?.focus()}
              containerStyle={styles.inputContainer}
              inputStyle={styles.modernInput}
            />

            <Input
              ref={referralRef}
              label="Referral Code (Optional)"
              placeholder="Franchise or Agent code"
              value={referralCode}
              onChangeText={setReferralCode}
              leftIcon="gift-outline"
              autoCapitalize="characters"
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
          </View>

          {/* Bottom Login Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Already have an account? </Text>
            <TouchableOpacity onPress={onLoginPress} activeOpacity={0.7}>
              <Text style={styles.signupLink}>Log In</Text>
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
    backgroundColor: '#F8FAFC',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 240,
    backgroundColor: '#4F46E5',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
  },
  topBar: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backBtn: {
    padding: 6,
    marginLeft: -6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  brandingSection: {
    alignItems: 'center',
    marginBottom: 14,
  },
  logoBadgeContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 8,
  },
  authLogoImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  roleOption: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
  },
  roleOptionActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  roleEmoji: {
    fontSize: 14,
    opacity: 0.7,
  },
  roleEmojiActive: {
    opacity: 1,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  roleTextActive: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  rowInputs: {
    flexDirection: 'row',
  },
  inputContainer: {
    marginBottom: 10,
  },
  modernInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
  },
  loginBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    elevation: 3,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    marginTop: 6,
  },
  loginBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 14,
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
});

