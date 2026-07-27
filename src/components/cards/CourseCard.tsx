import React from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  useColorScheme 
} from 'react-native';
import { Course } from '@/services/lms/lmsService';
import { Colors } from '@/constants/theme';

interface CourseCardProps {
  course: Course;
  onPress: () => void;
  onEnroll?: () => void;
  isEnrolled?: boolean;
  layoutMode?: 'horizontal' | 'vertical';
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onPress,
  onEnroll,
  isEnrolled = false,
  layoutMode = 'vertical',
}) => {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const isHorizontal = layoutMode === 'horizontal';

  const imgUri = course.imageUrl || course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop';

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
      {/* Thumbnail Container with Badges */}
      <View style={styles.imageWrap}>
        <Image source={{ uri: imgUri }} style={[styles.image, isHorizontal ? styles.horizontalImage : null]} resizeMode="cover" />
        
        {/* Category Badge Top-Left */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText} numberOfLines={1}>{course.category || 'Course'}</Text>
        </View>

        {/* Floating Price Tag Top-Right */}
        <View style={[styles.priceBadge, course.price === 0 ? styles.freeBadge : styles.paidBadge]}>
          <Text style={styles.priceBadgeText}>
            {course.price === 0 ? 'FREE' : `₹${course.price}`}
          </Text>
        </View>
      </View>

      {/* Card Content Body */}
      <View style={[styles.content, isHorizontal ? styles.horizontalContent : null]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {course.title}
          </Text>
          <Text style={styles.instructor} numberOfLines={1}>By {course.instructor || 'Ganimi Kava'}</Text>
          
          <View style={styles.metaRow}>
            <View style={styles.ratingBadge}>
              <Text style={styles.starIcon}>⭐</Text>
              <Text style={styles.ratingText}>{(course.rating || 4.8).toFixed(1)}</Text>
            </View>
            <Text style={styles.metaDivider}>•</Text>
            <Text style={styles.metaItem}>🕒 {course.duration || '2h 30m'}</Text>
          </View>
        </View>

        {/* Footer Action */}
        <View style={[styles.footer, !isHorizontal ? styles.verticalFooter : null]}>
          {isHorizontal && (
            <Text style={[styles.priceText, { color: colors.text }]}>
              {course.price === 0 ? 'Free Access' : `₹${course.price}`}
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.enrollButton,
              !isHorizontal ? styles.fullEnrollButton : null,
              isEnrolled ? styles.enrolledButton : null,
              (!isEnrolled && course.price > 0) ? styles.buyButton : null
            ]}
            onPress={(e) => {
              e.stopPropagation();
              if (onEnroll) {
                onEnroll();
              } else {
                onPress();
              }
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.enrollButtonText}>
              {isEnrolled ? '▶  Watch' : course.price === 0 ? 'Enroll Free' : 'Enroll Now'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    height: 245,
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    backgroundColor: '#ffffff',
  },
  horizontalCard: {
    height: 330,
    marginBottom: 0,
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
  },
  image: {
    width: '100%',
    height: 95,
    backgroundColor: '#E5E7EB',
  },
  horizontalImage: {
    height: 130,
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  priceBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  freeBadge: {
    backgroundColor: '#10B981',
  },
  paidBadge: {
    backgroundColor: '#4F46E5',
  },
  priceBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  content: {
    padding: 10,
    flex: 1,
    justifyContent: 'space-between',
  },
  horizontalContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 17,
    height: 34,
    marginBottom: 2,
  },
  instructor: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    gap: 2,
  },
  starIcon: {
    fontSize: 9.5,
  },
  ratingText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#D97706',
  },
  metaDivider: {
    fontSize: 9.5,
    color: '#94A3B8',
  },
  metaItem: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 2,
  },
  verticalFooter: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingTop: 6,
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  enrollButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  fullEnrollButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  enrolledButton: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  buyButton: {
    backgroundColor: '#F97316',
    shadowColor: '#F97316',
  },
  enrollButtonText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
