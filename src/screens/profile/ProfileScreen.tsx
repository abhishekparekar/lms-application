import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { jobService, JobApplication } from '@/services/jobs/jobService';
import { db } from '@/services/firebase/config';
import { collection, doc, onSnapshot, query, where, getDocs, setDoc } from 'firebase/firestore';

// Profile Wizard Steps
import { Step1Personal } from './SeekerProfileBuilder/Step1Personal';
import { Step2Summary } from './SeekerProfileBuilder/Step2Summary';
import { Step3Experience } from './SeekerProfileBuilder/Step3Experience';
import { Step4Education } from './SeekerProfileBuilder/Step4Education';
import { Step5Aadhar } from './SeekerProfileBuilder/Step5Aadhar';
import { Step6Skills } from './SeekerProfileBuilder/Step6Skills';
import { Step7Resume } from './SeekerProfileBuilder/Step7Resume';
import { Step8Preferences } from './SeekerProfileBuilder/Step8Preferences';

const { width: SW } = Dimensions.get('window');

interface ProfileScreenProps {
  onStartProfileBuilder: () => void;
  onViewSubscription: () => void;
  onViewCertificates: () => void;
  onLogout: () => void;
  onSavedJobsPress?: () => void;
  onPostJobPress?: () => void;
}

type Section = 'home' | 'builder';

const STEP_LABELS = [
  'Personal',
  'Summary',
  'Experience',
  'Education',
  'Aadhaar',
  'Skills',
  'Resume',
  'Preferences',
];

