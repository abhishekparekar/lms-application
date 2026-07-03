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
  Linking,
  Alert,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { lmsService, StudyResource } from '@/services/lms/lmsService';
import { useAuth } from '@/hooks/useAuth';

const CATEGORY_ICONS: Record<string, string> = {
  Development: '💻',
  Design: '🎨',
  Career: '💼',
  Business: '📊',
  Marketing: '📢',
  default: '📁',
};

const CATEGORIES = ['All', 'Development', 'Design', 'Career', 'Business', 'Marketing'];

export const ResourcesScreen: React.FC = () => {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { user } = useAuth();

  const [resources, setResources] = useState<StudyResource[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      if (user) {
        const data = await lmsService.getLmsDashboardData(user.uid);
        setResources(data.resources);
      }
    } catch (e) {
      console.error('Failed to fetch resources:', e);
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

  const handleDownload = async (resource: StudyResource) => {
    if (downloadingIds.includes(resource.id)) return;
    setDownloadingIds(prev => [...prev, resource.id]);

    try {
      // Track download in Firestore
      if (user) {
        await lmsService.trackDownload(user.uid, resource.id, resource.title);
      }

      // Open PDF URL in browser/system handler
      if (resource.pdfUrl) {
        const supported = await Linking.canOpenURL(resource.pdfUrl);
        if (supported) {
          await Linking.openURL(resource.pdfUrl);
        } else {
          Alert.alert('Download Error', 'Cannot open this file. Please try again later.');
        }
      } else {
        Alert.alert('Download Started', `Downloading: ${resource.title}`);
      }

      // Update local download count for UX
      setResources(prev =>
        prev.map(r => r.id === resource.id ? { ...r, downloads: (r.downloads || 0) + 1 } : r)
      );
    } catch (e) {
      console.error('Download failed:', e);
      Alert.alert('Error', 'Failed to open resource. Please try again.');
    } finally {
      setDownloadingIds(prev => prev.filter(id => id !== resource.id));
    }
  };

  const filteredResources = resources.filter((item) => {
    const matchesSearch =
      (typeof item.title === 'string' ? item.title.toLowerCase() : '').includes(search.toLowerCase()) ||
      (typeof item.category === 'string' ? item.category.toLowerCase() : '').includes(search.toLowerCase()) ||
      (typeof item.type === 'string' ? item.type.toLowerCase() : '').includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading Resources...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4F46E5" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>📂 Study Resources</Text>
        <Text style={styles.subtitle}>
          Download syllabus guides, design templates, career cheat sheets, and more.
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search resources..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category Filter */}
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
              style={[styles.filterPill, isSelected && styles.filterPillActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>{filteredResources.length} resources available</Text>
      </View>

      {/* Resource Cards */}
      {filteredResources.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={[styles.emptyText, { color: colors.text }]}>No resources found.</Text>
          <Text style={styles.emptySubtext}>Try a different search or category filter.</Text>
        </View>
      ) : (
        filteredResources.map((item) => {
          const icon = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.default;
          const isDownloading = downloadingIds.includes(item.id);
          return (
            <View key={item.id} style={styles.card}>
              {/* Icon Area */}
              <View style={styles.iconArea}>
                <Text style={styles.categoryIcon}>{icon}</Text>
              </View>

              {/* Content */}
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardType}>{item.type}</Text>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.cardSize}>{item.size}</Text>
                  {item.downloads !== undefined && item.downloads > 0 && (
                    <>
                      <Text style={styles.metaDot}>•</Text>
                      <Text style={styles.cardDownloads}>⬇️ {item.downloads}</Text>
                    </>
                  )}
                </View>
                <View style={[styles.categoryTag, { backgroundColor: '#E6F4FE' }]}>
                  <Text style={styles.categoryTagText}>{item.category}</Text>
                </View>
              </View>

              {/* Download Button */}
              <TouchableOpacity
                style={[styles.downloadBtn, isDownloading && styles.downloadBtnLoading]}
                onPress={() => handleDownload(item)}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#208AEF" />
                ) : (
                  <Text style={styles.downloadText}>📥</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })
      )}

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>
          💡 All resources are curated by our expert instructors. Downloads are tracked for personalized recommendations.
        </Text>
      </View>
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
  filterRow: { paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  filterPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterPillActive: { backgroundColor: '#4F46E5' },
  filterPillText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  filterPillTextActive: { color: '#fff' },
  statsRow: { paddingHorizontal: 20, marginBottom: 12 },
  statsText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  iconArea: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E6F4FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIcon: { fontSize: 22 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6, lineHeight: 20 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  cardType: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  metaDot: { fontSize: 11, color: '#D1D5DB' },
  cardSize: { fontSize: 11, color: '#6B7280' },
  cardDownloads: { fontSize: 11, color: '#6B7280' },
  categoryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryTagText: { fontSize: 10, color: '#4F46E5', fontWeight: '700' },
  downloadBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#E6F4FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadBtnLoading: { backgroundColor: '#F3F4F6' },
  downloadText: { fontSize: 20 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySubtext: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  infoBanner: {
    margin: 20,
    padding: 14,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  infoBannerText: { fontSize: 12, color: '#065F46', lineHeight: 18 },
});
