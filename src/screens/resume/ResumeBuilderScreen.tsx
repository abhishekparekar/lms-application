import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  useColorScheme,
  StatusBar as RNStatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/theme';
import { db } from '@/services/firebase/config';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';

interface ResumeBuilderScreenProps {
  onStartProfileBuilder?: () => void;
}

interface ExperienceItem {
  id?: string;
  position: string;
  company: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

interface EducationItem {
  id?: string;
  degree: string;
  fieldOfStudy: string;
  institution: string;
  startYear: string;
  endYear?: string;
}

interface ProjectItem {
  id?: string;
  title: string;
  technologies: string;
  link?: string;
  description: string;
}

// ── Clean Corporate ATS-Accepted HTML Generator (Strictly Real Data, No Demo Text) ──
const generateResumeHtml = (
  name: string,
  targetTitle: string,
  email: string,
  phone: string,
  location: string,
  portfolio: string,
  bio: string,
  skills: string[],
  experience: ExperienceItem[],
  education: EducationItem[],
  projects: ProjectItem[],
  theme: 'navy' | 'slate'
) => {
  const safeSkills = (Array.isArray(skills) ? skills : []).filter(s => Boolean(s && s.trim()));
  const safeExperience = (Array.isArray(experience) ? experience : []).filter(
    exp => exp && (Boolean(exp.position && exp.position.trim()) || Boolean(exp.company && exp.company.trim()))
  );
  const safeEducation = (Array.isArray(education) ? education : []).filter(
    edu => edu && (Boolean(edu.degree && edu.degree.trim()) || Boolean(edu.institution && edu.institution.trim()))
  );
  const safeProjects = (Array.isArray(projects) ? projects : []).filter(
    p => p && Boolean(p.title && p.title.trim())
  );

  const themeColors = {
    navy: { header: '#1E3A8A', accent: '#3B82F6', line: '#CBD5E1' },
    slate: { header: '#0F172A', accent: '#475569', line: '#E2E8F0' },
  };

  const currentTheme = themeColors[theme] || themeColors.navy;

  const expHtml = safeExperience
    .map(exp => `
      <div class="item">
        <div class="item-header">
          <span class="item-title">${exp.position || ''}</span>
          ${exp.startDate || exp.endDate ? `<span class="item-date">${exp.startDate || ''} ${exp.startDate && exp.endDate ? '&ndash;' : ''} ${exp.endDate || ''}</span>` : ''}
        </div>
        ${exp.company ? `<div class="item-subtitle">${exp.company}</div>` : ''}
        ${exp.description ? `<p class="item-desc">${exp.description}</p>` : ''}
      </div>
    `)
    .join('');

  const eduHtml = safeEducation
    .map(edu => `
      <div class="item">
        <div class="item-header">
          <span class="item-title">${edu.degree || ''} ${edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}</span>
          ${edu.startYear || edu.endYear ? `<span class="item-date">${edu.startYear || ''} ${edu.startYear && edu.endYear ? '&ndash;' : ''} ${edu.endYear || ''}</span>` : ''}
        </div>
        ${edu.institution ? `<div class="item-subtitle">${edu.institution}</div>` : ''}
      </div>
    `)
    .join('');

  const projectsHtml = safeProjects
    .map(proj => `
      <div class="item">
        <div class="item-header">
          <span class="item-title">${proj.title}</span>
          ${proj.technologies ? `<span class="item-date">${proj.technologies}</span>` : ''}
        </div>
        ${proj.link ? `<div class="item-subtitle"><a href="${proj.link}">${proj.link}</a></div>` : ''}
        ${proj.description ? `<p class="item-desc">${proj.description}</p>` : ''}
      </div>
    `)
    .join('');

  const skillsText = safeSkills.join(' • ');

  const contactItems: string[] = [];
  if (email) contactItems.push(`<span><strong>Email:</strong> ${email}</span>`);
  if (phone) contactItems.push(`<span><strong>Phone:</strong> ${phone}</span>`);
  if (location) contactItems.push(`<span><strong>Location:</strong> ${location}</span>`);
  if (portfolio) contactItems.push(`<span><strong>Link:</strong> ${portfolio}</span>`);

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>${name || 'Resume'} - ATS Resume</title>
        <style>
          @page {
            size: A4;
            margin: 28px 36px;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #1E293B;
            margin: 0;
            padding: 24px 30px;
            font-size: 11px;
            line-height: 1.5;
            background-color: #FFFFFF;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid ${currentTheme.header};
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .name {
            font-size: 22px;
            font-weight: 800;
            color: ${currentTheme.header};
            margin: 0 0 3px 0;
            text-transform: uppercase;
            letter-spacing: 0.8px;
          }
          .target-title {
            font-size: 12px;
            font-weight: 700;
            color: ${currentTheme.accent};
            text-transform: uppercase;
            letter-spacing: 0.6px;
            margin-bottom: 5px;
          }
          .contact-strip {
            font-size: 10px;
            color: #475569;
          }
          .contact-item {
            display: inline-block;
            margin: 0 5px;
          }
          .section-title {
            font-size: 11px;
            font-weight: 800;
            color: ${currentTheme.header};
            border-bottom: 1px solid ${currentTheme.line};
            padding-bottom: 2px;
            margin-top: 13px;
            margin-bottom: 7px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .bio-text {
            color: #334155;
            line-height: 1.5;
            margin: 0 0 6px 0;
            font-size: 10.5px;
          }
          .item {
            margin-bottom: 8px;
          }
          .item-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 2px;
          }
          .item-title {
            font-size: 11px;
            font-weight: 700;
            color: #0F172A;
          }
          .item-date {
            font-size: 10px;
            color: #475569;
            font-weight: 600;
          }
          .item-subtitle {
            font-size: 10px;
            color: #334155;
            font-weight: 600;
            margin-bottom: 2px;
          }
          .item-desc {
            color: #334155;
            margin: 0;
            font-size: 10px;
            line-height: 1.4;
          }
          .skills-text {
            color: #1E293B;
            font-size: 10.5px;
            line-height: 1.6;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="name">${name || 'Candidate Name'}</h1>
          ${targetTitle ? `<div class="target-title">${targetTitle}</div>` : ''}
          ${contactItems.length > 0 ? `<div class="contact-strip">${contactItems.join(' • ')}</div>` : ''}
        </div>

        ${bio ? `
          <div>
            <div class="section-title">Professional Summary</div>
            <p class="bio-text">${bio}</p>
          </div>
        ` : ''}

        ${safeSkills.length > 0 ? `
          <div>
            <div class="section-title">Key Skills & Core Competencies</div>
            <div class="skills-text">${skillsText}</div>
          </div>
        ` : ''}

        ${expHtml ? `
          <div>
            <div class="section-title">Work Experience</div>
            ${expHtml}
          </div>
        ` : ''}

        ${projectsHtml ? `
          <div>
            <div class="section-title">Key Projects</div>
            ${projectsHtml}
          </div>
        ` : ''}

        ${eduHtml ? `
          <div>
            <div class="section-title">Education & Credentials</div>
            ${eduHtml}
          </div>
        ` : ''}
      </body>
    </html>
  `;
};

export const ResumeBuilderScreen: React.FC<ResumeBuilderScreenProps> = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  // Tabs: 'edit' vs 'live_check'
  const [activeTab, setActiveTab] = useState<'edit' | 'live_check'>('edit');
  const [selectedTheme, setSelectedTheme] = useState<'navy' | 'slate'>('navy');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Resume Form Fields - STRICTLY NO FAKE/DEMO DATA
  const [fullName, setFullName] = useState('');
  const [targetTitle, setTargetTitle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [experience, setExperience] = useState<ExperienceItem[]>([]);
  const [education, setEducation] = useState<EducationItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);

  // Load purely real user data from Auth and Firestore Profile
  useEffect(() => {
    if (!user) return;
    const seeker = (user?.seekerProfile || {}) as any;

    setFullName(seeker.fullName || user.displayName || '');
    setEmail(user.email || '');
    setPhone(seeker.phone || '');
    setLocation(seeker.location || seeker.locationPreference || '');
    setPortfolio(seeker.portfolioUrl || seeker.linkedin || '');
    setTargetTitle(seeker.title || seeker.targetRole || '');
    setBio(seeker.bio || seeker.summary || '');

    // Strictly real data from profile, no mock fallbacks
    if (Array.isArray(seeker.skills)) {
      setSkills(seeker.skills.filter(Boolean));
    }
    if (Array.isArray(seeker.experience)) {
      setExperience(seeker.experience.filter(Boolean));
    }
    if (Array.isArray(seeker.education)) {
      setEducation(seeker.education.filter(Boolean));
    }
    if (Array.isArray(seeker.projects)) {
      setProjects(seeker.projects.filter(Boolean));
    }

    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const uData = snap.data();
        const sProf = uData.seekerProfile || {};
        if (sProf.fullName && !fullName) setFullName(sProf.fullName);
        if (sProf.phone && !phone) setPhone(sProf.phone);
        if (sProf.bio && !bio) setBio(sProf.bio);
      }
    });

    return () => unsub();
  }, [user]);

  // Clean, concise ATS score calculation
  const atsScore = useMemo(() => {
    let score = 0;
    if (fullName.trim()) score += 15;
    if (targetTitle.trim()) score += 10;
    if (email.trim() && email.includes('@')) score += 15;
    if (phone.trim()) score += 10;
    if (location.trim()) score += 10;
    if (bio.trim() && bio.length > 20) score += 15;
    if (skills.length >= 3) score += 15;
    if (experience.length > 0 || projects.length > 0) score += 10;
    return Math.min(100, score);
  }, [fullName, targetTitle, email, phone, location, bio, skills, experience, projects]);

  // Skills
  const handleAddSkill = () => {
    const trimmed = newSkillInput.trim();
    if (!trimmed) return;
    if (skills.includes(trimmed)) {
      setNewSkillInput('');
      return;
    }
    setSkills([...skills, trimmed]);
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  // Add Empty Experience (No dummy text)
  const handleAddExperience = () => {
    setExperience([
      ...experience,
      {
        id: `exp-${Date.now()}`,
        position: '',
        company: '',
        startDate: '',
        endDate: '',
        description: '',
      }
    ]);
  };

  const handleUpdateExperience = (idx: number, field: keyof ExperienceItem, val: string) => {
    const updated = [...experience];
    updated[idx] = { ...updated[idx], [field]: val };
    setExperience(updated);
  };

  const handleRemoveExperience = (idx: number) => {
    setExperience(experience.filter((_, i) => i !== idx));
  };

  // Add Empty Education (No dummy text)
  const handleAddEducation = () => {
    setEducation([
      ...education,
      {
        id: `edu-${Date.now()}`,
        degree: '',
        fieldOfStudy: '',
        institution: '',
        startYear: '',
        endYear: '',
      }
    ]);
  };

  const handleUpdateEducation = (idx: number, field: keyof EducationItem, val: string) => {
    const updated = [...education];
    updated[idx] = { ...updated[idx], [field]: val };
    setEducation(updated);
  };

  const handleRemoveEducation = (idx: number) => {
    setEducation(education.filter((_, i) => i !== idx));
  };

  // Add Empty Project (No dummy text)
  const handleAddProject = () => {
    setProjects([
      ...projects,
      {
        id: `proj-${Date.now()}`,
        title: '',
        technologies: '',
        link: '',
        description: '',
      }
    ]);
  };

  const handleUpdateProject = (idx: number, field: keyof ProjectItem, val: string) => {
    const updated = [...projects];
    updated[idx] = { ...updated[idx], [field]: val };
    setProjects(updated);
  };

  const handleRemoveProject = (idx: number) => {
    setProjects(projects.filter((_, i) => i !== idx));
  };

  // Save to Firestore Profile
  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'seekerProfile.fullName': fullName.trim(),
        'seekerProfile.phone': phone.trim(),
        'seekerProfile.location': location.trim(),
        'seekerProfile.locationPreference': location.trim(),
        'seekerProfile.title': targetTitle.trim(),
        'seekerProfile.portfolioUrl': portfolio.trim(),
        'seekerProfile.bio': bio.trim(),
        'seekerProfile.skills': skills,
        'seekerProfile.experience': experience,
        'seekerProfile.education': education,
        'seekerProfile.projects': projects,
      });
      Alert.alert('Saved Successfully! 💾', 'Your resume information is saved to your profile.');
    } catch (e: any) {
      Alert.alert('Save Error', e.message || 'Could not save resume details.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Download PDF Handler
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const htmlContent = generateResumeHtml(
        fullName.trim() || user?.displayName || 'Resume',
        targetTitle.trim(),
        email.trim(),
        phone.trim(),
        location.trim(),
        portfolio.trim(),
        bio.trim(),
        skills,
        experience,
        education,
        projects,
        selectedTheme
      );

      if (Platform.OS === 'web') {
        setIsGeneratingPdf(false);
        await Print.printAsync({ html: htmlContent });
        return;
      }

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      setIsGeneratingPdf(false);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${fullName || 'My'}_ATS_Resume.pdf`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF Saved 📥', `Your resume PDF is ready:\n${uri}`);
      }
    } catch (e: any) {
      setIsGeneratingPdf(false);
      Alert.alert('Download Error', e.message || 'Could not compile and export PDF.');
    }
  };

