import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/common/Input';

export interface EducationItem {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
}

interface Step4EducationProps {
  initialData: EducationItem[];
  onNext: (data: EducationItem[]) => void;
  onBack: () => void;
}

const DEGREE_SUGGESTIONS = [
  'B.Tech / B.E.',
  'BCA / MCA',
  'B.Sc / M.Sc',
  'B.Com / M.Com',
  'Diploma',
  'Higher Secondary (12th)',
];

export const Step4Education: React.FC<Step4EducationProps> = ({
  initialData,
  onNext,
  onBack,
}) => {
  const [educationList, setEducationList] = useState<EducationItem[]>(
    initialData.length > 0
      ? initialData
      : [{ institution: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '' }]
  );

  const handleAddField = () => {
    setEducationList([
      ...educationList,
      { institution: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '' },
    ]);
  };

  const handleRemoveField = (index: number) => {
    if (educationList.length === 1) {
      Alert.alert('Required', 'Please keep at least one education entry.');
      return;
    }
    const updated = [...educationList];
    updated.splice(index, 1);
    setEducationList(updated);
  };

  const handleUpdateField = (index: number, key: keyof EducationItem, value: string) => {
    const updated = [...educationList];
    updated[index] = { ...updated[index], [key]: value };
    setEducationList(updated);
  };

  const validate = () => {
    for (let i = 0; i < educationList.length; i++) {
      const item = educationList[i];
      if (!item.institution.trim()) {
        Alert.alert('Validation Error', `Entry #${i + 1}: Institution / University name is required.`);
        return false;
      }
      if (!item.degree.trim()) {
        Alert.alert('Validation Error', `Entry #${i + 1}: Degree or certification name is required.`);
        return false;
      }
      if (!item.fieldOfStudy.trim()) {
        Alert.alert('Validation Error', `Entry #${i + 1}: Major or Field of study is required.`);
        return false;
      }
      if (!item.startYear.trim() || !/^\d{4}$/.test(item.startYear.trim())) {
        Alert.alert('Validation Error', `Entry #${i + 1}: Enter a valid 4-digit start year (e.g. 2020).`);
        return false;
      }
      if (!item.endYear.trim() || !/^\d{4}$/.test(item.endYear.trim())) {
        Alert.alert('Validation Error', `Entry #${i + 1}: Enter a valid 4-digit end year (e.g. 2024).`);
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    onNext(educationList);
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
          <Ionicons name="school" size={26} color="#4F46E5" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.stepTitle}>Education Qualifications</Text>
          <Text style={styles.stepSubtitle}>
            Add details about your university degree, high school, or technical diploma.
          </Text>
        </View>
      </View>

      {/* Education Cards */}
      {educationList.map((item, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.cardNumBadge}>
                <Text style={styles.cardNumText}>#{index + 1}</Text>
              </View>
              <Text style={styles.cardTitle}>
                {item.degree ? item.degree : `Education Entry #${index + 1}`}
              </Text>
            </View>
            {educationList.length > 1 && (
              <TouchableOpacity
                onPress={() => handleRemoveField(index)}
                style={styles.removeBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>

          <Input
            label="College / University / School *"
            placeholder="e.g. Mumbai University"
            value={item.institution}
            onChangeText={(val) => handleUpdateField(index, 'institution', val)}
            leftIcon="business-outline"
          />

          <Input
            label="Degree / Qualification *"
            placeholder="e.g. B.Tech Computer Science"
            value={item.degree}
            onChangeText={(val) => handleUpdateField(index, 'degree', val)}
            leftIcon="school-outline"
          />

          {/* Quick Degree Suggestions */}
          <View style={styles.suggestionsWrap}>
            <Text style={styles.suggestionsLabel}>Quick select:</Text>
            <View style={styles.suggestionsRow}>
              {DEGREE_SUGGESTIONS.map((deg) => (
                <TouchableOpacity
                  key={deg}
                  style={styles.suggestionChip}
                  onPress={() => handleUpdateField(index, 'degree', deg)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestionChipText}>{deg}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Input
            label="Field of Study / Specialization *"
            placeholder="e.g. Information Technology"
            value={item.fieldOfStudy}
            onChangeText={(val) => handleUpdateField(index, 'fieldOfStudy', val)}
            leftIcon="book-outline"
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label="Start Year *"
                placeholder="e.g. 2020"
                value={item.startYear}
                onChangeText={(val) => handleUpdateField(index, 'startYear', val.replace(/\D/g, '').slice(0, 4))}
                keyboardType="numeric"
                maxLength={4}
                leftIcon="calendar-outline"
              />
            </View>
            <View style={styles.col}>
              <Input
                label="End / Pass Year *"
                placeholder="e.g. 2024"
                value={item.endYear}
                onChangeText={(val) => handleUpdateField(index, 'endYear', val.replace(/\D/g, '').slice(0, 4))}
                keyboardType="numeric"
                maxLength={4}
                leftIcon="calendar-outline"
              />
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={styles.addBtn}
        onPress={handleAddField}
        activeOpacity={0.7}
      >
        <Ionicons name="add-circle" size={18} color="#4F46E5" />
        <Text style={styles.addBtnText}>Add Another Qualification</Text>
      </TouchableOpacity>

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
  card: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardNumBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cardNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  removeBtn: {
    padding: 4,
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
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  col: {
    flex: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#EEF2FF',
  },
  addBtnText: {
    color: '#4F46E5',
    fontSize: 13,
    fontWeight: '700',
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
