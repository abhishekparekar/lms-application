import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Course, calculateCoursePrice } from '@/services/lms/lmsService';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface CourseCardProps {
  course: Course;
  onPress: () => void;
  onEnroll?: () => void;
  onDelete?: () => void;
  isEnrolled?: boolean;
  layoutMode?: 'horizontal' | 'vertical';
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onPress,
  onEnroll,
  onDelete,
  isEnrolled = false,
  layoutMode = 'vertical',
}) => {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const isHorizontal = layoutMode === 'horizontal';

  const imgUri =
    course.imageUrl ||
    (course as any).thumbnail ||
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop';
  const priceInfo = calculateCoursePrice(course);
  const rating = (course.rating || 4.8).toFixed(1);
  const lessonsMeta = course.lessonsCount ? `${course.lessonsCount} lessons` : 'Self-paced';
  const durationMeta = course.duration || '2h 30m';

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={[styles.card, isHorizontal ? styles.horizontalCard : styles.verticalCard]}
    >
      {/* ── Thumbnail ── */}
      <View style={[styles.imageWrap, isHorizontal ? styles.horizontalImageWrap : styles.verticalImageWrap]}>
        <Image source={{ uri: imgUri }} style={styles.image} resizeMode="cover" />

        {/* Category badge — top left */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText} numberOfLines={1}>
            {course.category || 'Course'}
          </Text>
        </View>

        {/* Price / Free / Discount badge — top right */}
        {onDelete ? (
          <TouchableOpacity
            style={[styles.priceBadge, { backgroundColor: '#EF4444' }]}
            onPress={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={11} color="#FFFFFF" />
            <Text style={[styles.priceBadgeText, { color: '#FFFFFF' }]}>Delete</Text>
          </TouchableOpacity>
        ) : (
          <View style={[
            styles.priceBadge,
            priceInfo.isFree ? styles.freeBadge : priceInfo.hasDiscount ? styles.discountBadge : styles.paidBadge,
          ]}>
            <Text style={styles.priceBadgeText}>
              {priceInfo.isFree
                ? 'FREE'
                : priceInfo.hasDiscount
                  ? `🔥 ${priceInfo.discountPercent}% OFF`
                  : `₹${priceInfo.finalPrice}`}
            </Text>
          </View>
        )}

        {/* Bottom overlay chips for horizontal mode */}
        {isHorizontal && (
          <View style={styles.thumbnailBottomOverlay}>
            <View style={styles.overlayChip}>
              <Ionicons name="play-circle-outline" size={11} color="#FFFFFF" />
              <Text style={styles.overlayChipText}>{lessonsMeta}</Text>
            </View>
            <View style={styles.overlayChip}>
              <Ionicons name="time-outline" size={11} color="#FFFFFF" />
              <Text style={styles.overlayChipText}>{durationMeta}</Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Card Body ── */}
      <View style={styles.body}>
        {/* Title */}
        <Text
          style={[styles.title, isHorizontal ? styles.titleHorizontal : styles.titleVertical]}
          numberOfLines={2}
        >
          {course.title}
        </Text>

        {/* Instructor */}
        <View style={styles.instructorRow}>
          <Ionicons name="person-circle-outline" size={14} color="#6366F1" />
          <Text style={styles.instructorText} numberOfLines={1}>
            {course.instructor || 'Ganimi Kava'}
          </Text>
        </View>

        {/* Meta chips: Rating · Lessons · Duration */}
        <View style={styles.metaRow}>
          {/* Rating */}
          <View style={styles.ratingChip}>
            <Text style={styles.ratingStar}>⭐</Text>
            <Text style={styles.ratingText}>{rating}</Text>
          </View>

          <View style={styles.metaDot} />

          {/* Lessons */}
          <View style={styles.metaChip}>
            <Ionicons name="book-outline" size={10} color="#64748B" />
            <Text style={styles.metaChipText}>{lessonsMeta}</Text>
          </View>

          {/* Duration — only in vertical mode to avoid overflow */}
          {!isHorizontal && (
            <>
              <View style={styles.metaDot} />
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={10} color="#64748B" />
                <Text style={styles.metaChipText}>{durationMeta}</Text>
              </View>
            </>
          )}
        </View>

        {/* ── Divider ── */}
        <View style={styles.divider} />

        {/* ── Footer: Price + Button ── */}
        <View style={[styles.footer, isHorizontal && styles.footerHorizontal]}>
          {/* Price block */}
          <View style={styles.priceBlock}>
            {priceInfo.isFree ? (
              <Text style={styles.priceTagFree}>Free Access</Text>
            ) : (
              <View style={styles.priceRow}>
                {priceInfo.hasDiscount && (
                  <Text style={styles.priceStrike}>₹{priceInfo.originalPrice}</Text>
                )}
                <Text style={styles.priceTag}>₹{priceInfo.finalPrice}</Text>
                {priceInfo.hasDiscount && (
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeText}>{priceInfo.discountPercent}% off</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={[
              styles.enrollBtn,
              isEnrolled ? styles.enrolledBtn : !priceInfo.isFree ? styles.buyBtn : styles.freeBtn,
              isHorizontal ? styles.enrollBtnHorizontal : styles.enrollBtnVertical,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              if (onEnroll) onEnroll();
              else onPress();
            }}
            activeOpacity={0.85}
          >
            {isEnrolled ? (
              <Ionicons name="play" size={13} color="#FFFFFF" />
            ) : null}
            <Text style={styles.enrollBtnText}>
              {isEnrolled
                ? 'Watch Now'
                : priceInfo.isFree
                  ? 'Enroll Free'
                  : isHorizontal
                    ? 'Enroll Now'
                    : `Enroll · ₹${priceInfo.finalPrice}`}
            </Text>
            {!isEnrolled && (
              <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
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
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
  },
  verticalCard: {
    marginBottom: 12,
  },
  horizontalCard: {
    marginBottom: 0,
    minHeight: 295,
    justifyContent: 'space-between',
  },

  // ── Thumbnail
  imageWrap: {
    position: 'relative',
    width: '100%',
    backgroundColor: '#DDD6FE',
  },
  verticalImageWrap: {
    height: 118,
  },
  horizontalImageWrap: {
    height: 148,
  },
  image: {
    width: '100%',
    height: '100%',
  },

  // Category badge — top left
  categoryBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Price badge — top right
  priceBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 3,
  },
  freeBadge: {
    backgroundColor: '#10B981',
  },
  paidBadge: {
    backgroundColor: '#4F46E5',
  },
  discountBadge: {
    backgroundColor: '#DC2626',
  },
  priceBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  // Bottom overlay chips (horizontal mode)
  thumbnailBottomOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 9,
    right: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overlayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  overlayChipText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
  },

  // ── Card Body
  body: {
    padding: 14,
    flex: 1,
    justifyContent: 'space-between',
  },

  // Title
  title: {
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginBottom: 5,
  },
  titleVertical: {
    fontSize: 13,
    lineHeight: 17.5,
  },
  titleHorizontal: {
    fontSize: 14.5,
    lineHeight: 20,
  },

  // Instructor
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 9,
  },
  instructorText: {
    fontSize: 11.5,
    color: '#6366F1',
    fontWeight: '600',
    flex: 1,
  },

  // Meta chips row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 2,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    gap: 2,
  },
  ratingText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#D97706',
  },
  ratingStar: {
    fontSize: 9,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaChipText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#F0F4FF',
    marginVertical: 11,
  },

  // ── Footer
  footer: {
    flexDirection: 'column',
    gap: 8,
  },
  footerHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 0,
  },

  // Price block
  priceBlock: {
    justifyContent: 'center',
  },
  priceTagFree: {
    fontSize: 14,
    fontWeight: '900',
    color: '#059669',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  priceStrike: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  priceTag: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E1B4B',
    letterSpacing: -0.2,
  },
  saveBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  saveBadgeText: {
    fontSize: 9.5,
    color: '#059669',
    fontWeight: '800',
  },

  // Enroll Button
  enrollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    gap: 6,
  },
  enrollBtnVertical: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: '100%',
  },
  enrollBtnHorizontal: {
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  freeBtn: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
  },
  buyBtn: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
  },
  enrolledBtn: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  enrollBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
