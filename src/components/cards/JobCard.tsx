import React from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  useColorScheme 
} from 'react-native';
import { Job } from '@/services/jobs/jobService';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { formatLocation } from '@/utils';

interface JobCardProps {
  job: Job;
  onPress: () => void;
  onApply?: () => void;
  hasApplied?: boolean;
  isSaved?: boolean;
  onSaveToggle?: () => void;
  layoutMode?: 'horizontal' | 'vertical';
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onPress,
  onApply,
  hasApplied = false,
  isSaved = false,
  onSaveToggle,
  layoutMode = 'vertical',
}) => {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const isHorizontal = layoutMode === 'horizontal';

  const initial = job.company ? job.company.charAt(0).toUpperCase() : 'J';
  const hasLogo = job.logoUrl && job.logoUrl.startsWith('http');
  
  const formattedLoc = formatLocation(job.location);
  const isRemote = formattedLoc.toLowerCase().includes('remote');
  const workspaceText = isRemote ? 'REMOTE' : (formattedLoc.toLowerCase().includes('hybrid') ? 'HYBRID' : 'OFFICE');
  const expText = job.experienceLevel === 'Entry Level' ? '0-2 YR EXP' : '2 YR EXP';

  const descSnippet = job.description 
    ? `About the Opportunity: ${job.company} is seeking an exceptional ${typeof job.title === 'string' ? job.title.toLowerCase() : ''} to join...`
    : '';
  
  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onPress}
      style={[
        styles.card,
        isHorizontal ? styles.horizontalCard : null,
        { backgroundColor: colors.background, borderColor: colors.backgroundSelected }
      ]}
    >
      <View style={isHorizontal ? styles.horizontalBody : null}>
        {/* Top Row: Logo & Heart Button */}
        <View style={styles.topRow}>
          {hasLogo ? (
            <Image source={{ uri: job.logoUrl }} style={styles.logo} />
          ) : (
            <View style={[styles.avatarCircle, { backgroundColor: '#4F46E5' }]}>
              <Text style={styles.avatarLetter}>{initial}</Text>
            </View>
          )}
          
          {onSaveToggle && (
            <TouchableOpacity 
              style={[styles.favBtn, isSaved && styles.favBtnActive]}
              onPress={onSaveToggle}
            >
              <Ionicons 
                name={isSaved ? 'heart' : 'heart-outline'} 
                size={18} 
                color={isSaved ? '#EF4444' : '#9CA3AF'} 
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Title & Company */}
        <View style={styles.infoContainer}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {job.title}
          </Text>
          <Text style={styles.company}>{job.company}</Text>
        </View>

        {/* Badge Tags */}
        <View style={styles.tagsContainer}>
          <View style={[styles.tag, styles.typeTag]}>
            <Text style={[styles.tagText, styles.typeTagText]}>{job.type ? job.type.toUpperCase() : 'FULL-TIME'}</Text>
          </View>
          <View style={[styles.tag, styles.workspaceTag]}>
            <Text style={[styles.tagText, styles.workspaceTagText]}>{workspaceText}</Text>
          </View>
          <View style={[styles.tag, styles.expTag]}>
            <Text style={[styles.tagText, styles.expTagText]}>{expText}</Text>
          </View>
        </View>

        {/* Description Snippet */}
        {descSnippet ? (
          <Text style={styles.description} numberOfLines={2}>
            {descSnippet}
          </Text>
        ) : null}
      </View>

      {/* Bottom Row: Post Date, Salary Badge & Apply Button */}
      <View style={styles.footer}>
        <Text style={styles.postedDate}>Posted {job.postedDate || 'recently'}</Text>
        
        <View style={styles.footerRight}>
          <View style={styles.salaryBadge}>
            <Text style={styles.salaryText}>{job.salaryRange || '₹0.1L-0.3L'}</Text>
          </View>
          
          {onApply && (
            <TouchableOpacity
              style={[
                styles.applyButton,
                hasApplied ? styles.appliedButton : null
              ]}
              onPress={onApply}
              disabled={hasApplied}
            >
              <Text style={styles.applyButtonText}>
                {hasApplied ? 'Applied' : 'Apply'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
    backgroundColor: '#ffffff',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  favBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  favBtnActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  infoContainer: {
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  company: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  typeTag: {
    backgroundColor: '#EEF2FF',
    borderColor: '#E0E7FF',
  },
  typeTagText: {
    color: '#4F46E5',
  },
  workspaceTag: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFEDD5',
  },
  workspaceTagText: {
    color: '#D97706',
  },
  expTag: {
    backgroundColor: '#F0F9FF',
    borderColor: '#E0F2FE',
  },
  expTagText: {
    color: '#0284C7',
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 16,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  postedDate: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  salaryBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  salaryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  applyButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  appliedButton: {
    backgroundColor: '#10B981',
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  horizontalCard: {
    height: 275,
    marginBottom: 0,
    justifyContent: 'space-between',
  },
  horizontalBody: {
    flex: 1,
  },
});