  const themePalettes = {
    navy: { primary: '#1E3A8A', label: 'Executive Navy' },
    slate: { primary: '#0F172A', label: 'Classic Slate' },
  };

  const activeColor = themePalettes[selectedTheme].primary;

  // Real filtered data counts for live check
  const realExpCount = experience.filter(e => e.position || e.company).length;
  const realEduCount = education.filter(e => e.degree || e.institution).length;
  const realProjCount = projects.filter(p => p.title).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#4F46E5' }} edges={['top']}>
      <RNStatusBar barStyle="light-content" backgroundColor="#4F46E5" translucent={false} />
      <StatusBar style="light" />

      {/* ── Top Header ── */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>ATS Resume Builder</Text>
          <Text style={styles.headerSub}>Corporate Single-Column ATS Format</Text>
        </View>
        <TouchableOpacity
          style={styles.headerSaveBtn}
          onPress={handleSaveProfile}
          disabled={savingProfile}
          activeOpacity={0.8}
        >
          {savingProfile ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="save-outline" size={14} color="#FFFFFF" />
              <Text style={styles.headerSaveBtnText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        {/* ── Segmented Switcher: Edit vs Live Check ── */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'edit' && styles.tabItemActive]}
            onPress={() => setActiveTab('edit')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="create-outline"
              size={15}
              color={activeTab === 'edit' ? '#4F46E5' : '#64748B'}
            />
            <Text style={[styles.tabText, activeTab === 'edit' && styles.tabTextActive]}>
              Edit Resume Form
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'live_check' && styles.tabItemActive]}
            onPress={() => setActiveTab('live_check')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="eye-outline"
              size={15}
              color={activeTab === 'live_check' ? '#4F46E5' : '#64748B'}
            />
            <Text style={[styles.tabText, activeTab === 'live_check' && styles.tabTextActive]}>
              Live Check & PDF
            </Text>
            <View style={[styles.scoreBadge, { backgroundColor: atsScore >= 80 ? '#10B981' : '#F59E0B' }]}>
              <Text style={styles.scoreBadgeText}>{atsScore}%</Text>
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === 'edit' ? (
            /* ══════════════ EDIT FORM (NO DEMO DATA) ══════════════ */
            <View>
              {/* 1. Contact Info */}
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionNumberCircle}>
                  <Text style={styles.sectionNumberText}>1</Text>
                </View>
                <Text style={styles.sectionTitle}>CONTACT & PERSONAL DETAILS</Text>
              </View>

              <View style={styles.formCard}>
                <View style={styles.fieldRow}>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput
                      style={styles.inputField}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="e.g. Rahul Sharma"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View style={styles.fieldHalf}>
                    <Text style={styles.label}>Target Job Title</Text>
                    <TextInput
                      style={styles.inputField}
                      value={targetTitle}
                      onChangeText={setTargetTitle}
                      placeholder="e.g. Java Developer"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.label}>Email Address *</Text>
                    <TextInput
                      style={styles.inputField}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="your.email@example.com"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.fieldHalf}>
                    <Text style={styles.label}>Phone Number *</Text>
                    <TextInput
                      style={styles.inputField}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="+91 9876543210"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.label}>Location / City</Text>
                    <TextInput
                      style={styles.inputField}
                      value={location}
                      onChangeText={setLocation}
                      placeholder="e.g. Bengaluru, India"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View style={styles.fieldHalf}>
                    <Text style={styles.label}>Portfolio / LinkedIn Link</Text>
                    <TextInput
                      style={styles.inputField}
                      value={portfolio}
                      onChangeText={setPortfolio}
                      placeholder="linkedin.com/in/... or portfolio"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </View>

              {/* 2. Professional Summary */}
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionNumberCircle}>
                  <Text style={styles.sectionNumberText}>2</Text>
                </View>
                <Text style={styles.sectionTitle}>PROFESSIONAL SUMMARY</Text>
              </View>

              <View style={styles.formCard}>
                <TextInput
                  style={[styles.inputField, styles.multilineInput]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Describe your background, core strengths, and career goals in 2-3 concise sentences..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* 3. Skills */}
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionNumberCircle}>
                  <Text style={styles.sectionNumberText}>3</Text>
                </View>
                <Text style={styles.sectionTitle}>KEY SKILLS ({skills.length})</Text>
              </View>

              <View style={styles.formCard}>
                {skills.length > 0 ? (
                  <View style={styles.skillsContainer}>
                    {skills.map((skill, idx) => (
                      <View key={idx} style={styles.skillBadge}>
                        <Ionicons name="checkmark-circle" size={13} color="#4F46E5" />
                        <Text style={styles.skillBadgeText}>{skill}</Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveSkill(skill)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close-circle" size={15} color="#818CF8" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyNotice}>
                    <Text style={styles.emptyNoticeText}>No skills added yet. Add your key skills below.</Text>
                  </View>
                )}

                <View style={styles.addSkillBox}>
                  <Ionicons name="code-slash-outline" size={16} color="#6366F1" style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.addSkillInput}
                    value={newSkillInput}
                    onChangeText={setNewSkillInput}
                    placeholder="Enter skill (e.g. React Native, Java, UI/UX, Python)"
                    placeholderTextColor="#94A3B8"
                    onSubmitEditing={handleAddSkill}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={[styles.addSkillBtn, !newSkillInput.trim() && styles.addSkillBtnDisabled]}
                    onPress={handleAddSkill}
                    disabled={!newSkillInput.trim()}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={styles.addSkillBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 4. Experience */}
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionNumberCircle}>
                  <Text style={styles.sectionNumberText}>4</Text>
                </View>
                <Text style={styles.sectionTitle}>WORK EXPERIENCE ({realExpCount})</Text>
              </View>

              <View style={styles.formCard}>
                {experience.length === 0 ? (
                  <View style={styles.emptyNotice}>
                    <Text style={styles.emptyNoticeText}>No experience added yet. Tap below to add a job or internship.</Text>
                  </View>
                ) : null}

                {experience.map((exp, idx) => (
                  <View key={idx} style={styles.subItemBox}>
                    <View style={styles.subItemHeader}>
                      <Text style={styles.subItemTitle}>Experience #{idx + 1}</Text>
                      <TouchableOpacity onPress={() => handleRemoveExperience(idx)} activeOpacity={0.7}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.fieldRow}>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.label}>Job Title / Role</Text>
                        <TextInput
                          style={styles.inputField}
                          value={exp.position}
                          onChangeText={(v) => handleUpdateExperience(idx, 'position', v)}
                          placeholder="e.g. Frontend Engineer"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.label}>Company Name</Text>
                        <TextInput
                          style={styles.inputField}
                          value={exp.company}
                          onChangeText={(v) => handleUpdateExperience(idx, 'company', v)}
                          placeholder="e.g. Acme Corp"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                    </View>

                    <View style={styles.fieldRow}>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.label}>Start Year / Date</Text>
                        <TextInput
                          style={styles.inputField}
                          value={exp.startDate}
                          onChangeText={(v) => handleUpdateExperience(idx, 'startDate', v)}
                          placeholder="e.g. 2022"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.label}>End Year / Date</Text>
                        <TextInput
                          style={styles.inputField}
                          value={exp.endDate}
                          onChangeText={(v) => handleUpdateExperience(idx, 'endDate', v)}
                          placeholder="e.g. Present or 2024"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                    </View>

                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.label}>Key Achievements / Responsibilities</Text>
                      <TextInput
                        style={[styles.inputField, styles.multilineInputSmall]}
                        value={exp.description}
                        onChangeText={(v) => handleUpdateExperience(idx, 'description', v)}
                        placeholder="Bullet points or summary of your contribution..."
                        placeholderTextColor="#94A3B8"
                        multiline
                      />
                    </View>
                  </View>
                ))}

                <TouchableOpacity style={styles.addItemBtn} onPress={handleAddExperience} activeOpacity={0.8}>
                  <Ionicons name="add-circle-outline" size={17} color="#4F46E5" />
                  <Text style={styles.addItemBtnText}>+ Add Work Experience</Text>
                </TouchableOpacity>
              </View>

              {/* 5. Projects */}
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionNumberCircle}>
                  <Text style={styles.sectionNumberText}>5</Text>
                </View>
                <Text style={styles.sectionTitle}>KEY PROJECTS ({realProjCount})</Text>
              </View>

              <View style={styles.formCard}>
                {projects.length === 0 ? (
                  <View style={styles.emptyNotice}>
                    <Text style={styles.emptyNoticeText}>No projects added yet. Tap below to showcase your projects.</Text>
                  </View>
                ) : null}

                {projects.map((proj, idx) => (
                  <View key={idx} style={styles.subItemBox}>
                    <View style={styles.subItemHeader}>
                      <Text style={styles.subItemTitle}>Project #{idx + 1}</Text>
                      <TouchableOpacity onPress={() => handleRemoveProject(idx)} activeOpacity={0.7}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.fieldRow}>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.label}>Project Title</Text>
                        <TextInput
                          style={styles.inputField}
                          value={proj.title}
                          onChangeText={(v) => handleUpdateProject(idx, 'title', v)}
                          placeholder="e.g. Online Learning App"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.label}>Technologies</Text>
                        <TextInput
                          style={styles.inputField}
                          value={proj.technologies}
                          onChangeText={(v) => handleUpdateProject(idx, 'technologies', v)}
                          placeholder="e.g. React, Node.js, Firebase"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                    </View>

                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.label}>Brief Description</Text>
                      <TextInput
                        style={[styles.inputField, styles.multilineInputSmall]}
                        value={proj.description}
                        onChangeText={(v) => handleUpdateProject(idx, 'description', v)}
                        placeholder="Key features and your role in building it..."
                        placeholderTextColor="#94A3B8"
                        multiline
                      />
                    </View>
                  </View>
                ))}

                <TouchableOpacity style={styles.addItemBtn} onPress={handleAddProject} activeOpacity={0.8}>
                  <Ionicons name="add-circle-outline" size={17} color="#4F46E5" />
                  <Text style={styles.addItemBtnText}>+ Add Project</Text>
                </TouchableOpacity>
              </View>

              {/* 6. Education */}
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionNumberCircle}>
                  <Text style={styles.sectionNumberText}>6</Text>
                </View>
                <Text style={styles.sectionTitle}>EDUCATION ({realEduCount})</Text>
              </View>

              <View style={styles.formCard}>
                {education.length === 0 ? (
                  <View style={styles.emptyNotice}>
                    <Text style={styles.emptyNoticeText}>No education added yet. Tap below to add your degree.</Text>
                  </View>
                ) : null}

                {education.map((edu, idx) => (
                  <View key={idx} style={styles.subItemBox}>
                    <View style={styles.subItemHeader}>
                      <Text style={styles.subItemTitle}>Degree #{idx + 1}</Text>
                      <TouchableOpacity onPress={() => handleRemoveEducation(idx)} activeOpacity={0.7}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.fieldRow}>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.label}>Degree Name</Text>
                        <TextInput
                          style={styles.inputField}
                          value={edu.degree}
                          onChangeText={(v) => handleUpdateEducation(idx, 'degree', v)}
                          placeholder="e.g. B.Tech / BCA / MCA"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.label}>Field / Branch</Text>
                        <TextInput
                          style={styles.inputField}
                          value={edu.fieldOfStudy}
                          onChangeText={(v) => handleUpdateEducation(idx, 'fieldOfStudy', v)}
                          placeholder="e.g. Computer Science"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                    </View>

                    <View style={styles.fieldRow}>
                      <View style={[styles.fieldHalf, { flex: 2 }]}>
                        <Text style={styles.label}>University / College</Text>
                        <TextInput
                          style={styles.inputField}
                          value={edu.institution}
                          onChangeText={(v) => handleUpdateEducation(idx, 'institution', v)}
                          placeholder="Institute name"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                      <View style={[styles.fieldHalf, { flex: 1 }]}>
                        <Text style={styles.label}>Year</Text>
                        <TextInput
                          style={styles.inputField}
                          value={edu.endYear}
                          onChangeText={(v) => handleUpdateEducation(idx, 'endYear', v)}
                          placeholder="e.g. 2024"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                    </View>
                  </View>
                ))}

                <TouchableOpacity style={styles.addItemBtn} onPress={handleAddEducation} activeOpacity={0.8}>
                  <Ionicons name="add-circle-outline" size={17} color="#4F46E5" />
                  <Text style={styles.addItemBtnText}>+ Add Education</Text>
                </TouchableOpacity>
              </View>

              {/* Bottom Quick Switch */}
              <TouchableOpacity
                style={styles.switchToCheckBtn}
                onPress={() => setActiveTab('live_check')}
                activeOpacity={0.88}
              >
                <Ionicons name="eye" size={18} color="#FFFFFF" />
                <Text style={styles.switchToCheckBtnText}>Preview Live ATS Resume & Download PDF 📥</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ══════════════ CLEAN LIVE CHECK & PREVIEW ══════════════ */
            <View>
              {/* Clean ATS Status Card */}
              <View style={styles.cleanStatusCard}>
                <View style={styles.cleanStatusTop}>
                  <View style={[styles.cleanScoreBadge, { backgroundColor: atsScore >= 80 ? '#10B981' : '#F59E0B' }]}>
                    <Text style={styles.cleanScoreNum}>{atsScore}%</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cleanStatusTitle}>ATS Readiness Score</Text>
                    <Text style={styles.cleanStatusSub}>
                      {atsScore >= 80 ? '✓ Ready for corporate recruiter submission' : 'Add remaining sections to maximize parse rate'}
                    </Text>
                  </View>
                </View>

                {/* Clean Pill Indicators */}
                <View style={styles.cleanPillsRow}>
                  <View style={[styles.cleanPill, fullName ? styles.cleanPillActive : null]}>
                    <Ionicons name={fullName ? "checkmark-circle" : "ellipse-outline"} size={13} color={fullName ? "#10B981" : "#94A3B8"} />
                    <Text style={[styles.cleanPillText, fullName ? styles.cleanPillTextActive : null]}>Contact</Text>
                  </View>

                  <View style={[styles.cleanPill, bio ? styles.cleanPillActive : null]}>
                    <Ionicons name={bio ? "checkmark-circle" : "ellipse-outline"} size={13} color={bio ? "#10B981" : "#94A3B8"} />
                    <Text style={[styles.cleanPillText, bio ? styles.cleanPillTextActive : null]}>Summary</Text>
                  </View>

                  <View style={[styles.cleanPill, skills.length > 0 ? styles.cleanPillActive : null]}>
                    <Ionicons name={skills.length > 0 ? "checkmark-circle" : "ellipse-outline"} size={13} color={skills.length > 0 ? "#10B981" : "#94A3B8"} />
                    <Text style={[styles.cleanPillText, skills.length > 0 ? styles.cleanPillTextActive : null]}>{skills.length} Skills</Text>
                  </View>

                  <View style={[styles.cleanPill, realExpCount > 0 ? styles.cleanPillActive : null]}>
                    <Ionicons name={realExpCount > 0 ? "checkmark-circle" : "ellipse-outline"} size={13} color={realExpCount > 0 ? "#10B981" : "#94A3B8"} />
                    <Text style={[styles.cleanPillText, realExpCount > 0 ? styles.cleanPillTextActive : null]}>{realExpCount} Jobs</Text>
                  </View>

                  <View style={[styles.cleanPill, realEduCount > 0 ? styles.cleanPillActive : null]}>
                    <Ionicons name={realEduCount > 0 ? "checkmark-circle" : "ellipse-outline"} size={13} color={realEduCount > 0 ? "#10B981" : "#94A3B8"} />
                    <Text style={[styles.cleanPillText, realEduCount > 0 ? styles.cleanPillTextActive : null]}>{realEduCount} Degrees</Text>
                  </View>
                </View>
              </View>

              {/* Theme Palette Bar */}
              <View style={styles.themeSelectorBar}>
                <Text style={styles.themeSelectorLabel}>Theme Color:</Text>
                <View style={styles.themeDotsRow}>
                  {(Object.keys(themePalettes) as Array<keyof typeof themePalettes>).map((key) => {
                    const isActive = selectedTheme === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.themePill,
                          isActive && { borderColor: themePalettes[key].primary, backgroundColor: '#EEF2FF' }
                        ]}
                        onPress={() => setSelectedTheme(key)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.themeDot, { backgroundColor: themePalettes[key].primary }]} />
                        <Text style={[styles.themePillText, isActive && { color: themePalettes[key].primary, fontWeight: '800' }]}>
                          {themePalettes[key].label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Live Clean Paper Sheet */}
              <View style={styles.resumePaper}>
                {/* Header Strip */}
                <View style={[styles.paperHeader, { borderBottomColor: activeColor }]}>
                  <Text style={[styles.paperName, { color: activeColor }]}>
                    {fullName || 'Your Name'}
                  </Text>
                  {targetTitle ? (
                    <Text style={[styles.paperTitle, { color: activeColor }]}>{targetTitle}</Text>
                  ) : null}
                  <Text style={styles.paperContact}>
                    {[email, phone, location].filter(Boolean).join(' • ')}
                  </Text>
                  {portfolio ? (
                    <Text style={[styles.paperContact, { color: '#4F46E5' }]}>{portfolio}</Text>
                  ) : null}
                </View>

                {/* Summary (Only if real data exists) */}
                {bio.trim() ? (
                  <View style={styles.paperSection}>
                    <Text style={[styles.paperSectionHeading, { color: activeColor }]}>
                      Professional Summary
                    </Text>
                    <Text style={styles.paperText}>{bio.trim()}</Text>
                  </View>
                ) : null}

                {/* Skills (Only if real skills exist) */}
                {skills.length > 0 ? (
                  <View style={styles.paperSection}>
                    <Text style={[styles.paperSectionHeading, { color: activeColor }]}>
                      Key Skills & Core Competencies
                    </Text>
                    <Text style={[styles.paperText, { fontWeight: '600' }]}>{skills.join(' • ')}</Text>
                  </View>
                ) : null}

                {/* Experience (Only real items) */}
                {realExpCount > 0 ? (
                  <View style={styles.paperSection}>
                    <Text style={[styles.paperSectionHeading, { color: activeColor }]}>
                      Work Experience
                    </Text>
                    {experience
                      .filter(exp => exp.position || exp.company)
                      .map((exp, idx) => (
                        <View key={idx} style={styles.paperItem}>
                          <View style={styles.paperItemTop}>
                            <Text style={styles.paperItemRole}>{exp.position || ''}</Text>
                            {exp.startDate || exp.endDate ? (
                              <Text style={styles.paperItemDates}>
                                {exp.startDate || ''} {exp.startDate && exp.endDate ? '–' : ''} {exp.endDate || ''}
                              </Text>
                            ) : null}
                          </View>
                          {exp.company ? <Text style={styles.paperItemCompany}>{exp.company}</Text> : null}
                          {exp.description ? <Text style={styles.paperText}>{exp.description}</Text> : null}
                        </View>
                      ))}
                  </View>
                ) : null}

                {/* Projects (Only real items) */}
                {realProjCount > 0 ? (
                  <View style={styles.paperSection}>
                    <Text style={[styles.paperSectionHeading, { color: activeColor }]}>
                      Key Projects
                    </Text>
                    {projects
                      .filter(p => p.title)
                      .map((proj, idx) => (
                        <View key={idx} style={styles.paperItem}>
                          <View style={styles.paperItemTop}>
                            <Text style={styles.paperItemRole}>{proj.title}</Text>
                            {proj.technologies ? <Text style={styles.paperItemDates}>{proj.technologies}</Text> : null}
                          </View>
                          {proj.description ? <Text style={styles.paperText}>{proj.description}</Text> : null}
                        </View>
                      ))}
                  </View>
                ) : null}

                {/* Education (Only real items) */}
                {realEduCount > 0 ? (
                  <View style={styles.paperSection}>
                    <Text style={[styles.paperSectionHeading, { color: activeColor }]}>
                      Education & Credentials
                    </Text>
                    {education
                      .filter(edu => edu.degree || edu.institution)
                      .map((edu, idx) => (
                        <View key={idx} style={styles.paperItem}>
                          <View style={styles.paperItemTop}>
                            <Text style={styles.paperItemRole}>
                              {edu.degree || ''} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
                            </Text>
                            {edu.endYear ? <Text style={styles.paperItemDates}>{edu.endYear}</Text> : null}
                          </View>
                          {edu.institution ? <Text style={styles.paperItemCompany}>{edu.institution}</Text> : null}
                        </View>
                      ))}
                  </View>
                ) : null}

                {/* Clean Empty State within Paper if completely blank */}
                {!bio.trim() && skills.length === 0 && realExpCount === 0 && realEduCount === 0 ? (
                  <View style={styles.paperEmptyNotice}>
                    <Ionicons name="create-outline" size={28} color="#94A3B8" />
                    <Text style={styles.paperEmptyNoticeTitle}>Your Resume is Fresh & Clean</Text>
                    <Text style={styles.paperEmptyNoticeSub}>
                      Switch to the "Edit Resume Form" tab to enter your summary, skills, experience, or education.
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionGrid}>
                <TouchableOpacity
                  style={[styles.downloadBtn, isGeneratingPdf && { opacity: 0.75 }]}
                  onPress={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  activeOpacity={0.88}
                >
                  <Ionicons name="cloud-download" size={18} color="#FFFFFF" />
                  <Text style={styles.downloadBtnText}>Download PDF Resume 📥</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backToEditBtn}
                  onPress={() => setActiveTab('edit')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={16} color="#4F46E5" />
                  <Text style={styles.backToEditBtnText}>Edit Resume Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* ── PDF Loading Modal ── */}
      <Modal visible={isGeneratingPdf} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loaderTitle}>Compiling PDF...</Text>
            <Text style={styles.loaderSub}>Generating clean ATS vector document</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#4F46E5',
    borderBottomWidth: 1,
    borderBottomColor: '#4338CA',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 10,
    color: '#E0E7FF',
    fontWeight: '600',
  },
  headerSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 11,
    paddingVertical: 5.5,
    borderRadius: 8,
  },
  headerSaveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ── Segmented Switcher ──
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  tabItemActive: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  scoreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  scoreBadgeText: {
    fontSize: 9.5,
    color: '#FFFFFF',
    fontWeight: '900',
  },

  scrollContent: {
    padding: 14,
  },

  // ── Section Headers ──
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 7,
    marginTop: 4,
  },
  sectionNumberCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionNumberText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#475569',
  },

  // ── Form Cards ──
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 13,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 9,
  },
  fieldHalf: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 9,
    paddingHorizontal: 10,
    height: 40,
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '600',
    backgroundColor: '#FFFFFF',
  },
  multilineInput: {
    height: 75,
    paddingTop: 8,
    textAlignVertical: 'top',
  },
  multilineInputSmall: {
    height: 52,
    paddingTop: 6,
    textAlignVertical: 'top',
  },

  // ── Skills ──
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 9,
  },
  skillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  skillBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3730A3',
  },
  addSkillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 9,
    paddingLeft: 9,
    paddingRight: 4,
    paddingVertical: 3,
  },
  addSkillInput: {
    flex: 1,
    height: 35,
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '600',
  },
  addSkillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    height: 31,
    borderRadius: 7,
    justifyContent: 'center',
  },
  addSkillBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  addSkillBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },

  emptyNotice: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  emptyNoticeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },

  // ── Sub Items ──
  subItemBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  subItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  subItemTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#475569',
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    borderRadius: 9,
    marginTop: 2,
  },
  addItemBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },

  switchToCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 16,
    elevation: 2,
  },
  switchToCheckBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },

  // ── CLEAN LIVE CHECK UI ──
  cleanStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cleanStatusTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  cleanScoreBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cleanScoreNum: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cleanStatusTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  cleanStatusSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  cleanPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cleanPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cleanPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  cleanPillText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  cleanPillTextActive: {
    color: '#065F46',
    fontWeight: '700',
  },

  themeSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  themeSelectorLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  themeDotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  themePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  themeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  themePillText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
  },

  // ── Paper Sheet Preview ──
  resumePaper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    minHeight: 280,
  },
  paperHeader: {
    alignItems: 'center',
    borderBottomWidth: 1.5,
    paddingBottom: 7,
    marginBottom: 8,
  },
  paperName: {
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paperTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  paperContact: {
    fontSize: 9,
    color: '#475569',
    marginTop: 3,
    textAlign: 'center',
  },
  paperSection: {
    marginTop: 7,
  },
  paperSectionHeading: {
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 2,
    marginBottom: 4,
  },
  paperText: {
    fontSize: 9.5,
    color: '#334155',
    lineHeight: 13.5,
  },
  paperItem: {
    marginBottom: 5,
  },
  paperItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  paperItemRole: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
  },
  paperItemDates: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  paperItemCompany: {
    fontSize: 9,
    color: '#475569',
    fontWeight: '600',
  },
  paperEmptyNotice: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  paperEmptyNoticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    marginTop: 8,
  },
  paperEmptyNoticeSub: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 15,
  },

  // ── Actions ──
  actionGrid: {
    gap: 8,
    marginBottom: 10,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 3,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  backToEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 10,
    borderRadius: 12,
  },
  backToEditBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#4F46E5',
  },

  // ── Loader Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loaderBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '85%',
    maxWidth: 320,
  },
  loaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 14,
  },
  loaderSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
});
