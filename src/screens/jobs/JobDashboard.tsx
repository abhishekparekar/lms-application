import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { jobService, Job } from '@/services/jobs/jobService';
import { lmsService } from '@/services/lms/lmsService';
import { JobCard } from '@/components/cards/JobCard';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/services/firebase/config';
import { collection, onSnapshot, doc, query, where } from 'firebase/firestore';
import { formatLocation } from '@/utils';

interface JobDashboardProps {
  onJobPress: (jobId: string) => void;
  onPostJobPress?: () => void;
  onSavedJobsPress: () => void;
  onRedirectToProfile?: () => void;
}

const JOB_TYPES = ['All', 'Full-time', 'Part-time', 'Contract', 'Internship'];
const WORKSPACE_MODES = ['All', 'Remote', 'Hybrid', 'Office'];

export const JobDashboard: React.FC<JobDashboardProps> = ({
  onJobPress,
  onPostJobPress,
  onSavedJobsPress,
  onRedirectToProfile,
}) => {
  const { user } = useAuth();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedWorkspace, setSelectedWorkspace] = useState('All');
  const [loading, setLoading] = useState(true);
  const [isJobsVisible, setIsJobsVisible] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'lms_config', 'tabs_visibility'), (snap) => {
      if (snap.exists()) {
        setIsJobsVisible(snap.data().jobs !== false);
      }
    }, (err) => {
      console.warn('JobDashboard visibility listener error:', err);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const jobsQ = (user && user.role === 'recruiter')
      ? query(collection(db, 'jobs'), where('recruiterId', '==', user.uid))
      : collection(db, 'jobs');

    const unsubscribeJobs = onSnapshot(
      jobsQ,
      (snapshot) => {
        const list: Job[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Job);
        });
        if (list.length === 0) {
          jobService.getJobs().then((allJobs) => {
            const filtered = (user && user.role === 'recruiter')
              ? allJobs.filter(j => j.recruiterId === user.uid)
              : allJobs;
            setJobs(filtered);
            setLoading(false);
          });
        } else {
          setJobs(list);
          setLoading(false);
        }
      },
      async (err) => {
        console.warn('Error listening to jobs:', err);
        const allJobs = await jobService.getJobs();
        const filtered = (user && user.role === 'recruiter')
          ? allJobs.filter(j => j.recruiterId === user.uid)
          : allJobs;
        setJobs(filtered);
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
            setSavedJobIds(data.savedJobIds || []);
          }
        },
        async (err) => {
          console.warn('Error listening to saved jobs:', err);
          const saved = await lmsService.getSavedJobs(user.uid);
          setSavedJobIds(saved);
        }
      );

      const appsQ = query(collection(db, 'applications'), where('seekerId', '==', user.uid));
      unsubscribeApps = onSnapshot(
        appsQ,
        (snapshot) => {
          const list: string[] = [];
          snapshot.forEach((docSnap) => {
            const appData = docSnap.data();
            if (appData.jobId) list.push(appData.jobId);
          });
          setAppliedIds(list);
        },
        async (err) => {
          console.warn('Error listening to applications:', err);
          const apps = await jobService.getSeekerApplications(user.uid);
          setAppliedIds(apps.map(a => a.jobId));
        }
      );
    }

    return () => {
      unsubscribeJobs();
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeApps) unsubscribeApps();
    };
  }, [user]);

  const handleApplyDirect = async (jobId: string) => {
    if (!user) return;
    try {
      await jobService.applyForJob(user.uid, jobId);
      Alert.alert('Application Submitted!', 'Your application has been logged.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSave = async (jobId: string) => {
    if (!user) return;
    const isCurrentlySaved = savedJobIds.includes(jobId);

    if (isCurrentlySaved) {
      setSavedJobIds(prev => prev.filter(id => id !== jobId));
    } else {
      setSavedJobIds(prev => [...prev, jobId]);
    }

    try {
      await lmsService.toggleBookmarkJob(user.uid, jobId, isCurrentlySaved);
      Alert.alert(
        isCurrentlySaved ? 'Job Removed' : 'Job Saved',
        isCurrentlySaved ? 'Job removed from saved bookmarks.' : 'Job saved to bookmarks.'
      );
    } catch (e) {
      console.warn('Failed to toggle bookmark job:', e);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      (typeof job.title === 'string' ? job.title.toLowerCase() : '').includes(search.toLowerCase()) ||
      (typeof job.company === 'string' ? job.company.toLowerCase() : '').includes(search.toLowerCase()) ||
      formatLocation(job.location).toLowerCase().includes(search.toLowerCase());

    const matchesType =
      selectedType === 'All' ||
      job.type === selectedType;

    const formattedLoc = formatLocation(job.location).toLowerCase();
    const matchesWorkspace =
      selectedWorkspace === 'All' ||
      (selectedWorkspace === 'Remote' && formattedLoc.includes('remote')) ||
      (selectedWorkspace === 'Hybrid' && formattedLoc.includes('hybrid')) ||
      (selectedWorkspace === 'Office' && !formattedLoc.includes('remote') && !formattedLoc.includes('hybrid'));

    return matchesSearch && matchesType && matchesWorkspace;
  });

  const isRecruiter = user?.role === 'recruiter';

  if (!isJobsVisible && !isRecruiter) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#F8F9FC', justifyContent: 'center', alignItems: 'center' }]} edges={['top']}>
        <Ionicons name="lock-closed-outline" size={64} color="#9CA3AF" />
        <Text style={{ color: '#1F2937', marginTop: 16, fontSize: 16, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 24 }}>
          Job portal access has been temporarily restricted by the administrator.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8F9FC' }]} edges={['top']}>
      {/* Search & Actions Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search roles, companies, locations..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>

        {isRecruiter && onPostJobPress && (
          <TouchableOpacity style={styles.postJobBtn} onPress={onPostJobPress}>
            <Text style={styles.postJobBtnText}>+ Post</Text>
          </TouchableOpacity>
        )}

        {!isRecruiter && (
          <TouchableOpacity style={styles.savedJobsBtn} onPress={onSavedJobsPress}>
            <Ionicons name="bookmark" size={16} color="#4F46E5" />
            <Text style={styles.savedJobsBtnText}>Saved</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filters Panel */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterSectionRow}>
          <Text style={styles.filterLabel}>Type:</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={JOB_TYPES}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.filterPillsScroll}
            renderItem={({ item }) => {
              const isSelected = selectedType === item;
              return (
                <TouchableOpacity
                  style={[styles.typePill, isSelected && styles.selectedPill]}
                  onPress={() => setSelectedType(item)}
                >
                  <Text style={[styles.typeText, isSelected && styles.selectedTypeText]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        <View style={[styles.filterSectionRow, { marginTop: 6 }]}>
          <Text style={styles.filterLabel}>Work:</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={WORKSPACE_MODES}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.filterPillsScroll}
            renderItem={({ item }) => {
              const isSelected = selectedWorkspace === item;
              return (
                <TouchableOpacity
                  style={[styles.typePill, isSelected && styles.selectedWorkspacePill]}
                  onPress={() => setSelectedWorkspace(item)}
                >
                  <Text style={[styles.typeText, isSelected && styles.selectedTypeText]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>

      {/* Job List */}
      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            onPress={() => onJobPress(item.id)}
            onApply={user?.role === 'seeker' ? () => handleApplyDirect(item.id) : undefined}
            hasApplied={appliedIds.includes(item.id)}
            isSaved={savedJobIds.includes(item.id)}
            onSaveToggle={user?.role === 'seeker' ? () => handleToggleSave(item.id) : undefined}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#4F46E5" />
            ) : (
              <>
                <Ionicons name="briefcase-outline" size={36} color="#9CA3AF" />
                <Text style={styles.emptyText}>No job openings found matching your criteria.</Text>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitleRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: '#ffffff',
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: '800',
  },
  headerSubtitleText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  searchContainer: {
    padding: 16,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    padding: 0,
  },
  postJobBtn: {
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 44,
  },
  postJobBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  savedJobsBtn: {
    backgroundColor: '#EEF2FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  savedJobsBtnText: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 13,
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    width: 42,
    textTransform: 'uppercase',
  },
  filterPillsScroll: {
    gap: 6,
  },
  typePill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedPill: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  selectedWorkspacePill: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  selectedTypeText: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '600',
  },
});
