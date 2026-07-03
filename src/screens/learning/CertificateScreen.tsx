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
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }
    .cert-container {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      border: 15px double rgba(245, 158, 11, 0.25);
      padding: 30px 40px;
      position: relative;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      font-family: 'Georgia', serif;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 56px;
      color: rgba(0, 0, 0, 0.02);
      font-weight: bold;
      letter-spacing: 8px;
      pointer-events: none;
      white-space: nowrap;
      text-transform: uppercase;
      z-index: 1;
    }
    .top-seal {
      position: absolute;
      top: 20px;
      right: 30px;
      width: 64px;
      height: 64px;
      border: 1px dashed rgba(245, 158, 11, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(245, 158, 11, 0.15);
      font-size: 7px;
      font-weight: 900;
      transform: rotate(12deg);
      text-transform: uppercase;
    }
    .header-section {
      z-index: 2;
    }
    .subtitle {
      font-size: 10px;
      letter-spacing: 0.25em;
      font-family: sans-serif;
      font-weight: 900;
      color: #b45309;
      text-transform: uppercase;
    }
    .academy-name {
      font-size: 20px;
      font-style: italic;
      font-weight: 900;
      color: #1e293b;
      margin: 5px 0;
    }
    .body-section {
      z-index: 2;
    }
    .presented-text {
      font-size: 11px;
      color: #94a3b8;
      font-style: italic;
      font-family: sans-serif;
    }
    .student-name {
      font-size: 24px;
      font-weight: bold;
      color: #0f172a;
      border-bottom: 1px solid rgba(245, 158, 11, 0.2);
      padding-bottom: 3px;
      display: inline-block;
      width: 80%;
      margin: 8px auto;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .course-details {
      font-size: 10px;
      color: #64748b;
      max-width: 500px;
      margin: 8px auto;
      line-height: 1.5;
      font-family: sans-serif;
    }
    .course-name {
      font-size: 18px;
      font-weight: 900;
      color: #4338ca;
      margin-top: 4px;
    }
    .footer-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      z-index: 2;
      font-family: sans-serif;
      padding-top: 10px;
    }
    .footer-col {
      width: 30%;
    }
    .label {
      font-size: 8px;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: bold;
      letter-spacing: 1px;
    }
    .value {
      font-size: 10px;
      color: #1e293b;
      font-weight: bold;
      margin-top: 3px;
    }
    .sig-line {
      font-family: 'Georgia', serif;
      font-style: italic;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 2px;
      display: inline-block;
      width: 80%;
    }
    .stamp-container {
      position: relative;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .gold-seal {
      position: absolute;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #fbbf24, #f59e0b, #d97706);
      border-radius: 50%;
      border: 1px solid #fbbf24;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      z-index: 3;
    }
    .inner-seal {
      position: absolute;
      width: 80%;
      height: 80%;
      border-radius: 50%;
      border: 1px solid #fef3c7;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 7px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -0.5px;
      z-index: 4;
      text-align: center;
    }
    .ribbon-l {
      position: absolute;
      bottom: -12px;
      left: 12px;
      width: 12px;
      height: 30px;
      background-color: #d97706;
      transform: rotate(15deg);
      clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 50% 80%, 0% 100%);
      z-index: 2;
    }
    .ribbon-r {
      position: absolute;
      bottom: -12px;
      right: 12px;
      width: 12px;
      height: 30px;
      background-color: #d97706;
      transform: rotate(-15deg);
      clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 50% 80%, 0% 100%);
      z-index: 2;
    }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="watermark">iCoded Academy</div>
    <div class="top-seal">Official Seal</div>
    
    <div class="header-section">
      <span class="subtitle">Certificate of Excellence</span>
      <h1 class="academy-name">LMS Job Portal Academy</h1>
    </div>
    
    <div class="body-section">
      <p class="presented-text">This credential is proudly presented to</p>
      <div class="student-name">${cert.userName || user?.displayName || user?.email || 'Student'}</div>
      <p class="course-details">
        for demonstrating technical mastery with a final assessment score of ${cert.score}% and successfully passing all lesson modules for the professional curriculum
      </p>
      <div class="course-name">${cert.courseTitle}</div>
    </div>
    
    <div class="footer-section">
      <div class="footer-col" style="text-align: left;">
        <span class="label">Credential ID / Issue Date</span>
        <div class="value">${cert.credentialId} <br/> ${cert.issuedDate}</div>
      </div>
      
      <div class="stamp-container">
        <div class="gold-seal"></div>
        <div class="inner-seal">
          <span>Verified</span>
          <span style="font-size: 5px; opacity: 0.8; margin-top: 1px;">Excellence</span>
        </div>
        <div class="ribbon-l"></div>
        <div class="ribbon-r"></div>
      </div>
      
      <div class="footer-col" style="text-align: right;">
        <span class="label">Course Director</span>
        <div class="value">
          <span class="sig-line">iCoded Academy</span>
        </div>
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
