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
  StatusBar as RNStatusBar,
  Platform,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { lmsService, StudyResource } from '@/services/lms/lmsService';
import { useAuth } from '@/hooks/useAuth';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Ionicons } from '@expo/vector-icons';

interface ResourcesScreenProps {
  onBack?: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  Development: '💻',
  Design: '🎨',
  Career: '💼',
  Business: '📊',
  Marketing: '📢',
  default: '📁',
};

const CATEGORIES = ['All', 'Development', 'Design', 'Career', 'Business', 'Marketing'];

export const ResourcesScreen: React.FC<ResourcesScreenProps> = ({ onBack }) => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const { user } = useAuth();

  const [resources, setResources] = useState<StudyResource[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState<string[]>([]);
  const [isSectionEnabled, setIsSectionEnabled] = useState(true);
  const [selectedResource, setSelectedResource] = useState<StudyResource | null>(null);

  useEffect(() => {
    // 1. Live subscription to Admin-created resources in Firestore
    const unsubRes = onSnapshot(
      collection(db, 'resources'),
      (snap) => {
        const list: StudyResource[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as StudyResource);
        });
        setResources(list);
        setLoading(false);
      },
      (err) => {
        console.error('Resources snapshot error:', err);
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
            data.resources !== false &&
            data['study-files'] !== false &&
            data.studyFiles !== false
          );
        }
      },
      (err) => {
        console.warn('Visibility check error in ResourcesScreen:', err);
      }
    );

    return () => {
      unsubRes();
      unsubVis();
    };
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const handleDownload = async (resource: StudyResource) => {
    if (downloadingIds.includes(resource.id)) return;
    setDownloadingIds((prev) => [...prev, resource.id]);

    try {
      if (user) {
        await lmsService.trackDownload(user.uid, resource.id, resource.title).catch(() => {});
      }

      // Check all potential file URL field names in Firestore document
      const rawUrl =
        resource.pdfUrl ||
        (resource as any).fileUrl ||
        (resource as any).url ||
        (resource as any).link ||
        (resource as any).downloadUrl;

      if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
        Alert.alert(
          'Resource Not Available',
          'Admin has not attached a valid file link for this resource yet.'
        );
        return;
      }

      let formattedUrl = rawUrl.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
      }

      const supported = await Linking.canOpenURL(formattedUrl).catch(() => false);
      if (supported) {
        await Linking.openURL(formattedUrl).catch(() => {
          Alert.alert(
            'Cannot Open File',
            'The requested file URL could not be opened on your device. Please verify the link with Admin.'
          );
        });
      } else {
        // Try opening directly as fallback
        await Linking.openURL(formattedUrl).catch(() => {
          Alert.alert(
            'URL Not Found',
            'The requested file link is invalid or unreachable. Please ask Admin to update the file URL.'
          );
        });
      }

      setResources((prev) =>
        prev.map((r) => (r.id === resource.id ? { ...r, downloads: (r.downloads || 0) + 1 } : r))
      );
    } catch (e: any) {
      console.error('Download failed:', e);
      Alert.alert(
        'Download Issue',
        'Could not open resource file. Please check your internet connection or ask Admin to re-upload the file link.'
      );
    } finally {
      setDownloadingIds((prev) => prev.filter((id) => id !== resource.id));
    }
  };

  const filteredResources = resources.filter((item) => {
    const title = typeof item.title === 'string' ? item.title.toLowerCase() : '';
    const cat = typeof item.category === 'string' ? item.category.toLowerCase() : '';
    const type = typeof item.type === 'string' ? item.type.toLowerCase() : '';
    const q = search.toLowerCase().trim();

    const matchesSearch = !q || title.includes(q) || cat.includes(q) || type.includes(q);
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading Study Resources...</Text>
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
            <Text style={styles.headerTitle}>📂 Study Resources</Text>

          </View>
        </View>
        <View style={styles.filesBadge}>
          <Ionicons name="document-text-outline" size={12} color="#FFFFFF" />
          <Text style={styles.filesBadgeText}>FILES</Text>
        </View>
      </View>

      {/* Content Body */}
      <View style={[styles.mainBody, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4F46E5" />
          }
        >
          {/* Search Box */}
          <View style={[styles.searchBox, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              style={[styles.searchInput, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
              placeholder="Search guides, cheat sheets, PDFs..."
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
              {filteredResources.length} {filteredResources.length === 1 ? 'Resource' : 'Resources'} Available
            </Text>
          </View>

          {/* Resource Cards List */}
          {filteredResources.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
              <Text style={styles.emptyEmoji}>📂</Text>
              <Text style={[styles.emptyTitleText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                No Study Resources Published
              </Text>
              <Text style={styles.emptySubText}>
                {resources.length === 0
                  ? 'Files created by Admin will appear here in real-time.'
                  : 'No resources match your search or filter.'}
              </Text>
            </View>
          ) : (
            filteredResources.map((item) => {
              const icon = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.default;
              const isDownloading = downloadingIds.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.9}
                  onPress={() => setSelectedResource(item)}
                  style={[
                    styles.resourceCard,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#EEF2FF',
                    },
                  ]}
                >
                  <View style={styles.iconAvatar}>
                    <Text style={styles.categoryIconEmoji}>{icon}</Text>
                  </View>

                  <View style={styles.cardContent}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.tagBadge}>
                        <Text style={styles.tagText}>{item.category || 'General'}</Text>
                      </View>
                      {item.type ? (
                        <Text style={styles.typeText}>{item.type.toUpperCase()}</Text>
                      ) : null}
                    </View>

                    <Text style={[styles.cardTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]} numberOfLines={2}>
                      {item.title}
                    </Text>

                    <View style={styles.cardMetaRow}>
                      {item.size ? <Text style={styles.cardMetaText}>{item.size}</Text> : null}
                      {item.downloads !== undefined && item.downloads > 0 ? (
                        <Text style={styles.cardMetaText}>
                          {item.size ? ' • ' : ''}⬇️ {item.downloads} downloads
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.downloadBtn, isDownloading && styles.downloadBtnLoading]}
                    onPress={() => handleDownload(item)}
                    disabled={isDownloading}
                    activeOpacity={0.8}
                  >
                    {isDownloading ? (
                      <ActivityIndicator size="small" color="#4F46E5" />
                    ) : (
                      <Ionicons name="download-outline" size={18} color="#4F46E5" />
                    )}
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Resource Detail Modal */}
      <Modal
        visible={!!selectedResource}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedResource(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
            <View style={styles.modalTopBar}>
              <View style={styles.tagBadge}>
                <Text style={styles.tagText}>{selectedResource?.category || 'Resource'}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedResource(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={isDark ? '#F8FAFC' : '#0F172A'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalBody}>
              <Text style={[styles.modalTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                {selectedResource?.title}
              </Text>

              <View style={styles.modalMetaRow}>
                {selectedResource?.type && (
                  <Text style={styles.modalMetaTag}>{selectedResource.type.toUpperCase()}</Text>
                )}
                {selectedResource?.size && (
                  <Text style={styles.modalMetaText}>📦 {selectedResource.size}</Text>
                )}
              </View>

              <View style={styles.modalDivider} />

              <Text style={[styles.modalDesc, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                {(selectedResource as any)?.description ||
                  'This study resource has been published by Admin for your career preparation and learning.'}
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalDownloadFooterBtn}
              onPress={() => {
                const res = selectedResource;
                setSelectedResource(null);
                if (res) handleDownload(res);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />
              <Text style={styles.modalDownloadFooterText}>Open / Download Resource</Text>
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
  filesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  filesBadgeText: {
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
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  iconAvatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIconEmoji: {
    fontSize: 20,
  },
  cardContent: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  tagBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMetaText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  downloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadBtnLoading: {
    backgroundColor: '#F1F5F9',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '35%',
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
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 8,
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  modalMetaTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  modalMetaText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 12,
  },
  modalDesc: {
    fontSize: 13,
    lineHeight: 20,
  },
  modalDownloadFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  modalDownloadFooterText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
