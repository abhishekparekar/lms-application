import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/services/firebase/config';
import { Course, courseService } from '@/services/lms/lmsService';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  onCoursePress: (courseId: string) => void;
  onWatchVideo?: (courseId: string, lessonIndex: number) => void;
}

const CATS = ['All', 'Development', 'Design', 'Business', 'Marketing', 'Personal Development'];
const SORT_OPTIONS = ['Popular', 'Newest', 'Price: Low', 'Price: High', 'Rating'];

// ─────────────────────────────────────────────────────────────────────────────
// Premium Main Course Card
// ─────────────────────────────────────────────────────────────────────────────
const PremiumCard: React.FC<{
  course: Course; enrolled: boolean;
  onPress: () => void; onAction: () => void;
  isDark: boolean;
}> = ({ course, enrolled, onPress, onAction, isDark }) => {
  const isFree = course.price === 0 || (course as any).isFree;
  const cardBg = isDark ? '#1A1A2E' : '#FFFFFF';
  const border = isDark ? '#2A2A3E' : '#F3F4F8';
  const textPrimary = isDark ? '#F0F0FF' : '#111827';
  const textSec = isDark ? '#8888AA' : '#6B7280';
  const accent = '#6C63FF';

  const img = course.imageUrl || course.thumbnail ||
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.95}
      style={[styles.premiumCard, { backgroundColor: cardBg }]}
    >
      <View style={styles.premiumImgWrap}>
        <Image source={{ uri: img }} style={styles.premiumImg} resizeMode="cover" />
        <View style={styles.premiumCatBadge}>
          <Text style={styles.premiumCatText}>{course.category}</Text>
        </View>
        <View style={[styles.premiumPriceBadge, { backgroundColor: isFree ? '#10B981' : '#0F0C29' }]}>
          <Text style={styles.premiumPriceText}>{isFree ? 'FREE' : `₹${course.price}`}</Text>
        </View>
      </View>

      <View style={styles.premiumBody}>
        <Text style={[styles.premiumTitle, { color: textPrimary }]} numberOfLines={2}>
          {course.title}
        </Text>

        <View style={styles.premiumInstructorRow}>
          <View style={[styles.premiumAvatar, { backgroundColor: accent + '22' }]}>
            <Ionicons name="person" size={10} color={accent} />
          </View>
          <Text style={[styles.premiumInstructorTxt, { color: textSec }]} numberOfLines={1}>
            {course.instructor}
          </Text>
        </View>

        <View style={[styles.premiumFooter, { borderTopColor: border }]}>
          <View style={styles.premiumStats}>
            <View style={styles.premiumStat}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={[styles.premiumStatTxt, { color: textSec }]}>{(course.rating || 0).toFixed(1)}</Text>
            </View>
            <View style={styles.premiumStat}>
              <Ionicons name="time-outline" size={14} color={textSec} />
              <Text style={[styles.premiumStatTxt, { color: textSec }]}>{course.duration || '2h 30m'}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.premiumActionBtn, { backgroundColor: enrolled ? '#10B981' : accent }]}
            onPress={e => { e.stopPropagation(); onAction(); }}
            activeOpacity={0.85}
          >
            <Text style={styles.premiumActionTxt}>
              {enrolled ? 'Continue' : isFree ? 'Enroll' : 'Buy'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Featured Course Carousel Card
// ─────────────────────────────────────────────────────────────────────────────
const FeaturedCard: React.FC<{
  course: Course; onPress: () => void; isDark: boolean;
}> = ({ course, onPress, isDark }) => {
  const img = course.imageUrl || course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop';
  const textPrimary = isDark ? '#F9FAFB' : '#111827';
  const textSec = isDark ? '#9CA3AF' : '#6B7280';
  const cardBg = isDark ? '#1A1A2E' : '#FFFFFF';

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.featWrap, { backgroundColor: cardBg }]}>
      <Image source={{ uri: img }} style={styles.featImg} resizeMode="cover" />
      <View style={styles.featContent}>
        <Text style={[styles.featTitle, { color: textPrimary }]} numberOfLines={1}>{course.title}</Text>
        <View style={styles.featStats}>
          <Text style={styles.featRating}>★ {(course.rating || 0).toFixed(1)}</Text>
          <Text style={[styles.featInst, { color: textSec }]} numberOfLines={1}>{course.instructor}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export const CoursesScreen: React.FC<Props> = ({ onCoursePress, onWatchVideo }) => {
  const { user } = useAuth();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const bg = isDark ? '#0A0A14' : '#F9FAFB';
  const cardBg = isDark ? '#1A1A2E' : '#FFFFFF';
  const border = isDark ? '#2A2A3E' : '#E5E7EB';
  const textPrimary = isDark ? '#F9FAFB' : '#111827';
  const textSec = isDark ? '#9CA3AF' : '#6B7280';
  const accent = '#6C63FF';

  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [priceFilter, setPriceFilter] = useState<'All' | 'Free' | 'Paid'>('All');
  const [sortBy, setSortBy] = useState('Popular');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Firestore real-time ────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'courses'),
      snap => {
        const list: Course[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as Course));
        setCourses(list);
        setLoading(false);
      },
      async () => { setCourses(await courseService.getCourses()); setLoading(false); }
    );
    let unsubUser: (() => void) | undefined;
    if (user) {
      unsubUser = onSnapshot(doc(db, 'users', user.uid),
        snap => { if (snap.exists()) setEnrolledIds(snap.data().enrolledCourses || []); },
        async () => { const e = await courseService.getEnrolledCourses(user.uid); setEnrolledIds(e.map(c => c.id)); }
      );
    }
    return () => { unsub(); unsubUser?.(); };
  }, [user]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  }, []);

  const handleEnroll = useCallback(async (courseId: string) => {
    if (!user) return;
    try {
      await courseService.enrollInCourse(user.uid, courseId);
      Alert.alert('🎉 Enrolled!', 'You now have full access to this course.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not enroll.');
    }
  }, [user]);

  // ── filter + sort ─────────────────────────────────────────────
  const filtered = useMemo(() => courses
    .filter(c => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.instructor?.toLowerCase().includes(q);
      const matchCat = category === 'All' || c.category === category;
      const matchPrice = priceFilter === 'All' ||
        (priceFilter === 'Free' && (c.price === 0 || (c as any).isFree)) ||
        (priceFilter === 'Paid' && c.price > 0 && !(c as any).isFree);
      return matchSearch && matchCat && matchPrice;
    })
    .sort((a, b) => {
      if (sortBy === 'Rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'Price: Low') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'Price: High') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'Newest') return (b.createdAt || '').localeCompare(a.createdAt || '');
      return ((b.enrolledUsers?.length || 0) - (a.enrolledUsers?.length || 0));
    }), [courses, search, category, priceFilter, sortBy]);

  const featuredCourses = useMemo(() => {
    return [...courses].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5);
  }, [courses]);

  const isEnrolled = useCallback((c: Course) =>
    enrolledIds.includes(c.id) ||
    !!(c.enrolledUsers?.includes(user?.uid || '')) ||
    c.price === 0 || !!(c as any).isFree
    , [enrolledIds, user]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Header Component (Hero + Carousel + Filters)
  // ─────────────────────────────────────────────────────────────────────────────
  const renderHeader = () => (
    <View>
      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, { backgroundColor: cardBg, shadowColor: accent }]}>
          <Ionicons name="search" size={20} color={accent} />
          <TextInput
            style={[styles.searchInput, { color: textPrimary }]}
            placeholder="Search for courses, skills..."
            placeholderTextColor={textSec}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={textSec} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Featured Carousel */}
      {!search && featuredCourses.length > 0 && (
        <View style={styles.featSection}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Featured Courses</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={featuredCourses}
            keyExtractor={c => 'feat-' + c.id}
            contentContainerStyle={styles.featList}
            renderItem={({ item }) => (
              <FeaturedCard course={item} onPress={() => onCoursePress(item.id)} isDark={isDark} />
            )}
          />
        </View>
      )}

      {/* Categories */}
      <View style={styles.catSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catList}>
          {CATS.map(cat => {
            const active = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catPill,
                  {
                    backgroundColor: active ? accent : cardBg,
                    borderColor: active ? accent : border,
                    borderWidth: 1
                  }
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text style={{ color: active ? '#fff' : textSec, fontWeight: '700', fontSize: 13 }}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Filters & Results Row */}
      <View style={styles.resultsRow}>
        <Text style={[styles.resultsText, { color: textPrimary }]}>
          {search || category !== 'All' ? 'Search Results' : 'All Courses'}
        </Text>
        <Text style={[styles.resultsCount, { color: textSec }]}>
          {filtered.length} found
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[accent]} />}
        renderItem={({ item }) => (
          <PremiumCard
            course={item}
            enrolled={isEnrolled(item)}
            isDark={isDark}
            onPress={() => onCoursePress(item.id)}
            onAction={() => {
              if (isEnrolled(item)) {
                onWatchVideo ? onWatchVideo(item.id, 0) : onCoursePress(item.id);
              } else if (item.price === 0 || (item as any).isFree) {
                handleEnroll(item.id);
              } else {
                onCoursePress(item.id);
              }
            }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading
              ? <ActivityIndicator size="large" color={accent} />
              : <>
                <View style={[styles.emptyIcon, { backgroundColor: accent + '18' }]}>
                  <Text style={{ fontSize: 36 }}>🔍</Text>
                </View>
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>No courses found</Text>
                <Text style={[styles.emptySub, { color: textSec }]}>Try a different category or search term.</Text>
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: accent }]}
                  onPress={() => { setSearch(''); setCategory('All'); setPriceFilter('All'); }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Clear Filters</Text>
                </TouchableOpacity>
              </>}
          </View>
        }
      />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  listContent: { paddingBottom: 40 },

  // Hero
  heroWrap: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 5 },
  heroGreeting: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  heroTitle: { fontSize: 24, fontWeight: '900', marginTop: 2, width: '90%', lineHeight: 30 },

  // Search
  searchWrap: { paddingHorizontal: 20, paddingVertical: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 20,
    paddingHorizontal: 16, height: 50, elevation: 4,
    shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },

  // Featured Carousel
  featSection: { marginTop: 4, paddingBottom: 5 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginHorizontal: 20, marginBottom: 10 },
  featList: { paddingHorizontal: 20, gap: 16 },
  featWrap: { width: 260, borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  featImg: { width: '100%', height: 140 },
  featContent: { padding: 12 },
  featTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  featStats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featRating: { color: '#F59E0B', fontSize: 12, fontWeight: '800' },
  featInst: { fontSize: 12, fontWeight: '600' },

  // Categories
  catSection: { paddingVertical: 5 },
  catList: { paddingHorizontal: 20, gap: 8 },
  catPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },

  // Results Row
  resultsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 5, paddingBottom: 12 },
  resultsText: { fontSize: 17, fontWeight: '800' },
  resultsCount: { fontSize: 13, fontWeight: '600', marginBottom: 2 },

  // Premium Main Card
  premiumCard: {
    marginHorizontal: 20, marginBottom: 20, borderRadius: 24, overflow: 'hidden',
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }
  },
  premiumImgWrap: { position: 'relative', height: 190 },
  premiumImg: { width: '100%', height: '100%' },
  premiumCatBadge: { position: 'absolute', top: 14, left: 14, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  premiumCatText: { color: '#000', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  premiumPriceBadge: { position: 'absolute', top: 14, right: 14, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  premiumPriceText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  premiumBody: { padding: 20 },
  premiumTitle: { fontSize: 18, fontWeight: '800', lineHeight: 24, marginBottom: 12 },
  premiumInstructorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  premiumAvatar: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  premiumInstructorTxt: { fontSize: 13, fontWeight: '600' },
  premiumFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1 },
  premiumStats: { flexDirection: 'row', gap: 14 },
  premiumStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  premiumStatTxt: { fontSize: 13, fontWeight: '700' },
  premiumActionBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  premiumActionTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // Empty
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
});
