import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  ActivityIndicator,
  TextInput,
  useColorScheme,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/hooks/useAuth';
import { jobService, Job } from '@/services/jobs/jobService';
import { Colors } from '@/constants/theme';
import { db } from '@/services/firebase/config';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import * as DocumentPicker from 'expo-document-picker';

interface ApplyJobProps {
  jobId: string;
  onBack: () => void;
  onSuccess: () => void;
}

export const ApplyJob: React.FC<ApplyJobProps> = ({
  jobId,
  onBack,
  onSuccess,
}) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [job, setJob] = useState<Job | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);

  useEffect(() => {
    RNStatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor('#4F46E5');
      RNStatusBar.setTranslucent(false);
    }
  }, []);

  // Auto-Fetched Seeker Profile Fields
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [candidateBio, setCandidateBio] = useState('');
  const [candidateSkills, setCandidateSkills] = useState<string[]>([]);
  const [expectedSalary, setExpectedSalary] = useState('');
  const [coverLetter, setCoverLetter] = useState('');

  // Mobile Device File Upload State
  const [savedResumeUrl, setSavedResumeUrl] = useState('');
  const [activeResumeUrl, setActiveResumeUrl] = useState('');
  const [activeResumeName, setActiveResumeName] = useState('');
  const [activeFileSize, setActiveFileSize] = useState<string>('');
  const [useCustomUpload, setUseCustomUpload] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch Job Details
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'jobs', jobId), (snap) => {
      if (snap.exists()) {
        setJob({ id: snap.id, ...snap.data() } as Job);
      }
      setLoadingJob(false);
    }, () => setLoadingJob(false));
    return () => unsub();
  }, [jobId]);

  // 2. Fetch & Hydrate Seeker Profile Details Automatically
  useEffect(() => {
    if (!user) return;

    const seeker = user.seekerProfile;
    setCandidateName(seeker?.fullName || user.displayName || 'Applicant');
    setCandidateEmail(user.email || '');
    setCandidatePhone(seeker?.phone || '');
    setCandidateBio(seeker?.bio || (seeker as any)?.summary || '');
    setCandidateSkills(seeker?.skills || []);
    setExpectedSalary((seeker as any)?.expectedSalary || '');

    const rUrl = seeker?.resumeUrl || (user as any).resumeUrl || '';
    setSavedResumeUrl(rUrl);

    if (rUrl) {
      const fileName = rUrl.split('/').pop() || 'Saved_Profile_Resume.pdf';
      setActiveResumeUrl(rUrl);
      setActiveResumeName(fileName);
      setActiveFileSize('Profile Resume');
    } else {
      setActiveResumeName('');
      setActiveFileSize('');
    }

    // Realtime Listener for profile updates
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const uData = snap.data();
        const sProf = uData.seekerProfile || {};
        if (sProf.fullName) setCandidateName(sProf.fullName);
        if (sProf.phone) setCandidatePhone(sProf.phone);
        if (sProf.bio) setCandidateBio(sProf.bio);
        if (sProf.skills) setCandidateSkills(sProf.skills);
        if (sProf.resumeUrl) {
          setSavedResumeUrl(sProf.resumeUrl);
          if (!useCustomUpload) {
            setActiveResumeUrl(sProf.resumeUrl);
            setActiveResumeName(sProf.resumeUrl.split('/').pop() || 'Saved_Profile_Resume.pdf');
            setActiveFileSize('Profile Resume');
          }
        }
      }
    });

    return () => unsubUser();
  }, [user]);

  const initials = candidateName
    ? candidateName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'AP';

  // Direct Mobile Device / Browser File Upload Trigger
  const handlePickFileFromMobileBrowser = async () => {
    try {
      if (DocumentPicker && typeof DocumentPicker.getDocumentAsync === 'function') {
        const res = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '*/*'],
          copyToCacheDirectory: true,
        });

        if (!res.canceled && res.assets && res.assets.length > 0) {
          const asset = res.assets[0];
          const fileName = asset.name || `${candidateName.replace(/\s+/g, '_')}_Resume.pdf`;
          const sizeKb = asset.size ? Math.round(asset.size / 1024) : 250;
          const fileUri = asset.uri;

          setActiveResumeName(fileName);
          setActiveResumeUrl(fileUri);
          setActiveFileSize(`${sizeKb} KB • Device PDF`);
          setUseCustomUpload(true);
          Alert.alert('📄 Resume Uploaded!', `"${fileName}" (${sizeKb} KB) attached from your device.`);
          return;
        }
      }
    } catch (e: any) {
      console.warn('[ApplyJob] Native DocumentPicker error:', e?.message || e);
    }

    // Web Browser fallback
    if (typeof document !== 'undefined') {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);

      fileInput.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const fileName = file.name;
          const sizeKb = Math.round(file.size / 1024);

          const reader = new FileReader();
          reader.onload = (event: any) => {
            const dataUrl = event.target?.result || URL.createObjectURL(file);
            setActiveResumeName(fileName);
            setActiveResumeUrl(dataUrl);
            setActiveFileSize(`${sizeKb} KB • Uploaded PDF`);
            setUseCustomUpload(true);
            Alert.alert('📄 Resume Selected!', `"${fileName}" (${sizeKb} KB) loaded successfully.`);
          };
          reader.onerror = () => {
            const objectUrl = URL.createObjectURL(file);
            setActiveResumeName(fileName);
            setActiveResumeUrl(objectUrl);
            setActiveFileSize(`${sizeKb} KB • Device File`);
            setUseCustomUpload(true);
          };
          reader.readAsDataURL(file);
        }
        if (document.body.contains(fileInput)) {
          document.body.removeChild(fileInput);
        }
      };
      fileInput.click();
    }
  };

  const handleSelectSavedResume = () => {
    if (!savedResumeUrl) {
      Alert.alert('No Profile Resume', 'No saved resume found in profile. Please upload a PDF file from your mobile device.');
      return;
    }
    setActiveResumeUrl(savedResumeUrl);
    setActiveResumeName(savedResumeUrl.split('/').pop() || 'Saved_Profile_Resume.pdf');
    setActiveFileSize('Profile Resume');
    setUseCustomUpload(false);
  };

  const handleDeleteResume = () => {
    Alert.alert(
      'Delete Resume 🗑️',
      'Are you sure you want to remove the attached resume from this application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setActiveResumeName('');
            setActiveResumeUrl('');
            setActiveFileSize('');
            setUseCustomUpload(true);
            Alert.alert('Resume Removed', 'Attached resume file cleared.');
          }
        }
      ]
    );
  };

  // Submit Application
  const handleSubmitApplication = async () => {
    if (!user) return;

    if (!activeResumeUrl) {
      Alert.alert(
        'Upload Resume Required 📄',
        'Please select a PDF resume file from your device before submitting.',
        [
          { text: 'Choose File', onPress: handlePickFileFromMobileBrowser },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    setSubmitting(true);
    try {
      await jobService.applyForJob(user.uid, jobId, {
        candidateName,
        candidateEmail,
        candidatePhone,
        candidateBio,
        candidateExpectedSalary: expectedSalary,
        resumeUrl: activeResumeUrl,
        coverLetter,
      });

      // Update candidate user record in Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'seekerProfile.phone': candidatePhone,
        'seekerProfile.bio': candidateBio,
        'seekerProfile.resumeUrl': activeResumeUrl,
      }).catch(() => {});

      Alert.alert(
        '🎉 Application Submitted!',
        `Your application for "${job?.title || 'this position'}" at ${job?.company || 'the company'} was submitted successfully!`,
        [{ text: 'OK', onPress: onSuccess }]
      );
    } catch (e: any) {
      Alert.alert('Submission Error', e.message || 'Could not submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingJob) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#4F46E5' }} edges={['top']}>
      <RNStatusBar barStyle="light-content" backgroundColor="#4F46E5" translucent={false} />
      <StatusBar style="light" />
      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: colors.background }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onBack} style={styles.headerBackButton} activeOpacity={0.75}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.headerBackText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Job Application
          </Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 90 + insets.bottom }]} 
          showsVerticalScrollIndicator={false}
        >
          {/* Target Job Banner */}
          {job && (
            <View style={styles.jobSummaryCard}>
              <View style={styles.jobBadgeBox}>
                <Ionicons name="briefcase" size={16} color="#4F46E5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.jobSummaryTitle} numberOfLines={1}>{job.title}</Text>
                <Text style={styles.jobSummaryCompany} numberOfLines={1}>{job.company} • {job.type || 'Full-time'}</Text>
              </View>
            </View>
          )}

          {/* Section 1: Auto-Fetched Applicant Profile Details */}
          <Text style={styles.sectionHeaderLabel}>1. CANDIDATE PROFILE DETAILS</Text>
          <View style={styles.profileCard}>
            <View style={styles.profileHeaderRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{candidateName}</Text>
                <Text style={styles.profileEmail}>{candidateEmail}</Text>
                <View style={styles.autoFetchTag}>
                  <Ionicons name="sparkles" size={10} color="#10B981" />
                  <Text style={styles.autoFetchText}>Auto-Fetched Seeker Profile</Text>
                </View>
              </View>
            </View>

            {/* Editable Info Fields */}
            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={candidateName}
                  onChangeText={setCandidateName}
                  placeholder="Full name"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.fieldHalf}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={candidatePhone}
                  onChangeText={setCandidatePhone}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>Expected Salary / CTC</Text>
              <TextInput
                style={styles.textInput}
                value={expectedSalary}
                onChangeText={setExpectedSalary}
                placeholder="e.g. ₹6,00,000 / year"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {candidateSkills.length > 0 && (
              <View style={styles.skillsSection}>
                <Text style={styles.inputLabel}>Profile Skills</Text>
                <View style={styles.skillsWrap}>
                  {candidateSkills.map((skill, idx) => (
                    <View key={idx} style={styles.skillChip}>
                      <Text style={styles.skillChipTxt}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>Profile Summary / Bio</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={candidateBio}
                onChangeText={setCandidateBio}
                placeholder="Summary of experience..."
                multiline
                numberOfLines={2}
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* Section 2: Direct Mobile Device Resume Upload */}
          <Text style={styles.sectionHeaderLabel}>2. UPLOAD RESUME FROM DEVICE</Text>
          <View style={styles.resumeSectionCard}>
            {/* Display Active Selected / Uploaded File */}
            <View style={[styles.activeResumeBox, !activeResumeUrl && styles.activeResumeBoxEmpty]}>
              <View style={styles.pdfIconWrap}>
                <Ionicons name="document-text" size={24} color="#EF4444" />
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={styles.activeResumeTitle} numberOfLines={1}>
                  {activeResumeName || 'No Resume Selected'}
                </Text>
                <Text style={styles.activeResumeSub}>
                  {activeFileSize || (activeResumeUrl ? 'Ready to Submit' : 'Tap button below to select PDF file from device')}
                </Text>
              </View>

              {activeResumeUrl ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={styles.readyBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.readyBadgeTxt}>Ready</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteIconBtn}
                    onPress={handleDeleteResume}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
              )}
            </View>

            {/* Direct Mobile Browser Upload Button */}
            <View style={styles.resumeActionGrid}>
              <TouchableOpacity
                style={styles.uploadMainBtn}
                onPress={handlePickFileFromMobileBrowser}
                activeOpacity={0.85}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                <Text style={styles.uploadMainBtnTxt}>
                  {activeResumeUrl ? 'Choose Different PDF File 📄' : 'Upload Resume File (PDF/DOC)'}
                </Text>
              </TouchableOpacity>

              {savedResumeUrl ? (
                <TouchableOpacity
                  style={[styles.savedResumeToggleBtn, !useCustomUpload && styles.savedResumeToggleBtnActive]}
                  onPress={handleSelectSavedResume}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name={!useCustomUpload ? "checkmark-circle" : "document-text-outline"} 
                    size={14} 
                    color={!useCustomUpload ? "#4F46E5" : "#64748B"} 
                  />
                  <Text style={[styles.savedResumeToggleTxt, !useCustomUpload && styles.savedResumeToggleTxtActive]}>
                    Use Saved Profile Resume
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Section 3: Cover Note */}
          <Text style={styles.sectionHeaderLabel}>3. COVER NOTE (OPTIONAL)</Text>
          <View style={styles.coverNoteCard}>
            <TextInput
              style={styles.coverNoteArea}
              value={coverLetter}
              onChangeText={setCoverLetter}
              placeholder="Introduce yourself to the employer and share why you are a great fit..."
              multiline
              numberOfLines={4}
              placeholderTextColor="#94A3B8"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitPrimaryBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmitApplication}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
                <Text style={styles.submitPrimaryBtnTxt}>Submit Application 🚀</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#4338CA',
    backgroundColor: '#4F46E5',
  },
  headerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 12,
  },
  jobSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EEF2FF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 12,
  },
  jobBadgeBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobSummaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  jobSummaryCompany: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '700',
    marginTop: 1,
  },
  sectionHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#94A3B8',
    marginBottom: 6,
    marginTop: 2,
  },
  profileCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 10,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  profileName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  profileEmail: {
    fontSize: 11,
    color: '#64748B',
  },
  autoFetchTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  autoFetchText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  fieldHalf: {
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 3,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '500',
  },
  multilineInput: {
    height: 52,
    textAlignVertical: 'top',
  },
  skillsSection: {
    marginBottom: 8,
  },
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 2,
  },
  skillChip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  skillChipTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
  },
  resumeSectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  activeResumeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 10,
  },
  activeResumeBoxEmpty: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  pdfIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeResumeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  activeResumeSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  readyBadgeTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  deleteIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumeActionGrid: {
    gap: 6,
  },
  uploadMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 2,
  },
  uploadMainBtnTxt: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  savedResumeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 7,
    borderRadius: 10,
  },
  savedResumeToggleBtnActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  savedResumeToggleTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  savedResumeToggleTxtActive: {
    color: '#4F46E5',
  },
  coverNoteCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 14,
  },
  coverNoteArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: '#0F172A',
    height: 80,
    textAlignVertical: 'top',
  },
  submitPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
  },
  submitPrimaryBtnTxt: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
