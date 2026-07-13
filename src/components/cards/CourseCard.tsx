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
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.card,
        isHorizontal ? styles.horizontalCard : null,
        { backgroundColor: colors.background, borderColor: colors.backgroundSelected }
      ]}
    >
      <Image source={{ uri: imgUri }} style={[styles.image, isHorizontal ? styles.horizontalImage : null]} />
      <View style={[styles.content, isHorizontal ? styles.horizontalContent : null]}>
        <View>
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryText}>{course.category}</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {course.title}
          </Text>
          <Text style={styles.instructor} numberOfLines={1}>By {course.instructor}</Text>
          
          <View style={styles.metaRow}>
            <Text style={styles.metaItem}>🕒 {course.duration}</Text>
            <Text style={styles.metaItem}>📚 {course.lessonsCount} lessons</Text>
            <Text style={styles.metaItem}>⭐ {(course.rating || 0).toFixed(1)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.price, { color: colors.text }]}>
            {course.price === 0 ? 'Free' : `₹${course.price}`}
          </Text>
          <TouchableOpacity
            style={[
              styles.enrollButton,
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
          >
            <Text style={styles.enrollButtonText}>
              {isEnrolled ? '▶️ Watch' : course.price === 0 ? 'Enroll Free' : 'Enroll Now'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    backgroundColor: '#ffffff',
  },
  horizontalCard: {
    height: 350,
    marginBottom: 0,
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: '#E5E7EB',
  },
  horizontalImage: {
    height: 120,
  },
  content: {
    padding: 20,
  },
  horizontalContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  categoryContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    marginBottom: 8,
  },
  categoryText: {
    color: '#8B5CF6',
    fontSize: 10.5,
    fontWeight: '700',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 20,
    marginBottom: 4,
  },
  instructor: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  metaItem: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  price: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  enrollButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
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
  },
});
