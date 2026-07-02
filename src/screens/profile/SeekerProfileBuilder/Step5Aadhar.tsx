import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';

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
  };

  const handleUploadSimulate = () => {
    Alert.alert('Upload Aadhaar Card', 'Aadhaar Card Document (PDF/Image) uploaded successfully.');
    setAadharFile('Aadhaar_Verification_Doc.pdf');
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
      if (isNaN(year) || year < 1900 || year > currentYear) {
        newErrors.birthYear = 'Please enter a valid birth year';
      } else {
        const age = currentYear - year;
        if (age < 18) {
          newErrors.birthYear = '❌ Age Check Failed: You must be 18 years or older';
        }
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

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Step 5: Identity Verification</Text>
      <Text style={styles.subtitle}>
        Verify your identity with your 12-digit Aadhaar Number, birth year, and card upload to ensure compliance.
      </Text>

      <Input
        label="Aadhaar Number"
        placeholder="e.g. 1234 5678 9012"
        value={aadhar}
        onChangeText={formatAadhar}
        error={errors.aadhar}
        keyboardType="numeric"
        maxLength={14}
      />

      <Input
        label="Birth Year (YYYY)"
        placeholder="e.g. 2004"
        value={birthYear}
        onChangeText={(text) => {
          setBirthYear(text.replace(/\D/g, ''));
          if (errors.birthYear) setErrors({ ...errors, birthYear: '' });
        }}
        error={errors.birthYear}
        keyboardType="numeric"
        maxLength={4}
      />

      <Text style={styles.sectionLabel}>Aadhaar Card Document Upload</Text>
      {!aadharFile ? (
        <TouchableOpacity style={[styles.uploadBox, errors.aadharFile ? styles.uploadBoxError : null]} onPress={handleUploadSimulate}>
          <Text style={styles.uploadIcon}>🆔</Text>
          <Text style={styles.uploadTitle}>Choose Aadhaar File</Text>
          <Text style={styles.uploadSubtitle}>Upload front & back PDF or JPG (Max 5MB)</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.fileCard}>
          <Text style={styles.fileIcon}>📄</Text>
          <View style={styles.fileDetails}>
            <Text style={styles.fileName}>{aadharFile}</Text>
            <Text style={styles.fileSize}>Verified ID Document • 840 KB</Text>
          </View>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => setAadharFile('')}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
      {errors.aadharFile ? <Text style={styles.errorText}>{errors.aadharFile}</Text> : null}

      <View style={styles.infoBox}>
        <Text style={styles.infoBoxText}>
          {"🔒 Your verification details are encrypted. Recruiter accounts see a \"Verified Seal\" rather than your credentials."}
        </Text>
      </View>

      <View style={styles.navigationRow}>
        <Button title="Back" onPress={onBack} variant="outline" style={styles.navCol} />
        <Button title="Continue" onPress={handleNext} style={styles.navCol} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 14,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoBoxText: {
    color: '#4B5563',
    fontSize: 12,
    lineHeight: 18,
  },
  navigationRow: {
    flexDirection: 'row',
    gap: 16,
  },
  navCol: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
    marginTop: 10,
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    marginBottom: 20,
  },
  uploadBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  uploadIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#ECFDF5',
    marginBottom: 20,
  },
  fileIcon: {
    fontSize: 28,
  },
  fileDetails: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  fileSize: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
  },
  deleteText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 20,
  },
});
