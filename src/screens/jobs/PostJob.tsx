import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  TextInput,
  Switch
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/useAuth';
import { jobService } from '@/services/jobs/jobService';
import { db } from '@/services/firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface PostJobProps {
  onBack: () => void;
  onSuccess: () => void;
  editingJobId?: string;
}

const JOB_TYPES = [
  { label: 'Full-time / पूर्ण वेळ', value: 'Full-time' },
  { label: 'Part-time / अर्धवेळ', value: 'Part-time' },
  { label: 'Contract / कंत्राटी', value: 'Contract' },
  { label: 'Internship / इंटर्नशिप', value: 'Internship' }
] as const;

const EXP_LEVELS = [
  { label: 'Entry Level / नवशिक्या', value: 'Entry Level' },
  { label: 'Mid Level / मध्यम स्तर', value: 'Mid Level' },
  { label: 'Senior Level / वरिष्ठ स्तर', value: 'Senior Level' }
] as const;

const GENDERS = [
  { label: 'Both / दोघेही', value: 'both' },
  { label: 'Male Only / फक्त पुरुष', value: 'male' },
  { label: 'Female Only / फक्त महिला', value: 'female' }
] as const;

const WORK_MODES = [
  { label: 'Work From Office / ऑफिस मधून काम', value: 'Work From Office' },
  { label: 'Work From Home / घरातून काम', value: 'Work From Home' },
  { label: 'In Field / फील्डवर काम', value: 'In Field' }
] as const;

