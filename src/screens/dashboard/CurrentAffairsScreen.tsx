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
  StatusBar as RNStatusBar,
  Platform,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { lmsService, CurrentAffairs } from '@/services/lms/lmsService';
import { useAuth } from '@/hooks/useAuth';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Ionicons } from '@expo/vector-icons';

interface CurrentAffairsScreenProps {
  onBack?: () => void;
}

const CATEGORIES = ['All', 'Technology', 'Economy & Jobs', 'Science', 'Education', 'Law & Governance'];

const CATEGORY_COLORS: Record<string, string> = {
  Technology: '#2563EB',
  'Economy & Jobs': '#059669',
  Science: '#7C3AED',
  Education: '#D97706',
  'Law & Governance': '#DC2626',
  default: '#4F46E5',
};

export const CurrentAffairsScreen: React.FC<CurrentAffairsScreenProps> = ({ onBack }) => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const { user } = useAuth();

  const [articles, setArticles] = useState<CurrentAffairs[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSectionEnabled, setIsSectionEnabled] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<CurrentAffairs | null>(null);

  useEffect(() => {
    // 1. Live subscription to Admin-created Current Affairs in Firestore
    const unsubCa = onSnapshot(
      collection(db, 'currentAffairs'),
      (snap) => {
        const list: CurrentAffairs[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as CurrentAffairs);
        });
        setArticles(list);
        setLoading(false);
      },
      (err) => {
        console.error('CurrentAffairs snapshot error:', err);
        setLoading(false);
      }
    );

    // 2. Live subscription to Admin tab visibility configuration
    const unsubVis = onSnapshot(
      doc(db, 'lms_config', 'tabs_visibility'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setIsSectionEnabled(
            data['current-affairs'] !== false &&
            data.currentAffairs !== false &&
            data.news !== false
          );
        }
      },
      (err) => {
        console.warn('Visibility check error in CurrentAffairsScreen:', err);
      }
    );

    let unsubUser: (() => void) | undefined;
    if (user) {
      unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
        if (snap.exists()) {
          setBookmarkedIds(snap.data().bookmarkedCaIds || []);
        }
      });
    }

    return () => {
      unsubCa();
      unsubVis();
      if (unsubUser) unsubUser();
    };
  }, [user]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const handleBookmark = async (caId: string) => {
    if (!user) return;
    const isBookmarked = bookmarkedIds.includes(caId);
    if (isBookmarked) {
      setBookmarkedIds(prev => prev.filter(id => id !== caId));
    } else {
      setBookmarkedIds(prev => [...prev, caId]);
    }
    try {
      await lmsService.toggleBookmarkCurrentAffairs(user.uid, caId, isBookmarked);
    } catch (e) {
      if (isBookmarked) {
        setBookmarkedIds(prev => [...prev, caId]);
      } else {
        setBookmarkedIds(prev => prev.filter(id => id !== caId));
      }
      Alert.alert('Error', 'Failed to update bookmark.');
    }
  };

  const filteredArticles = articles.filter((item) => {
    const title = typeof item.title === 'string' ? item.title.toLowerCase() : '';
    const cat = typeof item.category === 'string' ? item.category.toLowerCase() : '';
    const sum = typeof item.summary === 'string' ? item.summary.toLowerCase() : '';
    const q = search.toLowerCase().trim();

    const matchesSearch = !q || title.includes(q) || cat.includes(q) || sum.includes(q);
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) =>
    CATEGORY_COLORS[category] || CATEGORY_COLORS.default;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading Current Affairs...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: isDark ? '#0F172A' : '#4F46E5' }]} edges={['top']}>
      <RNStatusBar barStyle="light-content" backgroundColor="#4F46E5" translucent={false} />
      <StatusBar style="light" />

      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.headerTitle}>📰 Current Affairs</Text>

          </View>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Content Container */}
      <View style={[styles.mainBody, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4F46E5" />
          }
        >
          {/* Search Input */}
          <View style={[styles.searchBox, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              style={[styles.searchInput, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
              placeholder="Search news, topics, articles..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsContainer}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.pill,
                    isSelected
                      ? styles.pillActive
                      : {
                          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                          borderColor: isDark ? '#334155' : '#E2E8F0',
                        },
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.7}
                >
                  {isSelected && <View style={styles.activeDot} />}
                  <Text
                    style={[
                      styles.pillText,
                      { color: isSelected ? '#FFFFFF' : isDark ? '#CBD5E1' : '#475569', fontWeight: isSelected ? '700' : '600' },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Metadata Counter Bar */}
          <View style={styles.metaRow}>
            <Text style={[styles.metaCountText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {filteredArticles.length} {filteredArticles.length === 1 ? 'Article' : 'Articles'}
              {bookmarkedIds.length > 0 ? ` • ${bookmarkedIds.length} Saved` : ''}
            </Text>
          </View>

          {/* Articles Feed */}
          {filteredArticles.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
              <Text style={styles.emptyEmoji}>📰</Text>
              <Text style={[styles.emptyTitleText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                No Current Affairs Published
              </Text>
              <Text style={styles.emptySubText}>
                {articles.length === 0
                  ? 'Articles created by Admin will appear here in real-time.'
                  : 'No articles match your search or filter.'}
              </Text>
            </View>
          ) : (
            filteredArticles.map((item) => {
              const isBookmarked = bookmarkedIds.includes(item.id);
              const catColor = getCategoryColor(item.category);
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.9}
                  onPress={() => setSelectedArticle(item)}
                  style={[
                    styles.articleCard,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#EEF2FF',
                    },
                  ]}
                >
                  <View style={[styles.cardLeftStrip, { backgroundColor: catColor }]} />
                  <View style={styles.cardContent}>
                    {/* Header Row */}
                    <View style={styles.cardHeader}>
                      <View style={[styles.tagBadge, { backgroundColor: `${catColor}18` }]}>
                        <Text style={[styles.tagText, { color: catColor }]}>{item.category || 'General'}</Text>
                      </View>
                      <View style={styles.cardHeaderRight}>
                        {item.date ? (
                          <Text style={styles.dateText}>
                            <Ionicons name="calendar-outline" size={11} color="#94A3B8" /> {item.date}
                          </Text>
                        ) : null}
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            handleBookmark(item.id);
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          style={styles.bookmarkTouch}
                        >
                          <Ionicons
                            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                            size={18}
                            color={isBookmarked ? '#F59E0B' : '#94A3B8'}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Title */}
                    <Text style={[styles.articleTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]} numberOfLines={2}>
                      {item.title}
                    </Text>

                    {/* Summary Snippet */}
                    <Text style={[styles.articleSummary, { color: isDark ? '#94A3B8' : '#475569' }]} numberOfLines={2}>
                      {item.summary}
                    </Text>

                    {/* Footer */}
                    <View style={styles.cardFooter}>
                      <Text style={styles.readMoreLink}>Read Full Article →</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* Bookmarks Quick List */}
          {bookmarkedIds.length > 0 && (
            <View style={[styles.savedSection, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF', borderColor: isDark ? '#334155' : '#DBEAFE' }]}>
              <View style={styles.savedSectionHeader}>
                <Ionicons name="bookmark" size={16} color="#3B82F6" />
                <Text style={[styles.savedSectionTitle, { color: isDark ? '#F8FAFC' : '#1E40AF' }]}>
                  Saved Articles
                </Text>
              </View>
              {articles
                .filter((a) => bookmarkedIds.includes(a.id))
                .map((item) => (
                  <TouchableOpacity
                    key={`saved-${item.id}`}
                    style={styles.savedItemRow}
                    onPress={() => setSelectedArticle(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.savedItemTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Article Detail Modal */}
      <Modal
        visible={!!selectedArticle}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedArticle(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
            <View style={styles.modalTopBar}>
              <View style={[styles.tagBadge, { backgroundColor: `${getCategoryColor(selectedArticle?.category || '')}18` }]}>
                <Text style={[styles.tagText, { color: getCategoryColor(selectedArticle?.category || '') }]}>
                  {selectedArticle?.category || 'Article'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedArticle(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={isDark ? '#F8FAFC' : '#0F172A'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalBody}>
              <Text style={[styles.modalTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                {selectedArticle?.title}
              </Text>
              {selectedArticle?.date ? (
                <Text style={styles.modalDate}>
                  <Ionicons name="calendar-outline" size={13} color="#94A3B8" /> {selectedArticle?.date}
                </Text>
              ) : null}

              <View style={styles.modalDivider} />

              <Text style={[styles.modalContentText, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                {selectedArticle?.summary}
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseFooterBtn}
              onPress={() => setSelectedArticle(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCloseFooterText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { color: '#64748B', fontSize: 14, fontWeight: '500' },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#4F46E5',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubTitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  mainBody: {
    flex: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  pillsContainer: {
    gap: 6,
    marginBottom: 12,
    paddingRight: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
    marginRight: 6,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaRow: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  metaCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  articleCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardLeftStrip: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  bookmarkTouch: {
    padding: 2,
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 4,
  },
  articleSummary: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  readMoreLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  emptyBox: {
    padding: 32,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitleText: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  savedSection: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  savedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  savedSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  savedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
  },
  savedItemTitle: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '40%',
    padding: 16,
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
    marginBottom: 6,
  },
  modalDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 10,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 12,
  },
  modalContentText: {
    fontSize: 14,
    lineHeight: 22,
  },
  modalCloseFooterBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseFooterText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
