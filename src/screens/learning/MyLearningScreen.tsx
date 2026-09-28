import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/services/firebase/config';
import { Course } from '@/services/lms/lmsService';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
  StatusBar as RNStatusBar,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

interface MyLearningScreenProps {
  onResumeCourse: (courseId: string) => void;
  onExploreCourses: () => void;
}

export const MyLearningScreen: React.FC<MyLearningScreenProps> = ({
  onResumeCourse,
  onExploreCourses,
}) => {
  const { user } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const enrolled = useMemo(() => {
    return allCourses.filter(c =>
      enrolledIds.includes(c.id) ||
      (user && c.enrolledUsers && c.enrolledUsers.includes(user.uid))
    );
  }, [allCourses, enrolledIds, user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribeCourses = onSnapshot(
      collection(db, 'courses'),
      (snapshot) => {
        const list: Course[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Course);
        });
        setAllCourses(list);
        setLoading(false);
      },
      (err) => {
        console.error('MyLearning courses snapshot error:', err);
        setLoading(false);
      }
    );

    const unsubscribeUser = onSnapshot(
      doc(db, 'users', user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();

          const ids = new Set<string>();
          ['enrolledCourses', 'purchasedCourses', 'courses'].forEach((field) => {
            const val = data[field];
            if (Array.isArray(val)) {
              val.forEach((item: any) => {
                if (typeof item === 'string') ids.add(item);
                else if (item && typeof item === 'object') {
                  if (item.id) ids.add(item.id);
                  else if (item.courseId) ids.add(item.courseId);
                }
              });
            } else if (val && typeof val === 'object') {
              Object.keys(val).forEach((k) => { if (data[field][k]) ids.add(k); });
            }
          });

          if (data.seekerProfile) {
            const sp = data.seekerProfile;
            ['enrolledCourses', 'purchasedCourses'].forEach((field) => {
              if (Array.isArray(sp[field])) {
                sp[field].forEach((item: any) => {
                  if (typeof item === 'string') ids.add(item);
                  else if (item && item.id) ids.add(item.id);
                });
              }
            });
          }

          setEnrolledIds(Array.from(ids));

          const progress: Record<string, number> = {};
          if (data.courseProgress && typeof data.courseProgress === 'object') {
            Object.keys(data.courseProgress).forEach((cid) => {
              const val = data.courseProgress[cid];
              if (typeof val === 'number') progress[cid] = val;
            });
          }
          setProgressMap(progress);
        }
      },
      (err) => console.error('MyLearning user snapshot error:', err)
    );

    return () => {
      unsubscribeCourses();
      unsubscribeUser();
    };
  }, [user]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const getProgress = (courseId: string): number => {
    return Math.min(100, Math.max(0, progressMap[courseId] || 0));
  };

  const inProgressCount = useMemo(() => {
    return enrolled.filter(c => {
      const p = getProgress(c.id);
      return p > 0 && p < 100;
    }).length;
  }, [enrolled, progressMap]);

  const completedCount = useMemo(() => {
    return enrolled.filter(c => getProgress(c.id) >= 100).length;
  }, [enrolled, progressMap]);

  const notStartedCount = useMemo(() => {
    return enrolled.filter(c => getProgress(c.id) === 0).length;
  }, [enrolled, progressMap]);

  const overallProgress = useMemo(() => {
    if (enrolled.length === 0) return 0;
    const total = enrolled.reduce((acc, c) => acc + getProgress(c.id), 0);
    return Math.round(total / enrolled.length);
  }, [enrolled, progressMap]);

  const filteredEnrolled = useMemo(() => {
    return enrolled.filter(c => {
      const progress = getProgress(c.id);
      const isCompleted = progress >= 100;

      if (statusTab === 'in_progress' && (isCompleted || progress === 0)) return false;
      if (statusTab === 'completed' && !isCompleted) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        c.title?.toLowerCase().includes(q) ||
        c.instructor?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q)
      );
    });
  }, [enrolled, statusTab, searchQuery, progressMap]);

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* ── Search Bar ── */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#6366F1" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search enrolled courses, topics..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7} style={styles.clearSearchBtn}>
            <Ionicons name="close-circle" size={17} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Learning Progress Metrics Card ── */}
      {enrolled.length > 0 && (
        <View style={styles.trackerCard}>
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <View style={[styles.statIconWrap, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="book-outline" size={17} color="#4F46E5" />
              </View>
              <Text style={styles.statCount}>{enrolled.length}</Text>
              <Text style={styles.statLabel}>Enrolled</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCol}>
              <View style={[styles.statIconWrap, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="time-outline" size={17} color="#3B82F6" />
              </View>
              <Text style={styles.statCount}>{inProgressCount}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCol}>
              <View style={[styles.statIconWrap, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="trophy-outline" size={17} color="#10B981" />
              </View>
              <Text style={styles.statCount}>{completedCount}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>

          {/* Overall Completion Progress */}
          <View style={styles.overallProgressSection}>
            <View style={styles.overallProgressTextRow}>
              <Text style={styles.overallProgressLabel}>Overall Coursework</Text>
              <Text style={styles.overallProgressValue}>{overallProgress}%</Text>
            </View>
            <View style={styles.overallProgressTrack}>
              <View style={[styles.overallProgressFill, { width: `${overallProgress}%` }]} />
            </View>
          </View>
        </View>
      )}

      {/* ── Status Filter Chips ── */}
      {enrolled.length > 0 && (
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[styles.filterChip, statusTab === 'all' && styles.filterChipActive]}
            onPress={() => setStatusTab('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, statusTab === 'all' && styles.filterChipTextActive]}>
              All ({enrolled.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusTab === 'in_progress' && styles.filterChipActive]}
            onPress={() => setStatusTab('in_progress')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, statusTab === 'in_progress' && styles.filterChipTextActive]}>
              In Progress ({inProgressCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusTab === 'completed' && styles.filterChipActive]}
            onPress={() => setStatusTab('completed')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, statusTab === 'completed' && styles.filterChipTextActive]}>
              Completed ({completedCount})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <RNStatusBar barStyle="light-content" backgroundColor="#4F46E5" translucent={false} />
      <StatusBar style="light" />

      <FlatList
        data={filteredEnrolled}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4F46E5" />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Ionicons
                  name={searchQuery || statusTab !== 'all' ? "search-outline" : "school-outline"}
                  size={36}
                  color="#4F46E5"
                />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery || statusTab !== 'all' ? 'No matching courses found' : 'No Enrolled Courses Yet'}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery || statusTab !== 'all'
                  ? 'Try modifying your search keywords or filter tab to view enrolled courses.'
                  : 'Start your learning journey today! Browse our top courses and enroll to master skills.'}
              </Text>

              {searchQuery || statusTab !== 'all' ? (
                <TouchableOpacity
                  style={styles.resetFilterBtn}
                  onPress={() => {
                    setSearchQuery('');
                    setStatusTab('all');
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="refresh-outline" size={16} color="#4F46E5" />
                  <Text style={styles.resetFilterBtnText}>Reset Filters</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.exploreBtn}
                  onPress={onExploreCourses}
                  activeOpacity={0.88}
                >
                  <Ionicons name="compass" size={18} color="#FFFFFF" />
                  <Text style={styles.exploreBtnText}>Explore Courses Catalog</Text>
                  <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.loadingText}>Loading your courses...</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const progress = getProgress(item.id);
          const isCompleted = progress >= 100;
          const isStarted = progress > 0;
          const imgUri = item.imageUrl || item.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop';

          return (
            <TouchableOpacity
              style={styles.courseCard}
              onPress={() => onResumeCourse(item.id)}
              activeOpacity={0.92}
            >
              {/* ── Top Meta Row: Status Pill + Category ── */}
              <View style={styles.cardHeaderRow}>
                <View
                  style={[
                    styles.statusTagPill,
                    isCompleted
                      ? styles.statusCompletedPill
                      : isStarted
                      ? styles.statusInProgressPill
                      : styles.statusNotStartedPill,
                  ]}
                >
                  <Ionicons
                    name={isCompleted ? "checkmark-circle" : isStarted ? "play-circle" : "ellipse-outline"}
                    size={12}
                    color={isCompleted ? "#059669" : isStarted ? "#4F46E5" : "#64748B"}
                  />
                  <Text
                    style={[
                      styles.statusTagText,
                      { color: isCompleted ? "#059669" : isStarted ? "#4F46E5" : "#64748B" },
                    ]}
                  >
                    {isCompleted ? "Completed 🎓" : isStarted ? `In Progress • ${progress}%` : "Not Started"}
                  </Text>
                </View>

                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText} numberOfLines={1}>
                    {item.category || 'Course'}
                  </Text>
                </View>
              </View>

              {/* ── Card Body: Thumbnail + Info ── */}
              <View style={styles.cardBody}>
                <View style={styles.thumbnailWrap}>
                  <Image source={{ uri: imgUri }} style={styles.cardThumbnail} resizeMode="cover" />
                  <View style={styles.thumbnailOverlayBadge}>
                    <Ionicons
                      name={isCompleted ? "checkmark" : "play"}
                      size={13}
                      color="#FFFFFF"
                    />
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <Text style={styles.cardCourseTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <View style={styles.instructorMetaRow}>
                    <Ionicons name="person-circle" size={13} color="#6366F1" />
                    <Text style={styles.instructorMetaText} numberOfLines={1}>
                      By {item.instructor || 'Ganimi Kava'}
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={11} color="#64748B" />
                      <Text style={styles.metaText}>{item.duration || '2h 30m'}</Text>
                    </View>
                    <Text style={styles.metaDot}>•</Text>
                    <View style={styles.metaItem}>
                      <Ionicons name="book-outline" size={11} color="#64748B" />
                      <Text style={styles.metaText}>{item.lessonsCount ? `${item.lessonsCount} lessons` : 'Full Course'}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* ── Progress & Action Bar ── */}
              <View style={styles.cardFooter}>
                <View style={styles.progressSection}>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${progress}%`,
                          backgroundColor: isCompleted ? '#10B981' : '#4F46E5',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressStatusText}>
                    {isCompleted ? '100% • Course Finished' : isStarted ? `${progress}% Completed` : 'Ready to start lesson'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.ctaButton,
                    isCompleted ? styles.ctaButtonCompleted : styles.ctaButtonActive,
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    onResumeCourse(item.id);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={!isStarted ? "play" : isCompleted ? "refresh" : "play-forward"}
                    size={13}
                    color="#FFFFFF"
                  />
                  <Text style={styles.ctaButtonText}>
                    {!isStarted ? 'Start' : isCompleted ? 'Review' : 'Continue'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },

  // ── Search Bar ──
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    paddingHorizontal: 13,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  clearSearchBtn: {
    padding: 3,
  },

  // ── Tracker Overview Card ──
  trackerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statCount: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 21,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#F1F5F9',
  },
  overallProgressSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  overallProgressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  overallProgressLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  overallProgressValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#4F46E5',
  },
  overallProgressTrack: {
    height: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  overallProgressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 3,
  },

  // ── Filter Chips ──
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 6.5,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // ── Course Card ──
  listContent: {
    paddingBottom: 36,
  },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  statusInProgressPill: {
    backgroundColor: '#EEF2FF',
  },
  statusCompletedPill: {
    backgroundColor: '#ECFDF5',
  },
  statusNotStartedPill: {
    backgroundColor: '#F1F5F9',
  },
  statusTagText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  categoryBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },

  // ── Card Body ──
  cardBody: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  thumbnailWrap: {
    position: 'relative',
    width: 96,
    height: 70,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  cardThumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlayBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardCourseTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  instructorMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  instructorMetaText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  metaDot: {
    fontSize: 10,
    color: '#CBD5E1',
  },

  // ── Card Footer ──
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  progressSection: {
    flex: 1,
  },
  progressBarTrack: {
    height: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 2.5,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  progressStatusText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
  ctaButtonActive: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
  },
  ctaButtonCompleted: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // ── Empty State ──
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: 10,
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
  resetFilterBtn: {
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
  resetFilterBtnText: {
    color: '#4F46E5',
    fontSize: 12.5,
    fontWeight: '800',
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    gap: 7,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
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
});
