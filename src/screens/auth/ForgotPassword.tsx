import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/services/firebase/config';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  onBackToLogin,
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const insets = useSafeAreaInsets();

  const validate = () => {
    if (!email) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Enter a valid email address');
      return false;
    }
    setError('');
    return true;
  };

  const handleReset = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        'Email Sent',
        'If an account exists for this email, we have sent password reset instructions.',
        [{ text: 'OK', onPress: onBackToLogin }]
      );
    } catch (e: any) {
      Alert.alert('Reset Failed', e.message || 'Could not send recovery email.');
    } finally {
      setLoading(false);
    }
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
            {onBackToLogin ? (
              <TouchableOpacity onPress={onBackToLogin} style={styles.backBtn}>
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
            <Text style={styles.brandSubtitle}>Account Recovery</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Reset Password</Text>
            <Text style={styles.cardDesc}>Enter your email address to receive a recovery link.</Text>

            <Input
              label="Email Address"
              placeholder="e.g. yourname@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError('');
              }}
              error={error}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleReset}
              containerStyle={styles.inputContainer}
              inputStyle={styles.modernInput}
            />

            <Button 
              title="Send Recovery Link" 
              onPress={handleReset} 
              loading={loading}
              style={styles.loginBtn}
              textStyle={styles.loginBtnText}
            />

            <TouchableOpacity style={styles.backLinkContainer} onPress={onBackToLogin}>
              <Text style={styles.backLinkText}>Return to Sign In</Text>
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
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  modernInput: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderWidth: 1,
    height: 52,
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
  backLinkContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  backLinkText: {
    color: '#1E3A8A',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
