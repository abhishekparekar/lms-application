import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  BackHandler,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabs } from './BottomTabs';
import { CourseDetailsScreen } from '../screens/learning/CourseDetailsScreen';
import { VideoPlayerScreen } from '../screens/learning/VideoPlayerScreen';
import { TestSeriesScreen } from '../screens/learning/TestSeriesScreen';
import { JobDetails } from '../screens/jobs/JobDetails';
import { ApplyJob } from '../screens/jobs/ApplyJob';
import { SavedJobs } from '../screens/jobs/SavedJobs';
import { SubscriptionScreen } from '../screens/profile/SubscriptionScreen';
import { CertificateScreen } from '../screens/learning/CertificateScreen';
import { PostJob } from '../screens/jobs/PostJob';
import { useAuth } from '@/hooks/useAuth';
import { jobService } from '@/services/jobs/jobService';

// Seeker Profile Builder Steps
import { Step1Personal } from '../screens/profile/SeekerProfileBuilder/Step1Personal';
import { Step2Summary } from '../screens/profile/SeekerProfileBuilder/Step2Summary';
import { Step3Experience } from '../screens/profile/SeekerProfileBuilder/Step3Experience';
import { Step4Education } from '../screens/profile/SeekerProfileBuilder/Step4Education';
import { Step5Aadhar } from '../screens/profile/SeekerProfileBuilder/Step5Aadhar';
import { Step6Skills } from '../screens/profile/SeekerProfileBuilder/Step6Skills';
import { Step7Resume } from '../screens/profile/SeekerProfileBuilder/Step7Resume';
import { Step8Preferences } from '../screens/profile/SeekerProfileBuilder/Step8Preferences';

interface AppNavigatorProps {
  onLogout: () => void;
}

// ── Screen States ─────────────────────────────────────────────
type ScreenState =
  | { type: 'tabs' }
  | { type: 'course_details'; courseId: string }
  | { type: 'video_player'; courseId: string; lessonIndex: number }
  | { type: 'test_series'; courseId: string }
  | { type: 'job_details'; jobId: string }
  | { type: 'apply_job'; jobId: string }
  | { type: 'saved_jobs' }
  | { type: 'subscription' }
  | { type: 'certificates' }
  | { type: 'post_job'; editingJobId?: string }
  // Normal profile builder (from profile tab)
  | { type: 'profile_builder'; step: number }
  // Profile builder launched specifically before applying — remembers which job
  | { type: 'profile_builder_for_apply'; step: number; jobId: string };

const STEP_LABELS = [
  'Personal Info',
  'Professional Summary',
  'Experience',
  'Education',
  'Aadhaar Verification',
  'Skills',
  'Resume Upload',
  'Job Preferences',
];

