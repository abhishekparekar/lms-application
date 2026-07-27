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
  TouchableOpacity,
  View,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
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
  { id: 'All', label: 'All', icon: 'grid-outline' },
  { id: 'UPSC', label: 'UPSC & Exams', icon: 'school-outline' },
  { id: 'Development', label: 'Development', icon: 'code-slash-outline' },
  { id: 'Entrepreneurship', label: 'Entrepreneurship', icon: 'rocket-outline' },
  { id: 'Design', label: 'Design', icon: 'color-palette-outline' },
  { id: 'Business', label: 'Business', icon: 'business-outline' },
  { id: 'Marketing', label: 'Marketing', icon: 'megaphone-outline' },
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
  const { user, logout } = useAuth();
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

  const MOCK_LANDING_COURSES: Course[] = [
    {
      id: 'c1',
      title: 'गनिमी कावा: मानसिक रणनीती मास्टरक्लास',
      description: 'छत्रपतींच्या गनिमी काव्यासारखी मानसिक रणनीती आणि यशाचे वैज्ञानिक तंत्र.',
      instructor: 'माइंड स्ट्रॅटेजी तज्ज्ञ',
      category: 'Personal Development',
      duration: '3h 30m',
      lessonsCount: 12,
      rating: 4.9,
      price: 0,
      imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop',
      syllabus: ['मानसिक ताण मुक्ती', 'रणनीती रचना']
    },
    {
      id: 'c2',
      title: 'UPSC/MPSC: यशाचा अचूक फॉर्म्युला',
      description: 'स्पर्धा परीक्षांमध्ये उत्तम गुण मिळवण्याची शास्त्रीय अभ्यास पद्धती.',
      instructor: 'प्रो. सचिन पाटील',
      category: 'Development',
      duration: '5h 15m',
      lessonsCount: 20,
      rating: 4.8,
      price: 499,
      imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop',
      syllabus: ['स्मरणशक्ती विकास', 'टाईम मॅनेजमेंट']
    },
    {
      id: 'c3',
      title: 'फुलस्टॅक वेब डेव्हलपमेंट मास्टरक्लास',
      description: 'React, Node.js आणि React Native शिकून आयटी क्षेत्रात स्वतःचे करिअर घडवा.',
      instructor: 'अभिषेक पारेकर',
      category: 'Development',
      duration: '12h 00m',
      lessonsCount: 45,
      rating: 4.9,
      price: 999,
      imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&auto=format&fit=crop',
      syllabus: ['Frontend', 'Backend', 'Database']
    },
    {
      id: 'c4',
      title: 'उद्योजकता आणि व्यवसाय व्यवस्थापन',
      description: 'शून्यातून उद्योग कसा उभारावा आणि नफा वाढवावा याचे प्रॅक्टिकल ज्ञान.',
      instructor: 'संजय देशपांडे',
      category: 'Business',
      duration: '4h 45m',
      lessonsCount: 16,
      rating: 4.7,
      price: 299,
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop',
      syllabus: ['बिझनेस प्लॅन', 'मार्केटिंग']
    },
    {
      id: 'c5',
      title: 'UI/UX डिझाईन आणि फिड्मा मास्टरक्लास',
      description: 'मोबाईल ॲप्स आणि वेबसाईटसाठी आकर्षक युझर इंटरफेस कसा डिझाईन करावा.',
      instructor: 'नेहा जोशी',
      category: 'Design',
      duration: '6h 20m',
      lessonsCount: 24,
      rating: 4.9,
      price: 0,
      imageUrl: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=600&auto=format&fit=crop',
      syllabus: ['Figma Basics', 'Wireframing']
    },
    {
      id: 'c6',
      title: 'डिजिटल मार्केटिंग आणि ब्रँडिंग',
      description: 'सोशल मीडिया, SEO आणि ॲड्सद्वारे तुमच्या ब्रँडचा व्यवसाय वाढवा.',
      instructor: 'अमित कदम',
      category: 'Marketing',
      duration: '4h 10m',
      lessonsCount: 18,
      rating: 4.6,
      price: 399,
      imageUrl: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=600&auto=format&fit=crop',
      syllabus: ['Social Media', 'SEO']
    },
    {
      id: 'c7',
      title: 'कम्युनिकेशन आणि पर्सनॅलिटी डेव्हलपमेंट',
      description: 'आत्मविश्वास वाढवून इंग्रजी व संवाद कौशल्यात प्रभुत्व मिळवा.',
      instructor: 'डॉ. स्वाती केळकर',
      category: 'Business',
      duration: '3h 50m',
      lessonsCount: 15,
      rating: 4.8,
      price: 0,
      imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&auto=format&fit=crop',
      syllabus: ['Public Speaking', 'Body Language']
    },
    {
      id: 'c8',
      title: 'आर्थिक नियोजन आणि इन्व्हेस्टमेंट',
      description: 'शेअर मार्केट, म्युच्युअल फंड आणि स्मार्ट सेव्हिंग्सचे अचूक नियम.',
      instructor: 'रोहन शहा',
      category: 'Business',
      duration: '5h 00m',
      lessonsCount: 22,
      rating: 4.9,
      price: 499,
      imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop',
      syllabus: ['Mutual Funds', 'Stock Market']
    }
  ];

  const filteredCourses = React.useMemo(() => {
    const base = courses.length >= 8
      ? courses
      : [...courses, ...MOCK_LANDING_COURSES.filter(m => !courses.some(c => c.id === m.id))].slice(0, 8);

    return base.filter((course) => {
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

  const MOCK_LANDING_JOBS: Job[] = [
    {
      id: 'j1',
      title: 'React Native Mobile Developer',
      company: 'Ganimi Tech Solutions',
      location: 'Pune / Remote',
      type: 'Full-time',
      experienceLevel: 'Entry Level',
      salaryRange: '₹4.5L - ₹7.0L',
      description: 'Build high performance React Native apps.',
      postedDate: '2 days ago',
      logoUrl: '',
      requirements: ['React Native', 'TypeScript'],
      applicantsCount: 5,
      recruiterId: 'rec1'
    },
    {
      id: 'j2',
      title: 'Fullstack Web Engineer',
      company: 'Swarajya Systems',
      location: 'Mumbai (Hybrid)',
      type: 'Full-time',
      experienceLevel: 'Mid Level',
      salaryRange: '₹8.0L - ₹12.0L',
      description: 'Develop Node.js and React web portals.',
      postedDate: '1 day ago',
      logoUrl: '',
      requirements: ['Node.js', 'React'],
      applicantsCount: 8,
      recruiterId: 'rec2'
    },
    {
      id: 'j3',
      title: 'UI/UX Product Designer',
      company: 'Creative Design Studio',
      location: 'Bangalore / Remote',
      type: 'Full-time',
      experienceLevel: 'Entry Level',
      salaryRange: '₹5.0L - ₹8.5L',
      description: 'Design mobile apps and Figma prototypes.',
      postedDate: '3 days ago',
      logoUrl: '',
      requirements: ['Figma', 'UI/UX'],
      applicantsCount: 12,
      recruiterId: 'rec3'
    },
    {
      id: 'j4',
      title: 'Digital Marketing Executive',
      company: 'GrowthX Media',
      location: 'Nashik (Office)',
      type: 'Full-time',
      experienceLevel: 'Entry Level',
      salaryRange: '₹3.5L - ₹5.5L',
      description: 'Manage SEO, Meta ads, and brand marketing.',
      postedDate: 'Just now',
      logoUrl: '',
      requirements: ['SEO', 'Digital Marketing'],
      applicantsCount: 4,
      recruiterId: 'rec4'
    },
    {
      id: 'j5',
      title: 'Data Analyst & Python Dev',
      company: 'Analytics India',
      location: 'Pune (Hybrid)',
      type: 'Full-time',
      experienceLevel: 'Mid Level',
      salaryRange: '₹6.5L - ₹10.0L',
      description: 'Analyze business datasets with Python & SQL.',
      postedDate: '4 days ago',
      logoUrl: '',
      requirements: ['Python', 'SQL'],
      applicantsCount: 6,
      recruiterId: 'rec5'
    },
    {
      id: 'j6',
      title: 'Backend Node.js Architect',
      company: 'CloudScale Services',
      location: 'Remote',
      type: 'Full-time',
      experienceLevel: 'Senior Level',
      salaryRange: '₹12.0L - ₹18.0L',
      description: 'Build scalable microservices and APIs.',
      postedDate: '5 days ago',
      logoUrl: '',
      requirements: ['Node.js', 'AWS', 'Microservices'],
      applicantsCount: 15,
      recruiterId: 'rec6'
    },
    {
      id: 'j7',
      title: 'Business Development Manager',
      company: 'Apex Innovations',
      location: 'Chhatrapati Sambhajinagar',
      type: 'Full-time',
      experienceLevel: 'Mid Level',
      salaryRange: '₹6.0L - ₹9.0L',
      description: 'Drive B2B sales and business partnerships.',
      postedDate: '1 week ago',
      logoUrl: '',
      requirements: ['B2B Sales', 'Business Strategy'],
      applicantsCount: 9,
      recruiterId: 'rec7'
    },
    {
      id: 'j8',
      title: 'HR & Talent Acquisition Lead',
      company: 'TalentHub Solutions',
      location: 'Kolhapur (Office)',
      type: 'Full-time',
      experienceLevel: 'Mid Level',
      salaryRange: '₹4.0L - ₹6.5L',
      description: 'Recruit top engineering and management talent.',
      postedDate: '2 days ago',
      logoUrl: '',
      requirements: ['Hiring', 'HR Operations'],
      applicantsCount: 7,
      recruiterId: 'rec8'
    }
  ];

  const displayJobs = React.useMemo(() => {
    if (featuredJobs.length >= 8) return featuredJobs;
    const existingIds = new Set(featuredJobs.map(j => j.id));
    const extra = MOCK_LANDING_JOBS.filter(j => !existingIds.has(j.id));
    return [...featuredJobs, ...extra].slice(0, 8);
  }, [featuredJobs]);

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
            <Image source={require('../../assets/images/logoimg22.png')} style={styles.logoImageSmall} resizeMode="contain" />
            <Text style={styles.logoText}>Ganimi Kava</Text>
          </View>
          <View style={styles.navRightRow}>
            <TouchableOpacity
              style={styles.profileNavBtn}
              onPress={onLoginPress}
              activeOpacity={0.85}
            >
              <View style={styles.navAvatarCircle}>
                <Text style={styles.navAvatarLetter}>{initial}</Text>
              </View>
              <Text style={styles.profileNavText} numberOfLines={1}>
                {user.displayName ? user.displayName.split(' ')[0] : 'Profile'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutNavBtn}
              onPress={() => {
                if (logout) logout();
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="log-out-outline" size={15} color="#EF4444" />
              <Text style={styles.logoutNavBtnText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.navbar}>
        <View style={styles.logoRow}>
          <Image source={require('../../assets/images/logoimg22.png')} style={styles.logoImageSmall} resizeMode="contain" />
          <Text style={styles.logoText}>Ganimi Kava</Text>
        </View>
        <TouchableOpacity style={styles.signInBtn} onPress={onLoginPress} activeOpacity={0.85}>
          <Ionicons name="log-in-outline" size={16} color="#4F46E5" />
          <Text style={styles.signInBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Hero ─────────────────────────────────────────────────
  const renderHero = () => {
    return (
      <View style={styles.heroSection}>
        <View style={styles.heroBadgeWrap}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={12} color="#059669" />
            <Text style={styles.heroBadgeText}>#1 STRATEGIC LEARNING & PLACEMENT PLATFORM</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.marathiHeroTitle}>
          बलाढ्य आव्हानांना पराभूत करायला आता फक्त <Text style={styles.roseText}>&apos;कष्ट&apos;</Text> नाही,{'\n'}
          छत्रपतींच्या गनिमी काव्यासारखी <Text style={styles.orangeText}>&apos;मानसिक रणनीती&apos;</Text> हवी!
        </Text>

        {/* Action Buttons */}
        <View style={styles.heroCtas}>
          {isExploreVisible && (
            <TouchableOpacity
              style={styles.heroPrimaryBtn}
              onPress={onLearnPress || onLoginPress}
              activeOpacity={0.88}
            >
              <Ionicons name="book" size={16} color="#ffffff" />
              <Text style={styles.heroPrimaryBtnText}>Explore Courses</Text>
            </TouchableOpacity>
          )}
          {isJobsVisible && (
            <TouchableOpacity
              style={styles.heroSecondaryBtn}
              onPress={onJobsPress}
              activeOpacity={0.88}
            >
              <Ionicons name="briefcase-outline" size={16} color="#4F46E5" />
              <Text style={styles.heroSecondaryBtnText}>Find Jobs</Text>
            </TouchableOpacity>
          )}
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
      {renderSectionHeader('Explore Courses', onLearnPress || onLoginPress, '#4F46E5')}

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
        <View style={styles.courseGridContainer}>
          {filteredCourses.map((item) => {
            const isEnrolled = enrolledCourseIds.includes(item.id);
            return (
              <View key={item.id} style={styles.courseGridItem}>
                <CourseCard
                  course={item}
                  layoutMode="vertical"
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
          })}
        </View>
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
        <View style={styles.courseGridContainer}>
          {displayJobs.map((item) => {
            const hasApplied = appliedIds.includes(item.id);
            const isSaved = savedJobIds.includes(item.id);
            return (
              <View key={item.id} style={styles.courseGridItem}>
                <JobCard
                  job={item}
                  layoutMode="vertical"
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
          })}
        </View>
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

  // ── Why Choose Ganimi Kava ────────────────────────────────
  const renderWhyUs = () => (
    <View style={[styles.section, styles.whySection]}>
      {renderSectionHeader('Why Choose Ganimi Kava?', onLoginPress, '#4F46E5')}
      <View style={styles.whyGrid}>
        {[
          {
            icon: 'bulb-outline',
            color: '#4F46E5',
            title: 'Mental Fortitude',
            tag: 'मानसिक खंबीरता',
            desc: 'Expert psychological guidance & proven mindsets for career & exam success.',
          },
          {
            icon: 'shield-checkmark-outline',
            color: '#F97316',
            title: 'Strategic Blueprint',
            tag: 'यशस्वी रणनीती',
            desc: 'Tactical learning frameworks inspired by timeless strategic mastery.',
          },
          {
            icon: 'flame-outline',
            color: '#EF4444',
            title: 'Simplified Learning',
            tag: 'सोपी व प्रभावी भाषा',
            desc: 'Complex concepts translated into crystal-clear, intuitive Marathi & English lessons.',
          },
          {
            icon: 'construct-outline',
            color: '#10B981',
            title: 'Practical Tools',
            tag: 'प्रॅक्टिकल टूल्स',
            desc: 'Hands-on projects, resume builders, and job-ready tools for real-world growth.',
          },
        ].map((item) => (
          <View key={item.title} style={styles.whyCard}>
            <View style={styles.whyCardHeader}>
              <View style={[styles.whyIconBg, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <View style={[styles.whyTagBadge, { backgroundColor: item.color + '10', borderColor: item.color + '30' }]}>
                <Text style={[styles.whyTagText, { color: item.color }]}>{item.tag}</Text>
              </View>
            </View>
            <Text style={styles.whyTitle}>{item.title}</Text>
            <Text style={styles.whyDesc}>{item.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  // ── Footer ────────────────────────────────────────────────
  const renderFooterCta = () => (
    <View style={styles.footerWrapper}>
      {/* CTA Banner */}
      <View style={styles.footerCtaBanner}>
        <Text style={styles.footerCtaTitle}>यश मिळवायला आजच सुरुवात करा!</Text>
        <Text style={styles.footerCtaText}>
          हजारो विद्यार्थी, नोकरदार आणि उद्योजक यांच्यासोबत सामील व्हा{'\n'}आणि स्वतःचा नवा इतिहास रचा!
        </Text>
        <TouchableOpacity
          style={styles.footerCtaBtn}
          onPress={onLoginPress}
          activeOpacity={0.88}
        >
          <Ionicons name="rocket-outline" size={16} color="#4F46E5" />
          <Text style={styles.footerCtaBtnText}>ॲप सुरू करा — एकदम फ्री!</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Compact Footer (stub — merged above) ─────────────────
  const renderCompactFooter = () => null;

  // ── Main Render ───────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
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
    backgroundColor: '#4F46E5',
  },

  // ── Navbar
  navbar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#4F46E5',
    borderBottomWidth: 1,
    borderBottomColor: '#4338CA',
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
    backgroundColor: '#4338CA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 16,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  navRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  signInBtnText: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  profileNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 18,
  },
  profileNavText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
    maxWidth: 90,
  },
  logoutNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  logoutNavBtnText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 11.5,
  },
  courseGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 6,
  },
  courseGridItem: {
    width: '48.5%',
    marginBottom: 12,
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
    paddingBottom: 20,
  },

  // ── Hero
  heroSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  heroBadgeWrap: {
    alignItems: 'center',
    marginBottom: 10,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroBadgeText: {
    color: '#065F46',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    lineHeight: 32,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  marathiHeroTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 10,
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
    marginTop: 6,
    marginBottom: 6,
  },
  heroPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  heroPrimaryBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  heroSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    paddingVertical: 12,
    borderRadius: 14,
  },
  heroSecondaryBtnText: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.2,
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
    marginTop: 12,
    backgroundColor: '#ffffff',
    paddingTop: 14,
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
    marginBottom: 10,
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

  // ── Why Choose Ganimi Kava Grid
  whySection: {
    backgroundColor: '#F8FAFC',
    paddingBottom: 4,
  },
  whySubHeader: {
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: -8,
  },
  whySubHeaderText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  whyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  whyCard: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    justifyContent: 'space-between',
  },
  whyCardHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  whyIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whyTagBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  whyTagText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  whyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    lineHeight: 19,
  },
  whyDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16.5,
    fontWeight: '500',
  },

  // ── Footer Wrapper
  footerWrapper: {
    marginTop: 8,
  },

  // ── Footer CTA Banner
  footerCtaBanner: {
    marginHorizontal: 16,
    marginBottom: 0,
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  footerCtaIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  footerCtaEmoji: {
    fontSize: 26,
  },
  footerCtaTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  footerCtaText: {
    fontSize: 12.5,
    color: '#C7D2FE',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  footerCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  footerCtaBtnText: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.1,
  },
  footerCopyright: {
    color: '#A5B4FC',
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 14,
  },

  // ── Footer Divider
  footerDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#1E293B',
    marginBottom: 16,
  },

  // ── Compact Dark Footer Bar
  compactFooter: {
    backgroundColor: '#0F172A',
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 0,
  },
  compactFooterBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  compactFooterLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  compactFooterName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  compactFooterTagline: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  compactFooterLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  compactFooterLink: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  compactFooterDot: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '300',
  },
  compactFooterCopyright: {
    color: '#475569',
    fontSize: 10.5,
    fontWeight: '500',
    textAlign: 'center',
  },
  searchFilterContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
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
    fontSize: 13.5,
    color: '#111827',
    fontWeight: '500',
  },
  clearBtn: {
    padding: 4,
  },
  categoryScroll: {
    paddingVertical: 2,
    gap: 8,
  },
  categoryFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 6,
  },
  categoryFilterBtnActive: {
    backgroundColor: '#DB2777',
    borderColor: '#DB2777',
  },
  categoryFilterTxt: {
    fontSize: 11.5,
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
    marginBottom: 14,
  },
  featuredTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  featuredCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#312E81',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  featuredBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 2,
  },
  featuredBadgeText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  featuredInner: {
    padding: 16,
  },
  featuredCardCategory: {
    fontSize: 10.5,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  featuredCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 22,
    marginBottom: 6,
  },
  featuredCardInstructor: {
    fontSize: 12,
    color: '#A5B4FC',
    fontWeight: '500',
    marginBottom: 10,
  },
  featuredCardMeta: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 12,
  },
  featuredCardMetaTxt: {
    color: '#C7D2FE',
    fontSize: 11.5,
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
});
