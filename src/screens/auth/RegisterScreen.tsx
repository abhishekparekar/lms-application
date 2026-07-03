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
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState<'jobseeker' | 'employer' | 'agent'>('jobseeker');
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    if (initialRole) {
      setUserType(initialRole === 'recruiter' ? 'employer' : 'jobseeker');
    }
  }, [initialRole]);

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
      <View style={styles.headerBackground} />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContent, 
            { paddingTop: Math.max(insets.top, 10), paddingBottom: Math.max(insets.bottom, 24) }
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
            <Text style={styles.cardDesc}>Fill details below to get started</Text>

            {/* Role/UserType Selector */}
            <Text style={styles.fieldLabel}>Join As</Text>
            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[styles.roleOption, userType === 'jobseeker' && styles.roleOptionActive]}
                onPress={() => setUserType('jobseeker')}
                activeOpacity={0.8}
              >
                <Text style={[styles.roleEmoji, userType === 'jobseeker' && styles.roleEmojiActive]}>🎓</Text>
                <Text style={[styles.roleText, userType === 'jobseeker' && styles.roleTextActive]}>Seeker</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleOption, userType === 'employer' && styles.roleOptionActive]}
                onPress={() => setUserType('employer')}
                activeOpacity={0.8}
              >
                <Text style={[styles.roleEmoji, userType === 'employer' && styles.roleEmojiActive]}>🏢</Text>
                <Text style={[styles.roleText, userType === 'employer' && styles.roleTextActive]}>Recruiter</Text>
              </TouchableOpacity>

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
            <TouchableOpacity onPress={onLoginPress}>
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
    backgroundColor: '#F3F4F6',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 250,
    backgroundColor: '#1E3A8A',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  topBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  brandingSection: {
    alignItems: 'center',
    marginBottom: 15,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
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
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  roleOption: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#F9FAFB',
  },
  roleOptionActive: {
    borderColor: '#1E3A8A',
    backgroundColor: '#EFF6FF',
  },
  roleEmoji: {
    fontSize: 14,
    opacity: 0.6,
  },
  roleEmojiActive: {
    opacity: 1,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  roleTextActive: {
    color: '#1E3A8A',
    fontWeight: 'bold',
  },
  rowInputs: {
    flexDirection: 'row',
  },
  inputContainer: {
    marginBottom: 10,
  },
  modernInput: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 10,
    borderWidth: 1,
    height: 44,
  },
  loginBtn: {
    height: 48,
    borderRadius: 10,
    backgroundColor: '#1E3A8A',
    elevation: 2,
    marginTop: 10,
  },
  loginBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  signupText: {
    color: '#6B7280',
    fontSize: 14,
  },
  signupLink: {
    color: '#1E3A8A',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