const PRESET_AVATARS = [
  { id: '1', name: 'Tech Lead', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' },
  { id: '2', name: 'Creative Designer', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
  { id: '3', name: 'Product Manager', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80' },
  { id: '4', name: 'Software Engineer', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80' },
  { id: '5', name: 'UX Lead', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80' },
  { id: '6', name: 'Architect', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80' },
];

// ── Completeness ring (SVG-free using border trick) ──────────
const CompletenessRing: React.FC<{ pct: number }> = ({ pct }) => {
  const clampedPct = Math.min(100, Math.max(0, pct));
  const color =
    clampedPct >= 80 ? '#10B981' : clampedPct >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <View style={ring.wrap}>
      <View style={[ring.outer, { borderColor: color + '30' }]}>
        <View style={[ring.inner, { borderColor: color }]}>
          <Text style={[ring.pctText, { color }]}>{clampedPct}%</Text>
          <Text style={ring.pctLabel}>Complete</Text>
        </View>
      </View>
    </View>
  );
};

const ring = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: 4 },
  outer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctText: { fontSize: 18, fontWeight: '900' },
  pctLabel: { fontSize: 9, color: '#6B7280', fontWeight: '700', marginTop: 1 },
});

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onViewSubscription,
  onViewCertificates,
  onLogout,
  onSavedJobsPress,
  onPostJobPress,
}) => {
  const { user, updateProfile, switchRoleMode } = useAuth();
  const isSeeker = user?.role === 'seeker';
  const completeness = user?.profileCompleteness ?? 0;

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [isJobsVisible, setIsJobsVisible] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'lms_config', 'tabs_visibility'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setIsJobsVisible(data.jobs !== false);
        }
      },
      (err) => {
        console.warn('Error fetching tabs visibility in ProfileScreen:', err);
      }
    );
    return () => unsub();
  }, []);

  // ── Modals state ────────────────────────────────────────
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [recruiterApps, setRecruiterApps] = useState<JobApplication[]>([]);
  const [recruiterAppsLoading, setRecruiterAppsLoading] = useState(false);
  const [recruiterAppsModalVisible, setRecruiterAppsModalVisible] = useState(false);
  const [companyFromCollection, setCompanyFromCollection] = useState<any>(null);

  // ── Wizard state ────────────────────────────────────────
  const [section, setSection] = useState<Section>('home');
  const [step, setStep] = useState(1);
  const [profileLoading, setProfileLoading] = useState(false);

  const [wizardData, setWizardData] = useState({
    fullName: user?.seekerProfile?.fullName || user?.displayName || '',
    phone: user?.seekerProfile?.phone || '',
    bio: user?.seekerProfile?.bio || '',
    education: user?.seekerProfile?.education || [],
    experience: user?.seekerProfile?.experience || [],
    aadharNumber: '',
    birthYear: '',
    skills: user?.seekerProfile?.skills || [],
    resumeUrl: user?.seekerProfile?.resumeUrl || '',
    locationPreference: '',
    jobTypePreference: 'Full-time',
    expectedSalary: '',
  });

  // ── Quick Edit Local Inputs ─────────────────────────────
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBio, setEditBio] = useState('');

  // Recruiter Profile Editor states
  const [recruiterDisplayName, setRecruiterDisplayName] = useState('');
  const [recruiterCompanyName, setRecruiterCompanyName] = useState('');
  const [recruiterIndustry, setRecruiterIndustry] = useState('');
  const [recruiterPosition, setRecruiterPosition] = useState('');
  const [recruiterWebsite, setRecruiterWebsite] = useState('');
  const [recruiterBio, setRecruiterBio] = useState('');
  const [recruiterEditModalVisible, setRecruiterEditModalVisible] = useState(false);

  const openRecruiterEdit = () => {
    const dbComp = companyFromCollection;
    const dbUser = user?.recruiterProfile;
    setRecruiterDisplayName(user?.displayName || '');
    setRecruiterCompanyName(dbComp?.name || dbComp?.companyName || dbUser?.companyName || '');
    setRecruiterIndustry(dbComp?.industry || dbUser?.industry || '');
    setRecruiterPosition(dbComp?.position || dbUser?.position || '');
    setRecruiterWebsite(dbComp?.website || dbComp?.companyWebsite || dbUser?.companyWebsite || '');
    setRecruiterBio(dbComp?.bio || dbComp?.description || dbUser?.bio || '');
    setRecruiterEditModalVisible(true);
  };

  const saveRecruiterEdit = async () => {
    if (!user) return;
    setProfileLoading(true);
    try {
      await updateProfile({
        displayName: recruiterDisplayName.trim(),
        recruiterProfile: {
          companyName: recruiterCompanyName.trim(),
          industry: recruiterIndustry.trim(),
          position: recruiterPosition.trim(),
          companyWebsite: recruiterWebsite.trim(),
          bio: recruiterBio.trim(),
        }
      });

      // Save to 'companies' collection for web sync
      await setDoc(doc(db, 'companies', user.uid), {
        userId: user.uid,
        name: recruiterCompanyName.trim(),
        companyName: recruiterCompanyName.trim(),
        industry: recruiterIndustry.trim(),
        website: recruiterWebsite.trim(),
        companyWebsite: recruiterWebsite.trim(),
        position: recruiterPosition.trim(),
        bio: recruiterBio.trim(),
        description: recruiterBio.trim(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      Alert.alert('Success 🎉', 'Company profile details updated successfully.');
      setRecruiterEditModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not update company profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Sync state on load
  useEffect(() => {
    if (user) {
      setWizardData({
        fullName: user.seekerProfile?.fullName || user.displayName || '',
        phone: user.seekerProfile?.phone || '',
        bio: user.seekerProfile?.bio || '',
        education: user.seekerProfile?.education || [],
        experience: user.seekerProfile?.experience || [],
        aadharNumber: '',
        birthYear: '',
        skills: user.seekerProfile?.skills || [],
        resumeUrl: user.seekerProfile?.resumeUrl || '',
        locationPreference: '',
        jobTypePreference: 'Full-time',
        expectedSalary: '',
      });
    }
  }, [user]);

  // Load applications history
  const fetchApplications = async () => {
    if (!user) return;
    setAppsLoading(true);
    try {
      const apps = await jobService.getSeekerApplications(user.uid);
      setApplications(apps);
    } catch (e) {
      console.warn('Could not fetch applications', e);
    } finally {
      setAppsLoading(false);
    }
  };

  useEffect(() => {
    if (isSeeker && user?.uid) {
      fetchApplications();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSeeker, user?.uid]);

  useEffect(() => {
    if (!user || isSeeker) return;

    const unsubscribeCompany = onSnapshot(
      doc(db, 'companies', user.uid),
      (snap) => {
        if (snap.exists()) {
          setCompanyFromCollection(snap.data());
        } else {
          const q = query(collection(db, 'companies'), where('userId', '==', user.uid));
          getDocs(q).then((querySnap) => {
            if (!querySnap.empty) {
              setCompanyFromCollection(querySnap.docs[0].data());
            }
          });
        }
      },
      (err) => console.error('Company profile listener error:', err)
    );

    return () => unsubscribeCompany();
  }, [user, isSeeker]);

  const fetchRecruiterApps = async () => {
    if (!user) return;
    setRecruiterAppsLoading(true);
    try {
      const apps = await jobService.getRecruiterJobApplications(user.uid);
      if (apps.length === 0) {
        setRecruiterApps([
          {
            id: 'app-demo-1',
            jobId: 'job-1',
            jobTitle: 'Junior React Native Developer',
            company: 'Tech Solutions Inc.',
            seekerId: 'demo-seeker-uid',
            appliedDate: new Date().toISOString().split('T')[0],
            status: 'pending',
          },
          {
            id: 'app-demo-2',
            jobId: 'job-2',
            jobTitle: 'Senior Mobile Engineer (iOS & Android)',
            company: 'InnovateTech Corp',
            seekerId: 'demo-seeker-uid-2',
            appliedDate: new Date().toISOString().split('T')[0],
            status: 'reviewing',
          }
        ]);
      } else {
        setRecruiterApps(apps);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setRecruiterAppsLoading(false);
    }
  };

  const handleUpdateAppStatus = async (
    appId: string,
    newStatus: 'pending' | 'reviewing' | 'interviewing' | 'accepted' | 'rejected'
  ) => {
    try {
      await jobService.updateApplicationStatus(appId, newStatus);
      setRecruiterApps(prev =>
        prev.map(app => (app.id === appId ? { ...app, status: newStatus } : app))
      );
      Alert.alert('Status Updated', `Application status is now set to ${newStatus.toUpperCase()}`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not update status');
    }
  };

  // ── Finish wizard ────────────────────────────────────────
  const handleFinishWizard = async (finalPrefs: {
    locationPreference: string;
    jobTypePreference: string;
    expectedSalary: string;
  }) => {
    if (!user) return;
    setProfileLoading(true);
    try {
      const full = { ...wizardData, ...finalPrefs };
      let pct = 0;
      if (full.fullName && full.phone) pct += 20;
      if (full.bio && full.bio.trim().length > 10) pct += 10;
      if (full.experience && full.experience.length > 0) pct += 10;
      if (full.education && full.education.length > 0) pct += 15;
      if (full.aadharNumber) pct += 10;
      if (full.skills && full.skills.length > 0) pct += 15;
      if (full.resumeUrl) pct += 10;
      if (full.locationPreference && full.expectedSalary) pct += 10;

      await updateProfile({
        displayName: full.fullName,
        profileCompleted: true,
        profileCompleteness: pct,
        seekerProfile: {
          fullName: full.fullName,
          phone: full.phone,
          bio: full.bio,
          education: full.education,
          experience: full.experience,
          skills: full.skills,
          resumeUrl: full.resumeUrl,
        },
      });
      Alert.alert('🎉 Profile Saved!', `Your profile is ${pct}% complete. Great job!`);
      setSection('home');
      setStep(1);
    } catch (e: any) {
      Alert.alert('Save Failed', e.message || 'Could not update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Save Quick Edit Form ────────────────────────────────
  const saveQuickEdit = async () => {
    if (!user) return;
    setProfileLoading(true);
    try {
      const updatedSeekerProfile = {
        ...(user.seekerProfile || {}),
        fullName: editName,
        phone: editPhone,
        bio: editBio,
      };

      // Simple re-check score for what changed
      let newScore = 0;
      if (editName && editPhone) newScore += 20;
      if (editBio && editBio.trim().length > 10) newScore += 10;
      if ((user.seekerProfile?.experience || []).length > 0) newScore += 10;
      if ((user.seekerProfile?.education || []).length > 0) newScore += 15;
      if (user.seekerProfile?.resumeUrl) newScore += 10;
      // Add general placeholder scores for others if filled before
      if (completeness >= 80) {
        newScore = Math.max(newScore + 45, 80); // Keep old weightings if they were complete
      }

      await updateProfile({
        displayName: editName,
        profileCompleteness: Math.min(100, Math.max(completeness, newScore)),
        seekerProfile: updatedSeekerProfile as any,
      });

      Alert.alert('✅ Profile Updated', 'Your profile details have been saved successfully.');
      setEditModalVisible(false);
    } catch (e: any) {
      Alert.alert('Update Failed', e.message || 'Could not update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Image Preset Selection ──────────────────────────────
  const selectAvatar = async (url: string) => {
    if (!user) return;
    try {
      await updateProfile({
        avatarUrl: url,
      });
      setAvatarModalVisible(false);
    } catch {
      Alert.alert('Error', 'Could not save profile picture.');
    }
  };

  // ── Simulated Image Upload from Library ──────────────────
  const simulateImageUpload = () => {
    setUploadingImage(true);
    setTimeout(async () => {
      setUploadingImage(false);
      // Pick a random gorgeous portrait URL as simulation
      const randomId = Math.floor(Math.random() * 100);
      const url = `https://randomuser.me/api/portraits/men/${randomId}.jpg`;
      await selectAvatar(url);
      Alert.alert('🎉 Success', 'Image uploaded successfully from your device library.');
    }, 2000);
  };

  const openQuickEdit = () => {
    setEditName(user?.seekerProfile?.fullName || user?.displayName || '');
    setEditPhone(user?.seekerProfile?.phone || '');
    setEditBio(user?.seekerProfile?.bio || '');
    setEditModalVisible(true);
  };

  // ── Builder steps ────────────────────────────────────────
  const renderBuilderStep = () => {
    switch (step) {
      case 1:
        return (
          <Step1Personal
            initialData={{ fullName: wizardData.fullName, phone: wizardData.phone }}
            onNext={(d) => { setWizardData({ ...wizardData, ...d }); setStep(2); }}
          />
        );
      case 2:
        return (
          <Step2Summary
            initialData={{ bio: wizardData.bio }}
            onBack={() => setStep(1)}
            onNext={(d) => { setWizardData({ ...wizardData, ...d }); setStep(3); }}
          />
        );
      case 3:
        return (
          <Step3Experience
            initialData={wizardData.experience}
            onBack={() => setStep(2)}
            onNext={(d) => { setWizardData({ ...wizardData, experience: d }); setStep(4); }}
          />
        );
      case 4:
        return (
          <Step4Education
            initialData={wizardData.education}
            onBack={() => setStep(3)}
            onNext={(d) => { setWizardData({ ...wizardData, education: d }); setStep(5); }}
          />
        );
      case 5:
        return (
          <Step5Aadhar
            initialData={{ aadharNumber: wizardData.aadharNumber, birthYear: wizardData.birthYear }}
            onBack={() => setStep(4)}
            onNext={(d) => { setWizardData({ ...wizardData, ...d }); setStep(6); }}
          />
        );
      case 6:
        return (
          <Step6Skills
            initialData={wizardData.skills}
            onBack={() => setStep(5)}
            onNext={(d) => { setWizardData({ ...wizardData, skills: d }); setStep(7); }}
          />
        );
      case 7:
        return (
          <Step7Resume
            initialData={{ resumeUrl: wizardData.resumeUrl }}
            onBack={() => setStep(6)}
            onNext={(d) => { setWizardData({ ...wizardData, ...d }); setStep(8); }}
          />
        );
      case 8:
        return (
          <Step8Preferences
            initialData={{
              locationPreference: wizardData.locationPreference,
              jobTypePreference: wizardData.jobTypePreference,
              expectedSalary: wizardData.expectedSalary,
            }}
            onBack={() => setStep(7)}
            onSubmit={handleFinishWizard}
            loading={profileLoading}
          />
        );
      default:
        return <View />;
    }
  };

  if (section === 'builder') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.builderHeader}>
          <TouchableOpacity
            style={styles.builderBackBtn}
            onPress={() => {
              if (step > 1) setStep(step - 1);
              else setSection('home');
            }}
          >
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </TouchableOpacity>
          <View style={styles.builderHeaderCenter}>
            <Text style={styles.builderHeaderTitle}>Profile Builder</Text>
            <Text style={styles.builderHeaderSub}>
              Step {step} of 8 — {STEP_LABELS[step - 1]}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.builderCloseBtn}
            onPress={() => { setSection('home'); setStep(1); }}
          >
            <Ionicons name="close" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(step / 8) * 100}%` as any }]} />
        </View>

        {/* Step dots */}
        <View style={styles.stepDots}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => {
            const done = s < step;
            const active = s === step;
            return (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  done && styles.stepDotDone,
                  active && styles.stepDotActive,
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={11} color="#fff" />
                ) : (
                  <Text style={[styles.stepDotText, (done || active) && { color: '#fff' }]}>
                    {s}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Step content */}
        <View style={{ flex: 1 }}>{renderBuilderStep()}</View>
      </SafeAreaView>
    );
  }

  // ── Main Home UI Details ──────────────────────────────────
  // Guard: if user is not loaded yet, render nothing
  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      </SafeAreaView>
    );
  }

  const formatMemberSince = (createdAt: any) => {
    if (!createdAt) return '—';
    try {
      if (createdAt && typeof createdAt === 'object' && 'seconds' in createdAt) {
        return new Date(createdAt.seconds * 1000).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      }
      if (createdAt && typeof createdAt.toDate === 'function') {
        return createdAt.toDate().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      }
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      }
    } catch (e) {
      console.warn('Date formatting error:', e);
    }
    return '—';
  };

  const nameForInitials = isSeeker 
    ? (user?.seekerProfile?.fullName || user?.displayName || 'U')
    : (user?.recruiterProfile?.companyName || user?.displayName || 'U');

  const initials = nameForInitials
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const skills: string[] = user?.seekerProfile?.skills || [];
  const hasResume = !!user?.seekerProfile?.resumeUrl;
  const hasExp = (user?.seekerProfile?.experience || []).length > 0;
  const hasEdu = (user?.seekerProfile?.education || []).length > 0;

  // Info rows for quick summary
  const infoItems = [
    { icon: 'mail-outline' as const, label: 'Email', value: user?.email || '—' },
    { 
      icon: 'call-outline' as const, 
      label: 'Phone', 
      value: (isSeeker ? user?.seekerProfile?.phone : (user?.recruiterProfile as any)?.phone) || (user as any)?.phone || 'Not added' 
    },
    {
      icon: 'calendar-outline' as const,
      label: 'Member Since',
      value: formatMemberSince(user?.createdAt),
    },
    { icon: 'shield-checkmark-outline' as const, label: 'Account', value: user?.role === 'recruiter' ? 'Recruiter' : 'Job Seeker' },
  ];

  // Menu sections
  const seekerMenu = [
    {
      title: 'Career Tools',
      items: [
        {
          icon: 'construct-outline' as const,
          label: user?.profileCompleted ? 'Edit Profile Builder' : 'Start Profile Builder',
          sub: user?.profileCompleted ? 'Update your professional profile' : '8 quick steps to get hired',
          color: '#4F46E5',
          onPress: () => { setStep(1); setSection('builder'); },
        },
        ...(isJobsVisible ? [{
          icon: 'bookmark-outline' as const,
          label: 'Saved Jobs',
          sub: 'View bookmarked opportunities',
          color: '#D97706',
          onPress: onSavedJobsPress || (() => Alert.alert('Saved Jobs', 'No saved jobs yet.')),
        }] : []),
        {
          icon: 'ribbon-outline' as const,
          label: 'My Certificates',
          sub: 'View earned certificates',
          color: '#DB2777',
          onPress: onViewCertificates,
        },
      ],
    },
    {
      title: 'Account & Plans',
      items: [
        {
          icon: 'card-outline' as const,
          label: 'Subscription Plans',
          sub: isJobsVisible ? 'Upgrade to apply unlimited jobs' : 'Upgrade your learning plan limits',
          color: '#7C3AED',
          onPress: onViewSubscription,
        },
        {
          icon: 'help-circle-outline' as const,
          label: 'Help & Support',
          sub: 'Contact our team',
          color: '#6B7280',
          onPress: () => Alert.alert('Support', 'Email: support@jobskill.in'),
        },
      ],
    },
  ];

  const recruiterMenu = [
    {
      title: 'Hiring Tools',
      items: [
        {
          icon: 'briefcase-outline' as const,
          label: 'Post a Job',
          sub: 'Create a new job listing',
          color: '#4F46E5',
          onPress: onPostJobPress || (() => Alert.alert('Post Job', 'Please access this via the Employer Home page.')),
        },
        {
          icon: 'people-outline' as const,
          label: 'View Applicants',
          sub: 'Review job applications',
          color: '#059669',
          onPress: () => {
            fetchRecruiterApps();
            setRecruiterAppsModalVisible(true);
          },
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          icon: 'card-outline' as const,
          label: 'Subscription Plans',
          sub: 'Upgrade your recruiter plan',
          color: '#7C3AED',
          onPress: onViewSubscription,
        },
      ],
    },
  ];

  const adminSection = {
    title: 'Admin View Options',
    items: [
      {
        icon: 'swap-horizontal-outline' as const,
        label: isSeeker ? 'Switch to Employer Mode' : 'Switch to Seeker Mode',
        sub: `Change view to ${isSeeker ? 'Employer/Recruiter' : 'Jobseeker'} mode`,
        color: '#8B5CF6',
        onPress: () => {
          if (switchRoleMode) {
            const target = isSeeker ? 'recruiter' : 'seeker';
            switchRoleMode(target);
            Alert.alert('View Mode Switched 🔄', `You are now viewing the application as a ${target === 'seeker' ? 'Jobseeker' : 'Employer (Recruiter)'}.`);
          }
        }
      }
    ]
  };

  const menu = [
    ...((user?.originalRole === 'superadmin' || user?.originalRole === 'admin' || user?.role === 'admin') ? [adminSection] : []),
    ...(isSeeker ? seekerMenu : recruiterMenu)
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Header ─────────────────────────────────── */}
        <View style={styles.heroHeader}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.avatarEditBtn}
              onPress={() => setAvatarModalVisible(true)}
            >
              <Ionicons name="camera" size={13} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Name + Role */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <Text style={styles.heroName}>
              {isSeeker 
                ? (user?.seekerProfile?.fullName || user?.displayName || 'Seeker User') 
                : (user?.displayName || 'Employer Account')}
            </Text>
            {!isSeeker && (
              <Ionicons name="checkmark-circle" size={18} color="#4F46E5" style={{ marginTop: 2 }} />
            )}
          </View>
          <Text style={styles.heroEmail}>{user?.email || 'email@example.com'}</Text>
          <View
            style={[styles.roleBadge, isSeeker ? styles.roleBadgeSeeker : styles.roleBadgeRecruiter]}
          >
            <Ionicons
              name={isSeeker ? 'school' : 'business'}
              size={12}
              color={isSeeker ? '#4F46E5' : '#059669'}
            />
            <Text style={[styles.roleBadgeText, isSeeker ? { color: '#4F46E5' } : { color: '#059669' }]}>
              {isSeeker ? 'Job Seeker' : 'Recruiter'}
            </Text>
          </View>
        </View>

        {/* ── Seeker Stats strip ────────────────────────────── */}
        {isSeeker && (
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              {/* Completeness Ring */}
              <CompletenessRing pct={completeness} />

              <View style={styles.statsDivider} />

              {/* Quick stats */}
              <View style={styles.statsRight}>
                <View style={styles.statRow}>
                  <Ionicons name="briefcase-outline" size={14} color="#4F46E5" />
                  <Text style={styles.statRowText}>
                    {hasExp
                      ? `${(user?.seekerProfile?.experience || []).length} Experience(s)`
                      : 'No experience added'}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Ionicons name="school-outline" size={14} color="#059669" />
                  <Text style={styles.statRowText}>
                    {hasEdu
                      ? `${(user?.seekerProfile?.education || []).length} Education(s)`
                      : 'No education added'}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Ionicons name="document-text-outline" size={14} color="#D97706" />
                  <Text style={styles.statRowText}>
                    {hasResume ? 'Resume Uploaded ✓' : 'Resume not uploaded'}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Ionicons name="code-slash-outline" size={14} color="#DB2777" />
                  <Text style={styles.statRowText}>
                    {skills.length > 0 ? `${skills.length} Skills` : 'No skills added'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Completeness bar */}
            {completeness < 100 && (
              <TouchableOpacity
                style={styles.completeNudge}
                onPress={() => { setStep(1); setSection('builder'); }}
                activeOpacity={0.85}
              >
                <Ionicons name="rocket-outline" size={15} color="#4F46E5" />
                <Text style={styles.completeNudgeText}>
                  {completeness === 0
                    ? 'Start Profile Builder to get hired!'
                    : completeness < 80
                    ? `${80 - completeness}% more needed to apply for jobs`
                    : `${100 - completeness}% more to reach 100%`}
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#4F46E5" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Applied Jobs History Section ─────────────────── */}
        {isSeeker && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Applied Jobs History ({applications.length})</Text>
              <TouchableOpacity onPress={fetchApplications} style={styles.refreshBtn}>
                <Ionicons name="refresh" size={16} color="#4F46E5" />
              </TouchableOpacity>
            </View>

            {appsLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#4F46E5" />
                <Text style={styles.loadingText}>Loading applications...</Text>
              </View>
            ) : applications.length === 0 ? (
              <View style={styles.emptyAppsCard}>
                <Ionicons name="briefcase-outline" size={28} color="#9CA3AF" />
                <Text style={styles.emptyAppsTitle}>No Applications Yet</Text>
                <Text style={styles.emptyAppsSub}>Apply to jobs and they will be listed here.</Text>
              </View>
            ) : (
              <View style={styles.appsList}>
                {applications.map((app) => {
                  const statusColors: Record<string, { bg: string, txt: string }> = {
                    pending: { bg: '#FEF3C7', txt: '#D97706' },
                    reviewing: { bg: '#EEF2FF', txt: '#4F46E5' },
                    interviewing: { bg: '#F3E8FF', txt: '#7C3AED' },
                    accepted: { bg: '#D1FAE5', txt: '#059669' },
                    rejected: { bg: '#FEE2E2', txt: '#DC2626' },
                  };
                  const colors = statusColors[app.status] || { bg: '#F3F4F6', txt: '#374151' };

                  return (
                    <View key={app.id} style={styles.appCard}>
                      <View style={styles.appCardHeader}>
                        <View style={styles.appCompanyLogo}>
                          <Text style={styles.logoLetter}>
                            {app.company ? app.company[0].toUpperCase() : 'J'}
                          </Text>
                        </View>
                        <View style={styles.appHeaderInfo}>
                          <Text style={styles.appJobTitle} numberOfLines={1}>{app.jobTitle || 'Job'}</Text>
                          <Text style={styles.appCompanyName}>{app.company || '—'}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                          <Text style={[styles.statusText, { color: colors.txt }]}>
                            {(app.status || 'pending').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.appCardFooter}>
                        <View style={styles.appDateRow}>
                          <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
                          <Text style={styles.appDateText}>Applied on {app.appliedDate}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ── Skills preview ──────────────────────────────── */}
        {isSeeker && skills.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Skills</Text>
              <TouchableOpacity onPress={() => { setStep(6); setSection('builder'); }}>
                <Text style={styles.sectionEdit}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.skillsWrap}>
              {skills.slice(0, 8).map((sk) => (
                <View key={sk} style={styles.skillChip}>
                  <Text style={styles.skillChipText}>{sk}</Text>
                </View>
              ))}
              {skills.length > 8 && (
                <View style={[styles.skillChip, styles.skillChipMore]}>
                  <Text style={styles.skillChipText}>+{skills.length - 8} more</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── About Me / Bio ───────────────────────────────── */}
        {isSeeker && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>About Me</Text>
              <TouchableOpacity onPress={openQuickEdit}>
                <View style={styles.editRow}>
                  <Ionicons name="create-outline" size={14} color="#4F46E5" />
                  <Text style={styles.sectionEdit}>Edit Info</Text>
                </View>
              </TouchableOpacity>
            </View>
            {user?.seekerProfile?.bio ? (
              <Text style={styles.bioText}>{user.seekerProfile.bio}</Text>
            ) : (
              <TouchableOpacity style={styles.emptyBioCard} onPress={openQuickEdit}>
                <Ionicons name="add-circle-outline" size={18} color="#4F46E5" />
                <Text style={styles.emptyBioText}>Write professional summary</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Recruiter Company Profile details ──────────────── */}
        {!isSeeker && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Company Profile Details</Text>
              <TouchableOpacity onPress={openRecruiterEdit} activeOpacity={0.7}>
                <View style={styles.editRow}>
                  <Ionicons name="create-outline" size={14} color="#4F46E5" />
                  <Text style={styles.sectionEdit}>Edit Details</Text>
                </View>
              </TouchableOpacity>
            </View>
            
            <View style={styles.recruiterProfileCard}>
              <View style={styles.recruiterProfileRow}>
                <View style={[styles.recruiterProfileIconBg, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="business" size={16} color="#4F46E5" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recruiterProfileLabel}>Company Name</Text>
                  <Text style={styles.recruiterProfileValue}>
                    {companyFromCollection?.name || companyFromCollection?.companyName || user?.recruiterProfile?.companyName || 'Not Set'}
                  </Text>
                </View>
              </View>

              <View style={styles.recruiterProfileRow}>
                <View style={[styles.recruiterProfileIconBg, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="construct" size={16} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recruiterProfileLabel}>Industry Sector</Text>
                  <Text style={styles.recruiterProfileValue}>
                    {companyFromCollection?.industry || user?.recruiterProfile?.industry || 'Not Set'}
                  </Text>
                </View>
              </View>

              <View style={styles.recruiterProfileRow}>
                <View style={[styles.recruiterProfileIconBg, { backgroundColor: '#FFF7ED' }]}>
                  <Ionicons name="person" size={16} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recruiterProfileLabel}>Your Designation / Position</Text>
                  <Text style={styles.recruiterProfileValue}>
                    {companyFromCollection?.position || user?.recruiterProfile?.position || 'Not Set'}
                  </Text>
                </View>
              </View>

              <View style={styles.recruiterProfileRow}>
                <View style={[styles.recruiterProfileIconBg, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="globe" size={16} color="#4F46E5" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recruiterProfileLabel}>Company Website</Text>
                  {(() => {
                    const url = companyFromCollection?.website || companyFromCollection?.companyWebsite || user?.recruiterProfile?.companyWebsite;
                    if (url) {
                      return (
                        <TouchableOpacity
                          onPress={() => {
                            const formattedUrl = url.startsWith('http') ? url : 'https://' + url;
                            Linking.openURL(formattedUrl).catch(() => {
                              Alert.alert('Error', 'Invalid website URL format.');
                            });
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.recruiterProfileValue, { color: '#4F46E5', textDecorationLine: 'underline' }]}>
                            {url}
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                    return (
                      <Text style={[styles.recruiterProfileValue, { color: '#9CA3AF', fontStyle: 'italic' }]}>
                        Not Set
                      </Text>
                    );
                  })()}
                </View>
              </View>

              <View style={[styles.recruiterProfileRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <View style={[styles.recruiterProfileIconBg, { backgroundColor: '#F5F3FF', alignSelf: 'flex-start', marginTop: 2 }]}>
                  <Ionicons name="information-circle" size={16} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recruiterProfileLabel}>Company Bio / Summary</Text>
                  {(() => {
                    const bio = companyFromCollection?.bio || companyFromCollection?.description || user?.recruiterProfile?.bio;
                    return (
                      <Text style={[
                        styles.recruiterProfileValue,
                        !bio && { color: '#9CA3AF', fontStyle: 'italic' }
                      ]}>
                        {bio || 'No company bio description set yet.'}
                      </Text>
                    );
                  })()}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Account Info summary ─────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Info</Text>
          {infoItems.map((item) => (
            <View key={item.label} style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Ionicons name={item.icon} size={16} color="#4F46E5" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Menu sections ───────────────────────────────── */}
        {menu.map((group) => (
          <View key={group.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{group.title}</Text>
            <View style={styles.menuCard}>
              {group.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.menuItem,
                    idx < group.items.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIconWrap, { backgroundColor: item.color + '15' }]}>
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <View style={styles.menuTextBlock}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Text style={styles.menuSub}>{item.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* ── Logout ──────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() =>
            Alert.alert('Logout', 'Are you sure you want to log out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Logout', style: 'destructive', onPress: onLogout },
            ])
          }
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>JobSkill v1.1 · © 2026</Text>
      </ScrollView>

      {/* ── MODAL: Preset Avatar Selector & Simulated Uploader ── */}
      <Modal
        visible={avatarModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Profile Photo</Text>
              <TouchableOpacity onPress={() => setAvatarModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.avatarModalContent}>
              <TouchableOpacity 
                style={styles.uploadLibraryBtn} 
                onPress={simulateImageUpload}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={20} color="#ffffff" />
                    <Text style={styles.uploadLibraryText}>Upload from Phone Gallery</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.avatarPresetsTitle}>Choose from Presets</Text>
              <View style={styles.presetsGrid}>
                {PRESET_AVATARS.map((preset) => (
                  <TouchableOpacity
                    key={preset.id}
                    style={styles.presetItem}
                    onPress={() => selectAvatar(preset.url)}
                  >
                    <Image source={{ uri: preset.url }} style={styles.presetImage} />
                    <Text style={styles.presetName}>{preset.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: Quick Info Editor ── */}
      <Modal
        visible={editModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile Info</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.editModalContent}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your full name"
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>About Me / Bio</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Briefly summarize your skills & experience"
                multiline
                numberOfLines={4}
              />

              <View style={styles.editActionRow}>
                <TouchableOpacity
                  style={[styles.editBtnCancel, styles.editBtnHalf]}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.editBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editBtnSave, styles.editBtnHalf]}
                  onPress={saveQuickEdit}
                >
                  <Text style={styles.editBtnSaveText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: Recruiter Company Profile Editor ── */}
      <Modal
        visible={recruiterEditModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setRecruiterEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Company Profile</Text>
              <TouchableOpacity onPress={() => setRecruiterEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.editModalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Full Name / Your Name</Text>
              <TextInput
                style={styles.textInput}
                value={recruiterDisplayName}
                onChangeText={setRecruiterDisplayName}
                placeholder="e.g. Ram Shinde"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Company Name</Text>
              <TextInput
                style={styles.textInput}
                value={recruiterCompanyName}
                onChangeText={setRecruiterCompanyName}
                placeholder="e.g. SuperTech Solutions"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Industry Sector</Text>
              <TextInput
                style={styles.textInput}
                value={recruiterIndustry}
                onChangeText={setRecruiterIndustry}
                placeholder="e.g. IT Services / Software"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Your Designation / Role</Text>
              <TextInput
                style={styles.textInput}
                value={recruiterPosition}
                onChangeText={setRecruiterPosition}
                placeholder="e.g. Talent Acquisition Lead"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Company Website</Text>
              <TextInput
                style={styles.textInput}
                value={recruiterWebsite}
                onChangeText={setRecruiterWebsite}
                placeholder="e.g. www.supertech.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="url"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Company Description / Bio</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={recruiterBio}
                onChangeText={setRecruiterBio}
                placeholder="Describe your company services, core values and hiring domains..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={5}
              />

              <View style={styles.editActionRow}>
                <TouchableOpacity
                  style={[styles.editBtnCancel, styles.editBtnHalf]}
                  onPress={() => setRecruiterEditModalVisible(false)}
                >
                  <Text style={styles.editBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editBtnSave, styles.editBtnHalf, { backgroundColor: '#4F46E5' }]}
                  onPress={saveRecruiterEdit}
                >
                  <Text style={styles.editBtnSaveText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: Recruiter Applicant Viewer ── */}
      <Modal
        visible={recruiterAppsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRecruiterAppsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Received Job Applications</Text>
              <TouchableOpacity onPress={() => setRecruiterAppsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            {recruiterAppsLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#059669" />
                <Text style={styles.loadingText}>Fetching applicants...</Text>
              </View>
            ) : recruiterApps.length === 0 ? (
              <View style={styles.emptyAppsCard}>
                <Ionicons name="people-outline" size={32} color="#9CA3AF" />
                <Text style={styles.emptyAppsTitle}>No Applications Yet</Text>
                <Text style={styles.emptyAppsSub}>No candidate has applied to your listings yet.</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.editModalContent}>
                {recruiterApps.map((app) => {
                  const statusColors: Record<string, { bg: string; txt: string }> = {
                    pending:     { bg: '#FEF3C7', txt: '#D97706' },
                    reviewing:   { bg: '#EEF2FF', txt: '#4F46E5' },
                    interviewing:{ bg: '#F3E8FF', txt: '#7C3AED' },
                    accepted:    { bg: '#D1FAE5', txt: '#059669' },
                    rejected:    { bg: '#FEE2E2', txt: '#DC2626' },
                  };
                  const sc = statusColors[app.status] || { bg: '#F3F4F6', txt: '#374151' };

                  // Resolve candidate name from all possible web + mobile field names
                  const resolvedName =
                    app.candidateName ||
                    app.applicantName ||
                    app.name ||
                    app.fullName ||
                    app.seekerName ||
                    app.userName ||
                    '';

                  const EMPTY_NAMES = ['Candidate', 'Anonymous Candidate', 'Unknown Candidate', ''];
                  const candidateName = (!EMPTY_NAMES.includes(resolvedName))
                    ? resolvedName
                    // Fallback: use email prefix or phone
                    : app.candidateEmail
                      ? app.candidateEmail.split('@')[0]
                      : app.candidatePhone
                        ? `Candidate (${app.candidatePhone})`
                        : app.seekerId
                          ? `Applicant #${String(app.seekerId).slice(-6)}`
                          : 'Candidate';

                  const initials = candidateName
                    .split(' ').filter(Boolean).map((w: string) => (w[0] || '').toUpperCase()).join('').slice(0, 2) || 'C';

                  return (
                    <View key={app.id} style={styles.recruiterAppCard}>
                      {/* Header row */}
                      <View style={styles.appCardHeader}>
                        <View style={[styles.appCompanyLogo, { backgroundColor: sc.bg }]}>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: sc.txt }}>{initials}</Text>
                        </View>
                        <View style={styles.appHeaderInfo}>
                          <Text style={styles.appJobTitle} numberOfLines={1}>{candidateName}</Text>
                          <Text style={styles.appCompanyName} numberOfLines={1}>
                            Applied: {app.jobTitle || 'Unknown Job'}
                          </Text>
                          <Text style={styles.appDateText}>
                            📅 {app.appliedDate || 'N/A'}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                          <Text style={[styles.statusText, { color: sc.txt }]}>
                            {(app.status || 'pending').toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      {/* Contact pills row */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {app.candidateEmail ? (
                          <TouchableOpacity
                            onPress={() => Linking.openURL('mailto:' + app.candidateEmail)}
                            style={styles.contactInfoPill}
                          >
                            <Ionicons name="mail" size={11} color="#4F46E5" />
                            <Text style={[styles.contactInfoText, { color: '#4F46E5' }]} numberOfLines={1}>
                              {app.candidateEmail}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                        {app.candidatePhone ? (
                          <TouchableOpacity
                            onPress={() => Linking.openURL('tel:' + app.candidatePhone)}
                            style={[styles.contactInfoPill, { backgroundColor: '#ECFDF5' }]}
                          >
                            <Ionicons name="call" size={11} color="#059669" />
                            <Text style={[styles.contactInfoText, { color: '#059669' }]}>
                              {app.candidatePhone}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                        {app.candidateLocation ? (
                          <View style={[styles.contactInfoPill, { backgroundColor: '#F3F4F6' }]}>
                            <Ionicons name="pin" size={11} color="#4B5563" />
                            <Text style={[styles.contactInfoText, { color: '#4B5563' }]}>
                              {app.candidateLocation}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Bio */}
                      {app.candidateBio ? (
                        <Text style={[styles.appDateText, { marginTop: 8, color: '#4B5563', lineHeight: 18 }]} numberOfLines={3}>
                          {app.candidateBio}
                        </Text>
                      ) : null}

                      {/* Skills */}
                      {app.candidateSkills && app.candidateSkills.length > 0 ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                          {app.candidateSkills.slice(0, 6).map((skill, i) => (
                            <View key={i} style={styles.skillChip}>
                              <Text style={styles.skillChipText}>{skill}</Text>
                            </View>
                          ))}
                          {app.candidateSkills.length > 6 ? (
                            <View style={[styles.skillChip, { backgroundColor: '#F1F5F9' }]}>
                              <Text style={styles.skillChipText}>+{app.candidateSkills.length - 6}</Text>
                            </View>
                          ) : null}
                        </View>
                      ) : null}

                      {/* Extra meta row */}
                      {(app.candidateExpectedSalary || app.candidateNoticePeriod) ? (
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                          {app.candidateExpectedSalary ? (
                            <View>
                              <Text style={{ fontSize: 9, color: '#9CA3AF', fontWeight: '800', textTransform: 'uppercase' }}>Expected Salary</Text>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>{app.candidateExpectedSalary}</Text>
                            </View>
                          ) : null}
                          {app.candidateNoticePeriod ? (
                            <View>
                              <Text style={{ fontSize: 9, color: '#9CA3AF', fontWeight: '800', textTransform: 'uppercase' }}>Notice Period</Text>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>{app.candidateNoticePeriod}</Text>
                            </View>
                          ) : null}
                        </View>
                      ) : null}

                      {/* Resume button */}
                      {app.resumeUrl ? (
                        <TouchableOpacity
                          style={styles.resumeViewBtn}
                          onPress={() => Linking.openURL(app.resumeUrl!).catch(() =>
                            Alert.alert('Error', 'Could not open resume link.')
                          )}
                        >
                          <Ionicons name="document-text-outline" size={14} color="#4B5563" />
                          <Text style={styles.resumeViewText}>View Resume / Portfolio</Text>
                        </TouchableOpacity>
                      ) : null}

                      {/* Status action buttons */}
                      <Text style={styles.statusSelectorLabel}>Update Application Status</Text>
                      <View style={styles.statusActionsRow}>
                        <TouchableOpacity
                          style={[styles.statusActionBtn, { backgroundColor: '#DBEAFE' }]}
                          onPress={() => handleUpdateAppStatus(app.id, 'reviewing')}
                        >
                          <Text style={[styles.statusActionText, { color: '#1E40AF' }]}>Review</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.statusActionBtn, { backgroundColor: '#F3E8FF' }]}
                          onPress={() => handleUpdateAppStatus(app.id, 'interviewing')}
                        >
                          <Text style={[styles.statusActionText, { color: '#6B21A8' }]}>Interview</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.statusActionBtn, { backgroundColor: '#D1FAE5' }]}
                          onPress={() => handleUpdateAppStatus(app.id, 'accepted')}
                        >
                          <Text style={[styles.statusActionText, { color: '#065F46' }]}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.statusActionBtn, { backgroundColor: '#FEE2E2' }]}
                          onPress={() => handleUpdateAppStatus(app.id, 'rejected')}
                        >
                          <Text style={[styles.statusActionText, { color: '#991B1B' }]}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FC' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  // ── Hero ──────────────────────────────────────────────────
  heroHeader: {
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatarCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#E0E7FF',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: { fontSize: 32, fontWeight: '900', color: '#4F46E5' },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  heroName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  heroEmail: { fontSize: 14, color: '#E0E7FF', marginBottom: 10, fontWeight: '500' },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeSeeker: { backgroundColor: 'rgba(255,255,255,0.2)' },
  roleBadgeRecruiter: { backgroundColor: '#10B981' },
  roleBadgeText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },

  // ── Stats card ────────────────────────────────────────────
  statsCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: -28,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 8,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statsDivider: { width: 1, height: 90, backgroundColor: '#F1F5F9', marginHorizontal: 16 },
  statsRight: { flex: 1, gap: 8 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statRowText: { fontSize: 12, color: '#334155', fontWeight: '600', flex: 1 },
  completeNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  completeNudgeText: { flex: 1, fontSize: 12, color: '#6D28D9', fontWeight: '800' },

  // ── Section ───────────────────────────────────────────────
  section: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionEdit: { fontSize: 12, color: '#4F46E5', fontWeight: '800', marginLeft: 4 },
  editRow: { flexDirection: 'row', alignItems: 'center' },
  refreshBtn: {
    padding: 4,
  },

  // ── Applied Jobs List ─────────────────────────────────────
  loadingBox: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    fontWeight: '600',
  },
  emptyAppsCard: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyAppsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyAppsSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  appsList: {
    gap: 12,
  },
  appCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  appCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appCompanyLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  logoLetter: {
    fontSize: 16,
    fontWeight: '900',
    color: '#475569',
  },
  appHeaderInfo: {
    flex: 1,
  },
  appJobTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  appCompanyName: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  appCardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    marginTop: 12,
    paddingTop: 10,
  },
  appDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appDateText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },

  // ── Skills ────────────────────────────────────────────────
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  skillChipMore: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  skillChipText: { fontSize: 12, color: '#4F46E5', fontWeight: '700' },

  // ── Info rows ─────────────────────────────────────────────
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  infoIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', marginBottom: 2, letterSpacing: 0.5 },
  infoValue: { fontSize: 14, color: '#1E293B', fontWeight: '700' },

  // ── Menu card ─────────────────────────────────────────────
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    minHeight: 72,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  menuIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuTextBlock: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  menuSub: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },

  // ── Bio ───────────────────────────────────────────────────
  bioText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    fontWeight: '500',
  },
  emptyBioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  emptyBioText: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '700',
  },

  // ── Logout ────────────────────────────────────────────────
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: '#FFF5F5',
  },
  logoutText: { color: '#EF4444', fontWeight: '800', fontSize: 15 },
  version: {
    textAlign: 'center',
    color: '#D1D5DB',
    fontSize: 11,
    marginTop: 16,
    fontWeight: '500',
  },

  // ── Builder screen ────────────────────────────────────────
  builderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  builderBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  builderHeaderCenter: { flex: 1, alignItems: 'center' },
  builderHeaderTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  builderHeaderSub: { fontSize: 11, color: '#6B7280', fontWeight: '600', marginTop: 2 },
  builderCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: { height: 4, backgroundColor: '#E5E7EB' },
  progressFill: { height: 4, backgroundColor: '#4F46E5' },
  stepDots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#4F46E5', transform: [{ scale: 1.15 }] },
  stepDotDone: { backgroundColor: '#10B981' },
  stepDotText: { fontSize: 11, fontWeight: '800', color: '#9CA3AF' },

  // ── Modals Styles ─────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '40%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  avatarModalContent: {
    padding: 20,
  },
  uploadLibraryBtn: {
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 24,
  },
  uploadLibraryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  avatarPresetsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  presetItem: {
    width: (SW - 72) / 3,
    alignItems: 'center',
    marginBottom: 16,
  },
  presetImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  presetName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 6,
  },

  // Direct edit Modal
  editModalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flex: 1,
    marginTop: 60,
  },
  editModalContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 14,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  editActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    gap: 12,
  },
  editBtnHalf: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnCancel: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  editBtnCancelText: {
    color: '#4B5563',
    fontWeight: '800',
    fontSize: 14,
  },
  editBtnSave: {
    backgroundColor: '#4F46E5',
  },
  editBtnSaveText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  recruiterAppCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  statusSelectorLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  statusActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusActionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusActionText: {
    fontSize: 11,
    fontWeight: '800',
  },
  recruiterProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
    gap: 16,
  },
  recruiterProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  recruiterProfileIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  recruiterProfileLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recruiterProfileValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
    lineHeight: 18,
  },
  contactInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexShrink: 1,
    maxWidth: '100%',
  },
  contactInfoText: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  resumeViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  resumeViewText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
});
