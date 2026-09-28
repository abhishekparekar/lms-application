import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/common/Input';

interface Step2SummaryProps {
  initialData: { bio: string };
  onNext: (data: { bio: string }) => void;
  onBack: () => void;
}

const BIO_TEMPLATES = [
  {
    title: 'Software Developer',
    text: 'Enthusiastic software developer with solid foundations in data structures, modern frameworks, and responsive mobile/web applications.',
  },
  {
    title: 'Recent Graduate',
    text: 'Motivated Computer Science graduate eager to apply academic knowledge to real-world software engineering and collaborative projects.',
  },
  {
    title: 'UI/UX & Product',
    text: 'User-centric product designer committed to crafting intuitive user experiences, scalable design systems, and delightful digital interfaces.',
  },
];

export const Step2Summary: React.FC<Step2SummaryProps> = ({
  initialData,
  onNext,
  onBack,
}) => {
  const [bio, setBio] = useState(initialData.bio || '');
  const [error, setError] = useState('');

  const validate = () => {
    if (!bio.trim()) {
      setError('Professional bio is required (min 20 characters)');
      return false;
    }
    if (bio.trim().length < 20) {
      setError('Please provide a slightly more descriptive bio (min 20 characters)');
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    onNext({ bio: bio.trim() });
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
          <Ionicons name="document-text" size={26} color="#4F46E5" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.stepTitle}>Professional Summary</Text>
          <Text style={styles.stepSubtitle}>
            Highlight your key skills, experience level, and career aspirations for hiring managers.
          </Text>
        </View>
      </View>

      {/* Quick Templates */}
      <View style={styles.templatesCard}>
        <View style={styles.templatesHeader}>
          <Ionicons name="bulb-outline" size={15} color="#D97706" />
          <Text style={styles.templatesTitle}>Quick Starters (Tap to insert):</Text>
        </View>
        <View style={styles.templatesRow}>
          {BIO_TEMPLATES.map((tmpl) => (
            <TouchableOpacity
              key={tmpl.title}
              style={styles.templateChip}
              onPress={() => {
                setBio(tmpl.text);
                if (error) setError('');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.templateChipText}>{tmpl.title} +</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Input Card */}
      <View style={styles.formCard}>
        <Input
          label="About You / Bio Summary *"
          placeholder="e.g. Dynamic developer with experience building performant web & mobile apps..."
          value={bio}
          onChangeText={(text) => {
            setBio(text);
            if (error) setError('');
          }}
          error={error}
          multiline
          numberOfLines={5}
          inputStyle={styles.bioInput}
        />
        <View style={styles.charCountRow}>
          <Text style={styles.charCountText}>{bio.length} characters (min 20)</Text>
        </View>
      </View>

      {/* Navigation Buttons */}
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
  templatesCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  templatesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  templatesTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#B45309',
  },
  templatesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  templateChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  templateChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
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
  bioInput: {
    height: 110,
    alignItems: 'flex-start',
    paddingTop: 8,
  },
  charCountRow: {
    alignItems: 'flex-end',
    marginTop: -8,
  },
  charCountText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
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
