import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar as RNStatusBar,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { jobService, Job, JobApplication } from '@/services/jobs/jobService';
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
  onApplyPress?: (jobId: string) => void;
}

interface FilterOption {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const JOB_TYPES: FilterOption[] = [
  { id: 'All', label: 'All Jobs', icon: 'briefcase-outline' },
  { id: 'Full-time', label: 'Full-time', icon: 'flash-outline' },
  { id: 'Part-time', label: 'Part-time', icon: 'time-outline' },
  { id: 'Contract', label: 'Contract', icon: 'document-text-outline' },
  { id: 'Internship', label: 'Internship', icon: 'school-outline' },
];

const WORKSPACE_MODES: FilterOption[] = [
  { id: 'All', label: 'All Modes', icon: 'globe-outline' },
  { id: 'Remote', label: 'Remote', icon: 'home-outline' },
  { id: 'Hybrid', label: 'Hybrid', icon: 'business-outline' },
  { id: 'Office', label: 'Office', icon: 'location-outline' },
];

export const JobDashboard: React.FC<JobDashboardProps> = ({
  onJobPress,
  onPostJobPress,
  onSavedJobsPress,
  onRedirectToProfile,
  onApplyPress,
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
    const unsub = onSnapshot(
      collection(db, 'jobs'),
      (snap) => {
        const list: Job[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Job));
        setJobs(list);
        setLoading(false);
      },
      async () => {
        setJobs(await jobService.getJobs());
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const qApps = query(collection(db, 'job_applications'), where('applicantId', '==', user.uid));
    const unsubApps = onSnapshot(qApps, (snap) => {
      const ids = snap.docs.map((d) => (d.data() as JobApplication).jobId);
      setAppliedIds(ids);
    });

    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const u = snap.data();
        setSavedJobIds(u.savedJobs || u.savedJobIds || []);
      }
    });

