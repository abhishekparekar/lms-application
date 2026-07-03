import { CourseCard } from '@/components/cards/CourseCard';
import { JobCard } from '@/components/cards/JobCard';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/services/firebase/config';
import { Job, jobService } from '@/services/jobs/jobService';
import { Course, courseService, lmsService } from '@/services/lms/lmsService';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LandingScreenProps {
  onLoginPress: () => void;
  onJobsPress: () => void;
  onCoursePress?: (courseId: string) => void;
  onJobPress?: (jobId: string) => void;
  onLearnPress?: () => void;
  onStartProfileBuilder?: () => void;
  onViewSubscription?: () => void;
}



export const LandingScreen: React.FC<LandingScreenProps> = ({
  onLoginPress,
  onJobsPress,
  onCoursePress,
  onJobPress,
  onLearnPress,
  onStartProfileBuilder,
  onViewSubscription,
}) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [featuredJobs, setFeaturedJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isJobsVisible, setIsJobsVisible] = useState(true);

  useEffect(() => {
    setCoursesLoading(courses.length === 0);
    setJobsLoading(featuredJobs.length === 0);

    const unsubscribeCourses = onSnapshot(
      collection(db, 'courses'),
      (snapshot) => {
        const list: Course[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Course);
        });
        setCourses(list);
        setCoursesLoading(false);
      },
      async (err) => {
        console.warn('Error listening to courses:', err);
        const list = await courseService.getCourses();
        setCourses(list);
        setCoursesLoading(false);
      }
    );

    const unsubscribeJobs = onSnapshot(
      collection(db, 'jobs'),
      (snapshot) => {
        const list: Job[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Job);
        });
        if (list.length === 0) {
          jobService.getJobs().then((allJobs) => {
            setFeaturedJobs(allJobs);
            setJobsLoading(false);
          });
        } else {
          setFeaturedJobs(list);
          setJobsLoading(false);
        }
      },
      async (err) => {
        console.warn('Error listening to jobs:', err);
        const list = await jobService.getJobs();
        setFeaturedJobs(list);
        setJobsLoading(false);
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
            setEnrolledCourseIds(data.enrolledCourses || []);
          }
        },
        async (err) => {
          console.warn('Error listening to user doc:', err);
          const savedIds = await lmsService.getSavedJobs(user.uid);
          setSavedJobIds(savedIds);
          const enrolled = await courseService.getEnrolledCourses(user.uid);
          setEnrolledCourseIds(enrolled.map(c => c.id));
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

    const unsubscribeVisibility = onSnapshot(
      doc(db, 'lms_config', 'tabs_visibility'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setIsJobsVisible(data.jobs !== false);
        }
      },
      (err) => {
        console.warn('Error fetching visibility settings on landing:', err);
      }
    );

    return () => {
      unsubscribeCourses();
      unsubscribeJobs();
      unsubscribeVisibility();
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeApps) unsubscribeApps();
    };
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  const handleApplyJob = async (jobId: string) => {
    if (!user) {
      onLoginPress();
      return;
    }

    try {
      await jobService.applyForJob(user.uid, jobId);
      setAppliedIds(prev => [...prev, jobId]);
      Alert.alert('🎉 Applied Successfully!', 'Your application has been logged.');
    } catch (e: any) {
      Alert.alert('Apply Failed', e.message || 'Could not submit application.');
    }
  };

  const handleToggleSaveJob = async (jobId: string) => {
    if (!user) {
      onLoginPress();
      return;
    }
    const isCurrentlySaved = savedJobIds.includes(jobId);

    // Optimistic Update
    if (isCurrentlySaved) {
      setSavedJobIds(prev => prev.filter(id => id !== jobId));
    } else {
      setSavedJobIds(prev => [...prev, jobId]);
    }

    try {
      await lmsService.toggleBookmarkJob(user.uid, jobId, isCurrentlySaved);
      Alert.alert(
        !isCurrentlySaved ? '🔖 Job Saved' : 'Job Unsaved',
        !isCurrentlySaved ? 'Job saved to bookmarks.' : 'Job removed from bookmarks.'
      );
    } catch (e) {
      // Revert/refresh on error
      if (user) {
        lmsService.getSavedJobs(user.uid).then(setSavedJobIds);
      }
    }
  };

  const handleEnroll = async (courseId: string) => {
    if (!user) {
      onLoginPress();
      return;
    }
    try {
      await courseService.enrollInCourse(user.uid, courseId);
      setEnrolledCourseIds([...enrolledCourseIds, courseId]);
      Alert.alert('🎉 Success', 'You have enrolled in the course successfully!');
    } catch (e: any) {
      console.error('Failed to enroll:', e);
      Alert.alert('Enrollment Failed', e.message || 'Could not enroll in course.');
    }
  };

  const getCategoryDetails = (category: string) => {
    const cat = category ? category.toLowerCase() : '';
    if (cat.includes('dev')) {
      return { color: '#4F46E5', emoji: '📱' };
    } else if (cat.includes('design') || cat.includes('ux')) {
      return { color: '#DB2777', emoji: '🎨' };
    } else if (cat.includes('business')) {
      return { color: '#D97706', emoji: '💼' };
    } else if (cat.includes('market')) {
      return { color: '#2563EB', emoji: '📣' };
    } else if (cat.includes('personal') || cat.includes('grow')) {
      return { color: '#059669', emoji: '🌱' };
    }
    return { color: '#6B7280', emoji: '📚' };
  };

  // ── Navbar ──────────────────────────────────────────────
  const renderNavbar = () => {
    if (user) {
      const initial = user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U';
      return (
        <View style={styles.navbar}>
          <View style={styles.logoRow}>
            <View style={styles.logoIconBg}>
              <Text style={styles.logoEmoji}>💼</Text>
            </View>
            <Text style={styles.logoText}>JobSkill</Text>
          </View>
          <TouchableOpacity
            style={styles.profileNavBtn}
            onPress={onLoginPress}
            activeOpacity={0.85}
          >
            <Text style={styles.profileNavText} numberOfLines={1}>
              Hi, {user.displayName ? user.displayName.split(' ')[0] : 'User'}
            </Text>
            <View style={styles.navAvatarCircle}>
              <Text style={styles.navAvatarLetter}>{initial}</Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.navbar}>
        <View style={styles.logoRow}>
          <View style={styles.logoIconBg}>
            <Text style={styles.logoEmoji}>💼</Text>
          </View>
          <Text style={styles.logoText}>JobSkill</Text>
        </View>
        <TouchableOpacity style={styles.signInBtn} onPress={onLoginPress} activeOpacity={0.85}>
          <Ionicons name="person-outline" size={15} color="#4F46E5" />
          <Text style={styles.signInBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Hero ─────────────────────────────────────────────────
  const renderHero = () => {
    if (user) {
      return (
        <View style={styles.heroSection}>
          <View style={[styles.heroBadge, { backgroundColor: '#EEF2FF' }]}>
            <Text style={[styles.heroBadgeText, { color: '#4F46E5' }]}>★ WELCOME BACK</Text>
          </View>
          <Text style={styles.heroTitle}>
            Hi, {user.displayName || 'Learner'}!{'\n'}
            <Text style={styles.heroHighlight}>Grow Your Skills</Text>
          </Text>
          <Text style={styles.heroSub}>
            Ready to take the next step in your career? Browse active jobs or continue learning.
          </Text>
          <View style={styles.heroCtas}>
            <TouchableOpacity
              style={styles.heroPrimaryBtn}
              onPress={onLearnPress || onLoginPress}
              activeOpacity={0.85}
            >
              <Ionicons name="book-outline" size={16} color="#fff" />
              <Text style={styles.heroPrimaryBtnText}>Explore Courses</Text>
            </TouchableOpacity>
            {isJobsVisible && (
              <TouchableOpacity
                style={[styles.heroSecondaryBtn, { backgroundColor: '#F5F3FF' }]}
                onPress={onJobsPress}
                activeOpacity={0.85}
              >
                <Ionicons name="briefcase-outline" size={16} color="#4F46E5" />
                <Text style={styles.heroSecondaryBtnText}>Find Jobs</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.heroSection}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>★ INDIA&apos;S #1 LEARNING PLATFORM</Text>
        </View>
        <Text style={styles.heroTitle}>
          Learn. Grow.{'\n'}
          <Text style={styles.heroHighlight}>Succeed.</Text>
        </Text>
        <Text style={styles.heroSub}>
          1,00,000+ students · 500+ courses · 95% pass rate
        </Text>
        <View style={styles.heroCtas}>
          <TouchableOpacity 
            style={styles.heroPrimaryBtn} 
            onPress={onLearnPress || onLoginPress} 
            activeOpacity={0.85}
          >
            <Ionicons name="book-outline" size={16} color="#fff" />
            <Text style={styles.heroPrimaryBtnText}>Explore Courses</Text>
          </TouchableOpacity>
          {isJobsVisible && (
            <TouchableOpacity 
              style={styles.heroSecondaryBtn} 
              onPress={onJobsPress} 
              activeOpacity={0.85}
            >
              <Ionicons name="briefcase-outline" size={16} color="#4F46E5" />
              <Text style={styles.heroSecondaryBtnText}>Find Jobs</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Strip */}
        <View style={styles.statsStrip}>
          {[
            { val: '1L+', label: 'Students' },
            { val: '500+', label: 'Courses' },
            { val: '4.9★', label: 'Rating' },
            { val: '95%', label: 'Pass Rate' },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statVal}>{s.val}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ── Section Header ────────────────────────────────────────
  const renderSectionHeader = (
    title: string,
    onSeeAll: () => void,
    accentColor = '#4F46E5',
  ) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleWrap}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={[styles.sectionUnderline, { backgroundColor: accentColor }]} />
      </View>
      <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7} style={styles.seeAllBtn}>
        <Text style={[styles.seeAllText, { color: accentColor }]}>See All</Text>
        <Ionicons name="chevron-forward" size={14} color={accentColor} />
      </TouchableOpacity>
    </View>
  );

  // ── Courses ───────────────────────────────────────────────
  const renderCourses = () => (
    <View style={styles.section}>
      {renderSectionHeader('Popular Courses', onLearnPress || onLoginPress, '#DB2777')}

      {coursesLoading ? (
        <View style={styles.jobsLoader}>
          <ActivityIndicator size="large" color="#DB2777" />
          <Text style={styles.jobsLoaderText}>Loading courses…</Text>
        </View>
      ) : courses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>📚</Text>
          <Text style={styles.emptyStateTitle}>No Courses Yet</Text>
          <Text style={styles.emptyStateText}>Courses will be available soon.</Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          horizontal
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hListContent}
          renderItem={({ item }) => {
            const isEnrolled = enrolledCourseIds.includes(item.id);
            return (
              <View style={{ width: 280, marginRight: 4 }}>
                <CourseCard
                  course={item}
                  layoutMode="horizontal"
                  onPress={() => {
                    if (onCoursePress) {
                      onCoursePress(item.id);
                    } else {
                      onLoginPress();
                    }
                  }}
                  onEnroll={
                    user?.role === 'seeker'
                      ? (item.price === 0
                        ? () => handleEnroll(item.id)
                        : () => {
                          if (onCoursePress) onCoursePress(item.id);
                        })
                      : undefined
                  }
                  isEnrolled={isEnrolled}
                />
              </View>
            );
          }}
        />
      )}
    </View>
  );

  // ── Jobs ──────────────────────────────────────────────────
  const renderFeaturedJobs = () => (
    <View style={[styles.section, styles.jobsSection]}>
      {renderSectionHeader('Featured Jobs', onJobsPress, '#4F46E5')}

      {jobsLoading ? (
        <View style={styles.jobsLoader}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.jobsLoaderText}>Loading jobs…</Text>
        </View>
      ) : featuredJobs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>💼</Text>
          <Text style={styles.emptyStateTitle}>No Jobs Yet</Text>
          <Text style={styles.emptyStateText}>Check back soon for new opportunities.</Text>
        </View>
      ) : (
        <FlatList
          data={featuredJobs}
          horizontal
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hListContent}
          renderItem={({ item }) => {
            const hasApplied = appliedIds.includes(item.id);
            const isSaved = savedJobIds.includes(item.id);
            return (
              <View style={styles.jobCardWrapper}>
                <JobCard
                  job={item}
                  layoutMode="horizontal"
                  onPress={() => {
                    if (onJobPress) {
                      onJobPress(item.id);
                    } else {
                      onJobsPress();
                    }
                  }}
                  onApply={
                    user?.role === 'seeker'
                      ? () => handleApplyJob(item.id)
                      : user?.role === 'recruiter'
                        ? undefined
                        : onLoginPress
                  }
                  hasApplied={hasApplied}
                  isSaved={isSaved}
                  onSaveToggle={
                    user?.role === 'seeker'
                      ? () => handleToggleSaveJob(item.id)
                      : undefined
                  }
                />
              </View>
            );
          }}
        />
      )}

      {/* CTA Banner */}
      <TouchableOpacity style={styles.jobCtaBanner} onPress={onJobsPress} activeOpacity={0.88}>
        <View style={styles.jobCtaLeft}>
          <Text style={styles.jobCtaTitle}>🚀 Ready for your next role?</Text>
          <Text style={styles.jobCtaText}>200+ live jobs from top companies</Text>
        </View>
        <View style={styles.jobCtaArrow}>
          <Ionicons name="arrow-forward" size={18} color="#4F46E5" />
        </View>
      </TouchableOpacity>
    </View>
  );

  // ── Why Us ────────────────────────────────────────────────
  const renderWhyUs = () => (
    <View style={[styles.section, styles.whySection]}>
      {renderSectionHeader('Why JobSkill?', onLoginPress, '#059669')}
      <View style={styles.whyGrid}>
        {[
          { icon: 'school-outline', color: '#4F46E5', title: 'Expert Instructors', desc: 'Learn from industry veterans' },
          { icon: 'briefcase-outline', color: '#059669', title: 'Job Placement', desc: '95% placement record' },
          { icon: 'phone-portrait-outline', color: '#D97706', title: 'Learn Anywhere', desc: 'Android, iOS & Web' },
          { icon: 'ribbon-outline', color: '#DB2777', title: 'Certificates', desc: 'Industry-recognized certs' },
        ].map((item) => (
          <View key={item.title} style={styles.whyCard}>
            <View style={[styles.whyIconBg, { backgroundColor: item.color + '15' }]}>
              <Ionicons name={item.icon as any} size={22} color={item.color} />
            </View>
            <Text style={styles.whyTitle}>{item.title}</Text>
            <Text style={styles.whyDesc}>{item.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  // ── Footer CTA ────────────────────────────────────────────
  const renderFooterCta = () => (
    <View style={styles.footerCta}>
      <Text style={styles.footerCtaEmoji}>🎓</Text>
      <Text style={styles.footerCtaTitle}>Start Your Journey Today</Text>
      <Text style={styles.footerCtaText}>
        Join 1,00,000+ learners building their dream careers.
      </Text>
      <TouchableOpacity style={styles.footerCtaBtn} onPress={onLoginPress} activeOpacity={0.85}>
        <Text style={styles.footerCtaBtnText}>Get Started — It&apos;s Free</Text>
      </TouchableOpacity>
      <Text style={styles.footerCopyright}>© 2026 JobSkill · All Rights Reserved</Text>
    </View>
  );

  // ── Main Render ───────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {renderNavbar()}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#4F46E5"
          />
        }
      >
        {renderHero()}
        {renderCourses()}
        {isJobsVisible && renderFeaturedJobs()}
        {renderWhyUs()}
        {!user && renderFooterCta()}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────
const CARD_W = SCREEN_WIDTH * 0.72;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  // ── Navbar
  navbar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 16,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: -0.5,
  },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  signInBtnText: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 13,
  },
  profileNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  profileNavText: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 13,
    maxWidth: 100,
  },
  navAvatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navAvatarLetter: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },

  // ── Scroll
  scroll: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // ── Hero
  heroSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 14,
  },
  heroBadgeText: {
    color: '#065F46',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#111827',
    lineHeight: 42,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  heroHighlight: {
    color: '#10B981',
  },
  heroSub: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  heroCtas: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  heroPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 14,
  },
  heroPrimaryBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  heroSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingVertical: 14,
    borderRadius: 14,
  },
  heroSecondaryBtnText: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 15,
  },

  // ── Stats Strip
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FC',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
  },

  // ── Section layout
  section: {
    marginTop: 20,
    backgroundColor: '#ffffff',
    paddingTop: 18,
    paddingBottom: 4,
  },
  jobsSection: {
    backgroundColor: '#F5F3FF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionTitleWrap: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  sectionUnderline: {
    width: 36,
    height: 3,
    borderRadius: 2,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  hListContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },

  // ── Course Card
  courseCard: {
    width: CARD_W * 0.72,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  courseEmojiBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  courseEmoji: {
    fontSize: 22,
  },
  courseCategoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  courseCategoryText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 20,
    marginBottom: 10,
    minHeight: 40,
  },
  courseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  courseMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  courseMeta: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  coursePrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  coursePriceFree: {
    color: '#059669',
  },

  // ── Job Cards
  jobCardWrapper: {
    width: CARD_W,
  },
  jobsLoader: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  jobsLoaderText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    marginHorizontal: 16,
  },
  emptyStateEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // ── Job CTA Banner
  jobCtaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 18,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  jobCtaLeft: {
    flex: 1,
  },
  jobCtaTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 3,
  },
  jobCtaText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  jobCtaArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  // ── Why Us Grid
  whySection: {
    backgroundColor: '#F8FAFC',
    paddingBottom: 16,
  },
  whyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  whyCard: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  whyIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  whyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  whyDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    fontWeight: '500',
  },

  // ── Footer CTA
  footerCta: {
    marginTop: 20,
    marginHorizontal: 16,
    backgroundColor: '#4F46E5',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 8,
  },
  footerCtaEmoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  footerCtaTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  footerCtaText: {
    fontSize: 13,
    color: '#C7D2FE',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  footerCtaBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  footerCtaBtnText: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 15,
  },
  footerCopyright: {
    color: '#A5B4FC',
    fontSize: 11,
    fontWeight: '500',
  },
});
