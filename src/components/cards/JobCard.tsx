import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Job } from '@/services/jobs/jobService';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { formatLocation, formatJobSalary, getJobLogoUrl } from '@/utils';

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
  const logoUrl = getJobLogoUrl(job);
  const hasLogo = Boolean(logoUrl);
  const salaryText = formatJobSalary(job);

  const formattedLoc = formatLocation(job.location);
  const isRemote = formattedLoc.toLowerCase().includes('remote');
  const isHybrid = formattedLoc.toLowerCase().includes('hybrid');
  const workspaceText = isRemote ? 'Remote' : isHybrid ? 'Hybrid' : 'On-Site';
  const workspaceColor = isRemote ? '#059669' : isHybrid ? '#D97706' : '#475569';
  const workspaceBg = isRemote ? '#ECFDF5' : isHybrid ? '#FEF3C7' : '#F1F5F9';
  const workspaceBorder = isRemote ? '#6EE7B7' : isHybrid ? '#FCD34D' : '#CBD5E1';

  const jobType = job.type || 'Full-time';
  const experienceLevel = job.experienceLevel || '';

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={[styles.card, isHorizontal && styles.horizontalCard]}
    >
      {/* ── Header: Logo + Title + Company + Bookmark ── */}
      <View style={styles.headerRow}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          {hasLogo ? (
            <Image source={{ uri: logoUrl }} style={styles.logoImage} resizeMode="contain" />
          ) : (
            <View style={styles.logoFallback}>
              <Text style={styles.logoFallbackText}>{initial}</Text>
            </View>
          )}
        </View>

        {/* Title & Company */}
        <View style={styles.titleBlock}>
          <Text style={styles.jobTitle} numberOfLines={2}>
            {job.title}
          </Text>
          <View style={styles.companyRow}>
            <Ionicons name="business-outline" size={12} color="#6366F1" />
            <Text style={styles.companyText} numberOfLines={1}>
              {job.company || 'Verified Employer'}
            </Text>
          </View>
        </View>

        {/* Bookmark */}
        {onSaveToggle && (
          <TouchableOpacity
            style={[styles.bookmarkBtn, isSaved && styles.bookmarkBtnActive]}
            onPress={(e) => {
              e.stopPropagation();
              onSaveToggle();
            }}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Remove bookmark' : 'Bookmark job'}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={17}
              color={isSaved ? '#4F46E5' : '#94A3B8'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Meta chips row: Type · Work mode · Level · Location ── */}
      <View style={styles.metaRow}>
        {/* Job Type chip */}
        <View style={[styles.chip, styles.chipType]}>
          <Ionicons name="briefcase-outline" size={10} color="#4338CA" />
          <Text style={[styles.chipText, { color: '#4338CA' }]}>{jobType}</Text>
        </View>

        {/* Work mode chip */}
        <View style={[styles.chip, { backgroundColor: workspaceBg, borderColor: workspaceBorder }]}>
          <Ionicons
            name={isRemote ? 'globe-outline' : isHybrid ? 'git-branch-outline' : 'business-outline'}
            size={10}
            color={workspaceColor}
          />
          <Text style={[styles.chipText, { color: workspaceColor }]}>{workspaceText}</Text>
        </View>

        {/* Experience level chip — if available */}
        {experienceLevel ? (
          <View style={[styles.chip, styles.chipLevel]}>
            <Ionicons name="trending-up-outline" size={10} color="#7C3AED" />
            <Text style={[styles.chipText, { color: '#7C3AED' }]}>{experienceLevel}</Text>
          </View>
        ) : null}

        {/* Location chip */}
        {formattedLoc ? (
          <View style={[styles.chip, styles.chipLocation]}>
            <Ionicons name="location-outline" size={10} color="#64748B" />
            <Text style={[styles.chipText, { color: '#64748B' }]} numberOfLines={1}>
              {formattedLoc}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Divider ── */}
      <View style={styles.divider} />

      {/* ── Footer: Salary + Apply ── */}
      <View style={styles.footerRow}>
        <View style={styles.salaryBlock}>
          <Text style={styles.salaryLabel}>OFFERED SALARY</Text>
          <Text style={styles.salaryValue} numberOfLines={1}>
            {salaryText}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.applyBtn, hasApplied && styles.appliedBtn]}
          onPress={(e) => {
            e.stopPropagation();
            if (onApply) onApply();
            else onPress();
          }}
          disabled={hasApplied}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={hasApplied ? 'Already applied' : 'Apply for this job'}
        >
          {hasApplied ? (
            <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
          ) : null}
          <Text style={styles.applyBtnText}>
            {hasApplied ? 'Applied' : 'Apply Now'}
          </Text>
          {!hasApplied && <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // ── Card Container
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
  },
  horizontalCard: {
    marginBottom: 0,
    minHeight: 195,
    justifyContent: 'space-between',
  },

  // ── Header Row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  // Logo
  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  logoImage: {
    width: 42,
    height: 42,
  },
  logoFallback: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallbackText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4F46E5',
  },

  // Title + Company
  titleBlock: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 5,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 21,
    letterSpacing: -0.3,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  companyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
    flex: 1,
  },

  // Bookmark
  bookmarkBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bookmarkBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },

  // ── Meta chips
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  chipType: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  chipLevel: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  chipLocation: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    maxWidth: 180,
  },

  // ── Divider
  divider: {
    height: 1,
    backgroundColor: '#F0F4FF',
    marginVertical: 13,
  },

  // ── Footer
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  salaryBlock: {
    flex: 1,
    paddingRight: 12,
  },
  salaryLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.7,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  salaryValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E1B4B',
    letterSpacing: -0.2,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 13,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    gap: 6,
  },
  appliedBtn: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
