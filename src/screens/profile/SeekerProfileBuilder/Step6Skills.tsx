import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Step6SkillsProps {
  initialData: string[];
  onNext: (skills: string[]) => void;
  onBack: () => void;
}

const CATEGORIZED_SKILLS = [
  {
    category: 'Frontend & Web',
    items: ['React', 'TypeScript', 'JavaScript', 'HTML5/CSS3', 'Next.js', 'Tailwind CSS', 'Redux'],
  },
  {
    category: 'Backend & Cloud',
    items: ['Node.js', 'Python', 'Java', 'Express.js', 'Firebase', 'PostgreSQL', 'MongoDB', 'AWS', 'REST APIs'],
  },
  {
    category: 'Mobile & DevOps',
    items: ['React Native', 'Flutter', 'Android', 'iOS', 'Git & GitHub', 'Docker', 'CI/CD'],
  },
  {
    category: 'Design & Management',
    items: ['UI/UX Design', 'Figma', 'Product Management', 'Agile/Scrum', 'Data Analysis'],
  },
];

export const Step6Skills: React.FC<Step6SkillsProps> = ({
  initialData,
  onNext,
  onBack,
}) => {
  const [skills, setSkills] = useState<string[]>(initialData || []);
  const [customSkill, setCustomSkill] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);

  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkills([...skills, trimmed]);
    }
    setCustomSkill('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleNext = () => {
    if (skills.length === 0) {
      Alert.alert('Skills Required', 'Please select or type at least one skill to continue.');
      return;
    }
    onNext(skills);
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
          <Ionicons name="flash" size={26} color="#4F46E5" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.stepTitle}>Skills & Competencies</Text>
          <Text style={styles.stepSubtitle}>
            Add technical & professional skills to match algorithms with relevant job openings.
          </Text>
        </View>
      </View>

      {/* Selected Skills Card */}
      <View style={styles.formCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>Your Selected Skills</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{skills.length}</Text>
          </View>
        </View>

        <View style={styles.tagGrid}>
          {skills.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="add-circle-outline" size={20} color="#94A3B8" />
              <Text style={styles.emptyText}>No skills selected yet. Tap suggested skills below or type your own.</Text>
            </View>
          ) : (
            skills.map((skill) => (
              <TouchableOpacity
                key={skill}
                style={styles.activeTag}
                onPress={() => handleRemoveSkill(skill)}
                activeOpacity={0.7}
              >
                <Text style={styles.activeTagText}>{skill}</Text>
                <Ionicons name="close-circle" size={15} color="#4F46E5" />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Custom Input */}
        <View style={styles.inputRow}>
          <View style={styles.inputWrap}>
            <Ionicons name="search-outline" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.textInput}
              placeholder="Type custom skill (e.g. Docker, GraphQL)"
              placeholderTextColor="#94A3B8"
              value={customSkill}
              onChangeText={setCustomSkill}
              onSubmitEditing={() => handleAddSkill(customSkill)}
              returnKeyType="done"
            />
          </View>
          <TouchableOpacity
            style={[styles.addBtn, !customSkill.trim() && styles.addBtnDisabled]}
            onPress={() => handleAddSkill(customSkill)}
            disabled={!customSkill.trim()}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Suggested Skills by Category */}
      <View style={styles.suggestedCard}>
        <Text style={styles.suggestedTitle}>Suggested Skills by Category</Text>

        {/* Category Pill Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catTabs}>
          {CATEGORIZED_SKILLS.map((cat, idx) => (
            <TouchableOpacity
              key={cat.category}
              style={[styles.catTab, activeCategory === idx && styles.catTabActive]}
              onPress={() => setActiveCategory(idx)}
              activeOpacity={0.7}
            >
              <Text style={[styles.catTabText, activeCategory === idx && styles.catTabTextActive]}>
                {cat.category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.tagGrid}>
          {CATEGORIZED_SKILLS[activeCategory].items
            .filter((s) => !skills.includes(s))
            .map((skill) => (
              <TouchableOpacity
                key={skill}
                style={styles.presetTag}
                onPress={() => handleAddSkill(skill)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={14} color="#4F46E5" />
                <Text style={styles.presetTagText}>{skill}</Text>
              </TouchableOpacity>
            ))}
        </View>
      </View>

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
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  badge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 40,
    marginBottom: 14,
  },
  emptyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    flex: 1,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  activeTagText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
  },
  addBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12.5,
  },
  suggestedCard: {
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
    marginBottom: 16,
  },
  suggestedTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
  },
  catTabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  catTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  catTabActive: {
    backgroundColor: '#4F46E5',
  },
  catTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  catTabTextActive: {
    color: '#FFFFFF',
  },
  presetTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetTagText: {
    fontSize: 11.5,
    color: '#334155',
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
