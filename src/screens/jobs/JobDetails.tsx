import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { jobService, Job } from '@/services/jobs/jobService';
import { lmsService } from '@/services/lms/lmsService';
import { Button } from '@/components/common/Button';
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
            const savedList: string[] = data.savedJobIds || [];
            setIsSaved(savedList.includes(jobId));
          }
        },
        (err) => console.error('Error listening to user saved jobs in JobDetails:', err)
      );

      const appsQ = query(collection(db, 'applications'), where('seekerId', '==', user.uid), where('jobId', '==', jobId));
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
        newSavedState ? 'Job Saved' : 'Job Unsaved',
        newSavedState ? 'Job saved to bookmarks.' : 'Job removed from bookmarks.'
      );
    } catch (e) {
      console.warn('Failed to toggle save job:', e);
    }
  };

  if (!job) {
    return (
      <View style={[styles.container, styles.center]}>
        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" />
        ) : (
          <>
            <Text style={styles.errorText}>Job details could not be found.</Text>
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
              <Text style={styles.backBtnText}>Go Back</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  const isSeeker = user?.role === 'seeker';
  const initial = job.company ? job.company.charAt(0).toUpperCase() : 'J';
  const hasLogo = job.logoUrl && job.logoUrl.startsWith('http');

  const isRecruiter = user?.role === 'recruiter';

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Position Details
        </Text>
        {isSeeker && (
          <TouchableOpacity onPress={toggleSaveJob} style={styles.saveBtn}>
            <Ionicons 
              name={isSaved ? 'heart' : 'heart-outline'} 
              size={24} 
              color={isSaved ? '#EF4444' : '#6B7280'} 
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {/* Company Header Block */}
        <View style={styles.cardHeader}>
          <View style={styles.logoShadow}>
            {hasLogo ? (
              <Image source={{ uri: job.logoUrl }} style={styles.logo} />
            ) : (
              <View style={[styles.avatarCircle, { backgroundColor: '#4F46E5' }]}>
                <Text style={styles.avatarLetter}>{initial}</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{job.title}</Text>
          <Text style={styles.company}>{job.company}</Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color="#6B7280" />
            <Text style={styles.location}>{formatLocation(job.location)}</Text>
          </View>
        </View>

        {/* Highlights Row */}
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>JOB TYPE</Text>
            <Text style={styles.badgeValue}>{job.type}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>EXPERIENCE</Text>
            <Text style={styles.badgeValue}>{job.experienceLevel}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>SALARY</Text>
            <Text style={[styles.badgeValue, styles.salaryValue]}>{job.salaryRange || 'Competitive'}</Text>
          </View>
        </View>

        {/* Description & Requirements */}
        <View style={styles.bodyContent}>
          <Text style={styles.sectionTitle}>Job Description</Text>
          <Text style={styles.description}>{job.description}</Text>

          <Text style={styles.sectionTitle}>Key Requirements</Text>
          {job.requirements.map((req, index) => (
            <View key={index} style={styles.requirementRow}>
              <View style={styles.checkmarkWrap}>
                <Ionicons name="checkmark-circle" size={16} color="#4F46E5" />
              </View>
              <Text style={styles.requirementText}>{req}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom, height: 80 + insets.bottom }]}>
        <View style={styles.applicantsInfo}>
          <Ionicons name="people" size={16} color="#6B7280" />
          <Text style={styles.applicantsText}>
            {job.applicantsCount || 0} applicants
          </Text>
        </View>
        
        {isSeeker ? (
          <Button
            title={hasApplied ? 'Applied ✓' : 'Apply Now'}
            onPress={() => onApplyPress(job.id)}
            disabled={hasApplied}
            style={[styles.actionBtn, hasApplied && styles.appliedBtn]}
          />
        ) : (
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>Recruiter View Only</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  iconButton: {
    paddingRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
  },
  saveBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  cardHeader: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logoShadow: {
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 16,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 10,
  },
  company: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '700',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  badge: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
  },
  badgeLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  badgeValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '800',
  },
  salaryValue: {
    color: '#059669',
  },
  bodyContent: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 12,
  },
  description: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 24,
    fontWeight: '500',
  },
  requirementRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
    alignItems: 'flex-start',
  },
  checkmarkWrap: {
    marginTop: 2,
  },
  requirementText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    flex: 1,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  applicantsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  applicantsText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
  },
  actionBtn: {
    flex: 1,
    marginLeft: 24,
    maxWidth: 150,
    borderRadius: 14,
    height: 48,
  },
  appliedBtn: {
    backgroundColor: '#10B981',
  },
  infoBox: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  infoBoxText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
  },
});