export const PostJob: React.FC<PostJobProps> = ({
  onBack,
  onSuccess,
  editingJobId,
}) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // --- Step 1: Job Details ---
  const [title, setTitle] = useState('');
  const [industry, setIndustry] = useState('');
  const [jobType, setJobType] = useState('Full-time');
  const [workMode, setWorkMode] = useState('Work From Office');
  const [expLevel, setExpLevel] = useState('Entry Level');
  const [experienceRequired, setExperienceRequired] = useState('');
  const [gender, setGender] = useState('both');
  const [department, setDepartment] = useState('');

  // --- Step 2: Location & Pay ---
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [remote, setRemote] = useState(false);
  const [hybrid, setHybrid] = useState(false);
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [salaryPeriod, setSalaryPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [negotiable, setNegotiable] = useState(false);

  // --- Step 3: Skills & Benefits ---
  const [skillsInput, setSkillsInput] = useState('');
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [prefSkillsInput, setPrefSkillsInput] = useState('');
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [benefitInput, setBenefitInput] = useState('');
  const [benefits, setBenefits] = useState<string[]>([]);
  const [reqInput, setReqInput] = useState('');
  const [requirements, setRequirements] = useState<string[]>([]);

  // --- Step 4: Description & Settings ---
  const [description, setDescription] = useState('');
  const [applicationInstructions, setApplicationInstructions] = useState('');
  const [applicationDeadline, setApplicationDeadline] = useState('');
  const [featured, setFeatured] = useState(false);
  const [urgent, setUrgent] = useState(false);

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch company profile on mount
  const hasLoadedCompanyRef = useRef(false);
  useEffect(() => {
    if (!user || hasLoadedCompanyRef.current) return;
    const loadCompanyData = async () => {
      try {
        const compRef = doc(db, 'companies', user.uid);
        const compSnap = await getDoc(compRef);
        if (compSnap.exists()) {
          const data = compSnap.data();
          if (data.industry && !industry) setIndustry(data.industry);
          if (data.city && !city) setCity(data.city);
          if (data.state && !state) setState(data.state);
        } else if (user.recruiterProfile) {
          if (user.recruiterProfile.industry && !industry) setIndustry(user.recruiterProfile.industry);
        }
        hasLoadedCompanyRef.current = true;
      } catch (err) {
        console.warn('Could not auto-fill company data:', err);
      }
    };
    loadCompanyData();
  }, [user, industry, city, state]);

  // Load existing job details for editing
  useEffect(() => {
    const loadJobDetails = async () => {
      if (!editingJobId) return;
      setLoading(true);
      try {
        const job = await jobService.getJobById(editingJobId);
        if (job) {
          setTitle(job.title || '');
          let minSal = '';
          let maxSal = '';
          let salPeriod: 'monthly' | 'yearly' = 'monthly';
          if (job.salaryRange && job.salaryRange.includes(' - ')) {
            const parts = job.salaryRange.split(' - ');
            minSal = parts[0].replace('₹', '').trim();
            if (parts[1].includes(' (')) {
              const subParts = parts[1].split(' (');
              maxSal = subParts[0].replace('₹', '').trim();
              salPeriod = subParts[1].replace(')', '').trim() === 'yearly' ? 'yearly' : 'monthly';
            } else {
              maxSal = parts[1].replace('₹', '').trim();
            }
          }
          setSalaryMin(minSal);
          setSalaryMax(maxSal);
          setSalaryPeriod(salPeriod);
          setNegotiable(job.salaryRange === 'Salary Negotiable');

          if (job.location && job.location.includes(', ')) {
            const locParts = job.location.split(', ');
            setCity(locParts[0].trim());
            setState(locParts[1].trim());
          } else {
            setCity(job.location || '');
          }

          setJobType(job.type || 'Full-time');
          setExpLevel(job.experienceLevel || 'Entry Level');
          setDescription(job.description || '');
          setRequirements(job.requirements || []);
          
          if ((job as any).experienceRequired) setExperienceRequired((job as any).experienceRequired);
          if ((job as any).gender) setGender((job as any).gender);
          if ((job as any).department) setDepartment((job as any).department);
          if ((job as any).industry) setIndustry((job as any).industry);
          if ((job as any).locationDetails) {
            const det = (job as any).locationDetails;
            if (det.country) setCountry(det.country);
            if (det.remote !== undefined) setRemote(det.remote);
            if (det.hybrid !== undefined) setHybrid(det.hybrid);
          }
          if ((job as any).preferredSkills) setPreferredSkills((job as any).preferredSkills);
          if ((job as any).benefits) setBenefits((job as any).benefits);
          if ((job as any).applicationInstructions) setApplicationInstructions((job as any).applicationInstructions);
          if ((job as any).applicationDeadline) setApplicationDeadline((job as any).applicationDeadline);
          if ((job as any).featured !== undefined) setFeatured((job as any).featured);
          if ((job as any).urgent !== undefined) setUrgent((job as any).urgent);
        }
      } catch (err) {
        console.warn('Failed to load editing job details:', err);
      } finally {
        setLoading(false);
      }
    };
    loadJobDetails();
  }, [editingJobId]);

  // Draft auto-save and recovery
  // Draft auto-save and recovery
  const getDraftKey = useCallback(() => `postJobDraft_${user?.uid || 'guest'}`, [user?.uid]);

  useEffect(() => {
    const restoreDraft = async () => {
      try {
        const draftStr = await AsyncStorage.getItem(getDraftKey());
        if (draftStr) {
          const draft = JSON.parse(draftStr);
          Alert.alert(
            '📋 Draft Found',
            'Would you like to restore your previous job posting draft?',
            [
              { text: 'Discard', style: 'destructive', onPress: () => AsyncStorage.removeItem(getDraftKey()) },
              {
                text: 'Restore',
                onPress: () => {
                  setTitle(draft.title || '');
                  setIndustry(draft.industry || '');
                  setJobType(draft.jobType || 'Full-time');
                  setWorkMode(draft.workMode || 'Work From Office');
                  setExpLevel(draft.expLevel || 'Entry Level');
                  setExperienceRequired(draft.experienceRequired || '');
                  setGender(draft.gender || 'both');
                  setDepartment(draft.department || '');
                  setCity(draft.city || '');
                  setState(draft.state || '');
                  setCountry(draft.country || 'India');
                  setRemote(draft.remote || false);
                  setHybrid(draft.hybrid || false);
                  setSalaryMin(draft.salaryMin || '');
                  setSalaryMax(draft.salaryMax || '');
                  setSalaryPeriod(draft.salaryPeriod || 'monthly');
                  setNegotiable(draft.negotiable || false);
                  setRequiredSkills(draft.requiredSkills || []);
                  setPreferredSkills(draft.preferredSkills || []);
                  setBenefits(draft.benefits || []);
                  setRequirements(draft.requirements || []);
                  setDescription(draft.description || '');
                  setApplicationInstructions(draft.applicationInstructions || '');
                  setApplicationDeadline(draft.applicationDeadline || '');
                  setFeatured(draft.featured || false);
                  setUrgent(draft.urgent || false);
                }
              }
            ]
          );
        }
      } catch (err) {
        console.warn('Could not restore draft:', err);
      }
    };
    restoreDraft();
  }, [user, getDraftKey]);

  const saveDraft = useCallback(async () => {
    try {
      const draft = {
        title, industry, jobType, workMode, expLevel, experienceRequired, gender, department,
        city, state, country, remote, hybrid, salaryMin, salaryMax, salaryPeriod, negotiable,
        requiredSkills, preferredSkills, benefits, requirements, description,
        applicationInstructions, applicationDeadline, featured, urgent
      };
      await AsyncStorage.setItem(getDraftKey(), JSON.stringify(draft));
    } catch (err) {
      console.warn('Could not save draft:', err);
    }
  }, [
    title, industry, jobType, workMode, expLevel, experienceRequired, gender, department,
    city, state, country, remote, hybrid, salaryMin, salaryMax, salaryPeriod, negotiable,
    requiredSkills, preferredSkills, benefits, requirements, description,
    applicationInstructions, applicationDeadline, featured, urgent, getDraftKey
  ]);

  useEffect(() => {
    saveDraft();
  }, [saveDraft]);

  // Validation
  const validateStep = (stepNum: number) => {
    const stepErrors: Record<string, string> = {};
    let isValid = true;

    if (stepNum === 1) {
      if (!title.trim()) {
        stepErrors.title = 'Job Title is required / नोकरीचे शीर्षक आवश्यक आहे';
        isValid = false;
      }
      if (!industry.trim()) {
        stepErrors.industry = 'Industry is required / उद्योग आवश्यक आहे';
        isValid = false;
      }
      if (!experienceRequired.trim()) {
        stepErrors.experienceRequired = 'Experience Required is required / आवश्यक अनुभव आवश्यक आहे';
        isValid = false;
      }
    }

    if (stepNum === 2) {
      if (!city.trim()) {
        stepErrors.city = 'City is required / शहर आवश्यक आहे';
        isValid = false;
      }
      if (!state.trim()) {
        stepErrors.state = 'State is required / राज्य आवश्यक आहे';
        isValid = false;
      }
    }

    if (stepNum === 4) {
      if (!description.trim()) {
        stepErrors.description = 'Description is required / नोकरीचे वर्णन आवश्यक आहे';
        isValid = false;
      }
    }

    setErrors(stepErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => prev - 1);
  };

  // AI Auto-Generator Template
  const handleGenerateDescription = () => {
    if (!title.trim() || !industry.trim()) {
      Alert.alert('Details Missing', 'Please enter a Job Title and Industry in Step 1 to generate description.');
      return;
    }
    const generated = `🚀 **${title} Position**

**About the Company:**
We are a leading firm in the ${industry} industry, seeking a highly motivated and skilled ${title} to join our growing team.

---

## 🎯 **Key Responsibilities**
• Collaborate with cross-functional teams to deliver high quality results.
• Handle day-to-day operations and task management in the ${department || industry} department.
• Drive quality benchmarks and performance standards.

---

## 🎓 **Required Qualifications & Skills**
• Required Experience: ${experienceRequired || 'Freshers / Experienced'}
• Core Competencies: ${requiredSkills.join(', ') || 'Industry standard tools'}
${preferredSkills.length > 0 ? `• Preferred Skills: ${preferredSkills.join(', ')}\n` : ''}
---

## 🎁 **What We Offer**
• Salary Package: ${salaryMin ? `₹${salaryMin}` : 'Competitive'} ${salaryMax ? `- ₹${salaryMax}` : ''} (${salaryPeriod})
• Job Mode: ${workMode} (${jobType})
${benefits.length > 0 ? `• Added Benefits: ${benefits.join(', ')}\n` : ''}
*We are an equal opportunity employer and welcome candidates from all backgrounds.*`;
    setDescription(generated);
    Alert.alert('AI Success', 'Job Description auto-generated successfully!');
  };

  const handlePublish = async () => {
    if (!user) return;
    if (!validateStep(4)) return;

    setLoading(true);
    try {
      const subRef = doc(db, 'subscriptions', user.uid);
      let subData: any = null;
      let jobPostingsUsed = 0;
      let maxJobPostings = 0;

      // Subscription check only when posting a NEW job
      if (!editingJobId) {
        const subSnap = await getDoc(subRef);
        if (!subSnap.exists()) {
          Alert.alert('Subscription Required', 'You must have an active subscription package to post a job.');
          setLoading(false);
          return;
        }
        subData = subSnap.data();
        if (subData?.status !== 'active') {
          Alert.alert('Subscription Expired', 'Your subscription is expired or inactive. Please renew to post.');
          setLoading(false);
          return;
        }
        maxJobPostings = subData?.maxJobPostings || 0;
        const usage = subData?.usageStats || {};
        jobPostingsUsed = usage?.jobPostingsUsed || 0;

        if (jobPostingsUsed >= maxJobPostings) {
          Alert.alert('Limit Reached', `You have reached the limit of ${maxJobPostings} job postings in your active plan.`);
          setLoading(false);
          return;
        }
      }

      // Fetch company profile to bind correctly
      const compRef = doc(db, 'companies', user.uid);
      const compSnap = await getDoc(compRef);
      let companyNameVal = user.displayName || 'Employer';
      let logoUrlVal = '';

      if (compSnap.exists()) {
        const data = compSnap.data();
        companyNameVal = data.name || data.companyName || companyNameVal;
        logoUrlVal = data.logoUrl || data.logo || '';
      } else if (user.recruiterProfile) {
        companyNameVal = user.recruiterProfile.companyName || companyNameVal;
      }

      const cleanedData = {
        title: title.trim(),
        company: companyNameVal,
        logoUrl: logoUrlVal || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=150&auto=format&fit=crop',
        location: `${city.trim()}, ${state.trim()}`,
        type: jobType as any,
        experienceLevel: expLevel as any,
        description: description.trim(),
        requirements: requirements.length > 0 ? requirements : ['No specific requirements listed.'],
        salaryRange: salaryMin ? `₹${salaryMin} - ₹${salaryMax} (${salaryPeriod})` : 'Salary Negotiable',
        experienceRequired,
        gender,
        department,
        industry,
        locationDetails: {
          city,
          state,
          country,
          remote,
          hybrid,
        },
        preferredSkills,
        benefits,
        applicationInstructions,
        applicationDeadline,
        featured,
        urgent,
      };

      if (editingJobId) {
        await jobService.updateJob(editingJobId, cleanedData);
      } else {
        await jobService.postJob({
          ...cleanedData,
          recruiterId: user.uid,
        });

        // Increment usage count in active subscription
        await updateDoc(subRef, {
          'usageStats.jobPostingsUsed': jobPostingsUsed + 1
        });
      }

      // Clear draft on successful creation/update
      await AsyncStorage.removeItem(getDraftKey());

      Alert.alert(
        editingJobId ? '🎉 Job Updated!' : '🎉 Job Published!',
        editingJobId 
          ? 'Your job listing has been successfully updated.' 
          : 'Your job listing has been successfully published to the platform.',
        [{ text: 'Great', onPress: onSuccess }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save the job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper arrays builders
  const addChip = (input: string, list: string[], setInput: (v: string) => void, setList: (l: string[]) => void) => {
    if (input.trim()) {
      setList([...list, input.trim()]);
      setInput('');
    }
  };

  const removeChip = (idx: number, list: string[], setList: (l: string[]) => void) => {
    setList(list.filter((_, i) => i !== idx));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onBack} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{currentStep === 4 ? 'Review & Publish' : 'Create Job Listing'}</Text>
        </View>

        {/* Stepper progress dots */}
        <View style={styles.stepperContainer}>
          {[1, 2, 3, 4].map(s => {
            const active = currentStep === s;
            const completed = currentStep > s;
            return (
              <View key={s} style={styles.stepIndicatorCol}>
                <View style={[
                  styles.stepBadge,
                  active && styles.stepBadgeActive,
                  completed && styles.stepBadgeCompleted
                ]}>
                  {completed ? (
                    <Ionicons name="checkmark" size={14} color="#ffffff" />
                  ) : (
                    <Text style={[styles.stepText, active && styles.stepTextActive]}>{s}</Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>
                  {s === 1 ? 'Details' : s === 2 ? 'Location' : s === 3 ? 'Skills' : 'Publish'}
                </Text>
              </View>
            );
          })}
        </View>

        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 30 + insets.bottom }]} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* STEP 1: JOB DETAILS */}
          {currentStep === 1 && (
            <View style={styles.stepCard}>
              <Text style={styles.stepTitle}>Step 1: Basic Information / मूलभूत माहिती</Text>
              
              <Text style={styles.fieldLabel}>Job Title / नोकरीचे शीर्षक *</Text>
              <TextInput
                style={[styles.textInput, errors.title && styles.errorInput]}
                value={title}
                onChangeText={(v) => { setTitle(v); setErrors({}); }}
                placeholder="e.g. Graphic Designer / Office Assistant"
                placeholderTextColor="#9CA3AF"
              />
              {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

              <Text style={styles.fieldLabel}>Industry Sector / उद्योग क्षेत्र *</Text>
              <TextInput
                style={[styles.textInput, errors.industry && styles.errorInput]}
                value={industry}
                onChangeText={(v) => { setIndustry(v); setErrors({}); }}
                placeholder="e.g. IT Services / Manufacturing / Retail"
                placeholderTextColor="#9CA3AF"
              />
              {errors.industry && <Text style={styles.errorText}>{errors.industry}</Text>}

              <Text style={styles.fieldLabel}>Department / विभाग (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={department}
                onChangeText={setDepartment}
                placeholder="e.g. Marketing / Human Resources"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.fieldLabel}>Job Type / नोकरीचा प्रकार</Text>
              <View style={styles.pillsRow}>
                {JOB_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.pill, jobType === t.value && styles.pillActive]}
                    onPress={() => setJobType(t.value)}
                  >
                    <Text style={[styles.pillText, jobType === t.value && styles.pillTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Work Mode / कार्य पद्धत</Text>
              <View style={styles.pillsRow}>
                {WORK_MODES.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.pill, workMode === m.value && styles.pillActive]}
                    onPress={() => setWorkMode(m.value)}
                  >
                    <Text style={[styles.pillText, workMode === m.value && styles.pillTextActive]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Experience Level / अनुभव स्तर</Text>
              <View style={styles.pillsRow}>
                {EXP_LEVELS.map((el) => (
                  <TouchableOpacity
                    key={el.value}
                    style={[styles.pill, expLevel === el.value && styles.pillActive]}
                    onPress={() => setExpLevel(el.value)}
                  >
                    <Text style={[styles.pillText, expLevel === el.value && styles.pillTextActive]}>{el.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Experience Required / आवश्यक अनुभव *</Text>
              <TextInput
                style={[styles.textInput, errors.experienceRequired && styles.errorInput]}
                value={experienceRequired}
                onChangeText={(v) => { setExperienceRequired(v); setErrors({}); }}
                placeholder="e.g. Freshers / 1 to 2 Years / 3+ Years"
                placeholderTextColor="#9CA3AF"
              />
              {errors.experienceRequired && <Text style={styles.errorText}>{errors.experienceRequired}</Text>}

              <Text style={styles.fieldLabel}>Gender Preference / लिंग प्राधान्य</Text>
              <View style={styles.pillsRow}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g.value}
                    style={[styles.pill, gender === g.value && styles.pillActive]}
                    onPress={() => setGender(g.value)}
                  >
                    <Text style={[styles.pillText, gender === g.value && styles.pillTextActive]}>{g.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* STEP 2: LOCATION & PAY */}
          {currentStep === 2 && (
            <View style={styles.stepCard}>
              <Text style={styles.stepTitle}>Step 2: Location & Pay / स्थान आणि वेतन</Text>

              <Text style={styles.fieldLabel}>City / शहर *</Text>
              <TextInput
                style={[styles.textInput, errors.city && styles.errorInput]}
                value={city}
                onChangeText={(v) => { setCity(v); setErrors({}); }}
                placeholder="e.g. Pune / Mumbai"
                placeholderTextColor="#9CA3AF"
              />
              {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}

              <Text style={styles.fieldLabel}>State / राज्य *</Text>
              <TextInput
                style={[styles.textInput, errors.state && styles.errorInput]}
                value={state}
                onChangeText={(v) => { setState(v); setErrors({}); }}
                placeholder="e.g. Maharashtra"
                placeholderTextColor="#9CA3AF"
              />
              {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}

              <Text style={styles.fieldLabel}>Country / देश</Text>
              <TextInput
                style={styles.textInput}
                value={country}
                onChangeText={setCountry}
                placeholder="India"
                placeholderTextColor="#9CA3AF"
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Remote / पूर्णपणे घरून काम</Text>
                <Switch value={remote} onValueChange={setRemote} trackColor={{ true: '#4F46E5' }} />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Hybrid / हायब्रिड काम</Text>
                <Switch value={hybrid} onValueChange={setHybrid} trackColor={{ true: '#4F46E5' }} />
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Monthly Salary Min / किमान पगार (₹)</Text>
              <TextInput
                style={styles.textInput}
                value={salaryMin}
                onChangeText={setSalaryMin}
                placeholder="e.g. 15000"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Monthly Salary Max / कमाल पगार (₹)</Text>
              <TextInput
                style={styles.textInput}
                value={salaryMax}
                onChangeText={setSalaryMax}
                placeholder="e.g. 25000"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Salary Negotiable / पगार बोलणीनुसार ठरेल</Text>
                <Switch value={negotiable} onValueChange={setNegotiable} trackColor={{ true: '#4F46E5' }} />
              </View>
            </View>
          )}

          {/* STEP 3: SKILLS & BENEFITS */}
          {currentStep === 3 && (
            <View style={styles.stepCard}>
              <Text style={styles.stepTitle}>Step 3: Skills & Requirements / कौशल्ये आणि पात्रता</Text>

              {/* Required Skills */}
              <Text style={styles.fieldLabel}>Required Skills / आवश्यक कौशल्ये</Text>
              <View style={styles.addReqRow}>
                <TextInput
                  style={styles.addReqInput}
                  value={skillsInput}
                  onChangeText={setSkillsInput}
                  placeholder="e.g. React / Typing / Sales"
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity 
                  style={styles.addReqButton} 
                  onPress={() => addChip(skillsInput, requiredSkills, setSkillsInput, setRequiredSkills)}
                >
                  <Ionicons name="add" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
              <View style={styles.chipsWrap}>
                {requiredSkills.map((sk, idx) => (
                  <View key={idx} style={styles.chip}>
                    <Text style={styles.chipText}>{sk}</Text>
                    <TouchableOpacity onPress={() => removeChip(idx, requiredSkills, setRequiredSkills)}>
                      <Ionicons name="close-circle" size={16} color="#4B5563" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Preferred Skills */}
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Preferred Skills / इतर कौशल्ये (Optional)</Text>
              <View style={styles.addReqRow}>
                <TextInput
                  style={styles.addReqInput}
                  value={prefSkillsInput}
                  onChangeText={setPrefSkillsInput}
                  placeholder="e.g. Communication / Photoshop"
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity 
                  style={styles.addReqButton} 
                  onPress={() => addChip(prefSkillsInput, preferredSkills, setPrefSkillsInput, setPreferredSkills)}
                >
                  <Ionicons name="add" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
              <View style={styles.chipsWrap}>
                {preferredSkills.map((sk, idx) => (
                  <View key={idx} style={[styles.chip, { backgroundColor: '#ECFDF5' }]}>
                    <Text style={[styles.chipText, { color: '#047857' }]}>{sk}</Text>
                    <TouchableOpacity onPress={() => removeChip(idx, preferredSkills, setPreferredSkills)}>
                      <Ionicons name="close-circle" size={16} color="#047857" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Benefits */}
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Benefits & Perks / नोकरीचे फायदे</Text>
              <View style={styles.addReqRow}>
                <TextInput
                  style={styles.addReqInput}
                  value={benefitInput}
                  onChangeText={setBenefitInput}
                  placeholder="e.g. Free Meals / Health Insurance"
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity 
                  style={styles.addReqButton} 
                  onPress={() => addChip(benefitInput, benefits, setBenefitInput, setBenefits)}
                >
                  <Ionicons name="add" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
              <View style={styles.chipsWrap}>
                {benefits.map((bn, idx) => (
                  <View key={idx} style={[styles.chip, { backgroundColor: '#FFF7ED' }]}>
                    <Text style={[styles.chipText, { color: '#C2410C' }]}>{bn}</Text>
                    <TouchableOpacity onPress={() => removeChip(idx, benefits, setBenefits)}>
                      <Ionicons name="close-circle" size={16} color="#C2410C" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Requirements List */}
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Requirements / इतर अटी व शर्ती</Text>
              <View style={styles.addReqRow}>
                <TextInput
                  style={styles.addReqInput}
                  value={reqInput}
                  onChangeText={setReqInput}
                  placeholder="e.g. Must have personal vehicle / २ वर्षाचा अनुभव"
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity 
                  style={styles.addReqButton} 
                  onPress={() => addChip(reqInput, requirements, setReqInput, setRequirements)}
                >
                  <Ionicons name="add" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
              {requirements.length > 0 && (
                <View style={styles.reqList}>
                  {requirements.map((req, idx) => (
                    <View key={idx} style={styles.reqItem}>
                      <Ionicons name="ellipse" size={6} color="#4F46E5" style={styles.bulletPoint} />
                      <Text style={styles.reqText}>{req}</Text>
                      <TouchableOpacity onPress={() => removeChip(idx, requirements, setRequirements)}>
                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* STEP 4: DESCRIPTION & SETTINGS */}
          {currentStep === 4 && (
            <View style={styles.stepCard}>
              <Text style={styles.stepTitle}>Step 4: Job Description & Summary / नोकरीचे वर्णन</Text>

              <View style={styles.aiHeader}>
                <Text style={styles.fieldLabel}>Job Description / नोकरीचे वर्णन *</Text>
                <TouchableOpacity style={styles.aiButton} onPress={handleGenerateDescription}>
                  <Ionicons name="sparkles" size={13} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text style={styles.aiBtnText}>AI Auto-Write / एआय लेखन</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.textInput, styles.textArea, errors.description && styles.errorInput]}
                value={description}
                onChangeText={(v) => { setDescription(v); setErrors({}); }}
                placeholder="Write a clear explanation of the role, responsibilities, and team context..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={8}
              />
              {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Application Instructions / अर्ज करण्याच्या सूचना</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={applicationInstructions}
                onChangeText={setApplicationInstructions}
                placeholder="e.g. Send resume on WhatsApp / कॉल करा"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.fieldLabel}>Deadline / अर्ज करण्याची शेवटची तारीख</Text>
              <TextInput
                style={styles.textInput}
                value={applicationDeadline}
                onChangeText={setApplicationDeadline}
                placeholder="YYYY-MM-DD (e.g. 2026-07-15)"
                placeholderTextColor="#9CA3AF"
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Featured Job / वैशिष्ट्यीकृत नोकरी</Text>
                <Switch value={featured} onValueChange={setFeatured} trackColor={{ true: '#4F46E5' }} />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Urgent Position / त्वरित भरती</Text>
                <Switch value={urgent} onValueChange={setUrgent} trackColor={{ true: '#4F46E5' }} />
              </View>
            </View>
          )}

          {/* Navigation Action Buttons */}
          <View style={styles.navigationRow}>
            {currentStep > 1 && (
              <TouchableOpacity 
                style={[styles.navBtn as any, styles.navBtnCancel as any]} 
                onPress={handlePrev}
                disabled={loading}
              >
                <Ionicons name="arrow-back" size={16} color="#4F46E5" style={{ marginRight: 6 }} />
                <Text style={styles.navBtnTextCancel as any}>Back</Text>
              </TouchableOpacity>
            )}

            {currentStep < 4 ? (
              <TouchableOpacity 
                style={[styles.navBtn as any, styles.navBtnNext as any]} 
                onPress={handleNext}
              >
                <Text style={styles.navBtnTextNext as any}>Next Step</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.navBtn as any, styles.navBtnNext as any, { backgroundColor: '#10B981' }]} 
                onPress={handlePublish}
                disabled={loading}
              >
                <Ionicons name="checkmark-circle" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.navBtnTextNext as any}>{loading ? 'Publishing...' : 'Publish Job Listing'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  keyboardContainer: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  iconButton: {
    paddingRight: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  stepIndicatorCol: {
    alignItems: 'center',
    flex: 1,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  stepBadgeCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  stepText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  stepTextActive: {
    color: '#4F46E5',
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepLabelActive: {
    color: '#4F46E5',
  },
  scrollContent: {
    padding: 16,
  },
  stepCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  textInput: {
    height: 46,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#1E293B',
  },
  textArea: {
    height: 100,
    paddingTop: 10,
    alignItems: 'flex-start',
  },
  errorInput: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  pillText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
  },
  addReqRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  addReqInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#1E293B',
  },
  addReqButton: {
    width: 42,
    height: 42,
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  reqList: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 6,
  },
  reqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  bulletPoint: {
    marginRight: 8,
  },
  reqText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  aiBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  navBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  navBtnCancel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  navBtnNext: {
    backgroundColor: '#4F46E5',
  },
  navBtnTextCancel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4F46E5',
  },
  navBtnTextNext: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});
