import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { jobService, Job } from '@/services/jobs/jobService';
import { lmsService } from '@/services/lms/lmsService';
import { JobCard } from '@/components/cards/JobCard';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/services/firebase/config';
import { collection, onSnapshot, doc, query, where } from 'firebase/firestore';

interface SavedJobsProps {
  onBack: () => void;
  onJobPress: (jobId: string) => void;
  onApplyPress?: (jobId: string) => void;
}

export const SavedJobs: React.FC<SavedJobsProps> = ({
  onBack,
  onJobPress,
  onApplyPress,
}) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isJobsVisible, setIsJobsVisible] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'lms_config', 'tabs_visibility'), (snap) => {
      if (snap.exists()) {
        setIsJobsVisible(snap.data().jobs !== false);
      }
    }, (err) => {
      console.warn('SavedJobs visibility listener error:', err);
    });
    return () => unsub();
  }, []);

  const savedJobs = allJobs.filter(j => savedJobIds.includes(j.id));

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribeJobs = onSnapshot(
      collection(db, 'jobs'),
      (snapshot) => {
        const list: Job[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Job);
        });
        if (list.length === 0) {
          jobService.getJobs().then(setAllJobs);
        } else {
          setAllJobs(list);
        }
        setLoading(false);
      },
      async (err) => {
        console.warn('Error listening to jobs in SavedJobs:', err);
        const list = await jobService.getJobs();
        setAllJobs(list);
        setLoading(false);
      }
    );

    const unsubscribeUser = onSnapshot(
      doc(db, 'users', user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSavedJobIds(data.savedJobIds || []);
        }
      },
      (err) => console.error('SavedJobs user snapshot error:', err)
    );

    const appsQ = query(collection(db, 'applications'), where('seekerId', '==', user.uid));
    const unsubscribeApps = onSnapshot(
      appsQ,
      (snapshot) => {
        const list: string[] = [];
        snapshot.forEach((docSnap) => {
          const appData = docSnap.data();
          if (appData.jobId) list.push(appData.jobId);
        });
        setAppliedIds(list);
      },
      (err) => console.error('SavedJobs apps snapshot error:', err)
    );

    return () => {
      unsubscribeJobs();
      unsubscribeUser();
      unsubscribeApps();
    };
  }, [user]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }, []);

  const handleUnsave = async (jobId: string) => {
    if (!user) return;
    try {
      await lmsService.toggleBookmarkJob(user.uid, jobId, true);
      Alert.alert('Bookmarks Updated', 'Job removed from saved bookmarks.');
    } catch (e) {
      console.error('Failed to unsave job:', e);
    }
  };

  const handleApply = async (jobId: string) => {
    if (!user) return;

    const completeness = user.profileCompleteness || 0;
    if (completeness < 80) {
      Alert.alert(
        'Complete Your Profile to Apply',
        `Your profile is ${completeness}% complete. You need at least 80% completeness to apply for jobs.`,
        [{ text: 'Build Profile', onPress: onBack }]
      );
      return;
    }

    try {
      await jobService.applyForJob(user.uid, jobId);
      setAppliedIds([...appliedIds, jobId]);
      Alert.alert('Applied Successfully!', 'Your application has been logged.');
    } catch (e) {
      console.error('Apply failed:', e);
    }
  };

  if (!isJobsVisible) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]} edges={['top']}>
        <Ionicons name="lock-closed-outline" size={64} color="#9CA3AF" />
        <Text style={{ color: '#1F2937', marginTop: 16, fontSize: 16, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 24 }}>
          Saved jobs are temporarily unavailable because the job portal is disabled by the administrator.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#4F46E5' }]} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Saved Bookmarks
        </Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{savedJobs.length}</Text>
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
        <FlatList
          data={savedJobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 32 + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4F46E5" />
        }
        renderItem={({ item }) => (
          <JobCard
            job={item}
            onPress={() => onJobPress(item.id)}
            isSaved={true}
            onSaveToggle={() => handleUnsave(item.id)}
            onApply={() => {
              if (onApplyPress) {
                onApplyPress(item.id);
              } else {
                onJobPress(item.id);
              }
            }}
            hasApplied={appliedIds.includes(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#4F46E5" />
            ) : (
              <>
                <Ionicons name="bookmark-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>No Bookmarks Saved</Text>
                <Text style={styles.emptyText}>
                  Explore open positions and tap the heart icon to save listings for later review.
                </Text>
                <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                  <Text style={styles.backBtnText}>Browse Open Jobs</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FC',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: 16,
    backgroundColor: '#4F46E5',
    borderBottomWidth: 1,
    borderBottomColor: '#4338CA',
  },
  iconButton: { 
    paddingRight: 14,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#FFFFFF',
    flex: 1,
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  countBadgeText: { 
    color: '#FFFFFF', 
    fontSize: 12, 
    fontWeight: '800',
  },
  listContent: { 
    padding: 16, 
    paddingBottom: 32,
  },
  emptyContainer: { 
    padding: 48, 
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#1F2937',
    marginTop: 8,
  },
  emptyText: { 
    fontSize: 13, 
    color: '#6B7280', 
    textAlign: 'center', 
    lineHeight: 18, 
    fontWeight: '500',
    marginBottom: 12,
  },
  backBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  backBtnText: { 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: '800',
  },
});
