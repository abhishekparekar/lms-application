import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/common/Input';

interface Step1PersonalProps {
  initialData: { fullName: string; phone: string };
  onNext: (data: { fullName: string; phone: string }) => void;
}

export const Step1Personal: React.FC<Step1PersonalProps> = ({
  initialData,
  onNext,
}) => {
  const [fullName, setFullName] = useState(initialData.fullName || '');
  const [phone, setPhone] = useState(initialData.phone || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (phone.trim().replace(/\D/g, '').length < 10) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    onNext({ fullName: fullName.trim(), phone: phone.trim() });
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Step Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.iconCircle}>
          <Ionicons name="person-circle" size={28} color="#4F46E5" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.stepTitle}>Personal Details</Text>
          <Text style={styles.stepSubtitle}>
            Enter your official name and direct contact number so recruiters can reach you.
          </Text>
        </View>
      </View>

      {/* Inputs Card */}
      <View style={styles.formCard}>
        <Input
          label="Full Name *"
          placeholder="e.g. Rahul Sharma"
          value={fullName}
          onChangeText={(text) => {
            setFullName(text);
            if (errors.fullName) setErrors({ ...errors, fullName: '' });
          }}
          error={errors.fullName}
          leftIcon="person-outline"
        />

        <Input
          label="Phone Number *"
          placeholder="e.g. +91 98765 43210"
          value={phone}
          onChangeText={(text) => {
            setPhone(text);
            if (errors.phone) setErrors({ ...errors, phone: '' });
          }}
          error={errors.phone}
          keyboardType="phone-pad"
          leftIcon="call-outline"
        />

        <View style={styles.privacyNote}>
          <Ionicons name="shield-checkmark" size={16} color="#059669" />
          <Text style={styles.privacyText}>
            Your contact details are encrypted and only accessible to verified hiring partners.
          </Text>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={handleNext}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>Continue to Summary</Text>
        <View style={styles.btnIconWrap}>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  container: {
    padding: 16,
    paddingBottom: 28,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  stepSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 14,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginTop: 4,
  },
  privacyText: {
    flex: 1,
    fontSize: 11,
    color: '#166534',
    lineHeight: 16,
    fontWeight: '500',
  },
  primaryBtn: {
    height: 52,
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  btnIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
