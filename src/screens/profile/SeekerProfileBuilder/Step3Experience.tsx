import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';

interface ExperienceItem {
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
  const [experienceList, setExperienceList] = useState<ExperienceItem[]>(
    initialData.length > 0 ? initialData : [{ company: '', position: '', startDate: '', endDate: '', description: '' }]
  );

  const handleAddField = () => {
    setExperienceList([
      ...experienceList,
      { company: '', position: '', startDate: '', endDate: '', description: '' }
    ]);
  };

  const handleRemoveField = (index: number) => {
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
    for (let i = 0; i < experienceList.length; i++) {
      const item = experienceList[i];
      const hasAnyValue = item.company.trim() || item.position.trim() || item.startDate.trim() || item.endDate.trim() || item.description.trim();
      
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
          Alert.alert('Validation Error', `Entry #${i + 1}: End date or "Present" is required.`);
          return false;
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    const filteredList = experienceList.filter(item => item.company.trim() && item.position.trim());
    onNext(filteredList);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Step 3: Work Experience</Text>
      <Text style={styles.subtitle}>List your previous roles, internships, or freelance work (Optional).</Text>

      {experienceList.map((item, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Experience #{index + 1}</Text>
            {experienceList.length > 1 && (
              <TouchableOpacity onPress={() => handleRemoveField(index)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          <Input
            label="Company Name"
            placeholder="e.g. Google LLC"
            value={item.company}
            onChangeText={(val) => handleUpdateField(index, 'company', val)}
          />

          <Input
            label="Job Title / Position"
            placeholder="e.g. Software Engineer"
            value={item.position}
            onChangeText={(val) => handleUpdateField(index, 'position', val)}
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label="Start Date"
                placeholder="MM/YYYY or YYYY"
                value={item.startDate}
                onChangeText={(val) => handleUpdateField(index, 'startDate', val)}
              />
            </View>
            <View style={styles.col}>
              <Input
                label="End Date"
                placeholder="MM/YYYY or 'Present'"
                value={item.endDate}
                onChangeText={(val) => handleUpdateField(index, 'endDate', val)}
              />
            </View>
          </View>

          <Input
            label="Description / Achievements"
            placeholder="Key responsibilities and technical tools..."
            value={item.description}
            onChangeText={(val) => handleUpdateField(index, 'description', val)}
            multiline
            numberOfLines={3}
            inputStyle={styles.descInput}
          />
        </View>
      ))}

      <TouchableOpacity style={styles.addBtn} onPress={handleAddField}>
        <Text style={styles.addBtnText}>+ Add Experience Entry</Text>
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
    borderRadius: 8,
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
  descInput: {
    height: 72,
    alignItems: 'flex-start',
    paddingTop: 8,
  },
  addBtn: {
    borderWidth: 1,
    borderColor: '#208AEF',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  addBtnText: {
    color: '#208AEF',
    fontSize: 14,
    fontWeight: '600',
  },
  navigationRow: {
    flexDirection: 'row',
    gap: 16,
  },
  navCol: {
    flex: 1,
  },
});
