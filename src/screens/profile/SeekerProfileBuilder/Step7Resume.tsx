import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Step7ResumeProps {
  initialData: { resumeUrl: string };
  onNext: (data: { resumeUrl: string }) => void;
  onBack: () => void;
}

export const Step7Resume: React.FC<Step7ResumeProps> = ({
  initialData,
  onNext,
  onBack,
}) => {
  const [fileName, setFileName] = useState(
    initialData.resumeUrl ? 'My_ATS_Resume.pdf' : ''
  );

  const handleUploadSimulate = () => {
    Alert.alert('Resume Attached', 'PDF Resume has been attached and verified.');
    setFileName('My_ATS_Resume_2026.pdf');
  };

  const handleNext = () => {
    if (!fileName) {
      Alert.alert('Resume Required', 'Please upload or attach your resume to continue.');
      return;
    }
    onNext({ resumeUrl: `https://storage.googleapis.com/resumes/${fileName}` });
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Step Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.iconCircle}>
          <Ionicons name="document-text" size={26} color="#4F46E5" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.stepTitle}>Upload ATS Resume</Text>
          <Text style={styles.stepSubtitle}>
            Attach your corporate CV or PDF resume for automated recruiter parsing.
          </Text>
        </View>
      </View>

      {/* Upload Card */}
      <View style={styles.formCard}>
        {!fileName ? (
          <TouchableOpacity
            style={styles.uploadBox}
            onPress={handleUploadSimulate}
            activeOpacity={0.7}
          >
            <View style={styles.uploadIconWrap}>
              <Ionicons name="cloud-upload" size={28} color="#4F46E5" />
            </View>
            <Text style={styles.uploadTitle}>Choose Resume File</Text>
            <Text style={styles.uploadSubtitle}>Supports PDF, DOCX under 5MB</Text>
            <View style={styles.browsePill}>
              <Ionicons name="folder-open-outline" size={14} color="#4F46E5" />
              <Text style={styles.browsePillText}>Browse Files</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View>
            <View style={styles.fileCard}>
              <View style={styles.fileIconWrap}>
                <Ionicons name="document" size={24} color="#DC2626" />
              </View>
              <View style={styles.fileDetails}>
                <Text style={styles.fileName}>{fileName}</Text>
                <Text style={styles.fileSize}>PDF File • 1.2 MB • ATS Ready ✓</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => setFileName('')}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.reUploadBtn}
              onPress={handleUploadSimulate}
              activeOpacity={0.7}
            >
              <Ionicons name="swap-horizontal" size={15} color="#4F46E5" />
              <Text style={styles.reUploadText}>Upload Different Resume</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ATS Generator Note */}
        <View style={styles.atsNoteBox}>
          <Ionicons name="sparkles" size={18} color="#D97706" />
          <View style={{ flex: 1 }}>
            <Text style={styles.atsNoteTitle}>Platform ATS Resume Generator</Text>
            <Text style={styles.atsNoteDesc}>
              You can also build, customize, and export professional Harvard-format PDF resumes using our built-in tool anytime from your profile!
            </Text>
          </View>
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
    marginBottom: 14,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF2FF15',
    marginBottom: 14,
  },
  uploadIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 3,
  },
  uploadSubtitle: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginBottom: 12,
  },
  browsePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  browsePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
  },
  fileIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  fileSize: {
    fontSize: 11,
    color: '#059669',
    marginTop: 2,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 6,
  },
  reUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 12,
  },
  reUploadText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '700',
  },
  atsNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  atsNoteTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  atsNoteDesc: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 16,
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