    return () => {
      unsubApps();
      unsubUser();
    };
  }, [user]);

  const handleApplyDirect = async (jobId: string) => {
    if (!user) return;
    try {
      await jobService.applyForJob(user.uid, jobId);
      Alert.alert('🎉 Applied!', 'Your application has been logged successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit application.');
    }
  };

  const handleToggleSave = async (jobId: string) => {
    if (!user) return;
    const isCurrentlySaved = savedJobIds.includes(jobId);

    if (isCurrentlySaved) {
      setSavedJobIds((prev) => prev.filter((id) => id !== jobId));
    } else {
      setSavedJobIds((prev) => [...prev, jobId]);
    }

    try {
      await lmsService.toggleBookmarkJob(user.uid, jobId, isCurrentlySaved);
      Alert.alert(
        isCurrentlySaved ? 'Job Removed' : '🎉 Job Saved',
        isCurrentlySaved ? 'Job removed from saved bookmarks.' : 'Job saved to your bookmarks!'
      );
    } catch (e: any) {
      console.warn('Failed to toggle bookmark job:', e);
    }
  };

  const isRecruiter = user?.role === 'recruiter';

  const filteredJobs = jobs.filter((j) => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      j.title?.toLowerCase().includes(q) ||
      j.company?.toLowerCase().includes(q) ||
      j.location?.toLowerCase().includes(q) ||
      j.description?.toLowerCase().includes(q);

    const matchType = selectedType === 'All' || j.type === selectedType;

    const loc = formatLocation(j.location).toLowerCase();
    const matchWorkspace =
      selectedWorkspace === 'All' ||
      (selectedWorkspace === 'Remote' && loc.includes('remote')) ||
      (selectedWorkspace === 'Hybrid' && loc.includes('hybrid')) ||
      (selectedWorkspace === 'Office' && !loc.includes('remote') && !loc.includes('hybrid'));

    return matchSearch && matchType && matchWorkspace;
  });

  useEffect(() => {
    RNStatusBar.setBarStyle('light-content', true);
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor('#4F46E5', true);
      RNStatusBar.setTranslucent(false);
    }
  }, []);

  if (!isJobsVisible) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#4F46E5' }} edges={['top']}>
        <RNStatusBar barStyle="light-content" backgroundColor="#4F46E5" translucent={false} />
        <StatusBar style="light" />
        <View style={[styles.container, { backgroundColor: '#F8F9FC', justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
          <Ionicons name="briefcase-outline" size={48} color="#9CA3AF" />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 12 }}>
            Jobs Section Temporarily Offline
          </Text>
          <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center', paddingHorizontal: 32 }}>
            Job portal access has been temporarily restricted by the administrator.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#4F46E5' }} edges={['top']}>
      <RNStatusBar barStyle="light-content" backgroundColor="#4F46E5" translucent={false} />
      <StatusBar style="light" />
      {/* Top Header */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Job Portal</Text>
      </View>
      <View style={[styles.container, { backgroundColor: '#F8F9FC' }]}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#4F46E5" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs, skills, locations..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {isRecruiter && onPostJobPress && (
          <TouchableOpacity style={styles.postJobBtn} onPress={onPostJobPress} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.postJobBtnText}>Post</Text>
          </TouchableOpacity>
        )}

        {!isRecruiter && (
          <TouchableOpacity style={styles.savedJobsBtn} onPress={onSavedJobsPress} activeOpacity={0.85}>
            <Ionicons name="bookmark" size={16} color={savedJobIds.length > 0 ? '#4F46E5' : '#64748B'} />
            <Text style={[styles.savedJobsBtnText, savedJobIds.length > 0 && styles.savedJobsBtnTextActive]}>
              Saved
            </Text>
            {savedJobIds.length > 0 && (
              <View style={styles.savedBadge}>
                <Text style={styles.savedBadgeText}>{savedJobIds.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.filterSectionRow}>
          <Text style={styles.filterLabel}>TYPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsScroll}>
            {JOB_TYPES.map((typeObj) => {
              const isSelected = selectedType === typeObj.id;
              return (
                <TouchableOpacity
                  key={typeObj.id}
                  style={[styles.typePill, isSelected && styles.selectedPill, { flexDirection: 'row', alignItems: 'center' }]}
                  onPress={() => setSelectedType(typeObj.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={typeObj.icon}
                    size={13}
                    color={isSelected ? '#ffffff' : '#64748B'}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.typeText, isSelected && styles.selectedTypeText]}>
                    {typeObj.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <View style={styles.resultsBar}>
        <Text style={styles.resultsCountText}>
          Showing <Text style={styles.resultsHighlight}>{filteredJobs.length}</Text> opportunities
        </Text>
        {(search || selectedType !== 'All' || selectedWorkspace !== 'All') && (
          <TouchableOpacity
            onPress={() => {
              setSearch('');
              setSelectedType('All');
              setSelectedWorkspace('All');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.clearFiltersText}>Reset ✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {filteredJobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#4F46E5" />
            ) : (
              <>
                <Ionicons name="briefcase-outline" size={40} color="#9CA3AF" />
                <Text style={styles.emptyText}>No job openings found matching your criteria.</Text>
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={() => {
                    setSearch('');
                    setSelectedType('All');
                    setSelectedWorkspace('All');
                  }}
                >
                  <Text style={styles.resetBtnText}>Clear All Filters</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            {filteredJobs.map((item) => (
              <View key={item.id} style={{ width: '100%', marginBottom: 12 }}>
                <JobCard
                  job={item}
                  layoutMode="vertical"
                  onPress={() => onJobPress(item.id)}
                  onApply={user?.role === 'seeker' ? () => {
                    if (onApplyPress) {
                      onApplyPress(item.id);
                    } else {
                      onJobPress(item.id);
                    }
                  } : undefined}
                  hasApplied={appliedIds.includes(item.id)}
                  isSaved={savedJobIds.includes(item.id)}
                  onSaveToggle={user?.role === 'seeker' ? () => handleToggleSave(item.id) : undefined}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#4338CA',
    backgroundColor: '#4F46E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
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
    color: '#4B5563',
    fontWeight: '700',
    fontSize: 13,
  },
  savedJobsBtnTextActive: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  savedBadge: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 2,
  },
  savedBadgeText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '800',
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    width: 38,
    letterSpacing: 0.5,
  },
  filterPillsScroll: {
    gap: 6,
  },
  typePill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedPill: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedWorkspacePill: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  typeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  selectedTypeText: {
    color: '#ffffff',
  },
  resultsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  resultsCountText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
  },
  resultsHighlight: {
    color: '#0F172A',
    fontWeight: '800',
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '700',
  },
  listContent: {
    paddingTop: 8,
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
  resetBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  resetBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
