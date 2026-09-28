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
  Image,
  useColorScheme,
  StatusBar as RNStatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/hooks/useAuth';
import { jobService, Job } from '@/services/jobs/jobService';
import { Colors } from '@/constants/theme';
import { db } from '@/services/firebase/config';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { formatLocation, formatJobSalary, getJobLogoUrl } from '@/utils';
import * as DocumentPicker from 'expo-document-picker';

interface ApplyJobProps {
  jobId: string;
  onBack: () => void;
  onSuccess: () => void;
}

const EXPERIENCE_OPTIONS = ['Fresher', '1-2 Years', '3-5 Years', '5+ Years', '8+ Years'];
const EDUCATION_OPTIONS = ['B.Tech / BE', 'BCA / MCA', 'B.Sc / M.Sc', 'MBA / PG', 'Diploma', 'Other'];
const NOTICE_OPTIONS = ['Immediate', '15 Days', '30 Days', '60 Days'];

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

  // ── Candidate Contact Information ──
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [candidateLocation, setCandidateLocation] = useState('');

  // ── Professional Background ──
  const [selectedExp, setSelectedExp] = useState('1-2 Years');
  const [selectedEdu, setSelectedEdu] = useState('B.Tech / BE');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [selectedNotice, setSelectedNotice] = useState('Immediate');
  const [candidateBio, setCandidateBio] = useState('');
  
  // Skills management
  const [candidateSkills, setCandidateSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');

  // ── Resume & Portfolio Attachments ──
  const [savedResumeUrl, setSavedResumeUrl] = useState('');
  const [activeResumeUrl, setActiveResumeUrl] = useState('');
  const [activeResumeName, setActiveResumeName] = useState('');
  const [activeFileSize, setActiveFileSize] = useState<string>('');
  const [useCustomUpload, setUseCustomUpload] = useState(false);
  const [portfolioUrl, setPortfolioUrl] = useState('');

  // ── Cover Note ──
  const [coverLetter, setCoverLetter] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch Job Details
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'jobs', jobId), (snap) => {
      if (snap.exists()) {
        setJob({ id: snap.id, ...snap.data() } as Job);
      }
      setLoadingJob(false);
    }, async () => {
      const fallback = await jobService.getJobById(jobId);
      if (fallback) setJob(fallback);
      setLoadingJob(false);
    });
    return () => unsub();
  }, [jobId]);

  // 2. Fetch & Hydrate Seeker Profile Details Automatically
  useEffect(() => {
    if (!user) return;

    const seeker = user.seekerProfile;
    setCandidateName(seeker?.fullName || user.displayName || 'Applicant');
    setCandidateEmail(user.email || '');
    setCandidatePhone(seeker?.phone || '');
    setCandidateLocation((seeker as any)?.locationPreference || (user as any).location || '');
    setCandidateBio(seeker?.bio || (seeker as any)?.summary || '');
    
    if (Array.isArray(seeker?.skills) && seeker.skills.length > 0) {
      setCandidateSkills(seeker.skills);
    } else {
      setCandidateSkills(['Communication', 'Problem Solving']);
    }

    setExpectedSalary((seeker as any)?.expectedSalary || '');
    if ((seeker as any)?.noticePeriod) {
      setSelectedNotice((seeker as any).noticePeriod);
    }

    const rUrl = seeker?.resumeUrl || (user as any).resumeUrl || '';
    setSavedResumeUrl(rUrl);

    if (rUrl) {
      const fileName = rUrl.split('/').pop()?.split('?')[0] || 'Saved_Profile_Resume.pdf';
      setActiveResumeUrl(rUrl);
      setActiveResumeName(fileName);
      setActiveFileSize('Profile Resume');
    }

    // Realtime Listener for profile updates
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const uData = snap.data();
        const sProf = uData.seekerProfile || {};
        if (sProf.fullName) setCandidateName(sProf.fullName);
        if (sProf.phone) setCandidatePhone(sProf.phone);
        if (sProf.locationPreference) setCandidateLocation(sProf.locationPreference);
        if (sProf.bio) setCandidateBio(sProf.bio);
        if (Array.isArray(sProf.skills) && sProf.skills.length > 0) {
          setCandidateSkills(sProf.skills);
        }
        if (sProf.resumeUrl) {
          setSavedResumeUrl(sProf.resumeUrl);
          if (!useCustomUpload) {
            setActiveResumeUrl(sProf.resumeUrl);
            setActiveResumeName(sProf.resumeUrl.split('/').pop()?.split('?')[0] || 'Saved_Profile_Resume.pdf');
            setActiveFileSize('Profile Resume');
          }
        }
      }
    });

    return () => unsubUser();
  }, [user]);

  // Add / Remove Skills
  const handleAddSkill = () => {
    const trimmed = newSkillInput.trim();
    if (!trimmed) return;
    if (candidateSkills.includes(trimmed)) {
      setNewSkillInput('');
      return;
    }
    setCandidateSkills([...candidateSkills, trimmed]);
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setCandidateSkills(candidateSkills.filter(s => s !== skillToRemove));
  };

  // Word count helper for cover letter (max 100 words)
  const countWords = (text: string): number => {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const coverWordCount = countWords(coverLetter);

  const handleCoverLetterChange = (text: string) => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length > 100) {
      // Keep within 100 words limit
      const trimmed = words.slice(0, 100).join(' ');
      setCoverLetter(trimmed);
      return;
    }
    setCoverLetter(text);
  };

  // Direct Mobile Device / DocumentPicker File Upload
  const handlePickFile = async () => {
    try {
      if (DocumentPicker && typeof DocumentPicker.getDocumentAsync === 'function') {
        const res = await DocumentPicker.getDocumentAsync({
          type: [
            'application/pdf', 
            'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
            '*/*'
          ],
          copyToCacheDirectory: true,
        });

        if (!res.canceled && res.assets && res.assets.length > 0) {
          const asset = res.assets[0];
          const fileName = asset.name || `${candidateName.replace(/\s+/g, '_')}_Resume.pdf`;
          const sizeKb = asset.size ? Math.round(asset.size / 1024) : 180;
          const fileUri = asset.uri;

          setActiveResumeName(fileName);
          setActiveResumeUrl(fileUri);
          setActiveFileSize(`${sizeKb} KB • Device Document`);
          setUseCustomUpload(true);
          Alert.alert('📄 Resume Attached!', `"${fileName}" (${sizeKb} KB) attached successfully.`);
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
            setActiveFileSize(`${sizeKb} KB • Uploaded File`);
            setUseCustomUpload(true);
            Alert.alert('📄 Resume Attached!', `"${fileName}" (${sizeKb} KB) attached successfully.`);
          };
          reader.onerror = () => {
            const objectUrl = URL.createObjectURL(file);
            setActiveResumeName(fileName);
            setActiveResumeUrl(objectUrl);
            setActiveFileSize(`${sizeKb} KB • Uploaded File`);
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
      Alert.alert('No Profile Resume', 'No saved resume found in profile. Please upload a file from your device.');
      return;
    }
    setActiveResumeUrl(savedResumeUrl);
    setActiveResumeName(savedResumeUrl.split('/').pop()?.split('?')[0] || 'Saved_Profile_Resume.pdf');
    setActiveFileSize('Profile Resume');
    setUseCustomUpload(false);
  };

  const handleDeleteResume = () => {
    Alert.alert(
      'Remove Resume 🗑️',
      'Are you sure you want to remove the attached resume from this application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setActiveResumeName('');
            setActiveResumeUrl('');
            setActiveFileSize('');
            setUseCustomUpload(true);
          }
        }
      ]
    );
  };

  // Submit Application
  const handleSubmitApplication = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to submit your job application.');
      return;
    }

    if (!candidateName.trim()) {
      Alert.alert('Missing Field', 'Please enter your Full Name.');
      return;
    }

    if (!candidateEmail.trim() || !candidateEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid Email Address.');
      return;
    }

    if (!candidatePhone.trim()) {
      Alert.alert('Missing Field', 'Please enter your Phone Number.');
      return;
    }

    setSubmitting(true);
    try {
      await jobService.applyForJob(user.uid, jobId, {
        candidateName: candidateName.trim(),
        candidateEmail: candidateEmail.trim(),
        candidatePhone: candidatePhone.trim(),
        candidateLocation: candidateLocation.trim(),
        candidateExperience: selectedExp,
        candidateEducation: selectedEdu,
        candidateBio: candidateBio.trim(),
        candidateSkills,
        candidateExpectedSalary: expectedSalary.trim(),
        candidateNoticePeriod: selectedNotice,
        resumeUrl: activeResumeUrl || portfolioUrl.trim(),
        resumeFileName: activeResumeName,
        portfolioUrl: portfolioUrl.trim(),
        coverLetter: coverLetter.trim(),
      });

      // Update candidate user profile in Firestore so latest contact details persist
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'seekerProfile.fullName': candidateName.trim(),
        'seekerProfile.phone': candidatePhone.trim(),
        'seekerProfile.locationPreference': candidateLocation.trim(),
        'seekerProfile.bio': candidateBio.trim(),
        'seekerProfile.skills': candidateSkills,
        'seekerProfile.expectedSalary': expectedSalary.trim(),
        'seekerProfile.noticePeriod': selectedNotice,
        ...(activeResumeUrl ? { 'seekerProfile.resumeUrl': activeResumeUrl } : {}),
      }).catch(() => {});

      Alert.alert(
        '🎉 Application Submitted!',
        `Your application for "${job?.title || 'this position'}" at ${job?.company || 'the employer'} was submitted successfully! The recruiter will review your profile.`,
        [{ text: 'Great!', onPress: onSuccess }]
      );
    } catch (e: any) {
      Alert.alert('Submission Error', e.message || 'Could not submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingJob) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading job application details...</Text>
      </View>
    );
  }

  const logoUrl = getJobLogoUrl(job);
  const salaryText = formatJobSalary(job);
  const locationText = formatLocation(job?.location);
  const initial = job?.company ? job.company.charAt(0).toUpperCase() : 'J';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#4F46E5' }} edges={['top']}>
      <RNStatusBar barStyle="light-content" backgroundColor="#4F46E5" translucent={false} />
      <StatusBar style="light" />
      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: '#F8FAFC' }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Top Header Navigation ── */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onBack} style={styles.headerBackButton} activeOpacity={0.75}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.headerBackText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Job Application Form
          </Text>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Quick Apply</Text>
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Target Job Summary Banner ── */}
          {job && (
            <View style={styles.jobBannerCard}>
              <View style={styles.jobBannerTop}>
                <View style={styles.logoWrap}>
                  {logoUrl ? (
                    <Image source={{ uri: logoUrl }} style={styles.logoImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.logoFallback}>
                      <Text style={styles.logoFallbackText}>{initial}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.jobInfoCol}>
                  <Text style={styles.jobTitleText} numberOfLines={1}>{job.title}</Text>
                  <View style={styles.companyMetaRow}>
                    <Ionicons name="business" size={13} color="#6366F1" />
                    <Text style={styles.companyNameText} numberOfLines={1}>
                      {job.company || 'Verified Employer'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.jobBannerDivider} />

              <View style={styles.jobMetaPillsRow}>
                {salaryText ? (
                  <View style={[styles.metaPill, styles.salaryPill]}>
                    <Ionicons name="cash-outline" size={12} color="#059669" />
                    <Text style={[styles.metaPillText, styles.salaryPillText]}>{salaryText}</Text>
                  </View>
                ) : null}

                {locationText ? (
                  <View style={styles.metaPill}>
                    <Ionicons name="location-outline" size={12} color="#475569" />
                    <Text style={styles.metaPillText} numberOfLines={1}>{locationText}</Text>
                  </View>
                ) : null}

                <View style={[styles.metaPill, styles.typePill]}>
                  <Text style={[styles.metaPillText, styles.typePillText]}>{job.type || 'Full-time'}</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Section 1: Candidate Contact Info ── */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionNumberCircle}>
              <Text style={styles.sectionNumberText}>1</Text>
            </View>
            <Text style={styles.sectionTitle}>CANDIDATE CONTACT DETAILS</Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Full Name <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="person-outline" size={16} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  value={candidateName}
                  onChangeText={setCandidateName}
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Email Address <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="mail-outline" size={16} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  value={candidateEmail}
                  onChangeText={setCandidateEmail}
                  placeholder="e.g. rahul@example.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>
                  Phone Number <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={styles.inputWithIcon}>
                  <Ionicons name="call-outline" size={16} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputField}
                    value={candidatePhone}
                    onChangeText={setCandidatePhone}
                    placeholder="+91 9876543210"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Current City</Text>
                <View style={styles.inputWithIcon}>
                  <Ionicons name="location-outline" size={16} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputField}
                    value={candidateLocation}
                    onChangeText={setCandidateLocation}
                    placeholder="e.g. Bengaluru"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* ── Section 2: Professional Background ── */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionNumberCircle}>
              <Text style={styles.sectionNumberText}>2</Text>
            </View>
            <Text style={styles.sectionTitle}>PROFESSIONAL BACKGROUND</Text>
          </View>

          <View style={styles.formCard}>
            {/* Experience Level */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Total Experience</Text>
              <View style={styles.chipsWrap}>
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chipItem, selectedExp === opt && styles.chipItemActive]}
                    onPress={() => setSelectedExp(opt)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, selectedExp === opt && styles.chipTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Highest Qualification */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Highest Education / Degree</Text>
              <View style={styles.chipsWrap}>
                {EDUCATION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chipItem, selectedEdu === opt && styles.chipItemActive]}
                    onPress={() => setSelectedEdu(opt)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, selectedEdu === opt && styles.chipTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notice Period */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notice Period</Text>
              <View style={styles.chipsWrap}>
                {NOTICE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chipItem, selectedNotice === opt && styles.chipItemActive]}
                    onPress={() => setSelectedNotice(opt)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, selectedNotice === opt && styles.chipTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Expected Salary */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Expected Salary / CTC</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="cash-outline" size={16} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  value={expectedSalary}
                  onChangeText={setExpectedSalary}
                  placeholder="e.g. ₹4,50,000 / year or ₹35,000 / mo"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Skills */}
            <View style={styles.inputGroup}>
              <View style={styles.skillsHeaderRow}>
                <Text style={styles.label}>Key Skills</Text>
                <Text style={styles.skillsCountText}>
                  {candidateSkills.length} {candidateSkills.length === 1 ? 'skill' : 'skills'} added
                </Text>
              </View>

              {candidateSkills.length > 0 ? (
                <View style={styles.skillsContainer}>
                  {candidateSkills.map((skill, idx) => (
                    <View key={idx} style={styles.skillBadge}>
                      <Ionicons name="checkmark-circle" size={13} color="#4F46E5" />
                      <Text style={styles.skillBadgeText}>{skill}</Text>
                      <TouchableOpacity 
                        onPress={() => handleRemoveSkill(skill)} 
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close-circle" size={15} color="#818CF8" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noSkillsNotice}>
                  <Text style={styles.noSkillsText}>No skills added yet. Add your top skills below.</Text>
                </View>
              )}

              {/* Dedicated styled Add Skill Input Box */}
              <View style={styles.addSkillInputBox}>
                <Ionicons name="code-slash-outline" size={16} color="#6366F1" style={styles.addSkillIcon} />
                <TextInput
                  style={styles.addSkillTextInput}
                  value={newSkillInput}
                  onChangeText={setNewSkillInput}
                  placeholder="Enter a skill (e.g. React Native, Java, UI/UX, Python)"
                  placeholderTextColor="#94A3B8"
                  onSubmitEditing={handleAddSkill}
                  returnKeyType="done"
                />
                <TouchableOpacity 
                  style={[styles.addSkillBtn, !newSkillInput.trim() && styles.addSkillBtnDisabled]} 
                  onPress={handleAddSkill}
                  activeOpacity={0.8}
                  disabled={!newSkillInput.trim()}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.addSkillBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bio / Summary */}
            <View style={[styles.inputGroup, { marginBottom: 0 }]}>
              <Text style={styles.label}>Professional Summary / Bio</Text>
              <TextInput
                style={[styles.inputField, styles.bioInput]}
                value={candidateBio}
                onChangeText={setCandidateBio}
                placeholder="Brief summary of your skills, achievements, or experience..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* ── Section 3: Resume & Portfolio Attachments ── */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionNumberCircle}>
              <Text style={styles.sectionNumberText}>3</Text>
            </View>
            <Text style={styles.sectionTitle}>RESUME & PORTFOLIO ATTACHMENT</Text>
          </View>

          <View style={styles.formCard}>
            {/* Active Resume Display Box */}
            <View style={[styles.resumeCardBox, !activeResumeUrl && styles.resumeCardBoxEmpty]}>
              <View style={[styles.resumeIconWrap, !activeResumeUrl && { backgroundColor: '#F1F5F9' }]}>
                <Ionicons 
                  name="document-text" 
                  size={24} 
                  color={activeResumeUrl ? '#EF4444' : '#94A3B8'} 
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.resumeFileName} numberOfLines={1}>
                  {activeResumeName || 'No Resume File Selected'}
                </Text>
                <Text style={styles.resumeFileSize}>
                  {activeFileSize || (activeResumeUrl ? 'Ready to Submit' : 'Upload PDF/DOC or use profile resume')}
                </Text>
              </View>

              {activeResumeUrl ? (
                <View style={styles.resumeActionsCol}>
                  <View style={styles.readyBadgePill}>
                    <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                    <Text style={styles.readyBadgeText}>Attached</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeResumeBtn}
                    onPress={handleDeleteResume}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {/* Upload Buttons */}
            <View style={styles.resumeButtonsRow}>
              <TouchableOpacity
                style={styles.uploadFileBtn}
                onPress={handlePickFile}
                activeOpacity={0.85}
              >
                <Ionicons name="cloud-upload" size={17} color="#FFFFFF" />
                <Text style={styles.uploadFileBtnText}>
                  {activeResumeUrl ? 'Change Resume File 📄' : 'Upload Resume File (PDF / DOC)'}
                </Text>
              </TouchableOpacity>

              {savedResumeUrl ? (
                <TouchableOpacity
                  style={[styles.savedResumeBtn, !useCustomUpload && styles.savedResumeBtnActive]}
                  onPress={handleSelectSavedResume}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name={!useCustomUpload ? 'checkmark-circle' : 'person-circle-outline'} 
                    size={16} 
                    color={!useCustomUpload ? '#4F46E5' : '#64748B'} 
                  />
                  <Text style={[styles.savedResumeBtnText, !useCustomUpload && styles.savedResumeBtnTextActive]}>
                    Use Saved Profile Resume
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Portfolio / LinkedIn / Drive Link */}
            <View style={[styles.inputGroup, { marginTop: 12, marginBottom: 0 }]}>
              <Text style={styles.label}>Portfolio / LinkedIn / Drive Link (Optional)</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="globe-outline" size={16} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  value={portfolioUrl}
                  onChangeText={setPortfolioUrl}
                  placeholder="https://linkedin.com/in/... or portfolio link"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          {/* ── Section 4: Cover Note (Max 100 words) ── */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionNumberCircle}>
              <Text style={styles.sectionNumberText}>4</Text>
            </View>
            <Text style={styles.sectionTitle}>COVER NOTE (MAX 100 WORDS)</Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.coverHeaderRow}>
              <Text style={styles.label}>Note / Pitch to Hiring Team</Text>
              <View style={[styles.wordBadge, coverWordCount >= 100 ? styles.wordBadgeLimit : null]}>
                <Ionicons 
                  name={coverWordCount >= 100 ? "alert-circle" : "document-text-outline"} 
                  size={12} 
                  color={coverWordCount >= 100 ? "#DC2626" : "#4F46E5"} 
                />
                <Text style={[styles.wordBadgeText, coverWordCount >= 100 ? styles.wordBadgeTextLimit : null]}>
                  {coverWordCount} / 100 words
                </Text>
              </View>
            </View>

            <TextInput
              style={[
                styles.coverLetterInput,
                coverWordCount >= 100 && styles.coverLetterInputLimit
              ]}
              value={coverLetter}
              onChangeText={handleCoverLetterChange}
              placeholder="Why are you a great fit for this job? (Briefly explain your key strengths and experience in under 100 words)..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
            />

            <View style={styles.coverFooterRow}>
              {coverWordCount >= 100 ? (
                <Text style={styles.wordLimitWarning}>
                  ⚠️ Maximum 100 words limit reached. Please keep it concise.
                </Text>
              ) : (
                <Text style={styles.wordCounterHint}>
                  {100 - coverWordCount} words remaining
                </Text>
              )}
            </View>
          </View>

          {/* ── Trust Banner ── */}
          <View style={styles.trustBanner}>
            <Ionicons name="shield-checkmark" size={16} color="#059669" />
            <Text style={styles.trustBannerText}>
              Free application • Your verified details are shared directly with {job?.company || 'the hiring team'}.
            </Text>
          </View>

          {/* ── Primary Submit Button ── */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && { opacity: 0.75 }]}
            onPress={handleSubmitApplication}
            disabled={submitting}
            activeOpacity={0.88}
          >
            {submitting ? (
              <View style={styles.submittingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Submitting Application...</Text>
              </View>
            ) : (
              <View style={styles.submittingRow}>
                <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Submit Application Now 🚀</Text>
              </View>
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
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
    fontWeight: '600',
  },

  // ── Header Bar ──
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    paddingHorizontal: 14,
    backgroundColor: '#4F46E5',
    borderBottomWidth: 1,
    borderBottomColor: '#4338CA',
  },
  headerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingRight: 10,
  },
  headerBackText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  stepBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // ── Scroll Content ──
  scrollContent: {
    padding: 14,
  },

  // ── Target Job Summary Banner ──
  jobBannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  jobBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 40,
    height: 40,
  },
  logoFallback: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoFallbackText: {
    fontSize: 19,
    fontWeight: '900',
    color: '#4F46E5',
  },
  jobInfoCol: {
    flex: 1,
  },
  jobTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  companyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  companyNameText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  jobBannerDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  jobMetaPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  salaryPill: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  salaryPillText: {
    color: '#059669',
    fontWeight: '800',
  },
  typePill: {
    backgroundColor: '#EEF2FF',
    borderColor: '#E0E7FF',
  },
  typePillText: {
    color: '#4F46E5',
  },

  // ── Section Headers ──
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionNumberCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionNumberText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#475569',
  },

  // ── Form Cards ──
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  requiredStar: {
    color: '#EF4444',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputField: {
    flex: 1,
    height: 42,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },

  // ── Selectable Chips ──
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  chipItem: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  chipItemActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#4F46E5',
    fontWeight: '800',
  },

  // ── Skills Management ──
  skillsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  skillsCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366F1',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  noSkillsNotice: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    padding: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  noSkillsText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  skillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  skillBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#3730A3',
  },
  addSkillInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingLeft: 10,
    paddingRight: 5,
    paddingVertical: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  addSkillIcon: {
    marginRight: 6,
  },
  addSkillTextInput: {
    flex: 1,
    height: 38,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    paddingVertical: 0,
  },
  addSkillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 13,
    height: 32,
    borderRadius: 7,
    justifyContent: 'center',
  },
  addSkillBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  addSkillBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  bioInput: {
    height: 70,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 10,
    textAlignVertical: 'top',
  },

  // ── Resume Box ──
  resumeCardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 11,
    marginBottom: 10,
  },
  resumeCardBoxEmpty: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  resumeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumeFileName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  resumeFileSize: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '600',
  },
  resumeActionsCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  readyBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  readyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  removeResumeBtn: {
    padding: 3,
  },
  resumeButtonsRow: {
    gap: 8,
  },
  uploadFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4F46E5',
    paddingVertical: 10.5,
    borderRadius: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadFileBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  savedResumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 8,
    borderRadius: 10,
  },
  savedResumeBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  savedResumeBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  savedResumeBtnTextActive: {
    color: '#4F46E5',
  },

  // ── Cover Letter ──
  coverHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  wordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
  },
  wordBadgeLimit: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  wordBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#4F46E5',
  },
  wordBadgeTextLimit: {
    color: '#DC2626',
  },
  coverLetterInput: {
    height: 95,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
    lineHeight: 18,
  },
  coverLetterInputLimit: {
    borderColor: '#F87171',
    backgroundColor: '#FFFBFB',
  },
  coverFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 5,
  },
  wordLimitWarning: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '700',
  },
  wordCounterHint: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },

  // ── Trust Banner ──
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  trustBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
    lineHeight: 15,
  },

  // ── Primary Submit Button ──
  submitButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
});
