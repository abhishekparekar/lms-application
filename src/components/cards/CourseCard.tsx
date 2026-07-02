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
          {onEnroll && (
            <TouchableOpacity
              style={[
                styles.enrollButton,
                (isEnrolled || course.price === 0) ? styles.enrolledButton : null
              ]}
              onPress={(e) => {
                e.stopPropagation();
                onEnroll();
              }}
            >
              <Text style={styles.enrollButtonText}>
                {isEnrolled ? '▶️ Play' : course.price === 0 ? '▶️ Watch' : 'Buy'}
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
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
    backgroundColor: '#ffffff',
  },
  horizontalCard: {
    height: 380,
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
    padding: 16,
    justifyContent: 'space-between',
  },
  categoryContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    marginBottom: 8,
  },
  categoryText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  instructor: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  metaItem: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  enrollButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  enrolledButton: {
    backgroundColor: '#10B981',
  },
  enrollButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
