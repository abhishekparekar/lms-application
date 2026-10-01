import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CoursesScreen } from '../screens/dashboard/CoursesScreen';
import { CurrentAffairsScreen } from '../screens/dashboard/CurrentAffairsScreen';
import { ResourcesScreen } from '../screens/dashboard/ResourcesScreen';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { JobDashboard } from '../screens/jobs/JobDashboard';
import { ResumeBuilderScreen } from '../screens/resume/ResumeBuilderScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { MyLearningScreen } from '../screens/learning/MyLearningScreen';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/services/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';

type TabKey =
  | 'dashboard'
  | 'courses'
  | 'news'
  | 'resources'
  | 'learning'
  | 'jobs'
  | 'resume'
  | 'profile';

interface TabConfig {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}

interface BottomTabsProps {
  initialTab?: TabKey;
  onTabChange?: (tab: TabKey) => void;
  onCoursePress: (courseId: string) => void;
  onWatchVideo?: (courseId: string, lessonIndex: number, courseTitle?: string) => void;
  onJobPress: (jobId: string) => void;
  onSavedJobsPress: () => void;
  onStartProfileBuilder: () => void;
  onViewSubscription: () => void;
  onViewCertificates: () => void;
  onLogout: () => void;
  onPostJobPress?: (editingJobId?: string) => void;
  onTakeTest?: (courseId: string, courseTitle?: string) => void;
  onApplyPress?: (jobId: string) => void;
}

const ACTIVE_COLOR = '#4F46E5';
const INACTIVE_COLOR = '#9CA3AF';

// Seeker tabs
const SEEKER_TABS: TabConfig[] = [
  {
    key: 'dashboard',
    label: 'Home',
    icon: 'home-outline',
    iconActive: 'home',
  },
  {
    key: 'learning',
    label: 'Learn',
    icon: 'book-outline',
    iconActive: 'book',
  },
  {
    key: 'jobs',
    label: 'Jobs',
    icon: 'briefcase-outline',
    iconActive: 'briefcase',
  },
  {
    key: 'resume',
    label: 'Resume',
    icon: 'document-text-outline',
    iconActive: 'document-text',
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: 'person-outline',
    iconActive: 'person',
  },
];

// Recruiter tabs
const RECRUITER_TABS: TabConfig[] = [
  {
    key: 'dashboard',
    label: 'Home',
    icon: 'home-outline',
    iconActive: 'home',
  },
  {
    key: 'jobs',
    label: 'Jobs',
    icon: 'briefcase-outline',
    iconActive: 'briefcase',
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: 'person-outline',
    iconActive: 'person',
  },
];

