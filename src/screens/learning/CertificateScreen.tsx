import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Share, 
  Alert, 
  Platform,
  ActivityIndicator,
  useColorScheme
} from 'react-native';
import { Colors } from '@/constants/theme';
import { Button } from '@/components/common/Button';
import { lmsService, Certificate } from '@/services/lms/lmsService';
import { useAuth } from '@/hooks/useAuth';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface CertificateScreenProps {
  onBack: () => void;
}

export const CertificateScreen: React.FC<CertificateScreenProps> = ({
  onBack,
}) => {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    const fetchCerts = async () => {
      if (!user) return;
      try {
        const data = await lmsService.getLmsDashboardData(user.uid);
        setCertificates(data.certificates);
      } catch (e) {
        console.error('Failed to fetch certificates:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchCerts();
  }, [user]);

  const handleGeneratePDF = async (cert: Certificate) => {
    setGenerating(cert.id);
    try {
      const htmlContent = `
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              text-align: center;
              padding: 40px;
              background-color: #fcf8f2;
            }
            .container {
              border: 10px double #F59E0B;
              padding: 40px;
              background-color: #ffffff;
              box-shadow: 0 4px 15px rgba(0,0,0,0.1);
              position: relative;
            }
            .badge {
              font-size: 50px;
              margin-bottom: 10px;
            }
            .logo {
              font-size: 14px;
              color: #9CA3AF;
              font-weight: bold;
              letter-spacing: 3px;
              margin-bottom: 20px;
            }
            .title {
              font-size: 32px;
              font-weight: 800;
              color: #111827;
              margin-top: 10px;
              margin-bottom: 30px;
            }
            .presented {
              font-size: 16px;
              color: #6B7280;
              margin-bottom: 10px;
            }
            .name {
              font-size: 28px;
              font-weight: bold;
              color: #1F2937;
              margin-bottom: 10px;
              border-bottom: 2px solid #E5E7EB;
              display: inline-block;
              padding-bottom: 5px;
            }
            .completion {
              font-size: 16px;
              color: #6B7280;
              margin-top: 20px;
              margin-bottom: 15px;
            }
            .course {
              font-size: 22px;
              font-weight: bold;
              color: #208AEF;
              margin-bottom: 30px;
            }
            .meta {
              margin-top: 40px;
              display: flex;
              justify-content: space-around;
              align-items: center;
            }
            .meta-item {
              text-align: center;
              flex: 1;
            }
            .meta-label {
              font-size: 11px;
              color: #9CA3AF;
              margin-bottom: 5px;
              font-weight: bold;
            }
            .meta-value {
              font-size: 13px;
              font-weight: bold;
              color: #374151;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="badge">🎖️</div>
            <div class="logo">LMS JOB PORTAL ACADEMY</div>
            <div class="title">Certificate of Completion</div>
            <div class="presented">This is proudly presented to</div>
            <div class="name">${user?.displayName || user?.email || 'Student'}</div>
            <div class="completion">for successfully completing the course</div>
            <div class="course">${cert.courseTitle}</div>
            
            <div class="meta">
              <div class="meta-item">
                <div class="meta-label">SCORE</div>
                <div class="meta-value">${cert.score}%</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">DATE ISSUED</div>
                <div class="meta-value">${cert.issuedDate}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">CREDENTIAL ID</div>
                <div class="meta-value" style="font-family: monospace;">${cert.credentialId}</div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        await Print.printAsync({ html: htmlContent });
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Download ${cert.courseTitle} Certificate`,
            UTI: 'com.adobe.pdf',
          });
        } else {
          Alert.alert('PDF Exported!', `Certificate PDF file saved at: ${uri}`);
        }
      }
    } catch (e: any) {
      Alert.alert('Generation Failed', e.message || 'Could not compile certificate PDF.');
    } finally {
      setGenerating(null);
    }
  };

  const handleShare = async (cert: Certificate) => {
    try {
      await Share.share({
        message: `I've earned a Certificate of Completion for "${cert.courseTitle}"!\n\nCredential ID: ${cert.credentialId}\nIssued: ${cert.issuedDate}\nScore: ${cert.score}%\n\nVerify at: https://lmsjobportal.com/verify/${cert.credentialId}`,
      });
    } catch {
      Alert.alert('Share Failed', 'Unable to initiate platform sharing.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#208AEF" />
        <Text style={styles.loadingText}>Loading certificates...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
          <Text style={[styles.headerBackText, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          My Certificates
        </Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}>
        {/* Stats Banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statsIconWrapper}>
            <Ionicons name="school" size={22} color="#1D4ED8" />
          </View>
          <View style={styles.statsInfoCol}>
            <Text style={styles.statsBannerTitle}>{certificates.length} Certificate{certificates.length !== 1 ? 's' : ''} Earned</Text>
            <Text style={styles.statsBannerSub}>Add these to your LinkedIn profile and resume!</Text>
          </View>
        </View>

        {certificates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="ribbon-outline" size={48} color="#9CA3AF" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Certificates Yet</Text>
            <Text style={styles.emptyText}>
              Complete a course quiz with at least 80% score to earn your first certificate.
            </Text>
          </View>
        ) : (
          certificates.map((cert) => (
            <View key={cert.id} style={styles.certCard}>
              <View style={styles.borderFrame} />

              <View style={styles.ribbonWrapper}>
                <Ionicons name="ribbon" size={56} color="#F59E0B" />
              </View>

              <Text style={styles.issuerText}>LMS JOB PORTAL ACADEMY</Text>
              <Text style={[styles.certName, { color: colors.text }]}>Certificate of Completion</Text>
              <Text style={styles.subText}>This is proudly presented to</Text>
              <Text style={styles.recipientName}>{user?.displayName || user?.email || 'Student'}</Text>
              <Text style={styles.subText}>for successfully completing</Text>
              <Text style={styles.courseTitle}>{cert.courseTitle}</Text>

              {/* Score Badge */}
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreBadgeText}>Score: {cert.score}%</Text>
              </View>

              <Text style={styles.dateText}>Issued on {cert.issuedDate}</Text>

              {/* QR Verification Area */}
              <View style={styles.qrContainer}>
                <View style={styles.qrCodeGrid}>
                  {[
                    [1, 0, 1], [0, 1, 0], [1, 0, 1]
                  ].map((row, ri) => (
                    <View key={ri} style={styles.qrRow}>
                      {row.map((cell, ci) => (
                        <View key={ci} style={[styles.qrBlock, cell ? styles.qrBlack : styles.qrWhite]} />
                      ))}
                    </View>
                  ))}
                </View>
                <Text style={styles.qrLabel}>SCAN TO VERIFY</Text>
              </View>

              <Text style={styles.credText}>Credential ID: {cert.credentialId}</Text>

              {generating === cert.id ? (
                <View style={styles.generatingBox}>
                  <ActivityIndicator color="#4F46E5" size="small" />
                  <Text style={styles.generatingText}>Generating secure PDF...</Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={styles.actionBtnOutline}
                    onPress={() => handleShare(cert)}
                  >
                    <Ionicons name="share-social-outline" size={16} color="#4F46E5" style={{ marginRight: 6 }} />
                    <Text style={styles.actionBtnOutlineText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtnPrimary}
                    onPress={() => handleGeneratePDF(cert)}
                  >
                    <Ionicons name="download-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.actionBtnPrimaryText}>Download PDF</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingText: { marginTop: 16, fontSize: 14, color: '#6B7280', fontWeight: '500' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 16,
  },
  headerBackText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 4,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    gap: 12,
  },
  statsIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsInfoCol: { flex: 1 },
  statsBannerTitle: { fontSize: 15, fontWeight: '800', color: '#1D4ED8', marginBottom: 2 },
  statsBannerSub: { fontSize: 11, color: '#4F46E5', fontWeight: '500' },

  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  
  certCard: {
    borderWidth: 2.5,
    borderColor: '#F59E0B',
    borderRadius: 16,
    padding: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 24,
  },
  borderFrame: {
    position: 'absolute',
    top: 6, bottom: 6, left: 6, right: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  ribbonWrapper: { marginBottom: 12 },
  issuerText: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  certName: { fontSize: 18, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  subText: { fontSize: 11, color: '#6B7280', marginBottom: 4, textAlign: 'center' },
  recipientName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  courseTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#208AEF',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  scoreBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: '#A7F3D0',
  },
  scoreBadgeText: { fontSize: 12, fontWeight: '800', color: '#065F46' },
  dateText: { fontSize: 11, color: '#4B5563', fontWeight: '500', marginBottom: 16 },
  
  qrContainer: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  qrCodeGrid: { width: 44, height: 44, justifyContent: 'space-around', marginBottom: 6 },
  qrRow: { flexDirection: 'row', justifyContent: 'space-around' },
  qrBlock: { width: 12, height: 12, borderRadius: 2 },
  qrBlack: { backgroundColor: '#111827' },
  qrWhite: { backgroundColor: 'transparent' },
  qrLabel: { fontSize: 8, color: '#9CA3AF', fontWeight: '800', letterSpacing: 1 },
  credText: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    marginBottom: 20,
    fontWeight: '600',
  },
  generatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
  },
  generatingText: { fontSize: 13, color: '#4B5563', fontWeight: '600' },
  
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  actionBtnOutline: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderColor: '#4F46E5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  actionBtnOutlineText: { color: '#4F46E5', fontSize: 13, fontWeight: '700' },
  actionBtnPrimary: {
    flex: 1,
    height: 44,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  actionBtnPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
