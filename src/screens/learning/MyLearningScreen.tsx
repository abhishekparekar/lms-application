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
import { SafeAreaView } from 'react-native-safe-area-context';
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
              Object.keys(val).forEach((k) => { if (val[k]) ids.add(k); });
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
    return progressMap[courseId] || 0;
  };

  const inProgressCount = useMemo(() => {
    return enrolled.filter(c => getProgress(c.id) < 100).length;
  }, [enrolled, progressMap]);

  const completedCount = useMemo(() => {
    return enrolled.filter(c => getProgress(c.id) >= 100).length;
  }, [enrolled, progressMap]);

  const filteredEnrolled = useMemo(() => {
    return enrolled.filter(c => {
      const progress = getProgress(c.id);
      const isCompleted = progress >= 100;

      if (statusTab === 'in_progress' && isCompleted) return false;
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
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#4F46E5" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search enrolled courses..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7} style={{ padding: 2 }}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsStrip}>
        <View style={styles.statPill}>
          <Ionicons name="book-outline" size={14} color="#4F46E5" />
          <Text style={styles.statPillText}>{enrolled.length} Enrolled</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }]}>
          <Ionicons name="time-outline" size={14} color="#16A34A" />
          <Text style={[styles.statPillText, { color: '#16A34A' }]}>{inProgressCount} In Progress</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5' }]}>
          <Ionicons name="trophy-outline" size={14} color="#D97706" />
          <Text style={[styles.statPillText, { color: '#D97706' }]}>{completedCount} Completed</Text>
        </View>
      </View>

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
    </View>
  );

  useEffect(() => {
    RNStatusBar.setBarStyle('light-content', true);
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor('#4F46E5', true);
      RNStatusBar.setTranslucent(false);
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
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
                  <Ionicons name="book-outline" size={36} color="#4F46E5" />
                </View>
                <Text style={styles.emptyTitle}>
                  {searchQuery || statusTab !== 'all' ? 'No matching courses' : 'No Enrolled Courses Yet'}
                </Text>
                <Text style={styles.emptyText}>
                  {searchQuery || statusTab !== 'all'
                    ? 'Try clearing your search query or filter tab to view all courses.'
                    : 'Explore our catalog of top-rated courses and start building your skills today!'}
                </Text>
                <TouchableOpacity
                  style={styles.exploreBtn}
                  onPress={onExploreCourses}
                  activeOpacity={0.85}
                >
                  <Ionicons name="compass-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.exploreBtnText}>Explore Courses Catalog</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 40 }} />
            )
          }
          renderItem={({ item }) => {
            const progress = getProgress(item.id);
            const isCompleted = progress >= 100;
            const imgUri = item.imageUrl || item.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop';

            return (
              <TouchableOpacity
                style={styles.formattedCard}
                onPress={() => onResumeCourse(item.id)}
                activeOpacity={0.92}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.statusTagPill, isCompleted ? styles.completedPill : styles.inProgressPill]}>
                    <Ionicons
                      name={isCompleted ? "checkmark-circle" : "time"}
                      size={12}
                      color={isCompleted ? "#059669" : "#4F46E5"}
                    />
                    <Text style={[styles.statusTagText, { color: isCompleted ? "#059669" : "#4F46E5" }]}>
                      {isCompleted ? "Completed 🏆" : "In Progress"}
                    </Text>
                  </View>
                  <Text style={styles.categoryBadgeText}>{item.category || 'Course'}</Text>
                </View>

                <View style={styles.cardBody}>
                  <Image source={{ uri: imgUri }} style={styles.cardThumbnail} resizeMode="cover" />
                  
                  <View style={styles.cardDetails}>
                    <Text style={styles.cardCourseTitle} numberOfLines={2}>
                      {item.title}
                    </Text>

                    <View style={styles.instructorMetaRow}>
                      <Ionicons name="person" size={12} color="#64748B" />
                      <Text style={styles.instructorMetaText} numberOfLines={1}>
                        {item.instructor || 'Instructor'}
                      </Text>
                    </View>

                    <View style={styles.durationLessonRow}>
                      <Text style={styles.metaChipText}>🕒 {item.duration || '2h 30m'}</Text>
                      <Text style={styles.metaChipDot}>•</Text>
                      <Text style={styles.metaChipText}>📖 {item.lessonsCount || 10} lessons</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.progressCtaRow}>
                  <View style={styles.progressTrackWrapper}>
                    <View style={styles.progressLabelRow}>
                      <Text style={styles.progressPercentText}>{progress}% Complete</Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${progress}%`,
                            backgroundColor: isCompleted ? '#10B981' : '#4F46E5',
                          }
                        ]}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.ctaButton, isCompleted ? styles.ctaButtonCompleted : styles.ctaButtonActive]}
                    onPress={() => onResumeCourse(item.id)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={progress === 0 ? "play" : isCompleted ? "refresh" : "play-forward"}
                      size={15}
                      color="#FFFFFF"
                    />
                    <Text style={styles.ctaButtonText}>
                      {progress === 0 ? 'Start' : isCompleted ? 'Revisit' : 'Resume'}
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
  safeAreaWrapper: {
    flex: 1,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
  statsStrip: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 4,
  },
  formattedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inProgressPill: {
    backgroundColor: '#EEF2FF',
  },
  completedPill: {
    backgroundColor: '#ECFDF5',
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  cardBody: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  cardThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  cardDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardCourseTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
    marginBottom: 4,
  },
  instructorMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  instructorMetaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  durationLessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaChipText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  metaChipDot: {
    fontSize: 11,
    color: '#94A3B8',
  },
  progressCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  progressTrackWrapper: {
    flex: 1,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressPercentText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    elevation: 2,
  },
  ctaButtonActive: {
    backgroundColor: '#4F46E5',
  },
  ctaButtonCompleted: {
    backgroundColor: '#10B981',
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    width: '100%',
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