// ─────────────────────────────────────────────────────────────
export const AppNavigator: React.FC<AppNavigatorProps> = ({ onLogout }) => {
  const { user, updateProfile } = useAuth();
  const [screen, setScreen] = useState<ScreenState>({ type: 'tabs' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [initialTab, setInitialTab] = useState<
    'dashboard' | 'learning' | 'jobs' | 'resume' | 'profile'
  >('dashboard');

  // ── Wizard data (shared between normal & pre-apply flows) ──
  const [wizardData, setWizardData] = useState({
    fullName: user?.displayName || '',
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

  // ── Android hardware back ──────────────────────────────────
  useEffect(() => {
    const backAction = () => {
      switch (screen.type) {
        case 'video_player':
        case 'test_series':
          setScreen({ type: 'course_details', courseId: (screen as any).courseId });
          return true;
        case 'apply_job':
          setScreen({ type: 'job_details', jobId: (screen as any).jobId });
          return true;
        case 'profile_builder':
          if ((screen as any).step > 1) {
            setScreen({ type: 'profile_builder', step: (screen as any).step - 1 });
          } else {
            setScreen({ type: 'tabs' });
          }
          return true;
        case 'profile_builder_for_apply':
          if ((screen as any).step > 1) {
            setScreen({ ...screen, step: (screen as any).step - 1 });
          } else {
            // Go back to the job details
            setScreen({ type: 'job_details', jobId: (screen as any).jobId });
          }
          return true;
        case 'course_details':
        case 'job_details':
        case 'saved_jobs':
        case 'subscription':
        case 'certificates':
        case 'post_job':
          setScreen({ type: 'tabs' });
          return true;
        default:
          return false;
      }
    };
    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [screen]);

  // ── Save profile & compute completeness ───────────────────
  const saveWizardProfile = async (
    finalPrefs: {
      locationPreference: string;
      jobTypePreference: string;
      expectedSalary: string;
    },
    afterJobId?: string, // if set, redirect to apply_job after saving
  ) => {
    if (!user) return;
    setProfileLoading(true);
    try {
      const full = { ...wizardData, ...finalPrefs };
      let pct = 0;
      // Step 1 — Personal Info: name + phone (20%)
      if (full.fullName && full.phone) pct += 20;
      // Step 2 — Professional Summary: bio (10%)
      if (full.bio && full.bio.trim().length > 10) pct += 10;
      // Step 3 — Experience (10%)
      if (full.experience && full.experience.length > 0) pct += 10;
      // Step 4 — Education (15%)
      if (full.education && full.education.length > 0) pct += 15;
      // Step 5 — Aadhaar (10%)
      if (full.aadharNumber) pct += 10;
      // Step 6 — Skills (15%)
      if (full.skills && full.skills.length > 0) pct += 15;
      // Step 7 — Resume (10%)
      if (full.resumeUrl) pct += 10;
      // Step 8 — Job Preferences (10%)
      if (full.locationPreference && full.expectedSalary) pct += 10;
      // Total possible = 100%

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

      if (afterJobId) {
        // Profile was built specifically to apply → go straight to apply
        Alert.alert(
          'Profile Complete!',
          `Your profile is ${pct}% complete. You can now apply for this job!`,
          [
            {
              text: 'Apply Now',
              onPress: () => setScreen({ type: 'apply_job', jobId: afterJobId }),
            },
          ],
        );
      } else {
        Alert.alert('Profile Saved!', `Your profile is ${pct}% complete.`);
        setScreen({ type: 'tabs' });
      }
    } catch (e: any) {
      Alert.alert('Save Failed', e.message || 'Could not update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Render one step (works for both builder modes) ─────────
  const renderStep = (
    step: number,
    mode: 'profile_builder' | 'profile_builder_for_apply',
    jobId?: string,
  ) => {
    const goStep = (s: number) => {
      if (mode === 'profile_builder_for_apply' && jobId) {
        setScreen({ type: 'profile_builder_for_apply', step: s, jobId });
      } else {
        setScreen({ type: 'profile_builder', step: s });
      }
    };

    switch (step) {
      case 1:
        return (
          <Step1Personal
            initialData={{ fullName: wizardData.fullName, phone: wizardData.phone }}
            onNext={(d) => { setWizardData({ ...wizardData, ...d }); goStep(2); }}
          />
        );
      case 2:
        return (
          <Step2Summary
            initialData={{ bio: wizardData.bio }}
            onBack={() => goStep(1)}
            onNext={(d) => { setWizardData({ ...wizardData, ...d }); goStep(3); }}
          />
        );
      case 3:
        return (
          <Step3Experience
            initialData={wizardData.experience}
            onBack={() => goStep(2)}
            onNext={(d) => { setWizardData({ ...wizardData, experience: d }); goStep(4); }}
          />
        );
      case 4:
        return (
          <Step4Education
            initialData={wizardData.education}
            onBack={() => goStep(3)}
            onNext={(d) => { setWizardData({ ...wizardData, education: d }); goStep(5); }}
          />
        );
      case 5:
        return (
          <Step5Aadhar
            initialData={{ aadharNumber: wizardData.aadharNumber, birthYear: wizardData.birthYear }}
            onBack={() => goStep(4)}
            onNext={(d) => { setWizardData({ ...wizardData, ...d }); goStep(6); }}
          />
        );
      case 6:
        return (
          <Step6Skills
            initialData={wizardData.skills}
            onBack={() => goStep(5)}
            onNext={(d) => { setWizardData({ ...wizardData, skills: d }); goStep(7); }}
          />
        );
      case 7:
        return (
          <Step7Resume
            initialData={{ resumeUrl: wizardData.resumeUrl }}
            onBack={() => goStep(6)}
            onNext={(d) => { setWizardData({ ...wizardData, ...d }); goStep(8); }}
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
            onBack={() => goStep(7)}
            onSubmit={(prefs) => saveWizardProfile(prefs, jobId)}
            loading={profileLoading}
          />
        );
      default:
        return <View />;
    }
  };

  // ── Shared profile builder UI wrapper ─────────────────────
  const renderBuilderUI = (
    step: number,
    mode: 'profile_builder' | 'profile_builder_for_apply',
    jobId?: string,
  ) => {
    const onBack = () => {
      if (step > 1) {
        if (mode === 'profile_builder_for_apply' && jobId) {
          setScreen({ type: 'profile_builder_for_apply', step: step - 1, jobId });
        } else {
          setScreen({ type: 'profile_builder', step: step - 1 });
        }
      } else {
        if (mode === 'profile_builder_for_apply' && jobId) {
          setScreen({ type: 'job_details', jobId });
        } else {
          setScreen({ type: 'tabs' });
        }
      }
    };

    const onClose = () => {
      if (mode === 'profile_builder_for_apply' && jobId) {
        setScreen({ type: 'job_details', jobId });
      } else {
        setScreen({ type: 'tabs' });
      }
    };

    return (
      <SafeAreaView style={styles.builderSafe} edges={['top', 'bottom']}>
        {/* ── Top Banner (for apply mode) */}
        {mode === 'profile_builder_for_apply' && (
          <View style={styles.applyModeBanner}>
            <Ionicons name="briefcase" size={14} color="#ffffff" />
            <Text style={styles.applyModeBannerText}>
              Complete your profile to apply for this job
            </Text>
          </View>
        )}

        {/* ── Header */}
        <View style={styles.builderHeader}>
          <TouchableOpacity style={styles.builderNavBtn} onPress={onBack}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </TouchableOpacity>
          <View style={styles.builderHeaderCenter}>
            <Text style={styles.builderTitle}>Profile Builder</Text>
            <Text style={styles.builderSubtitle}>
              Step {step} of 8 — {STEP_LABELS[step - 1]}
            </Text>
          </View>
          <TouchableOpacity style={styles.builderNavBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* ── Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${(step / 8) * 100}%` as any },
              mode === 'profile_builder_for_apply' && styles.progressFillApply,
            ]}
          />
        </View>

        {/* ── Step indicator dots */}
        <View style={styles.stepRow}>
          {STEP_LABELS.map((label, i) => {
            const s = i + 1;
            const done = s < step;
            const active = s === step;
            return (
              <View key={s} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepDot,
                    done && styles.stepDotDone,
                    active && styles.stepDotActive,
                    mode === 'profile_builder_for_apply' && active && styles.stepDotApply,
                  ]}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  ) : (
                    <Text style={[styles.stepDotNum, (done || active) && { color: '#fff' }]}>
                      {s}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Step content */}
        <View style={styles.stepContent}>
          {renderStep(step, mode, jobId)}
        </View>
      </SafeAreaView>
    );
  };

  // ══════════════════════════════════════════════════════════
  // MAIN SWITCH
  // ══════════════════════════════════════════════════════════
  switch (screen.type) {

    // ── Tabs ─────────────────────────────────────────────────
    case 'tabs':
      return (
        <BottomTabs
          initialTab={initialTab}
          onTabChange={(tab: any) => setInitialTab(tab)}
          onCoursePress={(id) => setScreen({ type: 'course_details', courseId: id })}
          onWatchVideo={(cid, index) => setScreen({ type: 'video_player', courseId: cid, lessonIndex: index })}
          onJobPress={(id) => setScreen({ type: 'job_details', jobId: id })}
          onSavedJobsPress={() => setScreen({ type: 'saved_jobs' })}
          onStartProfileBuilder={() => setScreen({ type: 'profile_builder', step: 1 })}
          onViewSubscription={() => setScreen({ type: 'subscription' })}
          onViewCertificates={() => setScreen({ type: 'certificates' })}
          onLogout={onLogout}
          onPostJobPress={(editingJobId) => setScreen({ type: 'post_job', editingJobId })}
        />
      );

    // ── Course flows ─────────────────────────────────────────
    case 'course_details':
      return (
        <CourseDetailsScreen
          courseId={screen.courseId}
          onBack={() => setScreen({ type: 'tabs' })}
          onWatchVideo={(cid, index) =>
            setScreen({ type: 'video_player', courseId: cid, lessonIndex: index })
          }
          onTakeTest={(cid) => setScreen({ type: 'test_series', courseId: cid })}
        />
      );

    case 'video_player':
      return (
        <VideoPlayerScreen
          courseId={screen.courseId}
          lessonIndex={screen.lessonIndex}
          onBack={() =>
            setScreen({ type: 'course_details', courseId: screen.courseId })
          }
        />
      );

    case 'test_series':
      return (
        <TestSeriesScreen
          courseId={screen.courseId}
          onBack={() =>
            setScreen({ type: 'course_details', courseId: screen.courseId })
          }
          onFinishQuiz={(passed) => {
            if (passed) {
              setScreen({ type: 'certificates' });
            } else {
              setScreen({ type: 'course_details', courseId: screen.courseId });
            }
          }}
        />
      );

    // ── Job Details (with Apply gate) ────────────────────────
    case 'job_details':
      return (
        <JobDetails
          jobId={screen.jobId}
          onBack={() => setScreen({ type: 'tabs' })}
          onApplyPress={async (jid) => {
            // Direct apply — no restrictions or application limits
            setScreen({ type: 'apply_job', jobId: jid });
          }}
        />
      );

    // ── Apply Job ────────────────────────────────────────────
    case 'apply_job':
      return (
        <ApplyJob
          jobId={screen.jobId}
          onBack={() => setScreen({ type: 'job_details', jobId: screen.jobId })}
          onSuccess={() => setScreen({ type: 'tabs' })}
        />
      );

    // ── Saved Jobs ───────────────────────────────────────────
    case 'saved_jobs':
      return (
        <SavedJobs
          onBack={() => setScreen({ type: 'tabs' })}
          onJobPress={(id) => setScreen({ type: 'job_details', jobId: id })}
        />
      );

    // ── Misc screens ─────────────────────────────────────────
    case 'subscription':
      return <SubscriptionScreen onBack={() => setScreen({ type: 'tabs' })} />;

    case 'certificates':
      return <CertificateScreen onBack={() => setScreen({ type: 'tabs' })} />;

    // ── Profile Builder (from Profile tab) ───────────────────
    case 'profile_builder':
      return renderBuilderUI(screen.step, 'profile_builder');

    // ── Profile Builder (before applying for a job) ──────────
    case 'profile_builder_for_apply':
      return renderBuilderUI(
        screen.step,
        'profile_builder_for_apply',
        screen.jobId,
      );

    case 'post_job':
      return (
        <PostJob
          onBack={() => setScreen({ type: 'tabs' })}
          onSuccess={() => setScreen({ type: 'tabs' })}
          editingJobId={screen.editingJobId}
        />
      );

    default:
      return <View />;
  }
};

// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  builderSafe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  // Apply mode banner
  applyModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  applyModeBannerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Header
  builderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  builderNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  builderHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  builderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  builderSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
  },

  // Progress bar
  progressTrack: {
    height: 4,
    backgroundColor: '#E5E7EB',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#4F46E5',
  },
  progressFillApply: {
    backgroundColor: '#10B981', // green for apply mode
  },

  // Step dots row
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stepItem: {
    alignItems: 'center',
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#4F46E5',
    transform: [{ scale: 1.15 }],
  },
  stepDotApply: {
    backgroundColor: '#10B981', // green active dot in apply mode
  },
  stepDotDone: {
    backgroundColor: '#10B981',
  },
  stepDotNum: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
  },

  // Step content area
  stepContent: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
