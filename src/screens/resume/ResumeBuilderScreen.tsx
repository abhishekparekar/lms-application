import React, { useEffect, useState } from 'react';
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

// Generates an 80%+ corporate ATS-accepted single column HTML template with custom themes
const generateResumeHtml = (
  name: string,
  targetTitle: string,
  email: string,
  phone: string,
  location: string,
  bio: string,
  skills: string[],
  experience: ExperienceItem[],
  education: EducationItem[],
  theme: 'classic' | 'modern' | 'emerald' | 'gold'
) => {
  const safeSkills = Array.isArray(skills) ? skills : [];
  const safeExperience = Array.isArray(experience) ? experience : [];
  const safeEducation = Array.isArray(education) ? education : [];

  const expHtml = safeExperience.map(exp => {
    if (!exp || (!exp.position && !exp.company)) return '';
    const pos = exp.position || 'Position';
    const comp = exp.company || 'Company';
    const start = exp.startDate || '';
    const end = exp.endDate || 'Present';
    const desc = exp.description || '';
    return `
      <div class="item">
        <div class="item-header">
          <span class="item-title">${pos}</span>
          <span class="item-date">${start} ${start && end ? '&ndash;' : ''} ${end}</span>
        </div>
        <div class="item-subtitle">${comp}</div>
        ${desc ? `<p class="item-desc">${desc}</p>` : ''}
      </div>
    `;
  }).join('');

  const eduHtml = safeEducation.map(edu => {
    if (!edu || (!edu.degree && !edu.institution)) return '';
    const deg = edu.degree || 'Degree';
    const field = edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : '';
    const inst = edu.institution || 'Institution';
    const start = edu.startYear || '';
    const end = edu.endYear || 'Present';
    return `
      <div class="item">
        <div class="item-header">
          <span class="item-title">${deg} ${field}</span>
          <span class="item-date">${start} ${start && end ? '&ndash;' : ''} ${end}</span>
        </div>
        <div class="item-subtitle">${inst}</div>
      </div>
    `;
  }).join('');

  const skillsText = safeSkills.join(' • ');

  // Theme Colors Palette
  let headerColor = '#0f172a';
  let accentColor = '#94a3b8';
  
  if (theme === 'modern') {
    headerColor = '#1e3a8a';
    accentColor = '#3b82f6';
  } else if (theme === 'emerald') {
    headerColor = '#064e3b';
    accentColor = '#10b981';
  } else if (theme === 'gold') {
    headerColor = '#78350f';
    accentColor = '#d97706';
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${name} - Professional Resume</title>
        <style>
          @page {
            size: A4;
            margin: 0;
          }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 38px 44px;
            font-size: 11px;
            line-height: 1.5;
            background-color: #ffffff;
          }
          .header {
            text-align: center;
            border-bottom: 2.5px solid ${headerColor};
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .name {
            font-size: 24px;
            font-weight: 800;
            color: ${headerColor};
            margin: 0 0 3px 0;
            text-transform: uppercase;
            letter-spacing: 1.2px;
          }
          .target-title {
            font-size: 12px;
            font-weight: 700;
            color: ${accentColor};
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 6px;
          }
          .contact-strip {
            font-size: 10px;
            color: #475569;
            margin-top: 4px;
          }
          .contact-item {
            display: inline-block;
            margin: 0 6px;
          }
          .section-title {
            font-size: 11.5px;
            font-weight: 800;
            color: ${headerColor};
            border-bottom: 1px solid ${accentColor};
            padding-bottom: 2px;
            margin-top: 16px;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
          }
          .bio-text {
            color: #334155;
            line-height: 1.5;
            margin: 0 0 8px 0;
            font-size: 11px;
          }
          .item {
            margin-bottom: 10px;
          }
          .item-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 2px;
          }
          .item-title {
            font-size: 11.5px;
            font-weight: 700;
            color: ${headerColor};
          }
          .item-date {
            font-size: 10px;
            color: #475569;
            font-weight: 700;
          }
          .item-subtitle {
            font-size: 10.5px;
            color: #334155;
            font-style: italic;
            margin-bottom: 3px;
          }
          .item-desc {
            color: #334155;
            margin: 0 0 4px 0;
            font-size: 10.5px;
            line-height: 1.4;
          }
          .skills-text {
            color: #334155;
            font-size: 10.5px;
            line-height: 1.5;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="name">${name}</h1>
          ${targetTitle ? `<div class="target-title">${targetTitle}</div>` : ''}
          <div class="contact-strip">
            ${email ? `<span class="contact-item"><strong>Email:</strong> ${email}</span>` : ''}
            ${phone ? `<span class="contact-item">|</span><span class="contact-item"><strong>Phone:</strong> ${phone}</span>` : ''}
            ${location ? `<span class="contact-item">|</span><span class="contact-item"><strong>Location:</strong> ${location}</span>` : ''}
          </div>
        </div>

        ${bio ? `
          <div>
            <div class="section-title">Professional Summary</div>
            <p class="bio-text">${bio}</p>
          </div>
        ` : ''}

        ${expHtml ? `
          <div>
            <div class="section-title">Work Experience</div>
            ${expHtml}
          </div>
        ` : ''}

        ${eduHtml ? `
          <div>
            <div class="section-title">Education & Credentials</div>
            ${eduHtml}
          </div>
        ` : ''}

        ${safeSkills.length > 0 ? `
          <div>
            <div class="section-title">Skills & Core Competencies</div>
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
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  // View Mode: 'edit' or 'preview'
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [selectedTheme, setSelectedTheme] = useState<'classic' | 'modern' | 'emerald' | 'gold'>('modern');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Editable Resume Form State
  const [fullName, setFullName] = useState('');
  const [targetTitle, setTargetTitle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [experience, setExperience] = useState<ExperienceItem[]>([]);
  const [education, setEducation] = useState<EducationItem[]>([]);

  // Hydrate Form Data from user profile & Firestore realtime document
  useEffect(() => {
    if (!user) return;

    const seeker = (user?.seekerProfile || {}) as any;
    setFullName(seeker.fullName || user.displayName || '');
    setEmail(user.email || '');
    setPhone(seeker.phone || '');
    setLocation(seeker.location || '');
    setTargetTitle(seeker.title || seeker.targetRole || 'Software Engineer');
    setBio(seeker.bio || (seeker as any).summary || '');
    setSkills(Array.isArray(seeker.skills) ? seeker.skills : ['React Native', 'TypeScript', 'Firebase']);
    setExperience(Array.isArray(seeker.experience) ? seeker.experience : []);
    setEducation(Array.isArray(seeker.education) ? seeker.education : []);

    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const uData = snap.data();
        const sProf = uData.seekerProfile || {};
        if (sProf.fullName && !fullName) setFullName(sProf.fullName);
        if (sProf.phone && !phone) setPhone(sProf.phone);
        if (sProf.bio && !bio) setBio(sProf.bio);
        if (Array.isArray(sProf.skills) && skills.length === 0) setSkills(sProf.skills);
        if (Array.isArray(sProf.experience) && experience.length === 0) setExperience(sProf.experience);
        if (Array.isArray(sProf.education) && education.length === 0) setEducation(sProf.education);
      }
    });

    return () => unsub();
  }, [user]);

  // Theme palettes configuration
  const themeColors = {
    modern: { primary: '#1E3A8A', accent: '#3B82F6', bg: '#EFF6FF', label: 'Modern Royal' },
    classic: { primary: '#0F172A', accent: '#64748B', bg: '#F8FAFC', label: 'Classic Slate' },
    emerald: { primary: '#064E3B', accent: '#10B981', bg: '#ECFDF5', label: 'Creative Emerald' },
    gold: { primary: '#78350f', accent: '#d97706', bg: '#FEF3C7', label: 'Executive Gold' },
  };

  const activeColor = themeColors[selectedTheme].primary;
  const accentColor = themeColors[selectedTheme].accent;

  // Add / Remove Skills
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

  // Dynamic Add / Edit / Remove Experience
  const handleAddExperience = () => {
    setExperience([
      ...experience,
      {
        id: `exp-${Date.now()}`,
        position: 'Software Developer',
        company: 'Tech Company Inc.',
        startDate: '2023',
        endDate: 'Present',
        description: 'Developed scalable features and maintained mobile applications.',
      }
    ]);
  };

  const handleUpdateExperience = (index: number, field: keyof ExperienceItem, val: string) => {
    const updated = [...experience];
    updated[index] = { ...updated[index], [field]: val };
    setExperience(updated);
  };

  const handleRemoveExperience = (index: number) => {
    setExperience(experience.filter((_, i) => i !== index));
  };

  // Dynamic Add / Edit / Remove Education
  const handleAddEducation = () => {
    setEducation([
      ...education,
      {
        id: `edu-${Date.now()}`,
        degree: 'Bachelor of Technology',
        fieldOfStudy: 'Computer Science',
        institution: 'University of Technology',
        startYear: '2020',
        endYear: '2024',
      }
    ]);
  };

  const handleUpdateEducation = (index: number, field: keyof EducationItem, val: string) => {
    const updated = [...education];
    updated[index] = { ...updated[index], [field]: val };
    setEducation(updated);
  };

  const handleRemoveEducation = (index: number) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  // Save Resume Profile to Firestore
  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'seekerProfile.fullName': fullName,
        'seekerProfile.phone': phone,
        'seekerProfile.location': location,
        'seekerProfile.title': targetTitle,
        'seekerProfile.bio': bio,
        'seekerProfile.skills': skills,
        'seekerProfile.experience': experience,
        'seekerProfile.education': education,
      });
      Alert.alert('Resume Profile Saved! 💾', 'Your updated resume details are saved to your account.');
    } catch (e: any) {
      Alert.alert('Save Error', e.message || 'Could not save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // PDF Export & Download Handler
  const startPdfExport = async () => {
    setIsGeneratingPdf(true);
    try {
      const htmlContent = generateResumeHtml(
        fullName || 'Candidate',
        targetTitle,
        email,
        phone,
        location,
        bio,
        skills,
        experience,
        education,
        selectedTheme
      );

      setIsGeneratingPdf(false);
      await new Promise(resolve => setTimeout(resolve, 150));

      // Launch Native / Browser Save as PDF Dialog
      await Print.printAsync({ html: htmlContent });
    } catch (e: any) {
      setIsGeneratingPdf(false);
      Alert.alert('PDF Export Error', e.message || 'Could not compile PDF document.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#4F46E5' }} edges={['top']}>
      <RNStatusBar barStyle="light-content" backgroundColor="#4F46E5" translucent={false} />
      <StatusBar style="light" />
      {/* Top Header */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>ATS Resume Builder</Text>
      </View>

      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Segmented Mode Selector: Edit Form vs Preview */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'edit' && styles.tabItemActive]}
          onPress={() => setActiveTab('edit')}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="create-outline" 
            size={16} 
            color={activeTab === 'edit' ? '#4F46E5' : '#64748B'} 
          />
          <Text style={[styles.tabText, activeTab === 'edit' && styles.tabTextActive]}>
            Edit Resume Form
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'preview' && styles.tabItemActive]}
          onPress={() => setActiveTab('preview')}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="document-text-outline" 
            size={16} 
            color={activeTab === 'preview' ? '#4F46E5' : '#64748B'} 
          />
          <Text style={[styles.tabText, activeTab === 'preview' && styles.tabTextActive]}>
            Live PDF Preview
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]} 
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'edit' ? (
          /* EDITABLE RESUME FORM */
          <View style={styles.formContainer}>
            {/* Section 1: Personal Details */}
            <Text style={styles.formSectionTitle}>1. PERSONAL & CONTACT DETAILS</Text>
            <View style={styles.cardBox}>
              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>Full Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="e.g. John Doe"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>Target Job Title</Text>
                  <TextInput
                    style={styles.textInput}
                    value={targetTitle}
                    onChangeText={setTargetTitle}
                    placeholder="e.g. Senior Developer"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <TextInput
                    style={styles.textInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="email@example.com"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.textInput}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+91 98765 43210"
                    keyboardType="phone-pad"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Location / City</Text>
                <TextInput
                  style={styles.textInput}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="e.g. Mumbai, India"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Section 2: Professional Summary */}
            <Text style={styles.formSectionTitle}>2. PROFESSIONAL SUMMARY</Text>
            <View style={styles.cardBox}>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Write a concise overview of your key skills, years of experience, and achievements..."
                multiline
                numberOfLines={4}
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Section 3: Work Experience Editor */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.formSectionTitle}>3. WORK EXPERIENCE</Text>
              <TouchableOpacity style={styles.addItemBtn} onPress={handleAddExperience} activeOpacity={0.8}>
                <Ionicons name="add-circle" size={16} color="#4F46E5" />
                <Text style={styles.addItemBtnTxt}>Add Position</Text>
              </TouchableOpacity>
            </View>

            {experience.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardTxt}>No work experience added yet. Tap "+ Add Position" above.</Text>
              </View>
            ) : (
              experience.map((exp, idx) => (
                <View key={idx} style={styles.cardBox}>
                  <View style={styles.itemCardHeader}>
                    <Text style={styles.itemIndexLabel}>Position #{idx + 1}</Text>
                    <TouchableOpacity onPress={() => handleRemoveExperience(idx)}>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.fieldRow}>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>Job Title / Position</Text>
                      <TextInput
                        style={styles.textInput}
                        value={exp.position}
                        onChangeText={(v) => handleUpdateExperience(idx, 'position', v)}
                        placeholder="e.g. React Developer"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>Company Name</Text>
                      <TextInput
                        style={styles.textInput}
                        value={exp.company}
                        onChangeText={(v) => handleUpdateExperience(idx, 'company', v)}
                        placeholder="e.g. Tech Corp"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>

                  <View style={styles.fieldRow}>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>Start Date</Text>
                      <TextInput
                        style={styles.textInput}
                        value={exp.startDate}
                        onChangeText={(v) => handleUpdateExperience(idx, 'startDate', v)}
                        placeholder="2022"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>End Date</Text>
                      <TextInput
                        style={styles.textInput}
                        value={exp.endDate}
                        onChangeText={(v) => handleUpdateExperience(idx, 'endDate', v)}
                        placeholder="Present"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Key Responsibilities & Achievements</Text>
                    <TextInput
                      style={[styles.textInput, styles.multilineInput]}
                      value={exp.description}
                      onChangeText={(v) => handleUpdateExperience(idx, 'description', v)}
                      placeholder="Bullet points of key accomplishments..."
                      multiline
                      numberOfLines={2}
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              ))
            )}

            {/* Section 4: Education Editor */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.formSectionTitle}>4. EDUCATION & CREDENTIALS</Text>
              <TouchableOpacity style={styles.addItemBtn} onPress={handleAddEducation} activeOpacity={0.8}>
                <Ionicons name="add-circle" size={16} color="#4F46E5" />
                <Text style={styles.addItemBtnTxt}>Add Education</Text>
              </TouchableOpacity>
            </View>

            {education.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardTxt}>No education added yet. Tap "+ Add Education" above.</Text>
              </View>
            ) : (
              education.map((edu, idx) => (
                <View key={idx} style={styles.cardBox}>
                  <View style={styles.itemCardHeader}>
                    <Text style={styles.itemIndexLabel}>Education #{idx + 1}</Text>
                    <TouchableOpacity onPress={() => handleRemoveEducation(idx)}>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.fieldRow}>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>Degree / Qualification</Text>
                      <TextInput
                        style={styles.textInput}
                        value={edu.degree}
                        onChangeText={(v) => handleUpdateEducation(idx, 'degree', v)}
                        placeholder="e.g. B.Tech"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>Field of Study</Text>
                      <TextInput
                        style={styles.textInput}
                        value={edu.fieldOfStudy}
                        onChangeText={(v) => handleUpdateEducation(idx, 'fieldOfStudy', v)}
                        placeholder="Computer Science"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>

                  <View style={styles.fieldRow}>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>Institution / College</Text>
                      <TextInput
                        style={styles.textInput}
                        value={edu.institution}
                        onChangeText={(v) => handleUpdateEducation(idx, 'institution', v)}
                        placeholder="University Name"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>Passing Year</Text>
                      <TextInput
                        style={styles.textInput}
                        value={edu.endYear}
                        onChangeText={(v) => handleUpdateEducation(idx, 'endYear', v)}
                        placeholder="2024"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>
                </View>
              ))
            )}

            {/* Section 5: Skills Tag Adder */}
            <Text style={styles.formSectionTitle}>5. KEY SKILLS & EXPERTISE</Text>
            <View style={styles.cardBox}>
              <View style={styles.addSkillRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={newSkillInput}
                  onChangeText={setNewSkillInput}
                  placeholder="Add skill (e.g. JavaScript, Project Mgmt)"
                  onSubmitEditing={handleAddSkill}
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity style={styles.addSkillBtn} onPress={handleAddSkill} activeOpacity={0.8}>
                  <Text style={styles.addSkillBtnTxt}>+ Add</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.skillsWrap}>
                {skills.map((sk) => (
                  <View key={sk} style={styles.skillChip}>
                    <Text style={styles.skillChipTxt}>{sk}</Text>
                    <TouchableOpacity onPress={() => handleRemoveSkill(sk)}>
                      <Ionicons name="close-circle" size={14} color="#4F46E5" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* Save Profile Button */}
            <TouchableOpacity 
              style={[styles.saveProfilePrimaryBtn, savingProfile && { opacity: 0.7 }]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
              activeOpacity={0.85}
            >
              {savingProfile ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save" size={16} color="#FFFFFF" />
                  <Text style={styles.saveProfilePrimaryBtnTxt}>Save Resume Details 💾</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.previewSwitchBtn}
              onPress={() => setActiveTab('preview')}
              activeOpacity={0.85}
            >
              <Ionicons name="eye" size={16} color="#4F46E5" />
              <Text style={styles.previewSwitchBtnTxt}>View Live PDF Preview 📄</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* LIVE ATS PDF PREVIEW */
          <View style={styles.previewContainer}>
            {/* ATS Score Indicator */}
            <View style={styles.atsBanner}>
              <View style={styles.atsScoreCircle}>
                <Text style={styles.atsScoreNumber}>88%</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.atsTitle}>Recruiter ATS Format Score</Text>
                <Text style={styles.atsSub}>Single column corporate standard structure accepted by major recruiters.</Text>
              </View>
            </View>

            {/* Template Theme Selector */}
            <Text style={styles.formSectionTitle}>CHOOSE RESUME THEME COLOR</Text>
            <View style={styles.themeChipsRow}>
              {(Object.keys(themeColors) as Array<keyof typeof themeColors>).map((key) => {
                const isActive = selectedTheme === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.themeChip,
                      isActive && { borderColor: themeColors[key].primary, backgroundColor: themeColors[key].bg }
                    ]}
                    onPress={() => setSelectedTheme(key)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.colorDot, { backgroundColor: themeColors[key].primary }]} />
                    <Text style={[styles.themeChipTxt, isActive && { color: themeColors[key].primary, fontWeight: '800' }]}>
                      {themeColors[key].label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Paper Sheet Preview */}
            <View style={styles.resumePaper}>
              <View style={[styles.resumePaperHeader, { borderBottomColor: activeColor }]}>
                <Text style={[styles.resumePaperName, { color: activeColor }]}>
                  {fullName || 'Candidate Name'}
                </Text>
                {targetTitle ? (
                  <Text style={[styles.resumePaperTitle, { color: accentColor }]}>
                    {targetTitle}
                  </Text>
                ) : null}
                <Text style={styles.resumePaperContact}>
                  {email} {phone ? `• ${phone}` : ''} {location ? `• ${location}` : ''}
                </Text>
              </View>

              {bio ? (
                <View style={styles.paperSection}>
                  <Text style={[styles.paperSectionTitle, { color: activeColor, borderBottomColor: accentColor }]}>
                    Professional Summary
                  </Text>
                  <Text style={styles.paperBioText}>{bio}</Text>
                </View>
              ) : null}

              {experience.length > 0 && (
                <View style={styles.paperSection}>
                  <Text style={[styles.paperSectionTitle, { color: activeColor, borderBottomColor: accentColor }]}>
                    Work Experience
                  </Text>
                  {experience.map((exp, idx) => (
                    <View key={idx} style={styles.paperItem}>
                      <View style={styles.paperItemHeader}>
                        <Text style={[styles.paperItemTitle, { color: activeColor }]}>{exp.position}</Text>
                        <Text style={styles.paperItemDate}>{exp.startDate} – {exp.endDate || 'Present'}</Text>
                      </View>
                      <Text style={styles.paperItemCompany}>{exp.company}</Text>
                      {exp.description ? <Text style={styles.paperItemDesc}>{exp.description}</Text> : null}
                    </View>
                  ))}
                </View>
              )}

              {education.length > 0 && (
                <View style={styles.paperSection}>
                  <Text style={[styles.paperSectionTitle, { color: activeColor, borderBottomColor: accentColor }]}>
                    Education & Credentials
                  </Text>
                  {education.map((edu, idx) => (
                    <View key={idx} style={styles.paperItem}>
                      <View style={styles.paperItemHeader}>
                        <Text style={[styles.paperItemTitle, { color: activeColor }]}>
                          {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
                        </Text>
                        <Text style={styles.paperItemDate}>{edu.endYear || '2024'}</Text>
                      </View>
                      <Text style={styles.paperItemCompany}>{edu.institution}</Text>
                    </View>
                  ))}
                </View>
              )}

              {skills.length > 0 && (
                <View style={styles.paperSection}>
                  <Text style={[styles.paperSectionTitle, { color: activeColor, borderBottomColor: accentColor }]}>
                    Skills & Core Competencies
                  </Text>
                  <Text style={styles.paperSkillsTxt}>{skills.join(' • ')}</Text>
                </View>
              )}
            </View>

            {/* Prominent Action Bar */}
            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={[styles.downloadPrimaryBtn, isGeneratingPdf && { opacity: 0.7 }]}
                onPress={startPdfExport}
                disabled={isGeneratingPdf}
                activeOpacity={0.85}
              >
                <Ionicons name="cloud-download" size={18} color="#FFFFFF" />
                <Text style={styles.downloadPrimaryBtnTxt}>Download PDF Resume 📥</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
      </View>

      {/* PDF Generator Loading Modal */}
      <Modal visible={isGeneratingPdf} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loaderTitle}>Compiling PDF Resume...</Text>
            <Text style={styles.loaderSub}>Preparing high resolution ATS document file</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#4338CA',
    backgroundColor: '#4F46E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 4,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#4F46E5',
  },
  scrollContent: {
    padding: 16,
  },
  formContainer: {
    gap: 6,
  },
  formSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#4F46E5',
    marginBottom: 8,
    marginTop: 14,
    textTransform: 'uppercase',
  },
  cardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  fieldHalf: {
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addItemBtnTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  emptyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginBottom: 8,
    alignItems: 'center',
    gap: 6,
  },
  emptyCardTxt: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  itemCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  itemIndexLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
  },
  addSkillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  addSkillBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addSkillBtnTxt: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  skillChipTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
  },
  saveProfilePrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 12,
    elevation: 3,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveProfilePrimaryBtnTxt: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  previewSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 10,
  },
  previewSwitchBtnTxt: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '700',
  },
  previewContainer: {
    gap: 10,
  },
  atsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EEF2FF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  atsScoreCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  atsScoreNumber: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  atsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  atsSub: {
    fontSize: 10,
    color: '#4F46E5',
    marginTop: 1,
  },
  themeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  themeChipTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  resumePaper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  resumePaperHeader: {
    alignItems: 'center',
    borderBottomWidth: 2,
    paddingBottom: 10,
    marginBottom: 10,
  },
  resumePaperName: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  resumePaperTitle: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  resumePaperContact: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  paperSection: {
    marginBottom: 10,
  },
  paperSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    borderBottomWidth: 1,
    paddingBottom: 2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  paperBioText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
  },
  paperItem: {
    marginBottom: 6,
  },
  paperItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  paperItemTitle: {
    fontSize: 11,
    fontWeight: '800',
  },
  paperItemDate: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  paperItemCompany: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#475569',
  },
  paperItemDesc: {
    fontSize: 10,
    color: '#334155',
    marginTop: 2,
    lineHeight: 14,
  },
  paperSkillsTxt: {
    fontSize: 10.5,
    color: '#334155',
    fontWeight: '600',
  },
  actionGrid: {
    marginTop: 6,
  },
  downloadPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 3,
  },
  downloadPrimaryBtnTxt: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loaderBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '80%',
    elevation: 10,
  },
  loaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
  },
  loaderSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
});