export const BottomTabs: React.FC<BottomTabsProps> = ({
  initialTab,
  onTabChange,
  onCoursePress,
  onWatchVideo,
  onJobPress,
  onSavedJobsPress,
  onStartProfileBuilder,
  onViewSubscription,
  onViewCertificates,
  onLogout,
  onPostJobPress,
  onTakeTest,
  onApplyPress,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab || 'dashboard');
  const [learningSubTab, setLearningSubTab] = useState<'explore' | 'my_learning'>('explore');
  const [isJobsVisible, setIsJobsVisible] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'lms_config', 'tabs_visibility'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setIsJobsVisible(data.jobs !== false);
        }
      },
      (err) => {
        console.warn('Error listening to tabs visibility in BottomTabs:', err);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    RNStatusBar.setBarStyle('light-content', true);
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor('#4F46E5', true);
      RNStatusBar.setTranslucent(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);

  const handleTabPress = (key: TabKey) => {
    setActiveTab(key);
    if (onTabChange) onTabChange(key);
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardScreen
            onBrowseCourses={() => handleTabPress('learning')}
            onBrowseJobs={() => handleTabPress('jobs')}
            onViewApplications={() => handleTabPress('jobs')}
            onViewNews={() => handleTabPress('news')}
            onViewResources={() => handleTabPress('resources')}
            onViewSupport={() => handleTabPress('profile')}
            onLogout={onLogout}
            onCoursePress={onCoursePress}
            onJobPress={onJobPress}
            onPostJobPress={onPostJobPress}
            onTakeTest={onTakeTest}
            onApplyPress={onApplyPress}
          />
        );
      case 'courses':
        return <CoursesScreen onCoursePress={onCoursePress} onWatchVideo={onWatchVideo} />;
      case 'news':
        return <CurrentAffairsScreen onBack={() => handleTabPress('dashboard')} />;
      case 'resources':
        return <ResourcesScreen onBack={() => handleTabPress('dashboard')} />;
      case 'learning':
        return (
          <SafeAreaView style={[styles.learningWrapper, { backgroundColor: '#4F46E5' }]} edges={['top']}>
            <RNStatusBar barStyle="light-content" backgroundColor="#4F46E5" translucent={false} />
            <StatusBar style="light" />

            {/* Blue Header with title and segment tabs */}
            <View style={styles.learningHeader}>
              <View style={styles.segmentContainer}>
                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    learningSubTab === 'explore' && styles.segmentBtnActive,
                  ]}
                  onPress={() => setLearningSubTab('explore')}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={learningSubTab === 'explore' ? 'compass' : 'compass-outline'}
                    size={16}
                    color={learningSubTab === 'explore' ? '#4F46E5' : 'rgba(255,255,255,0.75)'}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      learningSubTab === 'explore' ? styles.segmentTextActive : styles.segmentTextInactive,
                    ]}
                  >
                    Explore Courses
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    learningSubTab === 'my_learning' && styles.segmentBtnActive,
                  ]}
                  onPress={() => setLearningSubTab('my_learning')}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={learningSubTab === 'my_learning' ? 'book' : 'book-outline'}
                    size={16}
                    color={learningSubTab === 'my_learning' ? '#4F46E5' : 'rgba(255,255,255,0.75)'}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      learningSubTab === 'my_learning' ? styles.segmentTextActive : styles.segmentTextInactive,
                    ]}
                  >
                    My Learning
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {learningSubTab === 'explore' ? (
              <CoursesScreen onCoursePress={onCoursePress} onWatchVideo={onWatchVideo} />
            ) : (
              <MyLearningScreen
                onResumeCourse={(cid, title) => {
                  if (onWatchVideo) onWatchVideo(cid, 0, title);
                  else onCoursePress(cid);
                }}
                onExploreCourses={() => setLearningSubTab('explore')}
              />
            )}
          </SafeAreaView>
        );
      case 'jobs':
        return (
          <JobDashboard
            onJobPress={onJobPress}
            onSavedJobsPress={onSavedJobsPress}
            onRedirectToProfile={() => handleTabPress('profile')}
            onApplyPress={onApplyPress}
            onPostJobPress={
              user?.role === 'recruiter'
                ? onPostJobPress
                : undefined
            }
          />
        );
      case 'resume':
        return (
          <ResumeBuilderScreen
            onStartProfileBuilder={onStartProfileBuilder}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            onStartProfileBuilder={onStartProfileBuilder}
            onViewSubscription={onViewSubscription}
            onViewCertificates={onViewCertificates}
            onLogout={onLogout}
            onSavedJobsPress={onSavedJobsPress}
            onPostJobPress={onPostJobPress}
            onResumeBuilderPress={() => setActiveTab('resume')}
          />
        );
      default:
        return <View />;
    }
  };

  const baseTabs = user?.role === 'recruiter' ? RECRUITER_TABS : SEEKER_TABS;
  const visibleTabs = baseTabs.filter(tab => tab.key !== 'jobs' || isJobsVisible || user?.role === 'recruiter');

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.screenContainer}>{renderActiveScreen()}</View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.key || (tab.key === 'dashboard' && (activeTab === 'news' || activeTab === 'resources'));
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={() => handleTabPress(tab.key)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
            >
              <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
                <Ionicons
                  name={isActive ? tab.iconActive : tab.icon}
                  size={19}
                  color={isActive ? '#FFFFFF' : '#64748B'}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  screenContainer: {
    flex: 1,
    paddingBottom: 88, // Ensures content is not hidden behind the floating tab bar
  },

  // ── Tab Bar ─────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 20 : 12,
    left: 14,
    right: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 68,
    paddingHorizontal: 8,
    paddingVertical: 5,
    // Android elevation & shadow
    elevation: 10,
    // iOS shadow
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },

  // ── Each Tab Button ───────────────────────────────────────
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    borderRadius: 18,
    minHeight: 52,
  },
  tabItemActive: {
    backgroundColor: '#EEF2FF', // proper soft brand background for active tab button!
  },

  iconContainer: {
    width: 38,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconContainerActive: {
    backgroundColor: '#4F46E5', // vibrant primary brand background for active icon!
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },

  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  tabLabelInactive: {
    color: '#64748B',
  },
  learningWrapper: {
    flex: 1,
    backgroundColor: '#4F46E5',
  },
  learningHeader: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  learningHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  segmentHeaderWrapper: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  segmentTextInactive: {
    color: 'rgba(255,255,255,0.80)',
  },
});
