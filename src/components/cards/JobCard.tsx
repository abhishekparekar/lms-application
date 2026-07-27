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

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={[
        styles.card,
        isHorizontal ? styles.horizontalCard : null,
        { backgroundColor: scheme === 'dark' ? '#1E293B' : '#FFFFFF', borderColor: scheme === 'dark' ? '#334155' : '#EEF2FF' }
      ]}
    >
      {/* Top Row: Logo & Top Right Badges */}
      <View style={styles.topRow}>
        {hasLogo ? (
          <Image source={{ uri: job.logoUrl }} style={styles.logo} resizeMode="cover" />
        ) : (
          <View style={[styles.avatarCircle, { backgroundColor: '#4F46E5' }]}>
            <Text style={styles.avatarLetter}>{initial}</Text>
          </View>
        )}

        <View style={styles.topRightGroup}>
          <View style={styles.salaryBadge}>
            <Text style={styles.salaryText}>{job.salaryRange || 'Best Pay'}</Text>
          </View>
          {onSaveToggle && (
            <TouchableOpacity 
              style={[styles.favBtn, isSaved && styles.favBtnActive]}
              onPress={(e) => {
                e.stopPropagation();
                onSaveToggle();
              }}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={isSaved ? 'heart' : 'heart-outline'} 
                size={14} 
                color={isSaved ? '#EF4444' : '#9CA3AF'} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Info Container */}
      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {job.title}
        </Text>
        <Text style={styles.company} numberOfLines={1}>{job.company}</Text>
      </View>

      {/* Tags */}
      <View style={styles.tagsContainer}>
        <View style={[styles.tag, styles.typeTag]}>
          <Text style={[styles.tagText, styles.typeTagText]}>{job.type ? job.type.toUpperCase() : 'FULL-TIME'}</Text>
        </View>
        <View style={[styles.tag, styles.workspaceTag]}>
          <Text style={[styles.tagText, styles.workspaceTagText]}>{workspaceText}</Text>
        </View>
      </View>

      {/* Full-width Footer Action */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.applyButton,
            hasApplied ? styles.appliedButton : null
          ]}
          onPress={(e) => {
            e.stopPropagation();
            if (onApply) {
              onApply();
            } else {
              onPress();
            }
          }}
          disabled={hasApplied}
          activeOpacity={0.85}
        >
          <Text style={styles.applyButtonText}>
            {hasApplied ? '✓ Applied' : 'Apply Now'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    height: 215,
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    backgroundColor: '#ffffff',
  },
  horizontalCard: {
    height: 'auto',
    minHeight: 140,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  topRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  salaryBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  salaryText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
  },
  favBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  favBtnActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  infoContainer: {
    marginBottom: 8,
  },
  title: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 18,
    marginBottom: 2,
  },
  company: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 10,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 9,
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
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 2,
  },
  applyButton: {
    backgroundColor: '#4F46E5',
    width: '100%',
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  appliedButton: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
