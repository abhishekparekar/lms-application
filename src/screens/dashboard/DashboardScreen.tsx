import { CourseCard } from '@/components/cards/CourseCard';
import { JobCard } from '@/components/cards/JobCard';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/services/firebase/config';
import { Job, JobApplication, jobService } from '@/services/jobs/jobService';
import { Course, courseService, lmsService } from '@/services/lms/lmsService';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, onSnapshot, query, where, getDocs, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
  Modal,
  TextInput,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = SCREEN_WIDTH * 0.75;

interface DashboardScreenProps {
  onBrowseCourses: () => void;
  onBrowseJobs: () => void;
  onViewApplications: () => void;
  onPostJobPress?: (editingJobId?: string) => void;
  onViewNews: () => void;
  onViewResources: () => void;
  onViewSupport: () => void;
  onLogout: () => void;
  onCoursePress: (courseId: string) => void;
  onJobPress: (jobId: string) => void;
  onTakeTest?: (courseId: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onBrowseCourses,
  onBrowseJobs,
  onViewApplications,
  onPostJobPress,
  onViewNews,
  onViewResources,
  onViewSupport,
  onLogout,
  onCoursePress,
  onJobPress,
  onTakeTest,
}) => {
  const { user, updateProfile } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [recruiterTab, setRecruiterTab] = useState<'overview' | 'my_jobs' | 'applications' | 'analytics' | 'profile' | 'candidates'>('overview');

  // Search & Status filters for recruiter applications tab
  const [appsSearchTerm, setAppsSearchTerm] = useState('');
  const [appsStatusFilter, setAppsStatusFilter] = useState<'all' | 'pending' | 'reviewing' | 'interviewing' | 'accepted' | 'rejected'>('all');

  // Recruiter Profile Editor states
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [companyFromCollection, setCompanyFromCollection] = useState<any>(null);
  const [companyName, setCompanyName] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyPosition, setCompanyPosition] = useState('');
  const [companyBio, setCompanyBio] = useState('');
  const [savingCompany, setSavingCompany] = useState(false);

  // Candidate Search states
  const [candidateList, setCandidateList] = useState<any[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesSearch, setCandidatesSearch] = useState('');
  const [candidatesStateFilter, setCandidatesStateFilter] = useState('');
  const [candidatesDistrictFilter, setCandidatesDistrictFilter] = useState('');
  const [candidatesTalukaFilter, setCandidatesTalukaFilter] = useState('');
  const [candidatesSkillsFilter, setCandidatesSkillsFilter] = useState('');
  const [candidatesExpFilter, setCandidatesExpFilter] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [revealedIds, setRevealedIds] = useState<string[]>([]);
  const [isJobsVisible, setIsJobsVisible] = useState(true);
  const [testSeriesModalVisible, setTestSeriesModalVisible] = useState(false);

  // Sync editor fields with database recruiter profile data
  useEffect(() => {
    if (user?.role === 'recruiter') {
      const dbCompany = companyFromCollection;
      const dbUser = user.recruiterProfile;
      setCompanyName(dbCompany?.name || dbCompany?.companyName || dbUser?.companyName || '');
      setCompanyIndustry(dbCompany?.industry || dbUser?.industry || '');
      setCompanyWebsite(dbCompany?.website || dbCompany?.companyWebsite || dbUser?.companyWebsite || '');
      setCompanyPosition(dbCompany?.position || dbUser?.position || '');
      setCompanyBio(dbCompany?.bio || dbCompany?.description || dbUser?.bio || '');
    }
  }, [user, companyModalVisible, companyFromCollection]);

  const enrolledCourses = allCourses.filter(c => 
    enrolledIds.includes(c.id) || 
    (user && c.enrolledUsers && c.enrolledUsers.includes(user.uid)) ||
    c.price === 0 ||
    (c as any).isFree
  );

  useEffect(() => {
    if (!user) return;

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
        console.error('Courses snapshot error:', err);
        setLoading(false);
      }
    );

    const jobsQ = user.role === 'recruiter'
      ? query(collection(db, 'jobs'), where('recruiterId', '==', user.uid))
      : collection(db, 'jobs');

    const unsubscribeJobs = onSnapshot(
      jobsQ,
      (snapshot) => {
        const list: Job[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Job);
        });
        setActiveJobs(list);
      },
      (err) => console.error('Jobs snapshot error:', err)
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
          setSavedJobIds(data.savedJobIds || []);

          const progress: Record<string, number> = {};
          if (data.courseProgress && typeof data.courseProgress === 'object') {
            Object.keys(data.courseProgress).forEach((cid) => {
              const val = data.courseProgress[cid];
              if (typeof val === 'number') {
                progress[cid] = val;
              }
            });
          }
          setProgressMap(progress);
        }
      },
      (err) => console.error('User doc snapshot error:', err)
    );

    let unsubscribeApps: (() => void) | undefined;

    if (user.role === 'seeker') {
      const appsQ = query(collection(db, 'applications'), where('seekerId', '==', user.uid));
      unsubscribeApps = onSnapshot(
        appsQ,
        (snapshot) => {
          const list: JobApplication[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as JobApplication);
          });
          setApplications(list);
        },
        (err) => console.error('Seeker applications error:', err)
      );
    } else {
      const appsQ = query(collection(db, 'applications'), where('employerId', '==', user.uid));
      unsubscribeApps = onSnapshot(
        appsQ,
        (appsSnap) => {
          const list: JobApplication[] = [];
          appsSnap.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as JobApplication);
          });
          setApplications(list);
        },
        (err) => console.error('Recruiter applications error:', err)
      );
    }

    let unsubscribeCompany: (() => void) | undefined;
    if (user.role === 'recruiter') {
      unsubscribeCompany = onSnapshot(
        doc(db, 'companies', user.uid),
        (snap) => {
          if (snap.exists()) {
            setCompanyFromCollection(snap.data());
          } else {
            const q = query(collection(db, 'companies'), where('userId', '==', user.uid));
            getDocs(q).then((querySnap) => {
              if (!querySnap.empty) {
                setCompanyFromCollection(querySnap.docs[0].data());
              }
            });
          }
        },
        (err) => console.error('Company doc listener error:', err)
      );
      // Fetch jobseeker candidates
      setCandidatesLoading(true);
      const seekersQ = query(collection(db, 'users'), where('role', '==', 'seeker'));
      getDocs(seekersQ).then((snap) => {
        const list: any[] = [];
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setCandidateList(list);
        setCandidatesLoading(false);
      }).catch((err) => {
        console.error('Failed to load seekers:', err);
        setCandidatesLoading(false);
      });
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
        console.error('Visibility snapshot error:', err);
      }
    );

    return () => {
      unsubscribeCourses();
      unsubscribeJobs();
      unsubscribeUser();
      unsubscribeVisibility();
      if (unsubscribeApps) unsubscribeApps();
      if (unsubscribeCompany) unsubscribeCompany();
    };
  }, [user]);

  const handleEnroll = async (courseId: string) => {
    if (!user) return;
    try {
      await courseService.enrollInCourse(user.uid, courseId);
      Alert.alert('🎉 Success', 'You have enrolled in the course successfully!');
    } catch (e: any) {
      console.error('Failed to enroll:', e);
      Alert.alert('Enrollment Failed', e.message || 'Could not enroll in course.');
    }
  };

  const handleApplyJob = async (jobId: string) => {
    if (!user) return;
    try {
      await jobService.applyForJob(user.uid, jobId);
      Alert.alert('🎉 Applied Successfully!', 'Your application has been logged.');
    } catch (e: any) {
      Alert.alert('Apply Failed', e.message || 'Could not submit application.');
    }
  };

  const handleToggleSaveJob = async (jobId: string) => {
    if (!user) return;
    const isCurrentlySaved = savedJobIds.includes(jobId);

    if (isCurrentlySaved) {
      setSavedJobIds(prev => prev.filter(id => id !== jobId));
    } else {
      setSavedJobIds(prev => [...prev, jobId]);
    }

    try {
      await lmsService.toggleBookmarkJob(user.uid, jobId, isCurrentlySaved);
    } catch (e) {
      console.warn('Failed to toggle bookmark job:', e);
    }
  };

  const handleDeleteJob = (jobId: string) => {
    Alert.alert(
      'Delete Job / नोकरी काढा',
      'Are you sure you want to delete this job listing permanently? / आपण ही नोकरी सूची कायमची काढू इच्छिता?',
      [
        { text: 'Cancel / रद्द करा', style: 'cancel' },
        {
          text: 'Delete / काढा',
          style: 'destructive',
          onPress: async () => {
            try {
              await jobService.deleteJob(jobId);
              Alert.alert('Success 🎉', 'Job listing deleted successfully.');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not delete job.');
            }
          }
        }
      ]
    );
  };

  const isSeeker = user?.role === 'seeker';
  const completeness = user?.profileCompleteness ?? 0;
  const appliedJobIds = applications.map(a => a.jobId);

  // Recruiter Dashboard Metrics
  const recruiterJobs = activeJobs.filter(j => j.recruiterId === user?.uid);
  const activeJobsCount = recruiterJobs.length;
  const draftJobsCount = 0; // standard mock from screenshot
  const totalAppsCount = applications.length;

  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const reviewingCount = applications.filter(a => a.status === 'reviewing').length;
  const shortlistedCount = applications.filter(a => a.status === 'accepted' || a.status === 'interviewing').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;

  const handleUpdateStatus = async (appId: string, newStatus: 'pending' | 'reviewing' | 'interviewing' | 'accepted' | 'rejected') => {
    try {
      await jobService.updateApplicationStatus(appId, newStatus);
      Alert.alert('Status Updated', `Application status updated to ${newStatus.toUpperCase()}`);
    } catch (e: any) {
      Alert.alert('Update Failed', e.message || 'Could not update status.');
    }
  };

  const handleSaveCompanyProfile = async () => {
    if (!user) return;
    if (!companyName.trim() || !companyIndustry.trim()) {
      Alert.alert('Validation Error', 'Company Name and Industry are required.');
      return;
    }
    setSavingCompany(true);
    try {
      await updateProfile({
        recruiterProfile: {
          companyName: companyName.trim(),
          industry: companyIndustry.trim(),
          companyWebsite: companyWebsite.trim(),
          position: companyPosition.trim(),
          bio: companyBio.trim(),
        }
      });

      // Save to 'companies' collection for web sync
      await setDoc(doc(db, 'companies', user.uid), {
        userId: user.uid,
        name: companyName.trim(),
        companyName: companyName.trim(),
        industry: companyIndustry.trim(),
        website: companyWebsite.trim(),
        companyWebsite: companyWebsite.trim(),
        position: companyPosition.trim(),
        bio: companyBio.trim(),
        description: companyBio.trim(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      Alert.alert('Success 🎉', 'Company profile updated successfully.');
      setCompanyModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save company profile.');
    } finally {
      setSavingCompany(false);
    }
  };

  const companyInitials = (companyFromCollection?.name || companyFromCollection?.companyName || user?.recruiterProfile?.companyName || 'icoded automation pvt ltd')
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Generate dynamic recent activities for recruiter
  const getRecruiterActivities = () => {
    const list: Array<{ id: string; text: string; time: string; type: 'post' | 'apply' | 'review' | 'shortlist' | 'reject' }> = [];
    
    applications.forEach(app => {
      if (app.status === 'reviewing') {
        list.push({
          id: `act-rev-${app.id}`,
          text: `Reviewing applicant for ${app.jobTitle}`,
          time: '2d ago',
          type: 'review'
        });
      } else if (app.status === 'pending') {
        list.push({
          id: `act-app-${app.id}`,
          text: `New applicant applied for ${app.jobTitle}`,
          time: '2d ago',
          type: 'apply'
        });
      } else if (app.status === 'accepted' || app.status === 'interviewing') {
        list.push({
          id: `act-short-${app.id}`,
          text: `Shortlisted applicant for ${app.jobTitle}`,
          time: '1d ago',
          type: 'shortlist'
        });
      } else if (app.status === 'rejected') {
        list.push({
          id: `act-rej-${app.id}`,
          text: `Rejected applicant for ${app.jobTitle}`,
          time: '1d ago',
          type: 'reject'
        });
      }
    });

    recruiterJobs.forEach(job => {
      list.push({
        id: `act-post-${job.id}`,
        text: `Posted: ${job.title}`,
        time: job.postedDate ? `${job.postedDate}` : '17d ago',
        type: 'post'
      });
    });

    // Fallback static items if there are no items
    if (list.length === 0) {
      return [
        { id: 'mock-1', text: 'Reviewing abhishek parekar for senior software Developer', time: '2d ago', type: 'review' as const },
        { id: 'mock-2', text: 'abhishek parekar applied for senior software Developer', time: '2d ago', type: 'apply' as const },
        { id: 'mock-3', text: 'Posted: senior software Developer', time: '17d ago', type: 'post' as const }
      ];
    }

    return list.slice(0, 5);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Image source={require('../../assets/images/logo1.jpeg')} style={styles.logoImageSmall} />
          <Text style={styles.logoText}>गनिमी कावा</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={16} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {isSeeker ? (
        <>
          {/* ════════════════════════════════════════════════════════════
          // SEEKER DASHBOARD VIEW
          // ════════════════════════════════════════════════════════════ */}
          <ScrollView
          style={[styles.container, { backgroundColor: '#F8FAFC' }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
              <Ionicons name="book" size={24} color="#4F46E5" style={styles.statIcon} />
              <Text style={styles.statNumber}>{enrolledCourses.length}</Text>
              <Text style={styles.statLabel}>Courses Enrolled</Text>
            </View>
            {isJobsVisible && (
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                onPress={onViewApplications}
                activeOpacity={0.9}
              >
                <Ionicons name="paper-plane" size={24} color="#059669" style={styles.statIcon} />
                <Text style={styles.statNumber}>{applications.length}</Text>
                <Text style={styles.statLabel}>Applications</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSolid]} onPress={onBrowseCourses}>
              <Ionicons name="book-outline" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnTextSolid}>Explore Courses</Text>
            </TouchableOpacity>
            {isJobsVisible && (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={onBrowseJobs}>
                <Ionicons name="briefcase-outline" size={18} color="#4F46E5" />
                <Text style={styles.actionBtnTextOutline}>Find Jobs</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Study Resources */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Study Resources</Text>
            <View style={styles.toolsGrid}>
              <TouchableOpacity style={[styles.toolItem, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }]} onPress={onViewNews}>
                <Ionicons name="newspaper-outline" size={22} color="#16A34A" style={styles.toolIcon} />
                <Text style={styles.toolLabel}>Current Affairs</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toolItem, { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5' }]} onPress={onViewResources}>
                <Ionicons name="folder-open-outline" size={22} color="#D97706" style={styles.toolIcon} />
                <Text style={styles.toolLabel}>Study Files</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toolItem, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]} 
                onPress={() => setTestSeriesModalVisible(true)}
              >
                <Ionicons name="school-outline" size={22} color="#4F46E5" style={styles.toolIcon} />
                <Text style={styles.toolLabel}>Test Series</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toolItem, { backgroundColor: '#F5F3FF', borderColor: '#EDE9FE' }]} onPress={onViewSupport}>
                <Ionicons name="chatbubbles-outline" size={22} color="#7C3AED" style={styles.toolIcon} />
                <Text style={styles.toolLabel}>Support Desk</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* My Lecture Progress */}
          {enrolledCourses.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>My Lecture Progress</Text>
              {enrolledCourses.slice(0, 3).map((course) => {
                const progress = progressMap[course.id] || 0;
                return (
                  <TouchableOpacity
                    key={course.id}
                    style={styles.enrolledCourseCard}
                    onPress={() => onCoursePress(course.id)}
                    activeOpacity={0.9}
                  >
                    <Image source={{ uri: course.imageUrl }} style={styles.enrolledCourseImg} />
                    <View style={styles.enrolledCourseInfo}>
                      <Text style={[styles.enrolledCourseTitle, { color: colors.text }]} numberOfLines={1}>
                        {course.title}
                      </Text>
                      <Text style={styles.enrolledCourseInstructor}>By {course.instructor}</Text>
                      <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                      </View>
                      <View style={styles.rowBetween}>
                        <Text style={styles.progressPctText}>{progress}% Complete</Text>
                        <Text style={styles.resumeLearningText}>Resume Lecture</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Popular Live Courses */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 2 }]}>Popular Live Courses</Text>
                <Text style={styles.sectionSubtitle}>Expand your expertise with superadmin classes</Text>
              </View>
              <TouchableOpacity onPress={onBrowseCourses} style={styles.seeAllLink}>
                <Text style={styles.seeAllLinkText}>See All</Text>
                <Ionicons name="chevron-forward" size={14} color="#4F46E5" />
              </TouchableOpacity>
            </View>

            {allCourses.length === 0 ? (
              <View style={styles.emptyCard}>
                {loading ? (
                  <ActivityIndicator size="small" color="#4F46E5" />
                ) : (
                  <>
                    <Ionicons name="book-outline" size={32} color="#94A3B8" />
                    <Text style={styles.emptyText}>No available courses yet.</Text>
                  </>
                )}
              </View>
            ) : (
              <FlatList
                data={allCourses}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => `all-c-${item.id}`}
                contentContainerStyle={styles.horizontalList}
                renderItem={({ item }) => {
                  const isEnrolled = enrolledIds.includes(item.id);
                  return (
                    <View style={{ width: 280, marginRight: 16 }}>
                      <CourseCard
                        course={item}
                        layoutMode="horizontal"
                        onPress={() => onCoursePress(item.id)}
                        onEnroll={item.price === 0 ? () => handleEnroll(item.id) : () => onCoursePress(item.id)}
                        isEnrolled={isEnrolled}
                      />
                    </View>
                  );
                }}
              />
            )}
          </View>

          {isJobsVisible && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 2 }]}>Featured Job Openings</Text>
                  <Text style={styles.sectionSubtitle}>Find jobs matching your skills and experience</Text>
                </View>
                <TouchableOpacity onPress={onBrowseJobs} style={styles.seeAllLink}>
                  <Text style={styles.seeAllLinkText}>See All</Text>
                  <Ionicons name="chevron-forward" size={14} color="#4F46E5" />
                </TouchableOpacity>
              </View>

              {activeJobs.length === 0 ? (
                <View style={styles.emptyCard}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#4F46E5" />
                  ) : (
                    <>
                      <Ionicons name="briefcase-outline" size={32} color="#94A3B8" />
                      <Text style={styles.emptyText}>No active job listings found.</Text>
                    </>
                  )}
                </View>
              ) : (
                <FlatList
                  data={activeJobs}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => `all-j-${item.id}`}
                  contentContainerStyle={styles.horizontalList}
                  renderItem={({ item }) => {
                    const hasApplied = appliedJobIds.includes(item.id);
                    const isSaved = savedJobIds.includes(item.id);
                    return (
                      <View style={{ width: 300, marginRight: 16 }}>
                        <JobCard
                          job={item}
                          layoutMode="horizontal"
                          onPress={() => onJobPress(item.id)}
                          onApply={() => handleApplyJob(item.id)}
                          hasApplied={hasApplied}
                          isSaved={isSaved}
                          onSaveToggle={() => handleToggleSaveJob(item.id)}
                        />
                      </View>
                    );
                  }}
                />
              )}
            </View>
          )}
        </ScrollView>

        {/* Test Series Modal */}
        <Modal
          visible={testSeriesModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setTestSeriesModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.editModalContent, { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Test Series / परीक्षा</Text>
                <TouchableOpacity onPress={() => setTestSeriesModalVisible(false)} style={styles.editCloseBtn}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ padding: 20 }}>
                <Text style={styles.modalSubtitle}>Select a course to start its exam series</Text>
                
                {enrolledCourses.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="book-outline" size={48} color="#94A3B8" />
                    <Text style={styles.emptyText}>You are not enrolled in any courses yet.</Text>
                  </View>
                ) : (
                  enrolledCourses.map((c) => {
                    const progress = progressMap[c.id] || 0;
                    const isLocked = progress < 100;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.testCourseItem, isLocked ? styles.testCourseLocked : styles.testCourseUnlocked]}
                        activeOpacity={0.8}
                        onPress={() => {
                          setTestSeriesModalVisible(false);
                          if (isLocked) {
                            Alert.alert(
                              'Quiz Locked / परीक्षा कुलूपबंद आहे',
                              `You must complete 100% lectures of this course to unlock the final quiz.\n\nYour progress: ${progress}%\n\nपरीक्षा देण्यासाठी सर्व लेक्चर्स १००% पूर्ण करा.`
                            );
                          } else {
                            if (onTakeTest) onTakeTest(c.id);
                          }
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.testCourseTitle}>{c.title}</Text>
                          <Text style={styles.testCourseProgress}>Lectures Progress: {progress}%</Text>
                        </View>
                        <View style={[styles.lockStatusBadge, { backgroundColor: isLocked ? '#FEF3C7' : '#D1FAE5' }]}>
                          <Ionicons 
                            name={isLocked ? "lock-closed" : "checkmark-circle"} 
                            size={14} 
                            color={isLocked ? "#D97706" : "#059669"} 
                            style={{ marginRight: 4 }} 
                          />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: isLocked ? "#B45309" : "#047857" }}>
                            {isLocked ? "Locked" : "Start"}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </>
      ) : (
        // ════════════════════════════════════════════════════════════
        // RECRUITER / EMPLOYER DASHBOARD VIEW (Overhauled)
        // ════════════════════════════════════════════════════════════
        <ScrollView
          style={[styles.container, { backgroundColor: '#F8FAFC' }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Redesigned grid buttons container */}
          <View style={styles.recruiterGridContainer}>
            <View style={styles.recruiterGridRow}>
              {/* Active Jobs Card */}
              <TouchableOpacity
                style={[
                  styles.recruiterGridCard,
                  { borderColor: '#3B82F6' },
                  recruiterTab === 'my_jobs' && { backgroundColor: '#EFF6FF', borderWidth: 2 }
                ]}
                onPress={() => setRecruiterTab('my_jobs')}
                activeOpacity={0.8}
              >
                <View style={[styles.gridIconBg, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="briefcase" size={20} color="#3B82F6" />
                </View>
                <Text style={styles.gridCardCount}>{activeJobsCount}</Text>
                <Text style={styles.gridCardLabel}>Active Jobs</Text>
              </TouchableOpacity>

              {/* Applications Card */}
              <TouchableOpacity
                style={[
                  styles.recruiterGridCard,
                  { borderColor: '#10B981' },
                  (recruiterTab === 'applications' && appsStatusFilter === 'all') && { backgroundColor: '#ECFDF5', borderWidth: 2 }
                ]}
                onPress={() => {
                  setRecruiterTab('applications');
                  setAppsStatusFilter('all');
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.gridIconBg, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="people" size={20} color="#10B981" />
                </View>
                <Text style={styles.gridCardCount}>{totalAppsCount}</Text>
                <Text style={styles.gridCardLabel}>Applicants</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.recruiterGridRow}>
              {/* Shortlisted Card */}
              <TouchableOpacity
                style={[
                  styles.recruiterGridCard,
                  { borderColor: '#8B5CF6' },
                  (recruiterTab === 'applications' && appsStatusFilter === 'accepted') && { backgroundColor: '#F5F3FF', borderWidth: 2 }
                ]}
                onPress={() => {
                  setRecruiterTab('applications');
                  setAppsStatusFilter('accepted');
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.gridIconBg, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="checkmark-done-circle" size={20} color="#8B5CF6" />
                </View>
                <Text style={styles.gridCardCount}>{shortlistedCount}</Text>
                <Text style={styles.gridCardLabel}>Shortlisted</Text>
              </TouchableOpacity>

              {/* + Post New Job Card (Primary Action) */}
              {onPostJobPress && (
                <TouchableOpacity
                  style={[
                    styles.recruiterGridCard,
                    { backgroundColor: '#4F46E5', borderColor: '#4F46E5' }
                  ]}
                  onPress={() => onPostJobPress()}
                  activeOpacity={0.8}
                >
                  <View style={[styles.gridIconBg, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Ionicons name="add" size={22} color="#ffffff" />
                  </View>
                  <Text style={[styles.gridCardCount, { color: '#ffffff', fontSize: 18, marginTop: 4 }]}>Post Job</Text>
                  <Text style={[styles.gridCardLabel, { color: '#E0E7FF' }]}>Create Listing</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.recruiterGridRow}>
              {/* Edit Profile Card (Full width or spanning bottom row) */}
              <TouchableOpacity
                style={[
                  styles.recruiterGridCardFull,
                  { borderColor: '#64748B' },
                  recruiterTab === 'profile' && { backgroundColor: '#F8FAFC', borderWidth: 2 }
                ]}
                onPress={() => setRecruiterTab('profile')}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.gridIconBg, { backgroundColor: '#F1F5F9' }]}>
                    <Ionicons name="business" size={18} color="#64748B" />
                  </View>
                  <View>
                    <Text style={styles.gridCardLabelFull}>Company Profile & Settings</Text>
                    <Text style={styles.gridCardDescFull}>Update your profile info & settings</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Render Tab Contents */}
          <View style={{ paddingVertical: 4 }}>
            {recruiterTab === 'overview' && (
              <>
                {/* Application Pipeline */}
                <Text style={styles.sectionTitle}>Application Pipeline</Text>
                <View style={styles.pipelineGrid}>
                  <View style={styles.pipelineCard}>
                    <View style={styles.pipelineInfo}>
                      <Text style={styles.pipelineLabel}>Pending</Text>
                      <Text style={styles.pipelineVal}>{pendingCount}</Text>
                    </View>
                    <View style={styles.pipelineIcon}>
                      <Ionicons name="time" size={16} color="#F59E0B" />
                    </View>
                  </View>

                  <View style={styles.pipelineCard}>
                    <View style={styles.pipelineInfo}>
                      <Text style={styles.pipelineLabel}>Reviewing</Text>
                      <Text style={styles.pipelineVal}>{reviewingCount}</Text>
                    </View>
                    <View style={styles.pipelineIcon}>
                      <Ionicons name="search" size={16} color="#3B82F6" />
                    </View>
                  </View>

                  <View style={styles.pipelineCard}>
                    <View style={styles.pipelineInfo}>
                      <Text style={styles.pipelineLabel}>Shortlisted</Text>
                      <Text style={styles.pipelineVal}>{shortlistedCount}</Text>
                    </View>
                    <View style={styles.pipelineIcon}>
                      <Ionicons name="checkmark-done-circle" size={16} color="#10B981" />
                    </View>
                  </View>

                  <View style={styles.pipelineCard}>
                    <View style={styles.pipelineInfo}>
                      <Text style={styles.pipelineLabel}>Rejected</Text>
                      <Text style={styles.pipelineVal}>{rejectedCount}</Text>
                    </View>
                    <View style={styles.pipelineIcon}>
                      <Ionicons name="close-circle" size={16} color="#EF4444" />
                    </View>
                  </View>
                </View>

                {/* Recent Activity Timeline */}
                <View style={{ marginTop: 24 }}>
                  <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Recent Activity</Text>
                  <View style={styles.timelineContainer}>
                    {getRecruiterActivities().map((act, index) => {
                      const isLast = index === getRecruiterActivities().length - 1;
                      const getDotColor = () => {
                        if (act.type === 'review') return '#EAB308'; // yellow
                        if (act.type === 'apply') return '#3B82F6';  // blue
                        if (act.type === 'shortlist') return '#10B981'; // green
                        if (act.type === 'reject') return '#EF4444'; // red
                        return '#4F46E5'; // post - indigo
                      };
                      return (
                        <View key={act.id} style={styles.timelineItem}>
                          {!isLast && <View style={styles.timelineLine} />}
                          <View style={[styles.timelineDot, { backgroundColor: getDotColor() }]} />
                          <View style={styles.timelineContent}>
                            <Text style={styles.timelineText}>{act.text}</Text>
                            <Text style={styles.timelineTime}>{act.time}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Top Performing Jobs */}
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Top Performing Jobs</Text>
                  {recruiterJobs.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Ionicons name="briefcase-outline" size={24} color="#94A3B8" />
                      <Text style={styles.emptyText}>No posted jobs yet. Post one to see insights.</Text>
                    </View>
                  ) : (
                    recruiterJobs.map((job) => {
                      // Mock metrics
                      const views = 0;
                      const jobApps = applications.filter(a => a.jobId === job.id);
                      const shortlisted = jobApps.filter(a => a.status === 'accepted' || a.status === 'interviewing').length;
                      return (
                        <View key={job.id} style={[styles.recruiterJobCard, { paddingVertical: 12 }]}>
                          <Text style={styles.recruiterJobTitle} numberOfLines={1}>{job.title}</Text>
                          <View style={styles.recruiterJobStatsRow}>
                            <View style={styles.recruiterJobStatCell}>
                              <Text style={styles.recruiterJobStatVal}>{jobApps.length}</Text>
                              <Text style={styles.recruiterJobStatLbl}>Applications</Text>
                            </View>
                            <View style={styles.recruiterJobStatCell}>
                              <Text style={styles.recruiterJobStatVal}>{views}</Text>
                              <Text style={styles.recruiterJobStatLbl}>Views</Text>
                            </View>
                            <View style={styles.recruiterJobStatCell}>
                              <Text style={styles.recruiterJobStatVal}>{shortlisted}</Text>
                              <Text style={styles.recruiterJobStatLbl}>Shortlisted</Text>
                            </View>
                          </View>
                          <View style={[styles.progressBarTrack, { marginTop: 10, height: 4, marginBottom: 0 }]}>
                            <View style={[styles.progressBarFill, { width: jobApps.length > 0 ? '100%' : '0%' }]} />
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </>
            )}

            {recruiterTab === 'my_jobs' && (
              <>
                <Text style={styles.sectionTitle}>My Posted Jobs</Text>
                <View style={{ gap: 10, marginTop: 8 }}>
                  {recruiterJobs.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Ionicons name="briefcase-outline" size={32} color="#94A3B8" />
                      <Text style={styles.emptyText}>{"You haven't posted any jobs yet."}</Text>
                      {onPostJobPress && (
                        <TouchableOpacity 
                          style={[styles.emptyBtn, { backgroundColor: '#4F46E5', marginTop: 10 }]} 
                          onPress={() => onPostJobPress()}
                        >
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Post a Job</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    recruiterJobs.map((job) => {
                      const jobAppsCount = applications.filter(a => a.jobId === job.id).length;
                      
                      const handleViewJobApplicants = () => {
                        setAppsSearchTerm(job.title);
                        setAppsStatusFilter('all');
                        setRecruiterTab('applications');
                      };

                      return (
                        <View key={job.id} style={styles.recruiterJobCardContainer}>
                          <View style={styles.recruiterJobCardHeader}>
                            <View style={styles.jobIconCircle}>
                              <Ionicons name="briefcase" size={20} color="#4F46E5" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.recruiterJobCardTitle}>{job.title}</Text>
                              <Text style={styles.recruiterJobCardLoc}>{job.company} • {job.location}</Text>
                            </View>
                            <View style={styles.jobTypeBadge}>
                              <Text style={styles.jobTypeBadgeText}>{job.type}</Text>
                            </View>
                          </View>

                          <View style={styles.recruiterJobCardDivider} />

                          <View style={styles.recruiterJobCardFooter}>
                            <View style={styles.jobMetricsRow}>
                              <View style={styles.jobMetricPill}>
                                <Ionicons name="people-outline" size={14} color="#4B5563" />
                                <Text style={styles.jobMetricValue}>{jobAppsCount}</Text>
                                <Text style={styles.jobMetricLabel}>Applicants</Text>
                              </View>
                              <View style={styles.jobMetricPill}>
                                <Ionicons name="cash-outline" size={14} color="#4B5563" />
                                <Text style={[styles.jobMetricValue, { maxWidth: 100 }]} numberOfLines={1}>
                                  {job.salaryRange}
                                </Text>
                              </View>
                            </View>
                          </View>

                          <View style={styles.recruiterJobCardDivider} />

                          {/* Action Buttons Row */}
                          <View style={styles.recruiterJobActionsRow}>
                            <TouchableOpacity 
                              style={[styles.jobActionBtn, { borderColor: '#4F46E5', borderWidth: 1 }]}
                              onPress={() => onPostJobPress?.(job.id)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="create-outline" size={14} color="#4F46E5" style={{ marginRight: 4 }} />
                              <Text style={[styles.jobActionText, { color: '#4F46E5' }]}>Edit / बदला</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={[styles.jobActionBtn, { borderColor: '#EF4444', borderWidth: 1 }]}
                              onPress={() => handleDeleteJob(job.id)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="trash-outline" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                              <Text style={[styles.jobActionText, { color: '#EF4444' }]}>Delete / काढा</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={[
                                styles.jobActionBtn, 
                                { backgroundColor: '#4F46E5', flex: 1.2 }
                              ]}
                              onPress={handleViewJobApplicants}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.jobActionText, { color: '#ffffff' }]}>
                                {jobAppsCount > 0 ? `Applicants (${jobAppsCount})` : 'No Applicants'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </>
            )}

            {recruiterTab === 'applications' && (() => {
              // Memoized applications filtering
              const filteredApps = applications.filter((app) => {
                // Status Filter
                if (appsStatusFilter !== 'all') {
                  const match = 
                    (appsStatusFilter === 'pending' && app.status === 'pending') ||
                    (appsStatusFilter === 'reviewing' && app.status === 'reviewing') ||
                    (appsStatusFilter === 'interviewing' && app.status === 'interviewing') ||
                    (appsStatusFilter === 'accepted' && app.status === 'accepted') ||
                    (appsStatusFilter === 'rejected' && app.status === 'rejected');
                  if (!match) return false;
                }
                // Search term filter
                if (appsSearchTerm.trim()) {
                  const query = appsSearchTerm.toLowerCase();
                  const matchQuery = 
                    (app.candidateName && app.candidateName.toLowerCase().includes(query)) ||
                    (app.candidateEmail && app.candidateEmail.toLowerCase().includes(query)) ||
                    (app.jobTitle && app.jobTitle.toLowerCase().includes(query));
                  if (!matchQuery) return false;
                }
                return true;
              });

              // Status Counts
              const counts = {
                all: applications.length,
                pending: applications.filter(a => a.status === 'pending').length,
                reviewing: applications.filter(a => a.status === 'reviewing').length,
                shortlisted: applications.filter(a => a.status === 'accepted' || a.status === 'interviewing').length,
                rejected: applications.filter(a => a.status === 'rejected').length
              };

              const getStatusProgressStep = (status: string) => {
                if (status === 'pending') return 1;
                if (status === 'reviewing') return 2;
                if (status === 'interviewing' || status === 'accepted') return 3;
                return 4;
              };

              return (
                <>
                  <Text style={styles.sectionTitle}>Manage Applications</Text>

                  {/* Horizontal Filter Tabs Scroll */}
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.appsFilterScroll}
                  >
                    {[
                      { key: 'all', label: 'All', value: counts.all, color: '#4F46E5' },
                      { key: 'pending', label: 'Pending', value: counts.pending, color: '#F59E0B' },
                      { key: 'reviewing', label: 'Viewed', value: counts.reviewing, color: '#2563EB' },
                      { key: 'accepted', label: 'Shortlisted', value: counts.shortlisted, color: '#8B5CF6' },
                      { key: 'rejected', label: 'Rejected', value: counts.rejected, color: '#EF4444' }
                    ].map(tab => {
                      const isActive = appsStatusFilter === tab.key;
                      return (
                        <TouchableOpacity
                          key={tab.key}
                          onPress={() => setAppsStatusFilter(tab.key as any)}
                          style={[
                            styles.appsFilterTab,
                            isActive && { backgroundColor: tab.color, borderColor: tab.color }
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.appsFilterLabel, isActive && { color: '#ffffff' }]}>
                            {tab.label}
                          </Text>
                          <View style={[
                            styles.appsFilterBadge, 
                            { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#F1F5F9' }
                          ]}>
                            <Text style={[
                              styles.appsFilterBadgeText, 
                              isActive ? { color: '#ffffff' } : { color: '#475569' }
                            ]}>
                              {tab.value}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Search Bar Input */}
                  <View style={styles.appsSearchBox}>
                    <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.appsSearchInput}
                      value={appsSearchTerm}
                      onChangeText={setAppsSearchTerm}
                      placeholder="Search by candidate name, email, or role..."
                      placeholderTextColor="#94A3B8"
                    />
                    {appsSearchTerm.length > 0 && (
                      <TouchableOpacity onPress={() => setAppsSearchTerm('')}>
                        <Ionicons name="close-circle" size={18} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* List Content */}
                  <View style={{ gap: 12, marginTop: 4, paddingBottom: 20 }}>
                    {filteredApps.length === 0 ? (
                      <View style={styles.emptyCard}>
                        <Ionicons name="people-outline" size={36} color="#94A3B8" />
                        <Text style={styles.emptyText}>No matching applications found.</Text>
                      </View>
                    ) : (
                      filteredApps.map((app) => {
                        const progressStep = getStatusProgressStep(app.status);
                        const initials = app.candidateName 
                          ? app.candidateName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) 
                          : 'C';

                        // Status Color Mapping
                        const themeColor = 
                          app.status === 'rejected' ? '#EF4444' :
                          app.status === 'accepted' ? '#10B981' :
                          app.status === 'interviewing' ? '#8B5CF6' :
                          app.status === 'reviewing' ? '#2563EB' : '#F59E0B';

                        const themeBg = themeColor + '15';

                        const handleViewResume = async () => {
                          if (app.resumeUrl) {
                            try {
                              await Linking.openURL(app.resumeUrl);
                              if (app.status === 'pending') {
                                await handleUpdateStatus(app.id, 'reviewing');
                              }
                            } catch {
                              Alert.alert('Link Error', 'Could not open resume attachment.');
                            }
                          } else {
                            Alert.alert('No Resume', 'Candidate did not attach a resume URL.');
                          }
                        };

                        return (
                          <View key={app.id} style={styles.applicantFullCard}>
                            {/* Card Header */}
                            <View style={styles.applicantCardHeader}>
                              <View style={[styles.candidateInitialsCircle, { backgroundColor: themeBg }]}>
                                <Text style={[styles.candidateInitialsText, { color: themeColor }]}>
                                  {initials}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.applicantNameText}>{app.candidateName || 'Anonymous Candidate'}</Text>
                                <Text style={styles.applicantJobTitleText}>Applied: {app.jobTitle}</Text>
                              </View>
                              <View style={[styles.badgeContainer, { backgroundColor: themeBg }]}>
                                <Text style={[styles.badgeLabelText, { color: themeColor }]}>
                                  {app.status === 'reviewing' ? 'Viewed' : app.status.toUpperCase()}
                                </Text>
                              </View>
                            </View>

                            {/* Contact Pills */}
                            <View style={styles.contactPillsContainer}>
                              {app.candidateEmail ? (
                                <TouchableOpacity 
                                  style={[styles.contactPill, { backgroundColor: '#EFF6FF' }]}
                                  onPress={() => Linking.openURL('mailto:' + app.candidateEmail)}
                                >
                                  <Ionicons name="mail" size={12} color="#2563EB" />
                                  <Text style={styles.contactPillText} numberOfLines={1}>
                                    {app.candidateEmail}
                                  </Text>
                                </TouchableOpacity>
                              ) : null}

                              {app.candidatePhone ? (
                                <TouchableOpacity 
                                  style={[styles.contactPill, { backgroundColor: '#ECFDF5' }]}
                                  onPress={() => Linking.openURL('tel:' + app.candidatePhone)}
                                >
                                  <Ionicons name="call" size={12} color="#10B981" />
                                  <Text style={styles.contactPillText}>
                                    {app.candidatePhone}
                                  </Text>
                                </TouchableOpacity>
                              ) : null}

                              {app.candidateLocation ? (
                                <View style={[styles.contactPill, { backgroundColor: '#F3F4F6' }]}>
                                  <Ionicons name="pin" size={12} color="#4B5563" />
                                  <Text style={styles.contactPillText} numberOfLines={1}>
                                    {app.candidateLocation}
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            {/* Candidate Bio Description */}
                            {app.candidateBio ? (
                              <Text style={styles.applicantBioText} numberOfLines={3}>
                                {app.candidateBio}
                              </Text>
                            ) : null}

                            {/* Education & Experience Quick Info */}
                            {((app as any).education || (app as any).experience) && (
                              <View style={styles.candidateEduExpRow}>
                                {(app as any).education ? (
                                  <View style={styles.candidateEduExpPill}>
                                    <Ionicons name="school-outline" size={12} color="#6366F1" style={{ marginRight: 4 }} />
                                    <Text style={styles.candidateEduExpText} numberOfLines={1}>
                                      {(app as any).education}
                                    </Text>
                                  </View>
                                ) : null}
                                {(app as any).experience ? (
                                  <View style={[styles.candidateEduExpPill, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                                    <Ionicons name="briefcase-outline" size={12} color="#16A34A" style={{ marginRight: 4 }} />
                                    <Text style={[styles.candidateEduExpText, { color: '#15803D' }]} numberOfLines={1}>
                                      {(app as any).experience}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                            )}

                            {/* Skills Row */}
                            {app.candidateSkills && app.candidateSkills.length > 0 ? (
                              <View style={{ marginTop: 10 }}>
                                <Text style={styles.metaSectionLabel}>Candidate Skills</Text>
                                <View style={styles.skillsContainerRow}>
                                  {app.candidateSkills.slice(0, 5).map((skill, index) => (
                                    <View key={index} style={styles.skillTagBadge}>
                                      <Text style={styles.skillTagText}>{skill}</Text>
                                    </View>
                                  ))}
                                  {app.candidateSkills.length > 5 ? (
                                    <View style={[styles.skillTagBadge, { backgroundColor: '#F1F5F9' }]}>
                                      <Text style={[styles.skillTagText, { color: '#64748B' }]}>
                                        +{app.candidateSkills.length - 5}
                                      </Text>
                                    </View>
                                  ) : null}
                                </View>
                              </View>
                            ) : null}

                            {/* Additional Candidate Metrics */}
                            <View style={styles.metaGridMetricsRow}>
                              {app.candidateExpectedSalary ? (
                                <View style={styles.metaMetricBox}>
                                  <Text style={styles.metaMetricLabel}>Expected Salary</Text>
                                  <Text style={styles.metaMetricVal}>{app.candidateExpectedSalary}</Text>
                                </View>
                              ) : null}

                              {app.candidateNoticePeriod ? (
                                <View style={styles.metaMetricBox}>
                                  <Text style={styles.metaMetricLabel}>Notice Period</Text>
                                  <Text style={styles.metaMetricVal}>{app.candidateNoticePeriod}</Text>
                                </View>
                              ) : null}
                            </View>

                            {/* Stepper Progress Bar indicator */}
                            <View style={styles.stepperContainer}>
                              <View style={styles.stepperTrackLine}>
                                <View style={[
                                  styles.stepperFillLine, 
                                  { width: app.status === 'rejected' ? '100%' : `${((progressStep - 1) / 3) * 100}%` }
                                ]} />
                              </View>
                              <View style={styles.stepperDotsRow}>
                                {[1, 2, 3, 4].map(s => {
                                  const label = s === 1 ? 'Applied' : s === 2 ? 'Viewed' : s === 3 ? 'Shortlisted' : 'Finalized';
                                  const isActive = progressStep >= s;
                                  const dotBg = isActive ? themeColor : '#E2E8F0';
                                  return (
                                    <View key={s} style={styles.stepperStepCol}>
                                      <View style={[styles.stepperDot, { backgroundColor: dotBg }]} />
                                      <Text style={[styles.stepperDotLabel, isActive && { color: themeColor }]}>
                                        {label}
                                      </Text>
                                    </View>
                                  );
                                })}
                              </View>
                            </View>

                            {/* Actions Buttons Row */}
                            <View style={styles.appsCardActionsRow}>
                              <TouchableOpacity
                                style={styles.viewResumeActionBtn}
                                onPress={handleViewResume}
                                activeOpacity={0.8}
                              >
                                <Ionicons name="document-text-outline" size={14} color="#4B5563" />
                                <Text style={styles.viewResumeActionText}>View Resume</Text>
                              </TouchableOpacity>

                              <View style={styles.statusButtonsRight}>
                                {app.status === 'pending' && (
                                  <TouchableOpacity
                                    style={[styles.statusBtn, { backgroundColor: '#EFF6FF' }]}
                                    onPress={() => handleUpdateStatus(app.id, 'reviewing')}
                                  >
                                    <Text style={[styles.statusBtnText, { color: '#2563EB' }]}>View</Text>
                                  </TouchableOpacity>
                                )}

                                {app.status !== 'accepted' && app.status !== 'interviewing' && app.status !== 'rejected' && (
                                  <TouchableOpacity
                                    style={[styles.statusBtn, { backgroundColor: '#ECFDF5' }]}
                                    onPress={() => handleUpdateStatus(app.id, 'accepted')}
                                  >
                                    <Text style={[styles.statusBtnText, { color: '#10B981' }]}>Shortlist</Text>
                                  </TouchableOpacity>
                                )}

                                {app.status !== 'rejected' && (
                                  <TouchableOpacity
                                    style={[styles.statusBtn, { backgroundColor: '#FEF2F2' }]}
                                    onPress={() => handleUpdateStatus(app.id, 'rejected')}
                                  >
                                    <Text style={[styles.statusBtnText, { color: '#EF4444' }]}>Reject</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                </>
              );
            })()}

            {recruiterTab === 'analytics' && (() => {
              const conversionRate = totalAppsCount > 0 ? ((shortlistedCount / totalAppsCount) * 100).toFixed(0) : '0';
              const averageAppsPerJob = activeJobsCount > 0 ? (totalAppsCount / activeJobsCount).toFixed(1) : '0';
              const draftsCount = draftJobsCount || 0;

              return (
                <>
                  <Text style={styles.sectionTitle}>Performance Analytics</Text>
                  <View style={{ gap: 14, marginTop: 10, paddingBottom: 20 }}>
                    
                    {/* Visual Performance Ratio Cards */}
                    <View style={styles.analyticsGridRow}>
                      <View style={[styles.analyticsStatBigCard, { borderColor: '#8B5CF6' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.analyticsStatTitle}>Hiring Conversion</Text>
                          <Ionicons name="trending-up" size={16} color="#8B5CF6" />
                        </View>
                        <Text style={[styles.analyticsStatNumber, { color: '#8B5CF6' }]}>
                          {conversionRate}%
                        </Text>
                        <View style={styles.analyticsProgressWrapper}>
                          <View style={styles.analyticsProgressBar}>
                            <View style={[styles.analyticsProgressFill, { width: `${conversionRate}%` as any, backgroundColor: '#8B5CF6' }]} />
                          </View>
                          <Text style={styles.analyticsProgressLabel}>Shortlisted / Total Apps</Text>
                        </View>
                      </View>

                      <View style={[styles.analyticsStatBigCard, { borderColor: '#10B981' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.analyticsStatTitle}>Apps Efficiency</Text>
                          <Ionicons name="pie-chart" size={16} color="#10B981" />
                        </View>
                        <Text style={[styles.analyticsStatNumber, { color: '#10B981' }]}>
                          {averageAppsPerJob}
                        </Text>
                        <View style={styles.analyticsProgressWrapper}>
                          <View style={styles.analyticsProgressBar}>
                            <View style={[styles.analyticsProgressFill, { width: `${Math.min(Number(averageAppsPerJob) * 10, 100)}%` as any, backgroundColor: '#10B981' }]} />
                          </View>
                          <Text style={styles.analyticsProgressLabel}>Avg. Candidates per Job</Text>
                        </View>
                      </View>
                    </View>

                    {/* Subscription & Resource Usage Caps Card */}
                    <View style={styles.analyticsLimitCard}>
                      <View style={{ borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10, marginBottom: 12 }}>
                        <Text style={[styles.analyticsTitle, { marginBottom: 2 }]}>Resource Limits & Billing</Text>
                        <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>
                          Current Plan: <Text style={{ color: '#4F46E5', fontWeight: '800' }}>Premium Recruiter Pro</Text>
                        </Text>
                      </View>

                      {/* Metric Row 1: Active Jobs */}
                      <View style={styles.analyticsLimitRow}>
                        <View style={styles.analyticsLimitHeader}>
                          <Text style={styles.analyticsLimitTitle}>Active Job Listings</Text>
                          <Text style={styles.analyticsLimitStats}>{activeJobsCount} / 10 Used</Text>
                        </View>
                        <View style={styles.analyticsLimitBarTrack}>
                          <View style={[styles.analyticsLimitBarFill, { width: `${(activeJobsCount / 10) * 100}%` as any, backgroundColor: '#4F46E5' }]} />
                        </View>
                      </View>

                      {/* Metric Row 2: Candidates Screened */}
                      <View style={styles.analyticsLimitRow}>
                        <View style={styles.analyticsLimitHeader}>
                          <Text style={styles.analyticsLimitTitle}>Candidates Screened</Text>
                          <Text style={styles.analyticsLimitStats}>{totalAppsCount} / 100 Used</Text>
                        </View>
                        <View style={styles.analyticsLimitBarTrack}>
                          <View style={[styles.analyticsLimitBarFill, { width: `${Math.min((totalAppsCount / 100) * 100, 100)}%` as any, backgroundColor: '#0284C7' }]} />
                        </View>
                      </View>

                      {/* Metric Row 3: Shortlist Limit */}
                      <View style={[styles.analyticsLimitRow, { marginBottom: 0 }]}>
                        <View style={styles.analyticsLimitHeader}>
                          <Text style={styles.analyticsLimitTitle}>Shortlisted Talent</Text>
                          <Text style={styles.analyticsLimitStats}>{shortlistedCount} / 50 Used</Text>
                        </View>
                        <View style={styles.analyticsLimitBarTrack}>
                          <View style={[styles.analyticsLimitBarFill, { width: `${Math.min((shortlistedCount / 50) * 100, 100)}%` as any, backgroundColor: '#8B5CF6' }]} />
                        </View>
                      </View>
                    </View>

                    {/* Overall Summary List */}
                    <View style={styles.analyticsCard}>
                      <Text style={styles.analyticsTitle}>Summary Overview</Text>
                      
                      <View style={styles.analyticsStatRow}>
                        <Text style={styles.analyticsLabel}>Total Posted Listings</Text>
                        <Text style={styles.analyticsVal}>{activeJobsCount + draftsCount}</Text>
                      </View>
                      
                      <View style={styles.analyticsStatRow}>
                        <Text style={styles.analyticsLabel}>Total Candidate Apps</Text>
                        <Text style={styles.analyticsVal}>{totalAppsCount}</Text>
                      </View>

                      <View style={styles.analyticsStatRow}>
                        <Text style={styles.analyticsLabel}>Shortlisted Profiles</Text>
                        <Text style={styles.analyticsVal}>{shortlistedCount}</Text>
                      </View>

                      <View style={[styles.analyticsStatRow, { borderBottomWidth: 0 }]}>
                        <Text style={styles.analyticsLabel}>Unpublished Drafts</Text>
                        <Text style={styles.analyticsVal}>{draftsCount}</Text>
                      </View>
                    </View>

                  </View>
                </>
              );
            })()}

            {recruiterTab === 'profile' && (
              <>
                <Text style={styles.sectionTitle}>Company Profile Details</Text>
                
                <View style={styles.profileDetailCard}>
                  {/* Avatar / Title Box */}
                  <View style={styles.profileHeaderBox}>
                    <View style={styles.profileLogoCircle}>
                      <Text style={styles.profileLogoInitials}>{companyInitials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.profileCompanyNameText}>
                        {user?.recruiterProfile?.companyName || 'icoded automation pvt ltd'}
                      </Text>
                      <Text style={styles.profileCompanyIndustryText}>
                        {user?.recruiterProfile?.industry || 'IT Services / Software'}
                      </Text>
                    </View>
                  </View>

                  {/* Divider */}
                  <View style={styles.profileCardDivider} />

                  {/* Info Rows */}
                  <View style={styles.profileInfoList}>
                    <View style={styles.profileInfoRow}>
                      <Ionicons name="briefcase-outline" size={18} color="#64748B" />
                      <View>
                        <Text style={styles.profileInfoLabel}>Your Role / Position</Text>
                        <Text style={styles.profileInfoValue}>
                          {user?.recruiterProfile?.position || 'HR Manager / Recruiter'}
                        </Text>
                      </View>
                    </View>

                    {user?.recruiterProfile?.companyWebsite ? (
                      <TouchableOpacity 
                        style={styles.profileInfoRow}
                        onPress={() => {
                          const url = user?.recruiterProfile?.companyWebsite;
                          if (url) {
                            const formattedUrl = url.startsWith('http') ? url : 'https://' + url;
                            Linking.openURL(formattedUrl).catch(() => {
                              Alert.alert('Error', 'Invalid website URL format.');
                            });
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="globe-outline" size={18} color="#2563EB" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.profileInfoLabel}>Company Website (Tap to open)</Text>
                          <Text style={[styles.profileInfoValue, { color: '#2563EB', textDecorationLine: 'underline' }]}>
                            {user.recruiterProfile.companyWebsite}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.profileInfoRow}>
                        <Ionicons name="globe-outline" size={18} color="#64748B" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.profileInfoLabel}>Company Website</Text>
                          <Text style={[styles.profileInfoValue, { color: '#94A3B8', fontStyle: 'italic' }]}>
                            Not Provided
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={[styles.profileInfoRow, { alignItems: 'flex-start' }]}>
                      <Ionicons name="information-circle-outline" size={18} color="#64748B" style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.profileInfoLabel}>About the Company</Text>
                        <Text style={[
                          styles.profileInfoValue, 
                          !user?.recruiterProfile?.bio && { color: '#94A3B8', fontStyle: 'italic' }
                        ]}>
                          {user?.recruiterProfile?.bio || 'No description provided yet. Tap edit to write a brief summary.'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Edit profile action button inside card */}
                  <TouchableOpacity 
                    style={styles.profileEditCardBtn}
                    onPress={() => setCompanyModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.profileEditCardBtnText}>Edit Company Details</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {recruiterTab === 'candidates' && (() => {
              const filteredCandidates = candidateList.filter((cand) => {
                const seekerProf = cand.seekerProfile || {};
                
                // Name or Email match
                if (candidatesSearch.trim()) {
                  const queryText = candidatesSearch.toLowerCase();
                  const nameVal = (cand.firstName || '') + ' ' + (cand.lastName || '');
                  const emailVal = cand.email || '';
                  if (!nameVal.toLowerCase().includes(queryText) && !emailVal.toLowerCase().includes(queryText)) {
                    return false;
                  }
                }
                
                // State filter
                if (candidatesStateFilter.trim()) {
                  const stateVal = cand.state || cand.location || '';
                  if (!stateVal.toLowerCase().includes(candidatesStateFilter.toLowerCase())) {
                    return false;
                  }
                }

                // District filter
                if (candidatesDistrictFilter.trim()) {
                  const distVal = cand.district || cand.location || '';
                  if (!distVal.toLowerCase().includes(candidatesDistrictFilter.toLowerCase())) {
                    return false;
                  }
                }

                // Taluka filter
                if (candidatesTalukaFilter.trim()) {
                  const talVal = cand.taluka || '';
                  if (!talVal.toLowerCase().includes(candidatesTalukaFilter.toLowerCase())) {
                    return false;
                  }
                }

                // Skill filter
                if (candidatesSkillsFilter.trim()) {
                  const skillsVal = seekerProf.skills || [];
                  const match = skillsVal.some((s: string) => s.toLowerCase().includes(candidatesSkillsFilter.toLowerCase()));
                  if (!match) return false;
                }

                // Experience filter
                if (candidatesExpFilter.trim()) {
                  const expPref = cand.experienceLevel || '';
                  if (!expPref.toLowerCase().includes(candidatesExpFilter.toLowerCase())) {
                    return false;
                  }
                }

                return true;
              });

              return (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.sectionTitle}>Talent Database Search</Text>
                  
                  {/* Search and Filters Card */}
                  <View style={styles.candidateSearchCard}>
                    <View style={styles.appsSearchBox}>
                      <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.appsSearchInput}
                        value={candidatesSearch}
                        onChangeText={setCandidatesSearch}
                        placeholder="Search candidates by name or email..."
                        placeholderTextColor="#94A3B8"
                      />
                      {candidatesSearch.length > 0 && (
                        <TouchableOpacity onPress={() => setCandidatesSearch('')}>
                          <Ionicons name="close-circle" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.filtersGrid}>
                      <TextInput
                        style={styles.filterInput}
                        value={candidatesStateFilter}
                        onChangeText={setCandidatesStateFilter}
                        placeholder="Filter by State"
                        placeholderTextColor="#94A3B8"
                      />
                      <TextInput
                        style={styles.filterInput}
                        value={candidatesDistrictFilter}
                        onChangeText={setCandidatesDistrictFilter}
                        placeholder="Filter by District"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <View style={styles.filtersGrid}>
                      <TextInput
                        style={styles.filterInput}
                        value={candidatesTalukaFilter}
                        onChangeText={setCandidatesTalukaFilter}
                        placeholder="Filter by Taluka"
                        placeholderTextColor="#94A3B8"
                      />
                      <TextInput
                        style={styles.filterInput}
                        value={candidatesSkillsFilter}
                        onChangeText={setCandidatesSkillsFilter}
                        placeholder="Filter by Skill"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>

                  {/* Candidates List */}
                  {candidatesLoading ? (
                    <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 24 }} />
                  ) : filteredCandidates.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Ionicons name="people-outline" size={32} color="#94A3B8" />
                      <Text style={styles.emptyText}>No candidates found matching the filters.</Text>
                    </View>
                  ) : (
                    <View style={{ gap: 12, marginTop: 12 }}>
                      {filteredCandidates.map((cand) => {
                        const seekerProf = cand.seekerProfile || {};
                        const name = (cand.firstName || cand.displayName || 'Anonymous') + ' ' + (cand.lastName || '');
                        const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                        const skills = seekerProf.skills || [];
                        const isUnlocked = revealedIds.includes(cand.id);
                        
                        // Masked info helper
                        const getMaskedPhone = (p: string) => {
                          if (!p) return 'Not Provided';
                          if (isUnlocked) return p;
                          return p.substring(0, 3) + '******' + p.substring(p.length - 2);
                        };

                        const getMaskedEmail = (e: string) => {
                          if (!e) return 'Not Provided';
                          if (isUnlocked) return e;
                          const parts = e.split('@');
                          return parts[0].substring(0, 2) + '****@' + parts[1];
                        };

                        const handleUnlockCandidate = async () => {
                          if (!user) return;
                          if (isUnlocked) {
                            setSelectedCandidate(cand);
                            return;
                          }

                          // Verify subscription
                          try {
                            const subRef = doc(db, 'subscriptions', user.uid);
                            const subSnap = await getDoc(subRef);
                            if (!subSnap.exists()) {
                              Alert.alert('Subscription Required', 'You must have an active subscription package to unlock candidate contact details.');
                              return;
                            }
                            const subData = subSnap.data();
                            if (subData?.status !== 'active') {
                              Alert.alert('Subscription Expired', 'Your subscription is expired or inactive. Please renew to download resumes.');
                              return;
                            }
                            const maxDownloads = subData?.maxResumeDownloads || 50; // fallback to 50
                            const usage = subData?.usageStats || {};
                            const downloadsUsed = usage?.resumeDownloads || 0;

                            if (downloadsUsed >= maxDownloads) {
                              Alert.alert('Limit Reached', `You have reached the limit of ${maxDownloads} resume downloads in your active plan.`);
                              return;
                            }

                            Alert.alert(
                              'Confirm Unlock',
                              'Unlocking this candidate will consume 1 resume download credit. Proceed?',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Unlock',
                                  onPress: async () => {
                                    await updateDoc(subRef, {
                                      'usageStats.resumeDownloads': downloadsUsed + 1
                                    });
                                    setRevealedIds(prev => [...prev, cand.id]);
                                    setSelectedCandidate(cand);
                                    Alert.alert('Success 🎉', 'Candidate contact details unlocked successfully!');
                                  }
                                }
                              ]
                            );
                          } catch (err: any) {
                            Alert.alert('Error', err.message || 'Could not verify subscription.');
                          }
                        };

                        return (
                          <View key={cand.id} style={styles.candidateCardItem}>
                            <View style={styles.applicantCardHeader}>
                              <View style={styles.candidateLogoCircle}>
                                <Text style={styles.candidateLogoInitials}>{initials}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.applicantNameText}>{name}</Text>
                                <Text style={styles.applicantJobTitleText}>
                                  {cand.location || cand.state || 'India'}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={[
                                  styles.unlockBtn,
                                  isUnlocked && { backgroundColor: '#10B981', borderColor: '#10B981' }
                                ]}
                                onPress={handleUnlockCandidate}
                                activeOpacity={0.8}
                              >
                                <Ionicons 
                                  name={isUnlocked ? "checkmark-circle" : "lock-closed"} 
                                  size={12} 
                                  color="#fff" 
                                  style={{ marginRight: 4 }} 
                                />
                                <Text style={styles.unlockBtnText}>
                                  {isUnlocked ? 'Unlocked' : 'Unlock Contact'}
                                </Text>
                              </TouchableOpacity>
                            </View>

                            <View style={styles.contactDetailsQuickRow}>
                              <View style={styles.contactDetailCell}>
                                <Ionicons name="call-outline" size={13} color="#64748B" />
                                <Text style={styles.contactDetailText}>{getMaskedPhone(cand.phone || seekerProf.phone)}</Text>
                              </View>
                              <View style={styles.contactDetailCell}>
                                <Ionicons name="mail-outline" size={13} color="#64748B" />
                                <Text style={styles.contactDetailText}>{getMaskedEmail(cand.email)}</Text>
                              </View>
                            </View>

                            {skills.length > 0 && (
                              <View style={styles.skillsContainerRow}>
                                {skills.slice(0, 4).map((s: string, idx: number) => (
                                  <View key={idx} style={styles.skillTagBadge}>
                                    <Text style={styles.skillTagText}>{s}</Text>
                                  </View>
                                ))}
                                {skills.length > 4 && (
                                  <View style={[styles.skillTagBadge, { backgroundColor: '#F1F5F9' }]}>
                                    <Text style={[styles.skillTagText, { color: '#64748B' }]}>
                                      +{skills.length - 4}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })()}
          </View>

          {/* Candidate Detailed Profile Modal */}
          {selectedCandidate && (
            <Modal
              visible={selectedCandidate !== null}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setSelectedCandidate(null)}
            >
              <View style={styles.candidateModalOverlay}>
                <View style={styles.candidateDetailsModalContent}>
                  <View style={styles.modalHeaderRow}>
                    <Text style={styles.modalHeaderTitle}>Candidate Profile</Text>
                    <TouchableOpacity onPress={() => setSelectedCandidate(null)}>
                      <Ionicons name="close-circle" size={24} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                    <View style={styles.modalHeroSection}>
                      <View style={[styles.profileLogoCircle, { width: 64, height: 64, borderRadius: 32 }]}>
                        <Text style={[styles.profileLogoInitials, { fontSize: 22 }]}>
                          {((selectedCandidate.firstName || selectedCandidate.displayName || 'A')[0] + (selectedCandidate.lastName || '')[0]).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.modalCandidateName}>
                        {(selectedCandidate.firstName || selectedCandidate.displayName || 'Anonymous Candidate') + ' ' + (selectedCandidate.lastName || '')}
                      </Text>
                      <Text style={styles.modalCandidateLoc}>
                        {selectedCandidate.location || selectedCandidate.state || 'India'}
                      </Text>
                    </View>

                    {/* Contact Details */}
                    <View style={styles.modalSectionBox}>
                      <Text style={styles.modalSectionTitle}>Contact Information</Text>
                      <View style={{ gap: 8, marginTop: 8 }}>
                        <View style={styles.modalInfoRow}>
                          <Ionicons name="call" size={16} color="#4F46E5" />
                          <Text style={styles.modalInfoText}>{selectedCandidate.phone || selectedCandidate.seekerProfile?.phone || 'Not Provided'}</Text>
                        </View>
                        <View style={styles.modalInfoRow}>
                          <Ionicons name="mail" size={16} color="#4F46E5" />
                          <Text style={styles.modalInfoText}>{selectedCandidate.email}</Text>
                        </View>
                        {selectedCandidate.seekerProfile?.resumeUrl ? (
                          <TouchableOpacity
                            style={styles.resumeDownloadBtn}
                            onPress={() => Linking.openURL(selectedCandidate.seekerProfile.resumeUrl)}
                          >
                            <Ionicons name="download-outline" size={16} color="#fff" />
                            <Text style={styles.resumeDownloadBtnText}>Download Resume PDF</Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.noResumeInfo}>No Resume Document Uploaded</Text>
                        )}
                      </View>
                    </View>

                    {/* Bio */}
                    {selectedCandidate.seekerProfile?.bio ? (
                      <View style={styles.modalSectionBox}>
                        <Text style={styles.modalSectionTitle}>Professional Summary</Text>
                        <Text style={styles.modalBodyBio}>{selectedCandidate.seekerProfile.bio}</Text>
                      </View>
                    ) : null}

                    {/* Skills */}
                    {selectedCandidate.seekerProfile?.skills && selectedCandidate.seekerProfile.skills.length > 0 ? (
                      <View style={styles.modalSectionBox}>
                        <Text style={styles.modalSectionTitle}>Professional Skills</Text>
                        <View style={[styles.skillsContainerRow, { marginTop: 8 }]}>
                          {selectedCandidate.seekerProfile.skills.map((s: string, idx: number) => (
                            <View key={idx} style={styles.skillTagBadge}>
                              <Text style={styles.skillTagText}>{s}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}

                    {/* Education */}
                    {selectedCandidate.seekerProfile?.education && selectedCandidate.seekerProfile.education.length > 0 ? (
                      <View style={styles.modalSectionBox}>
                        <Text style={styles.modalSectionTitle}>Education History</Text>
                        <View style={{ gap: 10, marginTop: 8 }}>
                          {selectedCandidate.seekerProfile.education.map((edu: any, idx: number) => (
                            <View key={idx} style={styles.modalListItemCard}>
                              <Text style={styles.modalListItemTitle}>{edu.degree || edu.degreeName || 'Degree/Qualification'}</Text>
                              <Text style={styles.modalListItemSub}>{edu.school || edu.institution || 'School/College'}</Text>
                              {edu.year && <Text style={styles.modalListItemYear}>Year: {edu.year}</Text>}
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}

                    {/* Experience */}
                    {selectedCandidate.seekerProfile?.experience && selectedCandidate.seekerProfile.experience.length > 0 ? (
                      <View style={styles.modalSectionBox}>
                        <Text style={styles.modalSectionTitle}>Work Experience</Text>
                        <View style={{ gap: 10, marginTop: 8 }}>
                          {selectedCandidate.seekerProfile.experience.map((exp: any, idx: number) => (
                            <View key={idx} style={styles.modalListItemCard}>
                              <Text style={styles.modalListItemTitle}>{exp.jobTitle || 'Role'}</Text>
                              <Text style={styles.modalListItemSub}>{exp.company || 'Company'}</Text>
                              {exp.duration && <Text style={styles.modalListItemYear}>Duration: {exp.duration}</Text>}
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}
                  </ScrollView>
                </View>
              </View>
            </Modal>
          )}

          {/* ── MODAL: Company Profile Editor ── */}
          <Modal
            visible={companyModalVisible}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setCompanyModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.editModalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Company Profile</Text>
                  <TouchableOpacity onPress={() => setCompanyModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#374151" />
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.editModalContent} keyboardShouldPersistTaps="handled">
                  <Text style={styles.inputLabel}>Company Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={companyName}
                    onChangeText={setCompanyName}
                    placeholder="e.g. SuperTech Innovations"
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text style={styles.inputLabel}>Industry</Text>
                  <TextInput
                    style={styles.textInput}
                    value={companyIndustry}
                    onChangeText={setCompanyIndustry}
                    placeholder="e.g. IT Services / Software"
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text style={styles.inputLabel}>Company Website</Text>
                  <TextInput
                    style={styles.textInput}
                    value={companyWebsite}
                    onChangeText={setCompanyWebsite}
                    placeholder="e.g. https://supertech.com"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="url"
                    autoCapitalize="none"
                  />

                  <Text style={styles.inputLabel}>Your Position</Text>
                  <TextInput
                    style={styles.textInput}
                    value={companyPosition}
                    onChangeText={setCompanyPosition}
                    placeholder="e.g. Tech Lead / HR Manager"
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text style={styles.inputLabel}>Company Description / Bio</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={companyBio}
                    onChangeText={setCompanyBio}
                    placeholder="Write a brief summary of what your company does..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                  />

                  <View style={styles.editActionRow}>
                    <TouchableOpacity
                      style={[styles.editBtnCancel, styles.editBtnHalf]}
                      onPress={() => setCompanyModalVisible(false)}
                      disabled={savingCompany}
                    >
                      <Text style={styles.editBtnCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editBtnSave, styles.editBtnHalf]}
                      onPress={handleSaveCompanyProfile}
                      disabled={savingCompany}
                    >
                      {savingCompany ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.editBtnSaveText}>Save Changes</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: -0.5,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
  },
  completenessBanner: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 16,
  },
  completenessLeft: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  completenessTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  completenessDesc: {
    fontSize: 11,
    color: '#4338CA',
    lineHeight: 16,
    marginTop: 1,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E0E7FF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    position: 'relative',
    minHeight: 88,
  },
  statIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    opacity: 0.15,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnSolid: {
    backgroundColor: '#4F46E5',
  },
  actionBtnTextSolid: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  actionBtnOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
  },
  actionBtnTextOutline: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 14,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  seeAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllLinkText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },
  enrolledCourseCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  enrolledCourseImg: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  enrolledCourseInfo: {
    flex: 1,
    marginLeft: 12,
  },
  enrolledCourseTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  enrolledCourseInstructor: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 6,
  },
  progressBarTrack: {
    height: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPctText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  resumeLearningText: {
    fontSize: 10,
    color: '#4F46E5',
    fontWeight: '800',
  },
  horizontalList: {
    paddingBottom: 4,
  },
  applicantItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 10,
  },
  applicantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  applicantName: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  status_pending: {
    backgroundColor: '#F59E0B',
  },
  status_reviewing: {
    backgroundColor: '#3B82F6',
  },
  status_accepted: {
    backgroundColor: '#10B981',
  },
  applicantRole: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 4,
  },
  applicantDate: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  toolsGrid: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginTop: 8,
  },
  toolItem: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  toolIcon: {
    marginBottom: 6,
  },
  toolLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'center',
  },
  // Recruiter Grid UI styles
  recruiterGridHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  recruiterGridWelcome: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  recruiterGridSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  recruiterGridContainer: {
    paddingHorizontal: 0, // remove double padding
    paddingTop: 0,
    paddingBottom: 8,
    gap: 8,
  },
  recruiterGridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  recruiterGridCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    minHeight: 92,
  },
  gridIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardCount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 4,
  },
  gridCardLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 2,
    textAlign: 'center',
  },
  recruiterGridCardFull: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  gridCardLabelFull: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  gridCardDescFull: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
  recruiterTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recruiterTabBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  recruiterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  recruiterTabTextActive: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  badgeText: {
    fontSize: 10,
    color: '#94A3B8',
  },

  // Pipeline
  pipelineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  pipelineCard: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pipelineInfo: {
    flex: 1,
  },
  pipelineLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  pipelineVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  pipelineIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Activity Timeline
  timelineContainer: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    paddingBottom: 16,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 9,
    top: 20,
    bottom: 0,
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 4,
    borderColor: '#ffffff',
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
  },
  timelineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 16,
  },
  timelineTime: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },

  // Recruiter Job Card List
  recruiterJobCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 10,
  },
  recruiterJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recruiterJobTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  recruiterJobLoc: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  recruiterJobStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  recruiterJobStatCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recruiterJobStatVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  recruiterJobStatLbl: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },

  // Recruiter Applications List & Actions
  applicationActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  appActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appActionBtnText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // Analytics Content
  analyticsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  analyticsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  analyticsStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  analyticsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  analyticsVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  status_rejected: {
    backgroundColor: '#EF4444',
  },
  emptyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Premium Recruiter Applications tab styling
  appsFilterScroll: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 8,
  },
  appsFilterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginRight: 6,
    gap: 6,
  },
  appsFilterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  appsFilterBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  appsFilterBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  appsSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    marginVertical: 10,
  },
  appsSearchInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 0,
  },
  applicantFullCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  applicantCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  candidateInitialsCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  candidateInitialsText: {
    fontSize: 15,
    fontWeight: '800',
  },
  applicantNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  applicantJobTitleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  badgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeLabelText: {
    fontSize: 10,
    fontWeight: '800',
  },
  contactPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  contactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    maxWidth: 200,
  },
  contactPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  applicantBioText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginTop: 10,
  },
  metaSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  skillsContainerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillTagBadge: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skillTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  metaGridMetricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  metaMetricBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 12,
    padding: 8,
  },
  metaMetricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  metaMetricVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    marginTop: 2,
  },
  stepperContainer: {
    marginTop: 16,
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepperTrackLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 5,
    height: 2,
    backgroundColor: '#E2E8F0',
  },
  stepperFillLine: {
    height: '100%',
  },
  stepperDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepperStepCol: {
    alignItems: 'center',
    width: 60,
  },
  stepperDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 1,
  },
  stepperDotLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  appsCardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  viewResumeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  viewResumeActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  statusButtonsRight: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  editModalContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  editActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  editBtnHalf: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnCancel: {
    backgroundColor: '#F1F5F9',
  },
  editBtnCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  editBtnSave: {
    backgroundColor: '#4F46E5',
  },
  editBtnSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Recruiter Analytics premium elements
  analyticsGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  analyticsStatBigCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  analyticsStatTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  analyticsStatNumber: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 8,
  },
  analyticsProgressWrapper: {
    marginTop: 10,
  },
  analyticsProgressBar: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  analyticsProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  analyticsProgressLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 4,
  },
  analyticsLimitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  analyticsLimitRow: {
    marginBottom: 14,
  },
  analyticsLimitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  analyticsLimitTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  analyticsLimitStats: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  analyticsLimitBarTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  analyticsLimitBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  // Recruiter Profile Tab styles
  profileDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  profileHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileLogoCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  profileLogoInitials: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4F46E5',
  },
  profileCompanyNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  profileCompanyIndustryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  profileCardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  profileInfoList: {
    gap: 16,
    marginBottom: 20,
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileInfoLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileInfoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
    lineHeight: 18,
  },
  profileEditCardBtn: {
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  profileEditCardBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  // Recruiter Job Card premium layout styles
  recruiterJobCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  recruiterJobCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  jobIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  recruiterJobCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  recruiterJobCardLoc: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  jobTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  jobTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  recruiterJobCardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  recruiterJobCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobMetricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  jobMetricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  jobMetricValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  jobMetricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  viewAppsActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewAppsActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  recruiterJobActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  jobActionBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  jobActionText: {
    fontSize: 11,
    fontWeight: '800',
  },
  candidateEduExpRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 2,
  },
  candidateEduExpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexShrink: 1,
  },
  candidateEduExpText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338CA',
    flexShrink: 1,
  },
  candidateSearchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  filtersGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  filterInput: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    fontSize: 12,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  candidateCardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 8,
  },
  candidateLogoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  candidateLogoInitials: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4F46E5',
  },
  unlockBtn: {
    backgroundColor: '#4F46E5',
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  unlockBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  contactDetailsQuickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  contactDetailCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactDetailText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  candidateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  candidateDetailsModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
    padding: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  modalHeroSection: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  modalCandidateName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  modalCandidateLoc: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  modalSectionBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalInfoText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '700',
  },
  resumeDownloadBtn: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  resumeDownloadBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  noResumeInfo: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalBodyBio: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginTop: 6,
  },
  modalListItemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 8,
    gap: 2,
  },
  modalListItemTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  modalListItemSub: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  modalListItemYear: {
    fontSize: 10,
    color: '#94A3B8',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    textAlign: 'center',
  },
  testCourseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
    gap: 12,
  },
  testCourseLocked: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  testCourseUnlocked: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  testCourseTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  testCourseProgress: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  lockStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  editCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});
