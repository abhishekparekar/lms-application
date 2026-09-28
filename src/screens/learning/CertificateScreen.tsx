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
  useColorScheme,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { lmsService, Certificate } from '@/services/lms/lmsService';
import { useAuth } from '@/hooks/useAuth';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface CertificateScreenProps {
  onBack: () => void;
}

export const CertificateScreen: React.FC<CertificateScreenProps> = ({ onBack }) => {
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

  const buildCertHTML = (cert: Certificate) => {
    const studentName = cert.userName || user?.displayName || user?.email || 'Student';
    const score = cert.score ?? 0;
    const issueDate = cert.issuedDate ?? new Date().toLocaleDateString('en-IN');
    const credId = cert.credentialId ?? '—';
    const courseTitle = cert.courseTitle ?? 'Course';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Roboto:wght@300;400;500;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;background:#fff}
  .page{
    width:100%;min-height:100vh;
    background:#fff;
    display:flex;align-items:center;justify-content:center;
    padding:20px;
  }
  .cert{
    width:720px;
    background:#fff;
    border:1px solid #e2e8f0;
    position:relative;
    overflow:hidden;
    font-family:'Roboto',sans-serif;
  }
  /* Gold top band */
  .band-top{height:12px;background:linear-gradient(90deg,#7C3AED,#4F46E5,#2563EB,#4F46E5,#7C3AED)}
  .band-bottom{height:12px;background:linear-gradient(90deg,#7C3AED,#4F46E5,#2563EB,#4F46E5,#7C3AED);margin-top:auto}
  .body{padding:40px 50px 36px;display:flex;flex-direction:column;align-items:center;text-align:center}
  /* Corner ornaments */
  .corner{position:absolute;width:60px;height:60px}
  .tl{top:16px;left:16px;border-top:3px solid #4F46E5;border-left:3px solid #4F46E5}
  .tr{top:16px;right:16px;border-top:3px solid #4F46E5;border-right:3px solid #4F46E5}
  .bl{bottom:16px;left:16px;border-bottom:3px solid #4F46E5;border-left:3px solid #4F46E5}
  .br{bottom:16px;right:16px;border-bottom:3px solid #4F46E5;border-right:3px solid #4F46E5}
  /* Watermark */
  .wm{
    position:absolute;top:50%;left:50%;
    transform:translate(-50%,-50%) rotate(-30deg);
    font-size:72px;font-weight:900;
    color:rgba(79,70,229,0.04);
    white-space:nowrap;letter-spacing:6px;
    pointer-events:none;user-select:none;
  }
  .issuer{font-size:11px;letter-spacing:4px;color:#7C3AED;font-weight:700;text-transform:uppercase;margin-bottom:6px}
  .heading{font-family:'Playfair Display',serif;font-size:30px;color:#0F172A;margin-bottom:4px}
  .heading em{font-style:italic;color:#4F46E5}
  .divider{width:80px;height:3px;background:linear-gradient(90deg,#7C3AED,#4F46E5);border-radius:2px;margin:16px auto}
  .presented{font-size:12px;color:#64748B;letter-spacing:1px;margin-bottom:10px}
  .name{
    font-family:'Playfair Display',serif;
    font-size:28px;font-weight:700;
    color:#0F172A;
    border-bottom:2px solid #4F46E5;
    padding-bottom:6px;
    margin-bottom:16px;
    display:inline-block;
    min-width:300px;
  }
  .desc{font-size:12px;color:#64748B;line-height:1.8;max-width:480px;margin-bottom:6px}
  .course{font-size:20px;font-weight:700;color:#4F46E5;margin-bottom:24px;line-height:1.4;max-width:520px}
  .score-badge{
    display:inline-flex;align-items:center;gap:6px;
    background:#EEF2FF;color:#4F46E5;
    border:1px solid #C7D2FE;border-radius:20px;
    font-size:12px;font-weight:700;
    padding:5px 16px;margin-bottom:28px;
  }
  /* Footer 3 columns */
  .footer{width:100%;display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #E2E8F0;padding-top:20px;margin-top:4px}
  .foot-col{flex:1;text-align:center}
  .foot-col:first-child{text-align:left}
  .foot-col:last-child{text-align:right}
  .foot-label{font-size:8px;color:#94A3B8;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:3px}
  .foot-value{font-size:11px;color:#0F172A;font-weight:700}
  .sig-name{font-family:'Playfair Display',serif;font-style:italic;font-size:14px;color:#0F172A}
  .sig-line{border-bottom:1px solid #CBD5E1;padding-bottom:2px;margin-bottom:4px}
  /* Gold seal */
  .seal{
    width:68px;height:68px;position:relative;
    display:flex;align-items:center;justify-content:center;margin:0 auto;
  }
  .seal-outer{
    position:absolute;width:68px;height:68px;
    background:conic-gradient(#7C3AED 0deg,#4F46E5 60deg,#2563EB 120deg,#4F46E5 180deg,#7C3AED 240deg,#4F46E5 300deg,#7C3AED 360deg);
    border-radius:50%;
  }
  .seal-inner{
    position:relative;width:52px;height:52px;
    background:#fff;border-radius:50%;
    display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    z-index:2;
  }
  .seal-text{font-size:6.5px;font-weight:900;color:#4F46E5;text-transform:uppercase;letter-spacing:1px;line-height:1.3;text-align:center}
  .cred{font-size:9px;color:#94A3B8;font-family:monospace;margin-top:4px}
</style>
</head>
<body>
<div class="page">
<div class="cert">
  <div class="band-top"></div>
  <div class="corner tl"></div>
  <div class="corner tr"></div>
  <div class="corner bl"></div>
  <div class="corner br"></div>
  <div class="wm">CERTIFIED</div>

  <div class="body">
    <div class="issuer">LMS Job Portal Academy</div>
    <div class="heading">Certificate of <em>Completion</em></div>
    <div class="divider"></div>

    <div class="presented">This certificate is proudly presented to</div>
    <div class="name">${studentName.toUpperCase()}</div>

    <div class="desc">
      for successfully completing all course requirements and demonstrating excellence<br>
      with a final assessment score of <strong>${score}%</strong>
    </div>
    <div class="course">${courseTitle}</div>

    <div class="score-badge">
      &#10003; Score: ${score}% &nbsp;|&nbsp; Passed
    </div>

    <div class="footer">
      <div class="foot-col">
        <div class="foot-label">Issue Date</div>
        <div class="foot-value">${issueDate}</div>
        <div class="cred">ID: ${credId}</div>
      </div>

      <div class="foot-col">
        <div class="seal">
          <div class="seal-outer"></div>
          <div class="seal-inner">
            <div class="seal-text">Verified<br>LMS<br>Academy</div>
          </div>
        </div>
      </div>

      <div class="foot-col">
        <div class="sig-line">
          <div class="sig-name">LMS Job Portal</div>
        </div>
        <div class="foot-label">Course Director</div>
      </div>
    </div>
  </div>

  <div class="band-bottom"></div>
</div>
</div>
</body>
</html>`;
  };

  const handleDownloadPDF = async (cert: Certificate) => {
    setGenerating(cert.id);
    try {
      const htmlContent = buildCertHTML(cert);
      if (Platform.OS === 'web') {
        await Print.printAsync({ html: htmlContent });
      } else {
        const { uri } = await Print.printToFileAsync({
          html: htmlContent,
          width: 842,
          height: 595,
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `${cert.courseTitle} Certificate`,
            UTI: 'com.adobe.pdf',
          });
        } else {
          Alert.alert('Certificate Saved!', `PDF saved at:\n${uri}`);
        }
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e.message || 'Could not generate certificate PDF.');
    } finally {
      setGenerating(null);
    }
  };

  const handleShare = async (cert: Certificate) => {
    try {
      await Share.share({
        message:
          `🎓 I've earned a Certificate of Completion!\n\n` +
          `Course: ${cert.courseTitle}\n` +
          `Score: ${cert.score}%\n` +
          `Issued: ${cert.issuedDate}\n` +
          `Credential ID: ${cert.credentialId}\n\n` +
          `Verify at: https://lmsjobportal.com/verify/${cert.credentialId}`,
        title: `${cert.courseTitle} Certificate`,
      });
    } catch {
      Alert.alert('Share Failed', 'Unable to share this certificate.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading certificates...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#F8FAFC' }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Certificates</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statsIcon}>
            <Ionicons name="ribbon" size={24} color="#4F46E5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statsBannerTitle}>
              {certificates.length} Certificate{certificates.length !== 1 ? 's' : ''} Earned
            </Text>
            <Text style={styles.statsBannerSub}>
              Add to LinkedIn • Download PDF • Share with employers
            </Text>
          </View>
        </View>

        {certificates.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Ionicons name="ribbon-outline" size={44} color="#A5B4FC" />
            </View>
            <Text style={styles.emptyTitle}>No Certificates Yet</Text>
            <Text style={styles.emptyDesc}>
              Complete a course and pass the Test Series (≥60%) to earn your first certificate.
            </Text>
          </View>
        ) : (
          certificates.map((cert) => (
            <View key={cert.id} style={styles.certCard}>
              {/* Top gradient band */}
              <View style={styles.certBandTop} />

              {/* Corner ornaments */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />

              {/* Issuer */}
              <Text style={styles.certIssuer}>LMS JOB PORTAL ACADEMY</Text>
              <Text style={styles.certHeading}>Certificate of</Text>
              <Text style={styles.certHeadingItalic}>Completion</Text>
              <View style={styles.certDivider} />

              <Text style={styles.certPresented}>This certificate is proudly presented to</Text>

              {/* Recipient name */}
              <View style={styles.certNameBox}>
                <Text style={styles.certName}>
                  {(cert.userName || user?.displayName || user?.email || 'Student').toUpperCase()}
                </Text>
              </View>

              <Text style={styles.certDesc}>
                for successfully completing all course requirements and{'\n'}
                passing the final assessment
              </Text>

              {/* Course title */}
              <Text style={styles.certCourse}>{cert.courseTitle}</Text>

              {/* Score badge */}
              <View style={styles.scoreBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#4F46E5" />
                <Text style={styles.scoreBadgeText}>Score: {cert.score}%  |  Passed</Text>
              </View>

              {/* Footer row */}
              <View style={styles.certFooter}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.footLabel}>Issue Date</Text>
                  <Text style={styles.footValue}>{cert.issuedDate}</Text>
                </View>

                {/* Seal */}
                <View style={styles.seal}>
                  <View style={styles.sealOuter}>
                    <View style={styles.sealInner}>
                      <Ionicons name="school" size={18} color="#4F46E5" />
                      <Text style={styles.sealText}>VERIFIED</Text>
                    </View>
                  </View>
                </View>

                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.footLabel}>Director</Text>
                  <Text style={[styles.footValue, { fontStyle: 'italic' }]}>LMS Portal</Text>
                </View>
              </View>

              {/* Credential */}
              <Text style={styles.credText}>ID: {cert.credentialId}</Text>

              {/* Divider */}
              <View style={styles.certInnerDivider} />

              {/* Bottom gradient band */}
              <View style={styles.certBandBottom} />

              {/* Actions */}
              {generating === cert.id ? (
                <View style={styles.genRow}>
                  <ActivityIndicator size="small" color="#4F46E5" />
                  <Text style={styles.genText}>Generating PDF...</Text>
                </View>
              ) : (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.btnOutline}
                    onPress={() => handleShare(cert)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="share-social-outline" size={15} color="#4F46E5" style={{ marginRight: 5 }} />
                    <Text style={styles.btnOutlineText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnPrimary}
                    onPress={() => handleDownloadPDF(cert)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="download-outline" size={15} color="#FFFFFF" style={{ marginRight: 5 }} />
                    <Text style={styles.btnPrimaryText}>Download PDF</Text>
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

const ACCENT = '#4F46E5';
const ACCENT2 = '#7C3AED';

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B', fontWeight: '500' },

  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },

  scroll: { padding: 20 },

  statsBanner: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  statsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsBannerTitle: { fontSize: 15, fontWeight: '800', color: ACCENT, marginBottom: 2 },
  statsBannerSub: { fontSize: 11, color: '#64748B', fontWeight: '500' },

  emptyBox: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  emptyDesc: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 22 },

  // ─── Certificate Card ───
  certCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    overflow: 'hidden',
    marginBottom: 28,
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 4,
    position: 'relative',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
  },
  certBandTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: ACCENT,
  },
  certBandBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: ACCENT2,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
  },
  cornerTL: { top: 18, left: 18, borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#C7D2FE' },
  cornerTR: { top: 18, right: 18, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#C7D2FE' },
  cornerBL: { bottom: 14, left: 18, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: '#C7D2FE' },
  cornerBR: { bottom: 14, right: 18, borderBottomWidth: 2, borderRightWidth: 2, borderColor: '#C7D2FE' },

  certIssuer: {
    fontSize: 9,
    color: ACCENT2,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  certHeading: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  certHeadingItalic: { fontSize: 22, fontWeight: '700', color: ACCENT, fontStyle: 'italic', marginBottom: 6 },
  certDivider: {
    width: 60,
    height: 3,
    backgroundColor: ACCENT,
    borderRadius: 2,
    marginVertical: 12,
  },
  certPresented: { fontSize: 11, color: '#94A3B8', marginBottom: 12, letterSpacing: 0.5 },
  certNameBox: {
    borderBottomWidth: 1.5,
    borderBottomColor: ACCENT,
    paddingBottom: 6,
    marginBottom: 14,
    minWidth: '70%',
    alignItems: 'center',
  },
  certName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1,
    textAlign: 'center',
  },
  certDesc: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 6,
  },
  certCourse: {
    fontSize: 16,
    fontWeight: '800',
    color: ACCENT,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
    lineHeight: 24,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 20,
  },
  scoreBadgeText: { fontSize: 12, fontWeight: '800', color: ACCENT },

  certFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginBottom: 8,
  },
  footLabel: { fontSize: 8, color: '#94A3B8', fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  footValue: { fontSize: 12, fontWeight: '700', color: '#0F172A' },

  seal: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  sealOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EEF2FF',
    borderWidth: 3,
    borderColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealInner: { alignItems: 'center', justifyContent: 'center' },
  sealText: { fontSize: 6, fontWeight: '900', color: ACCENT, letterSpacing: 0.5, marginTop: 2 },

  credText: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    marginBottom: 20,
  },
  certInnerDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },

  genRow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 44 },
  genText: { fontSize: 13, color: '#64748B', fontWeight: '600' },

  actionsRow: { flexDirection: 'row', gap: 12, width: '100%' },
  btnOutline: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: { fontSize: 13, fontWeight: '700', color: ACCENT },
  btnPrimary: {
    flex: 1,
    height: 44,
    backgroundColor: ACCENT,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
