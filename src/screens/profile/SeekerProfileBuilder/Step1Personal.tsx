import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';

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
    if (!phone.trim()) newErrors.phone = 'Phone number is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    onNext({ fullName, phone });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Step 1: Personal Details</Text>
      <Text style={styles.subtitle}>Let recruiters know your name and how to contact you.</Text>

      <Input
        label="Full Name"
        placeholder="e.g. Jane Doe"
        value={fullName}
        onChangeText={(text) => {
          setFullName(text);
          if (errors.fullName) setErrors({ ...errors, fullName: '' });
        }}
        error={errors.fullName}
      />

      <Input
        label="Phone Number"
        placeholder="e.g. +91 9999999999"
        value={phone}
        onChangeText={(text) => {
          setPhone(text);
          if (errors.phone) setErrors({ ...errors, phone: '' });
        }}
        error={errors.phone}
        keyboardType="phone-pad"
      />

      <Button title="Continue" onPress={handleNext} style={styles.btn} />
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
  btn: {
    marginTop: 16,
  },
});
