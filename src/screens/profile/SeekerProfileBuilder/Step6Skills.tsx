import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Button } from '@/components/common/Button';

interface Step6SkillsProps {
  initialData: string[];
  onNext: (skills: string[]) => void;
  onBack: () => void;
}

const PRESET_SKILLS = [
  'React Native', 'TypeScript', 'JavaScript', 'React', 'Node.js', 
  'Firebase', 'UI/UX Design', 'Figma', 'Python', 'Tailwind CSS', 
  'Product Management', 'Agile', 'SQL', 'Git', 'REST APIs'
];

export const Step6Skills: React.FC<Step6SkillsProps> = ({
  initialData,
  onNext,
  onBack,
}) => {
  const [skills, setSkills] = useState<string[]>(initialData || []);
  const [customSkill, setCustomSkill] = useState('');

  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }
    setCustomSkill('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const handleNext = () => {
    if (skills.length === 0) {
      Alert.alert('Skills Required', 'Please select or add at least one skill to continue.');
      return;
    }
    onNext(skills);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Step 6: Skills & Expertise</Text>
      <Text style={styles.subtitle}>Select or input skills relevant to your career target.</Text>

      {/* Selected tags */}
      <View style={styles.selectedContainer}>
        <Text style={styles.sectionLabel}>Your Selected Skills ({skills.length})</Text>
        <View style={styles.tagGrid}>
          {skills.length === 0 ? (
            <Text style={styles.emptyText}>Add some skills below to progress.</Text>
          ) : (
            skills.map((skill) => (
              <TouchableOpacity 
                key={skill} 
                style={styles.activeTag} 
                onPress={() => handleRemoveSkill(skill)}
              >
                <Text style={styles.activeTagText}>{skill}  ✕</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>

      {/* Custom input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          placeholder="Add custom skill (e.g. AWS)"
          placeholderTextColor="#9CA3AF"
          value={customSkill}
          onChangeText={setCustomSkill}
          onSubmitEditing={() => handleAddSkill(customSkill)}
        />
        <TouchableOpacity 
          style={styles.addBtn} 
          onPress={() => handleAddSkill(customSkill)}
        >
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Preset suggestions */}
      <View style={styles.presetContainer}>
        <Text style={styles.sectionLabel}>Suggested Skills</Text>
        <View style={styles.tagGrid}>
          {PRESET_SKILLS.filter(s => !skills.includes(s)).map((skill) => (
            <TouchableOpacity 
              key={skill} 
              style={styles.presetTag} 
              onPress={() => handleAddSkill(skill)}
            >
              <Text style={styles.presetTagText}>+ {skill}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  selectedContainer: {
    marginBottom: 20,
    minHeight: 60,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activeTag: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeTagText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    height: 48,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
  },
  addBtn: {
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 12,
    height: 48,
  },
  addBtnText: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 14,
  },
  presetContainer: {
    marginBottom: 32,
  },
  presetTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  presetTagText: {
    color: '#4B5563',
    fontSize: 13,
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
