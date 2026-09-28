import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { jobService, Job } from '@/services/jobs/jobService';
import { lmsService } from '@/services/lms/lmsService';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { formatLocation, formatJobSalary, getJobLogoUrl } from '@/utils';
import { db } from '@/services/firebase/config';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';

const safeText = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      try {
        return val.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch (e) {
        return '';
      }
    }
    if (val.seconds) {
      try {
        return new Date(val.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch (e) {
        return '';
      }
    }
    return '';
  }
  return String(val);
};

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

      const shareMsg = `💼 *Job Opening: ${job.title}*\n\n🏢 Company: ${job.company}\n📍 Location: ${formatLocation(job.location)}\n💰 Salary: ${formatJobSalary(job)}\n💼 Type: ${job.type || 'Full-time'}\n\n📱 *Open & Apply to Job in App*:\n${jobLink}\n\n📲 Direct App Deep-Link:\n${deepLink}\n\n📲 Download LMS Job Portal App on Play Store:\n${appPackageUrl}\n\nApply now on LMS Job Portal App!`;

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
  const logoUrl = getJobLogoUrl(job);
  const hasLogo = Boolean(logoUrl);

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

  const formattedLoc = formatLocation(job.location);
  const isRemote = formattedLoc.toLowerCase().includes('remote') || Boolean(job.locationDetails?.remote);
  const isHybrid = formattedLoc.toLowerCase().includes('hybrid') || Boolean(job.locationDetails?.hybrid);
  const workspaceText = isRemote ? 'Remote' : (isHybrid ? 'Hybrid' : (safeText(job.workMode) || 'On-Site'));

  const titleStr = safeText(job.title) || 'Job Opening';
  const companyStr = safeText(job.company) || 'Verified Employer';
  const salaryRangeStr = formatJobSalary(job);
  const jobTypeStr = safeText(job.type) || 'Full-time';
  const expRequiredStr = safeText(job.experienceRequired) || safeText(job.experienceLevel) || 'All Levels';
  const industryStr = safeText(job.industry) || safeText(job.department) || 'Corporate';
  const descriptionStr = safeText(job.description) || 'No detailed description provided for this job opening.';
  const deadlineStr = safeText(job.applicationDeadline);
  const instructionsStr = safeText(job.applicationInstructions);
  const postedDateStr = safeText(job.postedDate);

  const requirementsList = Array.isArray(job.requirements) 
    ? job.requirements.map(safeText).filter(r => Boolean(r && r !== 'No specific requirements listed.'))
    : [];

  const requiredSkillsList = Array.isArray(job.requiredSkills) 
    ? job.requiredSkills.map(safeText).filter(Boolean)
    : [];

  const preferredSkillsList = Array.isArray(job.preferredSkills) 
    ? job.preferredSkills.map(safeText).filter(Boolean)
    : [];

  const benefitsList = Array.isArray(job.benefits) 
    ? job.benefits.map(safeText).filter(Boolean)
    : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#4F46E5' }} edges={['top']}>
      <RNStatusBar barStyle="light-content" backgroundColor="#4F46E5" translucent={false} />
      <StatusBar style="light" />

      {/* ── Top Header Navigation ── */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack} style={styles.headerBackButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          <Text style={styles.headerBackText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          Job Details
        </Text>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShareJob} style={styles.headerIconBtn} activeOpacity={0.75}>
            <Ionicons name="share-social" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleSaveJob} style={styles.headerIconBtn} activeOpacity={0.75}>
            <Ionicons 
              name={isSaved ? 'bookmark' : 'bookmark-outline'} 
              size={18} 
              color={isSaved ? '#FDE047' : '#FFFFFF'} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Body Content ── */}
      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]} 
          showsVerticalScrollIndicator={false}
        >
          {/* ── Company Logo & Role Card (matches JobCard visual design) ── */}
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.logoWrap}>
                {hasLogo ? (
                  <Image source={{ uri: logoUrl }} style={styles.logoImage} resizeMode="contain" />
                ) : (
                  <View style={styles.logoFallback}>
                    <Text style={styles.logoFallbackText}>{initial}</Text>
                  </View>
                )}
              </View>

              <View style={styles.roleHeaderCol}>
                <Text style={styles.jobRoleTitle}>{titleStr}</Text>
                <View style={styles.companyMetaRow}>
                  <Ionicons name="business" size={13} color="#6366F1" />
                  <Text style={styles.companyNameText}>{companyStr}</Text>
                </View>
                {formattedLoc ? (
                  <View style={styles.locationMetaRow}>
                    <Ionicons name="location-sharp" size={13} color="#64748B" />
                    <Text style={styles.locationMetaText}>{formattedLoc}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Dynamic Status Badges */}
            <View style={styles.badgesWrap}>
              {job.urgent && (
                <View style={[styles.badgePill, styles.urgentBadge]}>
                  <Ionicons name="flash" size={11} color="#EF4444" />
                  <Text style={[styles.badgePillText, styles.urgentBadgeText]}>URGENT HIRING</Text>
                </View>
              )}
              {job.featured && (
                <View style={[styles.badgePill, styles.featuredBadge]}>
                  <Ionicons name="sparkles" size={11} color="#D97706" />
                  <Text style={[styles.badgePillText, styles.featuredBadgeText]}>FEATURED</Text>
                </View>
              )}
              <View style={[styles.badgePill, isRemote ? styles.remoteBadge : styles.neutralBadge]}>
                <Text style={[styles.badgePillText, isRemote ? styles.remoteBadgeText : styles.neutralBadgeText]}>
                  {workspaceText}
                </Text>
              </View>
              <View style={[styles.badgePill, styles.typeBadge]}>
                <Text style={[styles.badgePillText, styles.typeBadgeText]}>
                  {jobTypeStr}
                </Text>
              </View>
              {postedDateStr ? (
                <View style={[styles.badgePill, styles.neutralBadge]}>
                  <Ionicons name="calendar-outline" size={11} color="#64748B" />
                  <Text style={[styles.badgePillText, styles.neutralBadgeText]}>
                    {postedDateStr}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* ── Key Job Specs Grid ── */}
          <View style={styles.specsGrid}>
            <View style={styles.specCard}>
              <View style={[styles.specIconBox, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="cash" size={18} color="#059669" />
              </View>
              <Text style={styles.specLabel}>OFFERED SALARY</Text>
              <Text style={[styles.specValue, { color: '#059669' }]} numberOfLines={2}>
                {salaryRangeStr}
              </Text>
            </View>

            <View style={styles.specCard}>
              <View style={[styles.specIconBox, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="ribbon" size={18} color="#4F46E5" />
              </View>
              <Text style={styles.specLabel}>EXPERIENCE</Text>
              <Text style={styles.specValue} numberOfLines={2}>
                {expRequiredStr}
              </Text>
            </View>

            <View style={styles.specCard}>
              <View style={[styles.specIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="briefcase" size={18} color="#D97706" />
              </View>
              <Text style={styles.specLabel}>JOB TYPE</Text>
              <Text style={styles.specValue} numberOfLines={2}>
                {jobTypeStr}
              </Text>
            </View>

            <View style={styles.specCard}>
              <View style={[styles.specIconBox, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="business" size={18} color="#9333EA" />
              </View>
              <Text style={styles.specLabel}>INDUSTRY</Text>
              <Text style={styles.specValue} numberOfLines={2}>
                {industryStr}
              </Text>
            </View>
          </View>

          {/* ── Required Skills (if provided by recruiter) ── */}
          {requiredSkillsList.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>Required Skills & Expertise</Text>
              <View style={styles.skillsWrap}>
                {requiredSkillsList.map((skill, index) => (
                  <View key={`req-skill-${index}`} style={styles.skillPill}>
                    <Ionicons name="checkmark-circle" size={13} color="#4F46E5" />
                    <Text style={styles.skillPillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Preferred Skills (if provided by recruiter) ── */}
          {preferredSkillsList.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>Preferred / Good-to-Have Skills</Text>
              <View style={styles.skillsWrap}>
                {preferredSkillsList.map((skill, index) => (
                  <View key={`pref-skill-${index}`} style={styles.prefSkillPill}>
                    <Ionicons name="add-circle-outline" size={13} color="#64748B" />
                    <Text style={styles.prefSkillPillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── About the Role (Description) ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>About the Role</Text>
            <Text style={styles.descriptionBody}>
              {descriptionStr}
            </Text>
          </View>

          {/* ── Key Requirements (if provided by recruiter) ── */}
          {requirementsList.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>Role Requirements</Text>
              <View style={styles.requirementsListWrap}>
                {requirementsList.map((req, index) => (
                  <View key={`req-${index}`} style={styles.requirementRow}>
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                    <Text style={styles.requirementText}>{req}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Actual Benefits & Perks (ONLY if provided - NO demo data!) ── */}
          {benefitsList.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>Job Benefits & Perks</Text>
              <View style={styles.skillsWrap}>
                {benefitsList.map((benefit, index) => (
                  <View key={`benefit-${index}`} style={styles.benefitPill}>
                    <Ionicons name="gift-outline" size={14} color="#059669" />
                    <Text style={styles.benefitPillText}>{benefit}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Application Instructions / Deadline (if provided by recruiter) ── */}
          {(instructionsStr || deadlineStr) ? (
            <View style={[styles.sectionCard, styles.noticeCard]}>
              <View style={styles.noticeHeader}>
                <Ionicons name="information-circle" size={18} color="#D97706" />
                <Text style={styles.noticeHeading}>Application Notice</Text>
              </View>
              {deadlineStr ? (
                <Text style={styles.deadlineText}>
                  📅 Application Deadline: {deadlineStr}
                </Text>
              ) : null}
              {instructionsStr ? (
                <Text style={styles.instructionsText}>
                  {instructionsStr}
                </Text>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        {/* ── Sticky Bottom Bar: Salary summary & Apply Now Action ── */}
        <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.bottomSalaryCol}>
            <Text style={styles.bottomSalaryLabel}>SALARY</Text>
            <Text style={styles.bottomSalaryValue} numberOfLines={1}>
              {salaryRangeStr}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.applyBtn, hasApplied && styles.appliedBtn]}
            onPress={() => onApplyPress(job.id)}
            disabled={hasApplied}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={hasApplied ? 'Applied' : 'Apply Now'}
          >
            <Text style={styles.applyBtnText}>
              {hasApplied ? '✓ Applied' : 'Apply Now'}
            </Text>
            {!hasApplied && (
              <Ionicons name="arrow-forward" size={15} color="#FFFFFF" style={{ marginLeft: 4 }} />
            )}
          </TouchableOpacity>
        </View>
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

  // ── Header Bar
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 54,
    paddingHorizontal: 16,
    backgroundColor: '#4F46E5',
    borderBottomWidth: 1,
    borderBottomColor: '#4338CA',
  },
  headerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingRight: 8,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Scroll Content
  scrollContent: {
    padding: 14,
    gap: 12,
  },

  // ── Hero Card (matching JobCard)
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 48,
    height: 48,
  },
  logoFallback: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallbackText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4F46E5',
  },
  roleHeaderCol: {
    flex: 1,
  },
  jobRoleTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 22,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  companyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  companyNameText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#475569',
  },
  locationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationMetaText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },

  // ── Badges Wrap
  badgesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
  },
  badgePillText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  urgentBadge: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  urgentBadgeText: {
    color: '#EF4444',
  },
  featuredBadge: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  featuredBadgeText: {
    color: '#D97706',
  },
  typeBadge: {
    backgroundColor: '#EEF2FF',
    borderColor: '#E0E7FF',
  },
  typeBadgeText: {
    color: '#4F46E5',
  },
  remoteBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  remoteBadgeText: {
    color: '#059669',
  },
  neutralBadge: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  neutralBadgeText: {
    color: '#64748B',
  },

  // ── Specs Grid
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  specIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  specLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  specValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 17,
  },

  // ── Section Card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeading: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  descriptionBody: {
    fontSize: 13.5,
    lineHeight: 22,
    color: '#334155',
    fontWeight: '500',
  },

  // ── Skills & Benefits Chips
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
  },
  skillPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  prefSkillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
  },
  prefSkillPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  benefitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 20,
  },
  benefitPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },

  // ── Requirements List
  requirementsListWrap: {
    gap: 9,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  requirementText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },

  // ── Notice Box
  noticeCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  noticeHeading: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#92400E',
  },
  deadlineText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#78350F',
  },

  // ── Bottom Sticky Bar
  bottomActionBar: {
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
    paddingTop: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomSalaryCol: {
    flex: 1,
    paddingRight: 12,
  },
  bottomSalaryLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  bottomSalaryValue: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  appliedBtn: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  recruiterBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recruiterBadgeText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
});
