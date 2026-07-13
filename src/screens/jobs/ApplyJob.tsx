import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { jobService } from '@/services/jobs/jobService';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { db } from '@/services/firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface ApplyJobProps {
  jobId: string;
  onBack: () => void;
  onSuccess: () => void;
}

export const ApplyJob: React.FC<ApplyJobProps> = ({
  jobId,
  onBack,
  onSuccess,
}) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [coverLetter, setCoverLetter] = useState('');
  const [loading, setLoading] = useState(false);

  const seekerProfile = user?.seekerProfile;
  const name = seekerProfile?.fullName || user?.displayName || 'Applicant';
  const email = user?.email || '';
  const phone = seekerProfile?.phone || '';
  const bio = seekerProfile?.bio || '';
  const skills = seekerProfile?.skills || [];
  const resumeUrl = seekerProfile?.resumeUrl || '';
  const completeness = user?.profileCompleteness || 0;

  const resumeName = resumeUrl ? resumeUrl.split('/').pop() || 'Resume.pdf' : 'No Resume Uploaded';

  const initials = name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSubmit = async () => {
    if (!user) return;
    if (completeness < 80) {
      Alert.alert(
        'Profile Incomplete',
        `Your profile is only ${completeness}% complete. You need at least 80% completeness to apply for jobs.`,
        [{ text: 'Build Profile', onPress: onBack }]
      );
      return;
    }
    setLoading(true);
    try {
      // Check application limits inside subscription
      const subRef = doc(db, 'subscriptions', user.uid);
      const subSnap = await getDoc(subRef);
      if (!subSnap.exists()) {
        Alert.alert('Subscription Required', 'You must have an active subscription package to apply for jobs.');
        setLoading(false);
        return;
      }
      const subData = subSnap.data();
      if (subData?.status !== 'active') {
        Alert.alert('Subscription Expired', 'Your subscription is expired or inactive. Please renew to apply.');
        setLoading(false);
        return;
      }
      const maxApplications = subData?.maxApplications || 0;
      const usage = subData?.usageStats || {};
      const applicationsUsed = usage?.applicationsUsed || 0;

      if (applicationsUsed >= maxApplications) {
        Alert.alert('Limit Reached', `You have reached the limit of ${maxApplications} applications in your active plan.`);
        setLoading(false);
        return;
      }

      // Submit application
      await jobService.applyForJob(user.uid, jobId);

      // Increment applicationsUsed count
      await updateDoc(subRef, {
        'usageStats.applicationsUsed': applicationsUsed + 1
      });

      Alert.alert(
        'Application Submitted!',
        'Your profile details and resume have been sent to the recruiter.',
        [{ text: 'OK', onPress: onSuccess }]
      );
    } catch (e: any) {
      Alert.alert('Submission Failed', e.message || 'Could not apply.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apply For Job</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {/* Applicant Profile Review */}
        <Text style={styles.sectionLabel}>Review Profile Details</Text>
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileHeaderInfo}>
              <Text style={styles.applicantName}>{name}</Text>
              <Text style={styles.applicantMeta}>{email} {phone ? `• ${phone}` : ''}</Text>
            </View>
          </View>

          {bio ? (
            <View style={styles.profileBioSection}>
              <Text style={styles.subLabel}>Summary</Text>
              <Text style={styles.bioText} numberOfLines={3}>{bio}</Text>
            </View>
          ) : null}

          {skills.length > 0 ? (
            <View style={styles.profileSkillsSection}>
              <Text style={styles.subLabel}>Skills</Text>
              <View style={styles.skillsWrap}>
                {skills.map((sk: string) => (
                  <View key={sk} style={styles.skillChip}>
                    <Text style={styles.skillChipText}>{sk}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>Review Resume</Text>
        <View style={[styles.resumeCard, !resumeUrl && styles.resumeCardError]}>
          <Ionicons name="document-text" size={32} color={resumeUrl ? '#4F46E5' : '#EF4444'} />
          <View style={styles.resumeInfo}>
            <Text style={styles.resumeName} numberOfLines={1}>{resumeName}</Text>
            <Text style={styles.resumeSize}>
              {resumeUrl ? 'PDF File • Ready to Submit' : 'Please upload a resume in the profile builder'}
            </Text>
          </View>
          {resumeUrl ? (
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
          ) : (
            <Ionicons name="alert-circle" size={22} color="#EF4444" />
          )}
        </View>

        <Text style={styles.sectionLabel}>Cover Note (Optional)</Text>
        <Input
          placeholder="Briefly introduce yourself and explain why you're a great fit for this role..."
          value={coverLetter}
          onChangeText={setCoverLetter}
          multiline
          numberOfLines={6}
          inputStyle={styles.coverNoteInput}
        />

        <Button 
          title="Submit Application" 
          onPress={handleSubmit} 
          loading={loading}
          style={styles.submitBtn}
        />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  keyboardContainer: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  iconButton: {
    paddingRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  scrollContent: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 15,
  },
  // Profile Card
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4F46E5',
  },
  profileHeaderInfo: {
    flex: 1,
  },
  applicantName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  applicantMeta: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  profileBioSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    marginBottom: 12,
  },
  bioText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    fontWeight: '500',
  },
  profileSkillsSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillChip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  skillChipText: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '700',
  },
  // Resume Card
  resumeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#ffffff',
    marginBottom: 16,
    gap: 12,
  },
  resumeCardError: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  resumeInfo: {
    flex: 1,
  },
  resumeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  resumeSize: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  coverNoteInput: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 120,
    alignItems: 'flex-start',
    paddingTop: 12,
    paddingHorizontal: 14,
  },
  submitBtn: {
    marginTop: 24,
    borderRadius: 14,
    height: 50,
  },
});
