import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/common/Input';

export interface ExperienceItem {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface Step3ExperienceProps {
  initialData: ExperienceItem[];
  onNext: (data: ExperienceItem[]) => void;
  onBack: () => void;
}

export const Step3Experience: React.FC<Step3ExperienceProps> = ({
  initialData,
  onNext,
  onBack,
}) => {
  const [isFresher, setIsFresher] = useState<boolean>(initialData.length === 0);
  const [experienceList, setExperienceList] = useState<ExperienceItem[]>(
    initialData.length > 0
      ? initialData
      : [{ company: '', position: '', startDate: '', endDate: '', description: '' }]
  );

  const handleAddField = () => {
    setExperienceList([
      ...experienceList,
      { company: '', position: '', startDate: '', endDate: '', description: '' },
    ]);
  };

  const handleRemoveField = (index: number) => {
    if (experienceList.length === 1) {
      setIsFresher(true);
      return;
    }
    const updated = [...experienceList];
    updated.splice(index, 1);
    setExperienceList(updated);
  };

  const handleUpdateField = (index: number, key: keyof ExperienceItem, value: string) => {
    const updated = [...experienceList];
    updated[index] = { ...updated[index], [key]: value };
    setExperienceList(updated);
  };

  const validate = () => {
    if (isFresher) return true;

    for (let i = 0; i < experienceList.length; i++) {
      const item = experienceList[i];
      const hasAnyValue =
        item.company.trim() ||
        item.position.trim() ||
        item.startDate.trim() ||
        item.endDate.trim() ||
        item.description.trim();

      if (hasAnyValue) {
        if (!item.company.trim()) {
          Alert.alert('Validation Error', `Entry #${i + 1}: Company name is required.`);
          return false;
        }
        if (!item.position.trim()) {
          Alert.alert('Validation Error', `Entry #${i + 1}: Job Title/Position is required.`);
          return false;
        }
        if (!item.startDate.trim()) {
          Alert.alert('Validation Error', `Entry #${i + 1}: Start date is required.`);
          return false;
        }
        if (!item.endDate.trim()) {
          Alert.alert('Validation Error', `Entry #${i + 1}: End date or 'Present' is required.`);
          return false;
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    if (isFresher) {
      onNext([]);
    } else {
      const filtered = experienceList.filter((item) => item.company.trim() && item.position.trim());
      onNext(filtered);
    }
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
          <Ionicons name="briefcase" size={26} color="#4F46E5" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.stepTitle}>Work Experience</Text>
          <Text style={styles.stepSubtitle}>
            Add your employment history, internships, or mark yourself as a fresher.
          </Text>
        </View>
      </View>

      {/* Experience Mode Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, !isFresher && styles.toggleBtnActive]}
          onPress={() => {
            setIsFresher(false);
            if (experienceList.length === 0) {
              setExperienceList([{ company: '', position: '', startDate: '', endDate: '', description: '' }]);
            }
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="business" size={15} color={!isFresher ? '#4F46E5' : '#64748B'} />
          <Text style={[styles.toggleBtnText, !isFresher && styles.toggleBtnTextActive]}>
            Experienced
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, isFresher && styles.toggleBtnActive]}
          onPress={() => setIsFresher(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="school" size={15} color={isFresher ? '#4F46E5' : '#64748B'} />
          <Text style={[styles.toggleBtnText, isFresher && styles.toggleBtnTextActive]}>
            Fresher / Student
          </Text>
        </TouchableOpacity>
      </View>

      {isFresher ? (
        <View style={styles.fresherCard}>
          <View style={styles.fresherIconWrap}>
            <Ionicons name="checkmark-circle" size={32} color="#10B981" />
          </View>
          <Text style={styles.fresherTitle}>Entry-Level / Fresher Profile</Text>
          <Text style={styles.fresherSub}>
            No prior work experience is needed! Employers will evaluate you based on your education, skills, and certifications.
          </Text>
          <TouchableOpacity
            style={styles.switchModeBtn}
            onPress={() => setIsFresher(false)}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={15} color="#4F46E5" />
            <Text style={styles.switchModeText}>Have an internship or freelance role to add?</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {experienceList.map((item, index) => (
            <View key={index} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.cardNumBadge}>
                    <Text style={styles.cardNumText}>#{index + 1}</Text>
                  </View>
                  <Text style={styles.cardTitle}>
                    {item.position ? item.position : `Experience Entry #${index + 1}`}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveField(index)}
                  style={styles.removeBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <Input
                label="Company / Organization *"
                placeholder="e.g. Tata Consultancy Services"
                value={item.company}
                onChangeText={(val) => handleUpdateField(index, 'company', val)}
                leftIcon="business-outline"
              />

              <Input
                label="Job Title / Position *"
                placeholder="e.g. Frontend Developer"
                value={item.position}
                onChangeText={(val) => handleUpdateField(index, 'position', val)}
                leftIcon="briefcase-outline"
              />

              <View style={styles.row}>
                <View style={styles.col}>
                  <Input
                    label="Start Date *"
                    placeholder="MM/YYYY"
                    value={item.startDate}
                    onChangeText={(val) => handleUpdateField(index, 'startDate', val)}
                    leftIcon="calendar-outline"
                  />
                </View>
                <View style={styles.col}>
                  <Input
                    label="End Date *"
                    placeholder="MM/YYYY / Present"
                    value={item.endDate}
                    onChangeText={(val) => handleUpdateField(index, 'endDate', val)}
                    leftIcon="calendar-outline"
                  />
                </View>
              </View>

              <Input
                label="Key Achievements & Description"
                placeholder="Briefly describe your key responsibilities and tools..."
                value={item.description}
                onChangeText={(val) => handleUpdateField(index, 'description', val)}
                multiline
                numberOfLines={3}
                inputStyle={styles.descInput}
              />
            </View>
          ))}

          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAddField}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={18} color="#4F46E5" />
            <Text style={styles.addBtnText}>Add Another Experience</Text>
          </TouchableOpacity>
        </View>
      )}

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
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  toggleBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  fresherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  fresherIconWrap: {
    marginBottom: 8,
  },
  fresherTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  fresherSub: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  switchModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
  },
  switchModeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#4F46E5',
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
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  col: {
    flex: 1,
  },
  descInput: {
    height: 70,
    alignItems: 'flex-start',
    paddingTop: 8,
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
