import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Button } from '@/components/common/Button';

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
  const [fileName, setFileName] = useState(initialData.resumeUrl ? 'UploadedResume.pdf' : '');

  const handleUploadSimulate = () => {
    Alert.alert('Upload Document', 'Simulated PDF Upload Successful.');
    setFileName('MyResume_Updated.pdf');
  };

  const handleNext = () => {
    if (!fileName) {
      Alert.alert('Resume Required', 'Please upload your resume to continue.');
      return;
    }
    onNext({ resumeUrl: `https://mockstorage.firebase.com/resumes/${fileName}` });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Step 7: Upload Resume</Text>
      <Text style={styles.subtitle}>Upload your latest CV/Resume. Recommended formats: PDF, DOCX under 5MB.</Text>

      {!fileName ? (
        <TouchableOpacity style={styles.uploadBox} onPress={handleUploadSimulate}>
          <Text style={styles.uploadIcon}>📁</Text>
          <Text style={styles.uploadTitle}>Choose Resume File</Text>
          <Text style={styles.uploadSubtitle}>Tap to browse files on your device</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.fileCard}>
          <Text style={styles.fileIcon}>📄</Text>
          <View style={styles.fileDetails}>
            <Text style={styles.fileName}>{fileName}</Text>
            <Text style={styles.fileSize}>PDF File • 1.2 MB</Text>
          </View>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => setFileName('')}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {fileName ? (
        <TouchableOpacity style={styles.reUploadBtn} onPress={handleUploadSimulate}>
          <Text style={styles.reUploadText}>Upload Different File</Text>
        </TouchableOpacity>
      ) : null}

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
  uploadBox: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    marginBottom: 32,
  },
  uploadIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#ECFDF5',
    marginBottom: 20,
  },
  fileIcon: {
    fontSize: 32,
  },
  fileDetails: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  fileSize: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 8,
  },
  deleteText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  reUploadBtn: {
    alignSelf: 'center',
    marginBottom: 32,
  },
  reUploadText: {
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
