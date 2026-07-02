import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CoursesScreen } from '../screens/dashboard/CoursesScreen';
import { CurrentAffairsScreen } from '../screens/dashboard/CurrentAffairsScreen';
import { ResourcesScreen } from '../screens/dashboard/ResourcesScreen';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { JobDashboard } from '../screens/jobs/JobDashboard';
import { ResumeBuilderScreen } from '../screens/resume/ResumeBuilderScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { LandingScreen } from '../screens/public/LandingScreen';
import { MyLearningScreen } from '../screens/learning/MyLearningScreen';
import { useAuth } from '@/hooks/useAuth';

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
  onWatchVideo?: (courseId: string, lessonIndex: number) => void;
  onJobPress: (jobId: string) => void;
  onSavedJobsPress: () => void;
  onStartProfileBuilder: () => void;
  onViewSubscription: () => void;
  onViewCertificates: () => void;
  onLogout: () => void;
  onPostJobPress?: (editingJobId?: string) => void;
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
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab || 'dashboard');
  const [learningSubTab, setLearningSubTab] = useState<'explore' | 'my_learning'>('explore');

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
            onViewNews={() => handleTabPress('learning')}
            onViewResources={() => handleTabPress('learning')}
            onViewSupport={() => handleTabPress('profile')}
            onLogout={onLogout}
            onCoursePress={onCoursePress}
            onJobPress={onJobPress}
            onPostJobPress={onPostJobPress}
          />
        );
      case 'courses':
        return <CoursesScreen onCoursePress={onCoursePress} onWatchVideo={onWatchVideo} />;
      case 'news':
        return <CurrentAffairsScreen />;
      case 'resources':
        return <ResourcesScreen />;
      case 'learning':
        return (
          <SafeAreaView style={styles.learningWrapper} edges={['top']}>
            <View style={styles.segmentContainer}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  learningSubTab === 'explore' && styles.segmentBtnActive,
                ]}
                onPress={() => setLearningSubTab('explore')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentText,
                    learningSubTab === 'explore' && styles.segmentTextActive,
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
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentText,
                    learningSubTab === 'my_learning' && styles.segmentTextActive,
                  ]}
                >
                  My Learning
                </Text>
              </TouchableOpacity>
            </View>

            {learningSubTab === 'explore' ? (
              <CoursesScreen onCoursePress={onCoursePress} onWatchVideo={onWatchVideo} />
            ) : (
              <MyLearningScreen
                onResumeCourse={(cid) => {
                  if (onWatchVideo) onWatchVideo(cid, 0);
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
          />
        );
      default:
        return <View />;
    }
  };

  const visibleTabs = user?.role === 'recruiter' ? RECRUITER_TABS : SEEKER_TABS;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.screenContainer}>{renderActiveScreen()}</View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab.key)}
              activeOpacity={0.7}
            >
              {/* Active pill background */}
              {isActive && <View style={styles.activePill} />}

              <Ionicons
                name={isActive ? tab.iconActive : tab.icon}
                size={22}
                color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
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
    backgroundColor: '#ffffff',
  },
  screenContainer: {
    flex: 1,
  },

  // ── Tab Bar ─────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    height: Platform.OS === 'ios' ? 60 : 62,
    paddingHorizontal: 8,
    // Android shadow
    elevation: 12,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },

  // ── Each Tab ─────────────────────────────────────────────
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    position: 'relative',
    minHeight: 48, // Google touch target guideline
  },

  // Active background pill (shows behind the icon)
  activePill: {
    position: 'absolute',
    top: 4,
    width: 48,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
  },

  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: ACTIVE_COLOR,
    fontWeight: '800',
  },
  tabLabelInactive: {
    color: INACTIVE_COLOR,
  },
  learningWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF', // cleaner background
  },
  segmentContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  segmentBtnActive: {
    borderBottomColor: '#6C63FF',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  segmentTextActive: {
    color: '#6C63FF',
    fontWeight: '800',
  },
});
