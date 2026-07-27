import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { jobService, Job } from '@/services/jobs/jobService';
import { lmsService } from '@/services/lms/lmsService';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { formatLocation } from '@/utils';
import { db } from '@/services/firebase/config';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';

interface JobDetailsProps {
  jobId: string;
  onBack: () => void;
  onApplyPress: (jobId: string) => void;
}

export const JobDetails: React.FC<JobDetailsProps> = ({
  jobId,
  onBack,
  onApplyPress,
}) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [job, setJob] = useState<Job | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isJobsVisible, setIsJobsVisible] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'lms_config', 'tabs_visibility'), (snap) => {
      if (snap.exists()) {
        setIsJobsVisible(snap.data().jobs !== false);
      }
    }, (err) => {
      console.warn('JobDetails visibility listener error:', err);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubscribeJob = onSnapshot(
      doc(db, 'jobs', jobId),
      (docSnap) => {
        if (docSnap.exists()) {
          setJob({ id: docSnap.id, ...docSnap.data() } as Job);
        }
        setLoading(false);
      },
      async (err) => {
        console.warn('Error listening to job doc:', err);
        const details = await jobService.getJobById(jobId);
        setJob(details);
        setLoading(false);
      }
    );

    let unsubscribeUser: (() => void) | undefined;
    let unsubscribeApps: (() => void) | undefined;

    if (user) {
      unsubscribeUser = onSnapshot(
        doc(db, 'users', user.uid),
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const savedList: string[] = data.savedJobIds || data.savedJobs || [];
            setIsSaved(savedList.includes(jobId));
          }
        },
        (err) => console.error('Error listening to user saved jobs in JobDetails:', err)
      );

      const appsQ = query(collection(db, 'job_applications'), where('applicantId', '==', user.uid), where('jobId', '==', jobId));
      unsubscribeApps = onSnapshot(
        appsQ,
        (snapshot) => {
          setHasApplied(!snapshot.empty);
        },
        (err) => console.error('Error listening to applications in JobDetails:', err)
      );
    }

    return () => {
      unsubscribeJob();
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeApps) unsubscribeApps();
    };
  }, [jobId, user]);

  const toggleSaveJob = async () => {
    if (!user) return;
    const newSavedState = !isSaved;
    setIsSaved(newSavedState);
    try {
      await lmsService.toggleBookmarkJob(user.uid, jobId, isSaved);
      Alert.alert(
        newSavedState ? '🎉 Job Saved' : 'Job Removed',
        newSavedState ? 'Job saved to your bookmarks.' : 'Job removed from your bookmarks.'
      );
    } catch (e) {
      console.warn('Failed to toggle save job:', e);
    }
  };

  const handleShareJob = async () => {
    if (!job) return;
    try {
      const appPackageUrl = `https://play.google.com/store/apps/details?id=com.lmsjobportal1.app`;
      const jobLink = `${appPackageUrl}&referrer=job_id%3D${job.id}`;
      const deepLink = `lmsjobportal://job/${job.id}`;

      const shareMsg = `💼 *Job Opening: ${job.title}*\n\n🏢 Company: ${job.company}\n📍 Location: ${formatLocation(job.location)}\n💰 Salary: ${job.salaryRange || 'Best in Industry'}\n💼 Type: ${job.type || 'Full-time'}\n\n📱 *Open & Apply to Job in App*:\n${jobLink}\n\n📲 Direct App Deep-Link:\n${deepLink}\n\n📲 Download LMS Job Portal App on Play Store:\n${appPackageUrl}\n\nApply now on LMS Job Portal App!`;

      if (Platform.OS === 'android') {
        await Share.share({
          message: shareMsg,
          title: `${job.title} at ${job.company}`,
        });
      } else {
        await Share.share({
          message: shareMsg,
          url: jobLink,
          title: `${job.title} at ${job.company}`,
        });
      }
    } catch (e: any) {
      console.warn('Share job error:', e.message);
    }
  };

  if (!job) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" />
        ) : (
          <>
            <Text style={[styles.errorText, { color: colors.text }]}>Job details could not be found.</Text>
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
              <Text style={styles.backBtnText}>Go Back</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  const isSeeker = user?.role === 'seeker';
  const isRecruiter = user?.role === 'recruiter';
  const initial = job.company ? job.company.charAt(0).toUpperCase() : 'J';
  const hasLogo = job.logoUrl && job.logoUrl.startsWith('http');

  if (!isJobsVisible && !isRecruiter) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]} edges={['top']}>
        <Ionicons name="lock-closed-outline" size={64} color="#9CA3AF" />
        <Text style={{ color: '#1F2937', marginTop: 16, fontSize: 16, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 24 }}>
          Job details are temporarily restricted because the job portal is disabled by the administrator.
        </Text>
      </SafeAreaView>
    );
  }

  const requirementsList = Array.isArray(job.requirements) ? job.requirements : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Navigation Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack} style={styles.headerBackButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
          <Text style={[styles.headerBackText, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          Job Details
        </Text>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShareJob} style={styles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="share-social-outline" size={20} color={colors.text} />
          </TouchableOpacity>

          {isSeeker && (
            <TouchableOpacity onPress={toggleSaveJob} style={styles.headerIconBtn} activeOpacity={0.7}>
              <Ionicons 
                name={isSaved ? 'heart' : 'heart-outline'} 
                size={20} 
                color={isSaved ? '#EF4444' : colors.text} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {/* Company & Job Card Header */}
        <View style={styles.heroCard}>
          <View style={styles.logoShadow}>
            {hasLogo ? (
              <Image source={{ uri: job.logoUrl }} style={styles.logo} resizeMode="cover" />
            ) : (
              <View style={[styles.avatarCircle, { backgroundColor: '#4F46E5' }]}>
                <Text style={styles.avatarLetter}>{initial}</Text>
              </View>
            )}
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{job.title}</Text>
          
          <View style={styles.companyRow}>
            <View style={styles.companyBadge}>
              <Text style={styles.companyText}>{job.company}</Text>
            </View>
            <View style={styles.hiringBadge}>
              <View style={styles.hiringDot} />
              <Text style={styles.hiringText}>Actively Hiring</Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={15} color="#64748B" />
            <Text style={styles.locationText}>{formatLocation(job.location)}</Text>
          </View>
        </View>

        {/* Highlight Quick Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="cash-outline" size={18} color="#4F46E5" />
            </View>
            <Text style={styles.statLabel}>SALARY</Text>
            <Text style={[styles.statValue, { color: '#10B981' }]} numberOfLines={1}>
              {job.salaryRange || 'Best Pay'}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="briefcase-outline" size={18} color="#10B981" />
            </View>
            <Text style={styles.statLabel}>JOB TYPE</Text>
            <Text style={styles.statValue} numberOfLines={1}>{job.type || 'Full-time'}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="school-outline" size={18} color="#D97706" />
            </View>
            <Text style={styles.statLabel}>EXPERIENCE</Text>
            <Text style={styles.statValue} numberOfLines={1}>{job.experienceLevel || 'Entry'}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="people-outline" size={18} color="#9333EA" />
            </View>
            <Text style={styles.statLabel}>APPLICANTS</Text>
            <Text style={styles.statValue} numberOfLines={1}>{job.applicantsCount || 0} Applied</Text>
          </View>
        </View>

        {/* Job Description Block */}
        <View style={styles.contentSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About the Role</Text>
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>
              {job.description || 'No detailed description provided for this position.'}
            </Text>
          </View>

          {/* Key Requirements Block */}
          {requirementsList.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 12 }]}>
                Key Requirements
              </Text>
              <View style={styles.requirementsContainer}>
                {requirementsList.map((req, index) => (
                  <View key={index} style={styles.requirementItem}>
                    <View style={styles.checkWrap}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                    <Text style={styles.requirementText}>{req}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Company Perks Highlights */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 12 }]}>
            Role Highlights & Perks
          </Text>
          <View style={styles.perksRow}>
            <View style={styles.perkChip}>
              <Ionicons name="time-outline" size={14} color="#4F46E5" />
              <Text style={styles.perkChipText}>Flexible Hours</Text>
            </View>
            <View style={styles.perkChip}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#10B981" />
              <Text style={styles.perkChipText}>Health Insurance</Text>
            </View>
            <View style={styles.perkChip}>
              <Ionicons name="trending-up-outline" size={14} color="#9333EA" />
              <Text style={styles.perkChipText}>Career Growth</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom, height: 76 + insets.bottom }]}>
        <View style={styles.applicantsInfo}>
          <Ionicons name="people" size={16} color="#64748B" />
          <Text style={styles.applicantsText}>
            {job.applicantsCount || 0} applicants
          </Text>
        </View>

        {isSeeker ? (
          <TouchableOpacity
            style={[styles.applyPrimaryBtn, hasApplied && styles.appliedBtn]}
            onPress={() => onApplyPress(job.id)}
            disabled={hasApplied}
            activeOpacity={0.85}
          >
            <Ionicons
              name={hasApplied ? 'checkmark-circle' : 'paper-plane'}
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.applyBtnText}>
              {hasApplied ? 'Applied ✓' : 'Apply Now'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.recruiterBadge}>
            <Text style={styles.recruiterBadgeTxt}>Recruiter View Only</Text>
          </View>
        )}
      </View>
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
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  headerBackText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scrollContent: {
    padding: 12,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  logoShadow: {
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 8,
  },
  logo: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 22,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  companyBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  companyText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '800',
  },
  hiringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  hiringDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  hiringText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    alignItems: 'flex-start',
  },
  statIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.4,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  contentSection: {
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 7,
  },
  descriptionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  descriptionText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  requirementsContainer: {
    gap: 6,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  checkWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  requirementText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },
  perksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  perkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  perkChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  applicantsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  applicantsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  applyPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 16,
    elevation: 3,
  },
  appliedBtn: {
    backgroundColor: '#10B981',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  recruiterBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  recruiterBadgeTxt: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
});
