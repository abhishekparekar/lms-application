import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { lmsService, CurrentAffairs } from '@/services/lms/lmsService';
import { useAuth } from '@/hooks/useAuth';

const CATEGORIES = ['All', 'Technology', 'Economy & Jobs', 'Science', 'Education', 'Law & Governance'];

const CATEGORY_COLORS: Record<string, string> = {
  Technology: '#3B82F6',
  'Economy & Jobs': '#10B981',
  Science: '#8B5CF6',
  Education: '#F59E0B',
  'Law & Governance': '#EF4444',
  default: '#4F46E5',
};

export const CurrentAffairsScreen: React.FC = () => {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { user } = useAuth();

  const [articles, setArticles] = useState<CurrentAffairs[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      if (user) {
        const data = await lmsService.getLmsDashboardData(user.uid);
        setArticles(data.currentAffairs);
        setBookmarkedIds(data.bookmarkedCaIds);
      }
    } catch (e) {
      console.error('Failed to fetch current affairs:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [user]);

  const handleBookmark = async (caId: string) => {
    if (!user) return;
    const isBookmarked = bookmarkedIds.includes(caId);
    // Optimistic update
    if (isBookmarked) {
      setBookmarkedIds(prev => prev.filter(id => id !== caId));
    } else {
      setBookmarkedIds(prev => [...prev, caId]);
    }
    try {
      await lmsService.toggleBookmarkCurrentAffairs(user.uid, caId, isBookmarked);
    } catch (e) {
      // Revert on error
      if (isBookmarked) {
        setBookmarkedIds(prev => [...prev, caId]);
      } else {
        setBookmarkedIds(prev => prev.filter(id => id !== caId));
      }
      Alert.alert('Error', 'Failed to update bookmark. Please try again.');
    }
  };

  const filteredArticles = articles.filter((item) => {
    const matchesSearch =
      (typeof item.title === 'string' ? item.title.toLowerCase() : '').includes(search.toLowerCase()) ||
      (typeof item.category === 'string' ? item.category.toLowerCase() : '').includes(search.toLowerCase()) ||
      (typeof item.summary === 'string' ? item.summary.toLowerCase() : '').includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) =>
    CATEGORY_COLORS[category] || CATEGORY_COLORS.default;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#208AEF" />
        <Text style={styles.loadingText}>Loading Current Affairs...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#208AEF" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>📰 Current Affairs</Text>
        <Text style={styles.subtitle}>
          Stay updated with daily insights, global news, and industry updates.
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search articles..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterPill,
                isSelected && { backgroundColor: '#4F46E5' },
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.filterPillText, isSelected && { color: '#fff' }]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          {filteredArticles.length} articles
          {bookmarkedIds.length > 0 ? ` • ${bookmarkedIds.length} bookmarked` : ''}
        </Text>
      </View>

      {/* Article Cards */}
      {filteredArticles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={[styles.emptyText, { color: colors.text }]}>No articles found.</Text>
          <Text style={styles.emptySubtext}>Try a different search or category filter.</Text>
        </View>
      ) : (
        filteredArticles.map((item) => {
          const isBookmarked = bookmarkedIds.includes(item.id);
          const catColor = getCategoryColor(item.category);
          return (
            <View
              key={item.id}
              style={[styles.card, { borderLeftColor: catColor, borderLeftWidth: 4 }]}
            >
              {/* Card Header Row */}
              <View style={styles.cardMeta}>
                <View style={[styles.categoryBadge, { backgroundColor: `${catColor}20` }]}>
                  <Text style={[styles.categoryText, { color: catColor }]}>{item.category}</Text>
                </View>
                <View style={styles.cardMetaRight}>
                  <Text style={styles.dateText}>{item.date}</Text>
                  <TouchableOpacity
                    onPress={() => handleBookmark(item.id)}
                    style={styles.bookmarkBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.bookmarkIcon, isBookmarked && styles.bookmarkActive]}>
                      {isBookmarked ? '★' : '☆'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Card Title */}
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>

              {/* Card Summary */}
              <Text style={styles.cardSummary} numberOfLines={3}>{item.summary}</Text>

              {/* Read More */}
              <TouchableOpacity style={styles.readMoreBtn}>
                <Text style={styles.readMoreText}>Read More →</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}

      {/* Bookmarks Section */}
      {bookmarkedIds.length > 0 && (
        <View style={styles.bookmarkSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🔖 Your Bookmarks</Text>
          {articles
            .filter((a) => bookmarkedIds.includes(a.id))
            .map((item) => (
              <View key={`bm-${item.id}`} style={styles.bookmarkItem}>
                <Text style={[styles.bookmarkItemTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.bookmarkItemDate}>{item.date}</Text>
              </View>
            ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 48 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
  header: { padding: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginHorizontal: 20,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
    gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15 },
  filterRow: {
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  statsRow: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statsText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: { fontSize: 11, fontWeight: '700' },
  cardMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  bookmarkBtn: { padding: 2 },
  bookmarkIcon: { fontSize: 20, color: '#D1D5DB' },
  bookmarkActive: { color: '#F59E0B' },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, lineHeight: 22 },
  cardSummary: { fontSize: 13, color: '#4B5563', lineHeight: 19, marginBottom: 12 },
  readMoreBtn: { alignSelf: 'flex-start' },
  readMoreText: { fontSize: 13, color: '#4F46E5', fontWeight: '700' },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySubtext: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  bookmarkSection: {
    margin: 20,
    marginTop: 4,
    padding: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  bookmarkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#FDE68A',
  },
  bookmarkItemTitle: { fontSize: 13, fontWeight: '600', flex: 1, marginRight: 8 },
  bookmarkItemDate: { fontSize: 11, color: '#9CA3AF' },
});
