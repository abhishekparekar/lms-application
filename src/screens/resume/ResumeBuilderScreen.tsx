import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuth } from '@/hooks/useAuth';

const { width: SW } = Dimensions.get('window');

interface ResumeBuilderScreenProps {
  onStartProfileBuilder: () => void;
}

interface ExperienceItem {
  position: string;
  company: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

interface EducationItem {
  degree: string;
  fieldOfStudy: string;
  institution: string;
  startYear: string;
  endYear?: string;
}

// Generates an 80%+ corporate ATS-accepted single column layout
const generateResumeHtml = (
  name: string,
  email: string,
  phone: string,
  bio: string,
  skills: string[],
  experience: ExperienceItem[],
  education: EducationItem[]
) => {
  const safeSkills = Array.isArray(skills) ? skills : [];
  const safeExperience = Array.isArray(experience) ? experience : [];
  const safeEducation = Array.isArray(education) ? education : [];

  const expHtml = safeExperience.map(exp => {
    if (!exp) return '';
    const pos = exp.position || '';
    const comp = exp.company || '';
    const start = exp.startDate || '';
    const end = exp.endDate || 'Present';
    const desc = exp.description || '';
    return `
      <div class="item">
        <div class="item-header">
          <span class="item-title">${pos}</span>
          <span class="item-date">${start} &ndash; ${end}</span>
        </div>
        <div class="item-subtitle">${comp}</div>
        ${desc ? `<p class="item-desc">${desc}</p>` : ''}
      </div>
    `;
  }).join('');

  const eduHtml = safeEducation.map(edu => {
    if (!edu) return '';
    const deg = edu.degree || '';
    const field = edu.fieldOfStudy || '';
    const inst = edu.institution || '';
    const start = edu.startYear || '';
    const end = edu.endYear || 'Present';
    return `
      <div class="item">
        <div class="item-header">
          <span class="item-title">${deg} in ${field}</span>
          <span class="item-date">${start} &ndash; ${end}</span>
        </div>
        <div class="item-subtitle">${inst}</div>
      </div>
    `;
  }).join('');

  const skillsText = safeSkills.join(', ');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${name} - Resume</title>
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 40px;
            font-size: 11px;
            line-height: 1.5;
            background-color: #ffffff;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .name {
            font-size: 24px;
            font-weight: bold;
            color: #0f172a;
            margin: 0 0 6px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .contact-strip {
            font-size: 10px;
            color: #475569;
            margin-top: 6px;
          }
          .contact-item {
            display: inline-block;
            margin: 0 8px;
          }
          .section-title {
            font-size: 12px;
            font-weight: bold;
            color: #0f172a;
            border-bottom: 1px solid #94a3b8;
            padding-bottom: 2px;
            margin-top: 18px;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .bio-text {
            color: #334155;
            line-height: 1.5;
            margin: 0 0 10px 0;
            font-size: 11px;
          }
          .item {
            margin-bottom: 12px;
          }
          .item-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 2px;
          }
          .item-title {
            font-size: 11.5px;
            font-weight: bold;
            color: #0f172a;
          }
          .item-date {
            font-size: 10.5px;
            color: #475569;
            font-weight: bold;
          }
          .item-subtitle {
            font-size: 11px;
            color: #334155;
            font-style: italic;
            margin-bottom: 4px;
          }
          .item-desc {
            color: #334155;
            margin: 0 0 4px 0;
            font-size: 10.5px;
            line-height: 1.4;
          }
          .skills-text {
            color: #334155;
            font-size: 11px;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="name">${name}</h1>
          <div class="contact-strip">
            ${email ? `<span class="contact-item"><strong>Email:</strong> ${email}</span>` : ''}
            ${phone ? `<span class="contact-item">|</span><span class="contact-item"><strong>Phone:</strong> ${phone}</span>` : ''}
          </div>
        </div>

        ${bio ? `
          <div>
            <div class="section-title">Professional Summary</div>
            <p class="bio-text">${bio}</p>
          </div>
        ` : ''}

        ${experience.length > 0 ? `
          <div>
            <div class="section-title">Work Experience</div>
            ${expHtml}
          </div>
        ` : ''}

        ${education.length > 0 ? `
          <div>
            <div class="section-title">Education</div>
            ${eduHtml}
          </div>
        ` : ''}

        ${skills.length > 0 ? `
          <div>
            <div class="section-title">Skills & Expertise</div>
            <div class="skills-text">${skillsText}</div>
          </div>
        ` : ''}
      </body>
    </html>
  `;
};

export const ResumeBuilderScreen: React.FC<ResumeBuilderScreenProps> = ({
  onStartProfileBuilder,
}) => {
  const { user } = useAuth();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const seekerProfile = user?.seekerProfile;
  const name = seekerProfile?.fullName || user?.displayName || 'Your Name';
  const email = user?.email || 'email@example.com';
  const phone = seekerProfile?.phone || '';
  const bio = seekerProfile?.bio || '';
  const skills = Array.isArray(seekerProfile?.skills) ? seekerProfile.skills : [];
  const experience: ExperienceItem[] = Array.isArray(seekerProfile?.experience) ? seekerProfile.experience : [];
  const education: EducationItem[] = Array.isArray(seekerProfile?.education) ? seekerProfile.education : [];

  const isProfileEmpty = !bio && skills.length === 0 && experience.length === 0 && education.length === 0;

  const startPdfExport = async () => {
    setIsGeneratingPdf(true);
    try {
      const htmlContent = generateResumeHtml(name, email, phone, bio, skills, experience, education);
      
      if (Platform.OS === 'web') {
        setIsGeneratingPdf(false);
        await Print.printAsync({ html: htmlContent });
      } else {
        try {
          const { uri } = await Print.printToFileAsync({ html: htmlContent });
          setIsGeneratingPdf(false);
          // Small delay to ensure the modal transitions out fully before launching sharing overlay
          await new Promise(resolve => setTimeout(resolve, 350));
          
          const shareOptions: Sharing.SharingOptions = {
            mimeType: 'application/pdf',
            dialogTitle: `Download ${name} Resume`,
          };
          if (Platform.OS === 'ios') {
            shareOptions.UTI = 'com.adobe.pdf';
          }

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, shareOptions);
          } else {
            // Fallback to printAsync if sharing is not available
            await Print.printAsync({ html: htmlContent });
          }
        } catch (innerErr: any) {
          console.log('[ResumeBuilder] printToFileAsync or shareAsync failed (expected on simulator), falling back to printAsync:', innerErr?.message || innerErr);
          setIsGeneratingPdf(false);
          await new Promise(resolve => setTimeout(resolve, 350));
          // Direct native print manager fallback (allows "Save as PDF")
          await Print.printAsync({ html: htmlContent });
        }
      }
    } catch (e: any) {
      setIsGeneratingPdf(false);
      console.error('PDF Export Error:', e);
      Alert.alert('Export Failed', e.message || 'Could not compile PDF.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top Title Bar */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>ATS Resume Builder</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ATS Compliant Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color="#1E3A8A" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Corporate Recruiter Format (80%+ Acceptance)</Text>
            <Text style={styles.infoDesc}>
              This standard single-column layout is designed to score high with Applicant Tracking Systems (ATS) and recruiter screenings.
            </Text>
          </View>
        </View>

        {/* Paper Sheet Resume Preview */}
        <View style={styles.resumePaper}>
          {/* Header */}
          <View style={styles.resumeHeader}>
            <Text style={styles.resumeName}>{name}</Text>
            <View style={styles.resumeContactStrip}>
              {email ? (
                <View style={styles.contactItem}>
                  <Ionicons name="mail-outline" size={12} color="#475569" />
                  <Text style={styles.contactText}>{email}</Text>
                </View>
              ) : null}
              {phone ? (
                <View style={styles.contactItem}>
                  <Ionicons name="call-outline" size={12} color="#475569" />
                  <Text style={styles.contactText}>{phone}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {isProfileEmpty ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyStateTitle}>Your profile is empty</Text>
              <Text style={styles.emptyStateDesc}>
                Update your professional details in your profile builder to populate your corporate resume.
              </Text>
              <TouchableOpacity style={styles.emptyStateBtn} onPress={onStartProfileBuilder}>
                <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                <Text style={styles.emptyStateBtnText}>Build Profile Info</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Professional Summary */}
              {bio ? (
                <View style={styles.resumeSection}>
                  <Text style={styles.sectionTitle}>Professional Summary</Text>
                  <Text style={styles.resumeBio}>{bio}</Text>
                </View>
              ) : null}

              {/* Work Experience */}
              {experience.length > 0 ? (
                <View style={styles.resumeSection}>
                  <Text style={styles.sectionTitle}>Work Experience</Text>
                  {experience.map((exp, idx) => (
                    <View key={idx} style={styles.experienceItem}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.itemTitle}>{exp.position}</Text>
                        <Text style={styles.itemDate}>{exp.startDate} – {exp.endDate || 'Present'}</Text>
                      </View>
                      <Text style={styles.itemSub}>{exp.company}</Text>
                      {exp.description ? <Text style={styles.itemDesc}>{exp.description}</Text> : null}
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Education */}
              {education.length > 0 ? (
                <View style={styles.resumeSection}>
                  <Text style={styles.sectionTitle}>Education</Text>
                  {education.map((edu, idx) => (
                    <View key={idx} style={styles.educationItem}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.itemTitle}>{edu.degree} in {edu.fieldOfStudy}</Text>
                        <Text style={styles.itemDate}>{edu.startYear} – {edu.endYear || 'Present'}</Text>
                      </View>
                      <Text style={styles.itemSub}>{edu.institution}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Skills */}
              {skills.length > 0 ? (
                <View style={styles.resumeSection}>
                  <Text style={styles.sectionTitle}>Skills & Expertise</Text>
                  <View style={styles.skillsWrap}>
                    {skills.map((sk) => (
                      <View key={sk} style={styles.skillPill}>
                        <Text style={styles.skillPillText}>{sk}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          )}
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={onStartProfileBuilder}>
            <Ionicons name="create-outline" size={20} color="#4F46E5" />
            <Text style={styles.editBtnText}>Edit Details</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.downloadBtn]} onPress={startPdfExport} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="cloud-download-outline" size={20} color="#FFFFFF" />
                <Text style={styles.downloadBtnText}>Download PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Generating PDF Loader Modal */}
      <Modal visible={isGeneratingPdf} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loaderText}>Generating ATS PDF Resume...</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
    alignItems: 'flex-start',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 2,
  },
  infoDesc: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
  },
  resumePaper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 20,
  },
  resumePaperLocked: {
    opacity: 0.6,
  },
  resumeHeader: {
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#0F172A',
    paddingBottom: 12,
    marginBottom: 12,
  },
  resumeName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  resumeContactStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  resumeSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 3,
    marginBottom: 10,
  },
  resumeBio: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  experienceItem: {
    marginBottom: 12,
  },
  educationItem: {
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  itemDate: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },
  itemSub: {
    fontSize: 11.5,
    color: '#475569',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
  },
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skillPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4F46E5',
  },
  downloadBtn: {
    backgroundColor: '#4F46E5',
  },
  downloadBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#475569',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyStateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  emptyStateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    width: SW * 0.75,
  },
  loaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
});
