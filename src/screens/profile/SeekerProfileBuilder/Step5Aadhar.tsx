import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/common/Input';

interface Step5AadharProps {
  initialData: { aadharNumber: string; birthYear: string };
  onNext: (data: { aadharNumber: string; birthYear: string }) => void;
  onBack: () => void;
}

export const Step5Aadhar: React.FC<Step5AadharProps> = ({
  initialData,
  onNext,
  onBack,
}) => {
  const [aadhar, setAadhar] = useState(initialData.aadharNumber || '');
  const [birthYear, setBirthYear] = useState(initialData.birthYear || '');
  const [aadharFile, setAadharFile] = useState(initialData.aadharNumber ? 'Aadhaar_Document_Verified.pdf' : '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatAadhar = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = '';
    for (let i = 0; i < cleaned.length && i < 12; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += ' ';
      }
      formatted += cleaned[i];
    }
    setAadhar(formatted);
    if (errors.aadhar) setErrors({ ...errors, aadhar: '' });
  };

  const handleUploadSimulate = () => {
    Alert.alert('Document Attached', 'Aadhaar Card copy has been verified and attached securely.');
    setAadharFile('Aadhaar_Verification_Doc.pdf');
    if (errors.aadharFile) setErrors({ ...errors, aadharFile: '' });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const rawNumber = aadhar.replace(/\s/g, '');

    if (!rawNumber) {
      newErrors.aadhar = 'Aadhaar Number is required';
    } else if (rawNumber.length !== 12) {
      newErrors.aadhar = 'Aadhaar Number must be exactly 12 digits';
    }

    if (!birthYear.trim()) {
      newErrors.birthYear = 'Birth Year is required';
    } else {
      const year = parseInt(birthYear, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1920 || year > currentYear) {
        newErrors.birthYear = 'Please enter a valid birth year';
      }
    }

    if (!aadharFile) {
      newErrors.aadharFile = 'Please upload a copy of your Aadhaar Card document';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    onNext({ aadharNumber: aadhar, birthYear });
  };

  const calcAge = () => {
    const year = parseInt(birthYear, 10);
    if (!isNaN(year) && year >= 1920 && year <= new Date().getFullYear()) {
      return new Date().getFullYear() - year;
    }
    return null;
  };

  const age = calcAge();

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
          <Ionicons name="shield-checkmark" size={26} color="#059669" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.stepTitle}>Identity Verification</Text>
          <Text style={styles.stepSubtitle}>
            Government compliance verification to ensure authentic candidate applications.
          </Text>
        </View>
      </View>

      {/* Inputs Form */}
      <View style={styles.formCard}>
        <Input
          label="12-Digit Aadhaar Number *"
          placeholder="e.g. 1234 5678 9012"
          value={aadhar}
          onChangeText={formatAadhar}
          error={errors.aadhar}
          keyboardType="numeric"
          maxLength={14}
          leftIcon="card-outline"
        />

        <View style={styles.yearRow}>
          <View style={{ flex: 1 }}>
            <Input
              label="Birth Year (YYYY) *"
              placeholder="e.g. 2002"
              value={birthYear}
              onChangeText={(text) => {
                setBirthYear(text.replace(/\D/g, '').slice(0, 4));
                if (errors.birthYear) setErrors({ ...errors, birthYear: '' });
              }}
              error={errors.birthYear}
              keyboardType="numeric"
              maxLength={4}
              leftIcon="calendar-outline"
            />
          </View>
          {age !== null && (
            <View style={styles.ageBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
              <Text style={styles.ageBadgeText}>Age: {age} yrs</Text>
            </View>
          )}
        </View>

        {/* Document Upload Area */}
        <Text style={styles.uploadSectionLabel}>Aadhaar Card Document *</Text>
        {!aadharFile ? (
          <TouchableOpacity
            style={[styles.uploadBox, errors.aadharFile ? styles.uploadBoxError : null]}
            onPress={handleUploadSimulate}
            activeOpacity={0.7}
          >
            <View style={styles.uploadIconWrap}>
              <Ionicons name="cloud-upload" size={24} color="#4F46E5" />
            </View>
            <Text style={styles.uploadTitle}>Upload Aadhaar PDF / Photo</Text>
            <Text style={styles.uploadSubtitle}>Supported: PDF, JPG, PNG (Max 5MB)</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.fileCard}>
            <View style={styles.fileIconWrap}>
              <Ionicons name="document-text" size={22} color="#059669" />
            </View>
            <View style={styles.fileDetails}>
              <Text style={styles.fileName}>{aadharFile}</Text>
              <Text style={styles.fileSize}>Verified ID Document • Ready ✓</Text>
            </View>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => setAadharFile('')}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
        {errors.aadharFile ? <Text style={styles.errorText}>{errors.aadharFile}</Text> : null}

        {/* Security Assurance */}
        <View style={styles.securityBox}>
          <Ionicons name="lock-closed" size={15} color="#0284C7" />
          <Text style={styles.securityText}>
            Privacy Guaranteed: Your Aadhaar document is never publicly visible. Employers only see a "Verified Candidate" badge.
          </Text>
        </View>
      </View>

      {/* Navigation Row */}
      <View style={styles.navigationRow}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={onBack}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={16} color="#475569" />
          <Text style={styles.secondaryBtnText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
          <View style={styles.btnIconWrap}>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#ECFDF5',
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
  yearRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  ageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 26,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  ageBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  uploadSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    marginTop: 4,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 22,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
  },
  uploadBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  uploadIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  uploadSubtitle: {
    fontSize: 11.5,
    color: '#94A3B8',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F0FDF4',
    marginBottom: 10,
  },
  fileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  fileSize: {
    fontSize: 11,
    color: '#059669',
    marginTop: 1,
  },
  deleteBtn: {
    padding: 6,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11.5,
    marginTop: -4,
    marginBottom: 10,
    fontWeight: '600',
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    marginTop: 6,
  },
  securityText: {
    flex: 1,
    fontSize: 11,
    color: '#0369A1',
    lineHeight: 16,
    fontWeight: '500',
  },
  navigationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  secondaryBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#475569',
  },
  continueBtn: {
    flex: 2,
    height: 52,
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  btnIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
