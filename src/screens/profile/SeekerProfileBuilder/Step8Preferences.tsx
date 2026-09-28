import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/common/Input';

interface Step8PreferencesProps {
  initialData: { locationPreference: string; jobTypePreference: string; expectedSalary: string };
  onSubmit: (data: { locationPreference: string; jobTypePreference: string; expectedSalary: string }) => void;
  onBack: () => void;
  loading?: boolean;
}

const JOB_TYPES = ['Full-time', 'Remote', 'Internship', 'Contract', 'Part-time'];

const LOCATION_SUGGESTIONS = ['Remote', 'Bengaluru', 'Mumbai', 'Pune', 'Delhi NCR', 'Hyderabad'];

const SALARY_SUGGESTIONS = ['₹ 4 - 8 LPA', '₹ 8 - 14 LPA', '₹ 15 - 25 LPA', '₹ 25+ LPA'];

export const Step8Preferences: React.FC<Step8PreferencesProps> = ({
  initialData,
  onSubmit,
  onBack,
  loading = false,
}) => {
  const [locPref, setLocPref] = useState(initialData.locationPreference || '');
  const [jobType, setJobType] = useState(initialData.jobTypePreference || 'Full-time');
  const [salary, setSalary] = useState(initialData.expectedSalary || '');

  const validate = () => {
    if (!locPref.trim()) {
      Alert.alert('Validation Error', 'Location preference is required (e.g. Remote, Bengaluru, Mumbai).');
      return false;
    }
    if (!salary.trim()) {
      Alert.alert('Validation Error', 'Expected annual salary is required (e.g. ₹ 8 LPA).');
      return false;
    }
    return true;
  };

  const handleFinish = () => {
    if (!validate()) return;
    onSubmit({
      locationPreference: locPref.trim(),
      jobTypePreference: jobType,
      expectedSalary: salary.trim(),
    });
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
          <Ionicons name="compass" size={26} color="#4F46E5" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.stepTitle}>Job Preferences</Text>
          <Text style={styles.stepSubtitle}>
            Specify your desired job format, work cities, and target compensation.
          </Text>
        </View>
      </View>

      {/* Preferences Form Card */}
      <View style={styles.formCard}>
        {/* Job Type Selector */}
        <Text style={styles.fieldLabel}>Desired Employment Type *</Text>
        <View style={styles.pillRow}>
          {JOB_TYPES.map((type) => {
            const isSelected = jobType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.typePill, isSelected && styles.typePillActive]}
                onPress={() => setJobType(type)}
                activeOpacity={0.7}
              >
                {isSelected && <Ionicons name="checkmark" size={13} color="#4F46E5" style={{ marginRight: 4 }} />}
                <Text style={[styles.typePillText, isSelected && styles.typePillTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Location Preferences */}
        <Input
          label="Preferred Cities / Work Mode *"
          placeholder="e.g. Remote, Bengaluru, Mumbai"
          value={locPref}
          onChangeText={setLocPref}
          leftIcon="location-outline"
        />

        {/* Quick Location Suggestions */}
        <View style={styles.suggestionsWrap}>
          <Text style={styles.suggestionsLabel}>Quick select:</Text>
          <View style={styles.suggestionsRow}>
            {LOCATION_SUGGESTIONS.map((city) => (
              <TouchableOpacity
                key={city}
                style={styles.suggestionChip}
                onPress={() => {
                  if (!locPref.includes(city)) {
                    setLocPref(locPref ? `${locPref}, ${city}` : city);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionChipText}>+ {city}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Expected Salary */}
        <Input
          label="Expected Annual Salary *"
          placeholder="e.g. ₹ 10,00,000 / year or ₹ 10 LPA"
          value={salary}
          onChangeText={setSalary}
          leftIcon="cash-outline"
        />

        {/* Quick Salary Suggestions */}
        <View style={styles.suggestionsWrap}>
          <Text style={styles.suggestionsLabel}>Common ranges:</Text>
          <View style={styles.suggestionsRow}>
            {SALARY_SUGGESTIONS.map((range) => (
              <TouchableOpacity
                key={range}
                style={styles.suggestionChip}
                onPress={() => setSalary(range)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionChipText}>{range}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Success / Completion Banner */}
        <View style={styles.completionBanner}>
          <Ionicons name="sparkles" size={18} color="#059669" />
          <Text style={styles.completionBannerText}>
            You're at the final step! Submitting will activate your 100% profile score and unlock instant 1-Click job applications.
          </Text>
        </View>
      </View>

      {/* Navigation Row */}
      <View style={styles.navigationRow}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={onBack}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={16} color="#475569" />
          <Text style={styles.secondaryBtnText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleFinish}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>Complete Profile 🎉</Text>
              <View style={styles.btnIconWrap}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
            </>
          )}
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typePillActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  typePillText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  typePillTextActive: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  suggestionsWrap: {
    marginTop: -8,
    marginBottom: 12,
  },
  suggestionsLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  suggestionChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  suggestionChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginTop: 6,
  },
  completionBannerText: {
    flex: 1,
    fontSize: 11.5,
    color: '#166534',
    lineHeight: 16,
    fontWeight: '600',
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
  submitBtn: {
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
  submitBtnText: {
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
