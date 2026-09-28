import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  RefreshControl,
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

interface FilterChipItem {
  id: string;
  label: string;
  category: 'type' | 'workspace' | 'all';
  icon: keyof typeof Ionicons.glyphMap;
}

const FILTER_CHIPS: FilterChipItem[] = [
  { id: 'All', label: 'All Jobs', category: 'all', icon: 'briefcase' },
  { id: 'Full-time', label: 'Full-time', category: 'type', icon: 'flash' },
  { id: 'Part-time', label: 'Part-time', category: 'type', icon: 'time' },
  { id: 'Contract', label: 'Contract', category: 'type', icon: 'document-text' },
  { id: 'Internship', label: 'Internship', category: 'type', icon: 'school' },
  { id: 'Remote', label: 'Remote', category: 'workspace', icon: 'globe' },
  { id: 'Hybrid', label: 'Hybrid', category: 'workspace', icon: 'business' },
  { id: 'Office', label: 'On-Site', category: 'workspace', icon: 'location' },
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
  const [activeFilterId, setActiveFilterId] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isJobsVisible, setIsJobsVisible] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'lms_config', 'tabs_visibility'),
      (snap) => {
        if (snap.exists()) {
          setIsJobsVisible(snap.data().jobs !== false);
        }
      },
      (err) => {
        console.warn('JobDashboard visibility listener error:', err);
      }
    );
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

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

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
        isCurrentlySaved ? 'Bookmark Removed' : '🎉 Job Bookmarked',
        isCurrentlySaved ? 'Job removed from your saved list.' : 'Job saved to your bookmarks!'
      );
    } catch (e: any) {
      console.warn('Failed to toggle bookmark job:', e);
    }
  };

  const isRecruiter = user?.role === 'recruiter';

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        j.title?.toLowerCase().includes(q) ||
        j.company?.toLowerCase().includes(q) ||
        j.location?.toLowerCase().includes(q) ||
        j.description?.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (activeFilterId === 'All') return true;

      // Type filters
      if (['Full-time', 'Part-time', 'Contract', 'Internship'].includes(activeFilterId)) {
        return j.type === activeFilterId;
      }

      // Workspace filters
      const loc = formatLocation(j.location).toLowerCase();
      if (activeFilterId === 'Remote') return loc.includes('remote');
      if (activeFilterId === 'Hybrid') return loc.includes('hybrid');
      if (activeFilterId === 'Office') return !loc.includes('remote') && !loc.includes('hybrid');

      return true;
    });
  }, [jobs, search, activeFilterId]);

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
        <View style={styles.offlineContainer}>
          <Ionicons name="briefcase-outline" size={48} color="#94A3B8" />
          <Text style={styles.offlineTitle}>Job Portal Temporarily Offline</Text>
          <Text style={styles.offlineSub}>
            Job portal access has been temporarily restricted by the administrator.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <RNStatusBar barStyle="light-content" backgroundColor="#4F46E5" translucent={false} />
      <StatusBar style="light" />

      {/* ── Top Header Bar ── */}
      <View style={styles.headerBar}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerIconBg}>
            <Ionicons name="briefcase" size={18} color="#4F46E5" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Job Openings</Text>
            <Text style={styles.headerSub}>Verified opportunities & careers</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          {!isRecruiter ? (
            <TouchableOpacity
              style={[styles.savedHeaderBtn, savedJobIds.length > 0 && styles.savedHeaderBtnActive]}
              onPress={onSavedJobsPress}
              activeOpacity={0.85}
            >
              <Ionicons
                name={savedJobIds.length > 0 ? "bookmark" : "bookmark-outline"}
                size={15}
                color={savedJobIds.length > 0 ? "#4F46E5" : "#FFFFFF"}
              />
              <Text
                style={[
                  styles.savedHeaderBtnText,
                  savedJobIds.length > 0 && styles.savedHeaderBtnTextActive,
                ]}
              >
                Saved
              </Text>
              {savedJobIds.length > 0 && (
                <View style={styles.savedBadge}>
                  <Text style={styles.savedBadgeText}>{savedJobIds.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            onPostJobPress && (
              <TouchableOpacity
                style={styles.postJobBtn}
                onPress={onPostJobPress}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle" size={17} color="#FFFFFF" />
                <Text style={styles.postJobBtnText}>Post Job</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>

      <View style={styles.mainBody}>
        {/* ── Search & Filter Controls ── */}
        <View style={styles.controlsSection}>
          {/* Search Box */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#6366F1" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by job title, company, skills, or city..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={17} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Filter Carousel */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsScroll}
          >
            {FILTER_CHIPS.map((chip) => {
              const isSelected = activeFilterId === chip.id;
              return (
                <TouchableOpacity
                  key={chip.id}
                  style={[styles.filterPill, isSelected && styles.filterPillActive]}
                  onPress={() => setActiveFilterId(chip.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={chip.icon}
                    size={13}
                    color={isSelected ? '#FFFFFF' : '#64748B'}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Results Bar ── */}
        <View style={styles.resultsBar}>
          <Text style={styles.resultsCountText}>
            Showing <Text style={styles.resultsHighlight}>{filteredJobs.length}</Text> opportunities
          </Text>
          {(search.length > 0 || activeFilterId !== 'All') && (
            <TouchableOpacity
              onPress={() => {
                setSearch('');
                setActiveFilterId('All');
              }}
              activeOpacity={0.75}
              style={styles.resetLink}
            >
              <Ionicons name="refresh-outline" size={13} color="#EF4444" />
              <Text style={styles.clearFiltersText}>Reset Filters</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Job Openings List ── */}
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4F46E5" />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBg}>
                  <Ionicons
                    name={search || activeFilterId !== 'All' ? "search-outline" : "briefcase-outline"}
                    size={36}
                    color="#4F46E5"
                  />
                </View>
                <Text style={styles.emptyTitle}>
                  {search || activeFilterId !== 'All'
                    ? 'No matching job openings'
                    : 'No Active Job Listings'}
                </Text>
                <Text style={styles.emptyText}>
                  {search || activeFilterId !== 'All'
                    ? 'Try adjusting your search terms or filter criteria to discover more openings.'
                    : 'Check back soon for new career opportunities posted by verified employers.'}
                </Text>
                {(search || activeFilterId !== 'All') && (
                  <TouchableOpacity
                    style={styles.resetBtn}
                    onPress={() => {
                      setSearch('');
                      setActiveFilterId('All');
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="refresh" size={15} color="#4F46E5" />
                    <Text style={styles.resetBtnText}>Clear All Filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.loadingText}>Loading career opportunities...</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <JobCard
              job={item}
              layoutMode="vertical"
              onPress={() => onJobPress(item.id)}
              onApply={() => {
                if (onApplyPress) {
                  onApplyPress(item.id);
                } else {
                  onJobPress(item.id);
                }
              }}
              hasApplied={appliedIds.includes(item.id)}
              isSaved={savedJobIds.includes(item.id)}
              onSaveToggle={() => handleToggleSave(item.id)}
            />
          )}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#4F46E5',
  },
  mainBody: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // ── Header Bar ──
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#4338CA',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    color: '#E0E7FF',
    fontWeight: '500',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savedHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
  },
  savedHeaderBtnActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  savedHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  savedHeaderBtnTextActive: {
    color: '#4F46E5',
  },
  savedBadge: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 2,
  },
  savedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  postJobBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  postJobBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  // ── Search & Filters ──
  controlsSection: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 13,
    height: 44,
    paddingHorizontal: 13,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: '600',
    padding: 0,
  },
  clearBtn: {
    padding: 2,
  },
  filterPillsScroll: {
    paddingHorizontal: 16,
    gap: 7,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  filterPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },

  // ── Results Bar ──
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
    fontWeight: '900',
  },
  resetLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  clearFiltersText: {
    fontSize: 11.5,
    color: '#EF4444',
    fontWeight: '800',
  },

  // ── List Content ──
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },

  // ── Empty State ──
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 45,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconBg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  resetBtnText: {
    color: '#4F46E5',
    fontSize: 12.5,
    fontWeight: '800',
  },

  // ── Loading ──
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },

  // ── Offline ──
  offlineContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  offlineTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 12,
  },
  offlineSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 19,
  },
});
