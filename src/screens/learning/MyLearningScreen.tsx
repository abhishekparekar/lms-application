import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/services/firebase/config';
import { Course } from '@/services/lms/lmsService';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const enrolled = allCourses.filter(c =>
    enrolledIds.includes(c.id) ||
    (user && c.enrolledUsers && c.enrolledUsers.includes(user.uid)) ||
    c.price === 0 ||
    (c as any).isFree
  );

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

          // Extract enrolled IDs robustly from various user doc formats
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
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }, []);

  const getProgress = (courseId: string): number => {
    return progressMap[courseId] || 0;
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />

      {/* Deep Blue Header Background */}
      <View style={styles.headerBackground} />

      <View style={styles.safeAreaWrapper}>
        {/* Course List Overlapping the Header */}
        <FlatList
          data={enrolled}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FFFFFF" />
          }
          renderItem={({ item }) => {
            const progress = getProgress(item.id);
            const isCompleted = progress >= 100;

            return (
              <TouchableOpacity
                style={styles.courseCard}
                onPress={() => onResumeCourse(item.id)}
                activeOpacity={0.95}
              >
                <Image source={{ uri: item.imageUrl || item.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop' }} style={styles.courseImage} />

                <View style={styles.courseDetails}>
                  <Text style={styles.courseTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <View style={styles.instructorRow}>
                    <Ionicons name="person-circle-outline" size={14} color="#6B7280" />
                    <Text style={styles.instructorName} numberOfLines={1}>{item.instructor}</Text>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="play-circle-outline" size={14} color="#1E3A8A" />
                      <Text style={styles.metaText}>{item.lessonsCount} lessons</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={14} color="#1E3A8A" />
                      <Text style={styles.metaText}>{item.duration}</Text>
                    </View>
                  </View>

                  {/* Integrated Progress Bar & Resume Button */}
                  <View style={styles.actionRow}>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressLabels}>
                        <Text style={styles.progressPctText}>{progress}% Completed</Text>
                      </View>
                      <View style={styles.progressBg}>
                        <View style={[
                          styles.progressFill,
                          { width: `${progress}%`, backgroundColor: isCompleted ? '#10B981' : '#1E3A8A' }
                        ]} />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.resumeBtn, isCompleted && styles.resumeBtnCompleted]}
                      onPress={() => onResumeCourse(item.id)}
                    >
                      <Ionicons
                        name={progress === 0 ? "play" : isCompleted ? "checkmark-circle" : "refresh"}
                        size={16}
                        color="#FFFFFF"
                      />
                      <Text style={styles.resumeBtnText}>
                        {progress === 0 ? 'Start' : isCompleted ? 'Review' : 'Resume'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {loading ? (
                <ActivityIndicator size="large" color="#FFFFFF" />
              ) : (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIconBg}>
                    <Ionicons name="book-outline" size={48} color="#1E3A8A" />
                  </View>
                  <Text style={styles.emptyTitle}>No Enrolled Courses</Text>
                  <Text style={styles.emptyText}>{"You haven't enrolled in any courses yet. Discover our premium live classes and enhance your skills."}</Text>
                  <TouchableOpacity style={styles.exploreBtn} onPress={onExploreCourses}>
                    <Text style={styles.exploreBtnText}>Explore Courses</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: '#1E3A8A',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  safeAreaWrapper: {
    flex: 1,
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
  },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
  },
  courseImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#E5E7EB',
    resizeMode: 'cover',
  },
  courseDetails: {
    padding: 20,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 22,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  instructorName: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 10,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  progressContainer: {
    flex: 1,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressPctText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
  },
  progressBg: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    minWidth: 100,
  },
  resumeBtnCompleted: {
    backgroundColor: '#10B981',
  },
  resumeBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emptyContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
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
