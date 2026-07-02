import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';

interface Step8PreferencesProps {
  initialData: { locationPreference: string; jobTypePreference: string; expectedSalary: string };
  onSubmit: (data: { locationPreference: string; jobTypePreference: string; expectedSalary: string }) => void;
  onBack: () => void;
  loading?: boolean;
}

export const Step8Preferences: React.FC<Step8PreferencesProps> = ({
  initialData,
  onSubmit,
  onBack,
  loading = false,
}) => {
  const [locPref, setLocPref] = useState(initialData.locationPreference || '');
  const [jobType, setJobType] = useState(initialData.jobTypePreference || 'Full-time');
  const [salary, setSalary] = useState(initialData.expectedSalary || '');

  const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Internship'];

  const validate = () => {
    if (!locPref.trim()) {
      Alert.alert('Validation Error', 'Location preference is required (e.g. Remote, Bangalore, New York).');
      return false;
    }
    if (!salary.trim()) {
      Alert.alert('Validation Error', 'Expected salary is required (e.g. $80,000/yr, Rs 12 LPA).');
      return false;
    }
    return true;
  };

  const handleFinish = () => {
    if (!validate()) return;
    onSubmit({
      locationPreference: locPref,
      jobTypePreference: jobType,
      expectedSalary: salary,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Step 8: Job Preferences</Text>
      <Text style={styles.subtitle}>Set your target locations, job structures, and compensation ranges.</Text>

      <Input
        label="Location Preferences"
        placeholder="e.g. Remote, San Francisco, Bangalore"
        value={locPref}
        onChangeText={setLocPref}
      />

      <Text style={styles.sectionLabel}>Desired Job Type</Text>
      <View style={styles.buttonRow}>
        {jobTypes.map((type) => {
          const isSelected = jobType === type;
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.typePill,
                isSelected ? styles.selectedPill : null
              ]}
              onPress={() => setJobType(type)}
            >
              <Text style={[
                styles.typePillText,
                isSelected ? styles.selectedText : null
              ]}>
                {type}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Input
        label="Expected Annual Salary"
        placeholder="e.g. $85,000 / year or ₹10,00,000 / year"
        value={salary}
        onChangeText={setSalary}
      />

      <View style={styles.navigationRow}>
        <Button title="Back" onPress={onBack} variant="outline" disabled={loading} style={styles.navCol} />
        <Button title="Submit Profile" onPress={handleFinish} loading={loading} style={styles.navCol} />
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  typePill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  selectedPill: {
    backgroundColor: '#208AEF',
  },
  typePillText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 13,
  },
  selectedText: {
    color: '#ffffff',
  },
  navigationRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
  },
  navCol: {
    flex: 1,
  },
});
