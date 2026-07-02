import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';

interface Step2SummaryProps {
  initialData: { bio: string };
  onNext: (data: { bio: string }) => void;
  onBack: () => void;
}

export const Step2Summary: React.FC<Step2SummaryProps> = ({
  initialData,
  onNext,
  onBack,
}) => {
  const [bio, setBio] = useState(initialData.bio || '');
  const [error, setError] = useState('');

  const validate = () => {
    if (!bio.trim()) {
      setError('Professional bio is required');
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    onNext({ bio });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Step 2: Professional Summary</Text>
      <Text style={styles.subtitle}>Introduce yourself, highlighting your strengths, career goals, and experience.</Text>

      <Input
        label="Short Bio Summary"
        placeholder="e.g. Dynamic mobile developer with 3+ years experience engineering responsive cross-platform apps..."
        value={bio}
        onChangeText={(text) => {
          setBio(text);
          if (error) setError('');
        }}
        error={error}
        multiline
        numberOfLines={6}
        inputStyle={styles.bioInput}
      />

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
  bioInput: {
    height: 120,
    alignItems: 'flex-start',
    paddingTop: 8,
  },
  navigationRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  navCol: {
    flex: 1,
  },
});
