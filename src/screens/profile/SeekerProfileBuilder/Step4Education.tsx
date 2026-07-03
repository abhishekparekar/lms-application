import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';

interface EducationItem {
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

export const Step4Education: React.FC<Step4EducationProps> = ({
  initialData,
  onNext,
  onBack,
}) => {
  const [educationList, setEducationList] = useState<EducationItem[]>(
    initialData.length > 0 ? initialData : [{ institution: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '' }]
  );

  const handleAddField = () => {
    setEducationList([
      ...educationList,
      { institution: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '' }
    ]);
  };

  const handleRemoveField = (index: number) => {
    if (educationList.length === 1) {
      Alert.alert('Info', 'Please enter at least one education entry.');
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
        Alert.alert('Validation Error', `Entry #${i + 1}: School/University is required.`);
        return false;
      }
      if (!item.degree.trim()) {
        Alert.alert('Validation Error', `Entry #${i + 1}: Degree type is required.`);
        return false;
      }
      if (!item.fieldOfStudy.trim()) {
        Alert.alert('Validation Error', `Entry #${i + 1}: Field of study is required.`);
        return false;
      }
      if (!item.startYear.trim() || !/^\d{4}$/.test(item.startYear)) {
        Alert.alert('Validation Error', `Entry #${i + 1}: Invalid start year (e.g. 2020).`);
        return false;
      }
      if (!item.endYear.trim() || !/^\d{4}$/.test(item.endYear)) {
        Alert.alert('Validation Error', `Entry #${i + 1}: Invalid end year (e.g. 2024).`);
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Step 4: Education History</Text>
      <Text style={styles.subtitle}>List your college, university, high school, or training qualifications.</Text>

      {educationList.map((item, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Education #{index + 1}</Text>
            {educationList.length > 1 && (
              <TouchableOpacity onPress={() => handleRemoveField(index)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          <Input
            label="School / University"
            placeholder="e.g. State College of Technology"
            value={item.institution}
            onChangeText={(val) => handleUpdateField(index, 'institution', val)}
          />

          <Input
            label="Degree"
            placeholder="e.g. Bachelor of Technology"
            value={item.degree}
            onChangeText={(val) => handleUpdateField(index, 'degree', val)}
          />

          <Input
            label="Field of Study"
            placeholder="e.g. Electronics & Communications"
            value={item.fieldOfStudy}
            onChangeText={(val) => handleUpdateField(index, 'fieldOfStudy', val)}
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label="Start Year"
                placeholder="2020"
                value={item.startYear}
                onChangeText={(val) => handleUpdateField(index, 'startYear', val)}
                keyboardType="numeric"
                maxLength={4}
              />
            </View>
            <View style={styles.col}>
              <Input
                label="End Year (or Expected)"
                placeholder="2024"
                value={item.endYear}
                onChangeText={(val) => handleUpdateField(index, 'endYear', val)}
                keyboardType="numeric"
                maxLength={4}
              />
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addBtn} onPress={handleAddField}>
        <Text style={styles.addBtnText}>+ Add Education Entry</Text>
      </TouchableOpacity>

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
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  removeText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  addBtn: {
    borderWidth: 1.5,
    borderColor: '#4F46E5',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  addBtnText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '700',
  },
  navigationRow: {
    flexDirection: 'row',
    gap: 16,
  },
  navCol: {
    flex: 1,
  },
});
