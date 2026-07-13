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
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
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

const CATEGORIES = [
  { id: 'All', label: 'सर्व (All) 📱', icon: 'apps' },
  { id: 'UPSC', label: 'स्पर्धा परीक्षा (UPSC) 📚', icon: 'school-outline' },
  { id: 'Development', label: 'तंत्रज्ञान (Development) 💻', icon: 'code-slash-outline' },
  { id: 'Entrepreneurship', label: 'उद्योजकता (Entrepreneurship) 🚀', icon: 'rocket-outline' },
  { id: 'Design', label: 'रचना व कला (Design) 🎨', icon: 'color-palette-outline' },
  { id: 'Business', label: 'व्यवसाय (Business) 💼', icon: 'business-outline' },
  { id: 'Marketing', label: 'विपणन (Marketing) 📣', icon: 'megaphone-outline' },
];



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
  const [isExploreVisible, setIsExploreVisible] = useState(true);
  const [isCurrentAffairsVisible, setIsCurrentAffairsVisible] = useState(true);
  const [isResourcesVisible, setIsResourcesVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

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
          setIsExploreVisible(data.explore !== false);
          setIsCurrentAffairsVisible(data['current-affairs'] !== false);
          setIsResourcesVisible(data.resources !== false);
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

  const filteredCourses = React.useMemo(() => {
    return courses.filter((course) => {
      const title = course.title || '';
      const description = (course as any).description || '';
      const instructor = course.instructor || '';
      const category = course.category || '';

      const matchesSearch =
        !searchQuery.trim() ||
        title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        instructor.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === 'All' ||
        category.toLowerCase() === selectedCategory.toLowerCase() ||
        category.toLowerCase().includes(selectedCategory.toLowerCase());

      return matchesSearch && matchesCat;
    });
  }, [courses, searchQuery, selectedCategory]);

  const featuredCourse = React.useMemo(() => {
    if (courses.length === 0) return null;
    return [...courses].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
  }, [courses]);

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
            <Image source={require('../../assets/images/logo1.jpeg')} style={styles.logoImageSmall} />
            <Text style={styles.logoText}>गनिमी कावा</Text>
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
          <Image source={require('../../assets/images/logo1.jpeg')} style={styles.logoImageSmall} />
          <Text style={styles.logoText}>गनिमी कावा</Text>
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
          <Text style={styles.marathiHeroTitle}>
            बलाढ्य आव्हानांना पराभूत करायला आता फक्त <Text style={styles.roseText}>'कष्ट'</Text> नाही,{'\n'}
            छत्रपतींच्या गनिमी काव्यासारखी <Text style={styles.orangeText}>'मानसिक रणनीती'</Text> हवी!
          </Text>

          {/* Feature Row */}
          <View style={styles.featureRow}>
            <View style={styles.featureItem}>
              <Text style={styles.featureTitleBlue}>वैज्ञानिक तंत्र</Text>
              <Text style={styles.featureSub}>100% प्रॅक्टिकल सायंटिफिक</Text>
            </View>
            <View style={styles.featureDivider} />
            <View style={styles.featureItem}>
              <Text style={styles.featureTitleGreen}>रांगडा पॅटर्न</Text>
              <Text style={styles.featureSub}>सोपी मराठी भाषा</Text>
            </View>
            <View style={styles.featureDivider} />
            <View style={styles.featureItem}>
              <Text style={styles.featureTitlePink}>मनाची शक्ती</Text>
              <Text style={styles.featureSub}>अथांग मानसिक क्रांती</Text>
            </View>
          </View>

          {/* White Card Container */}
          <View style={styles.heroCard}>
            {/* Paragraph 1 */}
            <Text style={styles.heroCardText}>
              निराशा आणि अपयशाच्या भिंती भेदून प्रत्येक व्यक्ति, विद्यार्थी, नोकरदार, गृहिणी अन् उद्योजकाला त्याच्या मनाची अथांग शक्ती ओळखायला लावणारे, हे एक{' '}
              <Text style={styles.blueLinkText}>प्रॅक्टिकल सायंटिफिक अस्त्र</Text>
              {' '}आहे. म्हणूनच आम्ही घेऊन आलोय 'सेल्फ डेव्हलपमेंटचा{' '}
              <Text style={styles.orangeHighlightText}>गनिमी कावा</Text>
              ' ॲप! कोणतीही क्लिष्ट इंग्रजी नाही; संपूर्ण वैज्ञानिक तंत्रांचा सोपा आणि थेट मनाचा ठाव घेणारा 'रांगडा-प्रभावी' मराठी लई भारी पॅटर्न जो तुम्हाला यशाच्या शिखरावर नेईल.
            </Text>

            {/* Paragraph 2 */}
            <Text style={[styles.heroCardText, { marginTop: 12 }]}>
              कोरड्या सिद्धांतांना फाटा देत, सायकॉलॉजी तज्ज्ञांच्या थेट मार्गदर्शनाखाली रोजच्या जगण्यात क्रांती घडवून आणणारी अचूक प्रॅक्टिकल टूल्स यात मिळतील.
            </Text>
          </View>

          <View style={styles.heroCtas}>
            {isExploreVisible && (
              <TouchableOpacity
                style={styles.heroPrimaryBtn}
                onPress={onLearnPress || onLoginPress}
                activeOpacity={0.85}
              >
                <Ionicons name="book-outline" size={16} color="#fff" />
                <Text style={styles.heroPrimaryBtnText}>Explore Courses</Text>
              </TouchableOpacity>
            )}
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
        {/* Title */}
        <Text style={styles.marathiHeroTitle}>
          बलाढ्य आव्हानांना पराभूत करायला आता फक्त <Text style={styles.roseText}>'कष्ट'</Text> नाही,{'\n'}
          छत्रपतींच्या गनिमी काव्यासारखी <Text style={styles.orangeText}>'मानसिक रणनीती'</Text> हवी!
        </Text>

        {/* Feature Row */}
        <View style={styles.featureRow}>
          <View style={styles.featureItem}>
            <Text style={styles.featureTitleBlue}>वैज्ञानिक तंत्र</Text>
            <Text style={styles.featureSub}>100% प्रॅक्टिकल सायंटिफिक</Text>
          </View>
          <View style={styles.featureDivider} />
          <View style={styles.featureItem}>
            <Text style={styles.featureTitleGreen}>रांगडा पॅटर्न</Text>
            <Text style={styles.featureSub}>सोपी मराठी भाषा</Text>
          </View>
          <View style={styles.featureDivider} />
          <View style={styles.featureItem}>
            <Text style={styles.featureTitlePink}>मनाची शक्ती</Text>
            <Text style={styles.featureSub}>अथांग मानसिक क्रांती</Text>
          </View>
        </View>

        {/* White Card Container */}
        <View style={styles.heroCard}>
          {/* Paragraph 1 */}
          <Text style={styles.heroCardText}>
            निराशा आणि अपयशाच्या भिंती भेदून प्रत्येक व्यक्ति, विद्यार्थी, नोकरदार, गृहिणी अन् उद्योजकाला त्याच्या मनाची अथांग शक्ती ओळखायला लावणारे, हे एक{' '}
            <Text style={styles.blueLinkText}>प्रॅक्टिकल सायंटिफिक अस्त्र</Text>
            {' '}आहे. म्हणूनच आम्ही घेऊन आलोय 'सेल्फ डेव्हलपमेंटचा{' '}
            <Text style={styles.orangeHighlightText}>गनिमी कावा</Text>
            ' ॲप! कोणतीही क्लिष्ट इंग्रजी नाही; संपूर्ण वैज्ञानिक तंत्रांचा सोपा आणि थेट मनाचा ठाव घेणारा 'रांगडा-प्रभावी' मराठी लई भारी पॅटर्न जो तुम्हाला यशाच्या शिखरावर नेईल.
          </Text>

          {/* Paragraph 2 */}
          <Text style={[styles.heroCardText, { marginTop: 12 }]}>
            कोरड्या सिद्धांतांना फाटा देत, सायकॉलॉजी तज्ज्ञांच्या थेट मार्गदर्शनाखाली रोजच्या जगण्यात क्रांती घडवून आणणारी अचूक प्रॅक्टिकल टूल्स यात मिळतील.
          </Text>

          {/* Quote Block */}
          <View style={styles.quoteBlock}>
            <Text style={styles.quoteText}>
              इतिहास साक्षी आहे, कष्ट सगळेच करतात पण राजे तेच होतात जे 'गनिमी कावा' वापरतात; आजच सबस्क्राईब करा आणि स्वतःचा नवा इतिहास रचा!
            </Text>
          </View>
        </View>

        <View style={styles.heroCtas}>
          <TouchableOpacity style={styles.orangeCtaBtn} onPress={onLoginPress} activeOpacity={0.85}>
            <Text style={styles.orangeCtaBtnText}>आजच सबस्क्राईब करा!</Text>
          </TouchableOpacity>
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

  // ── Search & Filter ──────────────────────────────────────
  const renderSearchAndFilters = () => (
    <View style={styles.searchFilterContainer}>
      <View style={styles.searchBarWrapper}>
        <Ionicons name="search-outline" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          placeholder="What do you want to learn today?"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryFilterBtn,
                isActive && styles.categoryFilterBtnActive
              ]}
              onPress={() => setSelectedCategory(cat.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={cat.icon as any}
                size={14}
                color={isActive ? '#ffffff' : '#4B5563'}
              />
              <Text
                style={[
                  styles.categoryFilterTxt,
                  isActive && styles.categoryFilterTxtActive
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  // ── Featured Course Banner ───────────────────────────────
  const renderFeaturedCourse = () => {
    if (!featuredCourse) return null;

    const details = getCategoryDetails(featuredCourse.category);

    return (
      <View style={styles.featuredCourseWrap}>
        <Text style={styles.featuredTitle}>⚡ Featured Course</Text>
        <TouchableOpacity
          style={styles.featuredCard}
          onPress={() => {
            if (onCoursePress) onCoursePress(featuredCourse.id);
            else onLoginPress();
          }}
          activeOpacity={0.95}
        >
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>BEST SELLER</Text>
          </View>
          <View style={styles.featuredInner}>
            <Text style={[styles.featuredCardCategory, { color: '#818CF8' }]}>
              {details.emoji} {featuredCourse.category}
            </Text>
            <Text style={styles.featuredCardTitle} numberOfLines={2}>
              {featuredCourse.title}
            </Text>
            <Text style={styles.featuredCardInstructor}>
              By {featuredCourse.instructor}
            </Text>
            <View style={styles.featuredCardMeta}>
              <Text style={styles.featuredCardMetaTxt}>⭐ {(featuredCourse.rating || 0).toFixed(1)} rating</Text>
              <Text style={styles.featuredCardMetaTxt}>🕒 {featuredCourse.duration}</Text>
            </View>
            <View style={styles.featuredFooter}>
              <Text style={styles.featuredCardPrice}>
                {featuredCourse.price === 0 ? 'Free' : `₹${featuredCourse.price}`}
              </Text>
              <View style={styles.exploreBtn}>
                <Text style={styles.exploreBtnText}>Start Learning</Text>
                <Ionicons name="arrow-forward" size={14} color="#ffffff" />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Courses ───────────────────────────────────────────────
  const renderCourses = () => (
    <View style={styles.section}>
      {renderSectionHeader('अभ्यासक्रम (Explore Courses)', onLearnPress || onLoginPress, '#DB2777')}

      {renderSearchAndFilters()}

      {renderFeaturedCourse()}

      <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
        <Text style={styles.featuredTitle}>📚 Recommended for you</Text>
      </View>

      {coursesLoading ? (
        <View style={styles.jobsLoader}>
          <ActivityIndicator size="large" color="#DB2777" />
          <Text style={styles.jobsLoaderText}>Loading courses…</Text>
        </View>
      ) : filteredCourses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>🔍</Text>
          <Text style={styles.emptyStateTitle}>No Courses Found</Text>
          <Text style={styles.emptyStateText}>Try checking your search spelling or change filters.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCourses}
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
      {renderSectionHeader('Why गनिमी कावा?', onLoginPress, '#059669')}
      <View style={styles.whyGrid}>
        {[
          { icon: 'bulb-outline', color: '#4F46E5', title: 'मानसिक खंबीरता', desc: 'सायकॉलॉजी तज्ज्ञांचे थेट मार्गदर्शन व अचूक मानसिक रणनीती.' },
          { icon: 'shield-checkmark-outline', color: '#F97316', title: 'यशस्वी रणनीती', desc: 'छत्रपती शिवरायांच्या गनिमी काव्यावर आधारित प्रॅक्टिकल रणनीती.' },
          { icon: 'flame-outline', color: '#EF4444', title: 'मराठी लई भारी पॅटर्न', desc: 'कोणतीही क्लिष्ट इंग्रजी नाही, थेट मनाचा ठाव घेणारी सोपी मराठी भाषा.' },
          { icon: 'construct-outline', color: '#10B981', title: 'प्रॅक्टिकल टूल्स', desc: 'कोरड्या सिद्धांतांना फाटा देत रोजच्या जगण्यात क्रांती घडवणारी टूल्स.' },
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
      <Text style={styles.footerCtaEmoji}>🚩</Text>
      <Text style={styles.footerCtaTitle}>यश मिळवायला आजच सुरुवात करा!</Text>
      <Text style={styles.footerCtaText}>
        हजारो विद्यार्थी, नोकरदार आणि उद्योजक यांच्यासोबत सामील व्हा आणि स्वतःचा नवा इतिहास रचा!
      </Text>
      <TouchableOpacity style={styles.footerCtaBtn} onPress={onLoginPress} activeOpacity={0.85}>
        <Text style={styles.footerCtaBtnText}>ॲप सुरू करा — एकदम फ्री!</Text>
      </TouchableOpacity>
      <Text style={styles.footerCopyright}>© 2026 गनिमी कावा · All Rights Reserved</Text>
    </View>
  );

  // ── Compact Footer ────────────────────────────────────────
  const renderCompactFooter = () => (
    <View style={styles.compactFooter}>
      <View style={styles.compactFooterBrand}>
        <Image source={require('../../assets/images/logo1.jpeg')} style={styles.compactFooterLogo} />
        <Text style={styles.compactFooterName}>गनिमी कावा</Text>
      </View>
      <View style={styles.compactFooterLinks}>
        <TouchableOpacity onPress={onLoginPress}><Text style={styles.compactFooterLink}>Privacy Policy</Text></TouchableOpacity>
        <Text style={styles.compactFooterDot}>•</Text>
        <TouchableOpacity onPress={onLoginPress}><Text style={styles.compactFooterLink}>Terms of Service</Text></TouchableOpacity>
        <Text style={styles.compactFooterDot}>•</Text>
        <TouchableOpacity onPress={() => Alert.alert('Contact Support', 'Email: support@ganimikawa.in')}><Text style={styles.compactFooterLink}>Support</Text></TouchableOpacity>
      </View>
      <Text style={styles.compactFooterCopyright}>
        © 2026 गनिमी कावा. All rights reserved.
      </Text>
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
        {renderCompactFooter()}
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
  logoImageSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
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
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    lineHeight: 36,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  marathiHeroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  roseText: {
    color: '#EC4899',
  },
  orangeText: {
    color: '#F97316',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
    backgroundColor: '#FAF5FF',
    paddingVertical: 8,
    borderRadius: 10,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureTitleBlue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 2,
  },
  featureTitleGreen: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 2,
  },
  featureTitlePink: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#EC4899',
    marginBottom: 2,
  },
  featureSub: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '600',
  },
  featureDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#E2E8F0',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  heroCardText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18.5,
  },
  blueLinkText: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
    fontWeight: 'bold',
  },
  orangeHighlightText: {
    color: '#F97316',
    fontWeight: 'bold',
  },
  quoteBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#E2E8F0',
  },
  quoteText: {
    fontSize: 11.5,
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#475569',
    lineHeight: 17,
    textAlign: 'center',
  },
  orangeCtaBtn: {
    backgroundColor: '#F97316',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    width: '100%',
  },
  orangeCtaBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: 'bold',
  },
  heroHighlight: {
    color: '#10B981',
  },
  heroSub: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 20,
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
  // ── Search & Filter Styles
  searchFilterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  clearBtn: {
    padding: 4,
  },
  categoryScroll: {
    paddingVertical: 4,
    gap: 8,
  },
  categoryFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 6,
  },
  categoryFilterBtnActive: {
    backgroundColor: '#DB2777',
    borderColor: '#DB2777',
  },
  categoryFilterTxt: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  categoryFilterTxtActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // ── Featured Course Styles
  featuredCourseWrap: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  featuredTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  featuredCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#312E81',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 2,
  },
  featuredBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  featuredInner: {
    padding: 20,
  },
  featuredCardCategory: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  featuredCardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 24,
    marginBottom: 8,
  },
  featuredCardInstructor: {
    fontSize: 13,
    color: '#A5B4FC',
    fontWeight: '500',
    marginBottom: 12,
  },
  featuredCardMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  featuredCardMetaTxt: {
    color: '#C7D2FE',
    fontSize: 12,
    fontWeight: '600',
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#312E81',
    paddingTop: 16,
  },
  featuredCardPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10B981',
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  exploreBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },

  // ── Roadmaps Styles
  roadmapSection: {
    backgroundColor: '#ffffff',
    paddingBottom: 16,
  },
  roadmapScroll: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  roadmapCard: {
    width: 260,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    marginRight: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  roadmapIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  roadmapTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  roadmapSteps: {
    fontSize: 11.5,
    color: '#4B5563',
    lineHeight: 16,
    marginBottom: 16,
    minHeight: 32,
  },
  roadmapFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  roadmapLink: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Testimonials Styles
  testimonialSection: {
    backgroundColor: '#F8FAFC',
    paddingBottom: 24,
  },
  testimonialScroll: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  testimonialCard: {
    width: 280,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  testimonialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  testimonialAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  testimonialAvatarText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  testimonialUser: {
    flex: 1,
  },
  testimonialName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  testimonialRole: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  testimonialRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  testimonialRatingTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  testimonialText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  compactFooter: {
    backgroundColor: '#0F172A',
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderColor: '#1E293B',
    marginTop: 16,
  },
  compactFooterBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  compactFooterLogo: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  compactFooterName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  compactFooterLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  compactFooterLink: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  compactFooterDot: {
    color: '#475569',
    fontSize: 12,
  },
  compactFooterCopyright: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '500',
  },
});
