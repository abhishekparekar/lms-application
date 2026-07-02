import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  arrayUnion,
  query,
  where,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface Job {
  id: string;
  title: string;
  company: string;
  logoUrl: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  experienceLevel: 'Entry Level' | 'Mid Level' | 'Senior Level';
  description: string;
  requirements: string[];
  salaryRange: string;
  postedDate: string;
  applicantsCount: number;
  recruiterId: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  seekerId: string;
  appliedDate: string;
  status: 'pending' | 'reviewing' | 'interviewing' | 'accepted' | 'rejected';
  employerId?: string;
  // Candidate info (stored at apply-time, hydrated from users collection)
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateLocation?: string;
  candidateBio?: string;
  candidateSkills?: string[];
  candidateExpectedSalary?: string;
  candidateNoticePeriod?: string;
  resumeUrl?: string;
  // Web platform may use these alternative field names
  [key: string]: any;
}

const mockJobs: Job[] = [
  {
    id: 'job-1',
    title: 'Junior React Native Developer',
    company: 'Tech Solutions Inc.',
    logoUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=150&auto=format&fit=crop',
    location: 'Remote (US/Canada)',
    type: 'Full-time',
    experienceLevel: 'Entry Level',
    description: 'We are seeking a junior mobile developer to help build and maintain our mobile products. You will work closely with senior engineers to implement new features using React Native and Firebase.',
    requirements: [
      'Basic understanding of JavaScript / TypeScript',
      'Knowledge of React or React Native lifecycle',
      'Experience with CSS or styling systems (like Tailwind)',
      'Eager to learn and work in an Agile team'
    ],
    salaryRange: '$60,000 - $80,000',
    postedDate: '2026-06-20',
    applicantsCount: 14,
    recruiterId: 'recruiter-123',
  },
  {
    id: 'job-2',
    title: 'Senior Mobile Engineer (iOS & Android)',
    company: 'InnovateTech Corp',
    logoUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=150&auto=format&fit=crop',
    location: 'Hybrid (New York, NY)',
    type: 'Full-time',
    experienceLevel: 'Senior Level',
    description: 'Lead the development of our high-traffic flagship mobile application. Optimize app startup performance, implement complex reanimated transitions, and mentor junior developers.',
    requirements: [
      '5+ years of software development experience',
      '3+ years of building React Native apps in production',
      'Strong expertise in native iOS (Swift) or Android (Kotlin) bridge code',
      'Experience with performance profiling and memory management'
    ],
    salaryRange: '$140,000 - $170,000',
    postedDate: '2026-06-22',
    applicantsCount: 5,
    recruiterId: 'recruiter-123',
  },
  {
    id: 'job-3',
    title: 'Full Stack Intern',
    company: 'StartupLabs',
    logoUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=150&auto=format&fit=crop',
    location: 'Remote (Global)',
    type: 'Internship',
    experienceLevel: 'Entry Level',
    description: 'Join our fast-paced product squad. You will write code for our Node.js backends and build beautiful frontends in React. Perfect position for university students or boot camp grads looking for real experience.',
    requirements: [
      'Familiarity with Node.js and Express',
      'Familiarity with HTML, CSS, React',
      'Strong communication skills',
      'Self-starter who is comfortable with ambiguity'
    ],
    salaryRange: '$25 - $35 / hr',
    postedDate: '2026-06-23',
    applicantsCount: 22,
    recruiterId: 'mock-recruiter-id-2',
  }
];

const mockApplications: JobApplication[] = [
  {
    id: 'app-1',
    jobId: 'job-1',
    jobTitle: 'Junior React Native Developer',
    company: 'Tech Solutions Inc.',
    seekerId: 'seeker-123',
    appliedDate: '2026-06-21',
    status: 'reviewing',
  }
];

export const jobService = {
  /**
   * Get all jobs
   */
  async getJobs(): Promise<Job[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'jobs'));
      const jobs: Job[] = [];
      querySnapshot.forEach((docSnap) => {
        jobs.push({ id: docSnap.id, ...docSnap.data() } as Job);
      });
      return jobs.length > 0 ? jobs : mockJobs;
    } catch (e) {
      console.warn('Failed to fetch jobs from Firebase, falling back to mock jobs:', e);
      return mockJobs;
    }
  },

  /**
   * Get job details by ID
   */
  async getJobById(id: string): Promise<Job | null> {
    try {
      const docRef = doc(db, 'jobs', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Job;
      }
      return mockJobs.find(j => j.id === id) || null;
    } catch (e) {
      return mockJobs.find(j => j.id === id) || null;
    }
  },

  /**
   * Create/Post a new job listing (recruiter only)
   */
  async postJob(jobData: Omit<Job, 'id' | 'postedDate' | 'applicantsCount'>): Promise<Job> {
    const newJob: Job = {
      ...jobData,
      id: `job-${Date.now()}`,
      postedDate: new Date().toISOString().split('T')[0],
      applicantsCount: 0,
    };

    try {
      await setDoc(doc(db, 'jobs', newJob.id), newJob);
      return newJob;
    } catch (e) {
      mockJobs.unshift(newJob);
      return newJob;
    }
  },

  /**
   * Resolve candidate profile details from all known Firestore schemas
   * (web platform + mobile app both store data slightly differently)
   */
  async getCandidateDetails(seekerId: string): Promise<{
    candidateName: string;
    candidateEmail: string;
    candidatePhone: string;
    candidateLocation: string;
    candidateBio: string;
    candidateSkills: string[];
    candidateExpectedSalary: string;
    candidateNoticePeriod: string;
    resumeUrl: string;
    education: string;
    experience: string;
  }> {
    let candidateName = 'Anonymous Candidate';
    let candidateEmail = '';
    let candidatePhone = '';
    let candidateLocation = '';
    let candidateBio = '';
    let candidateSkills: string[] = [];
    let candidateExpectedSalary = '';
    let candidateNoticePeriod = 'Immediate';
    let resumeUrl = '';
    let education = '';
    let experience = '';

    try {
      const userSnap = await getDoc(doc(db, 'users', seekerId));
      if (!userSnap.exists()) {
        console.warn(`[getCandidateDetails] No user doc found for seekerId=${seekerId}`);
        // Also try 'seekers' collection (some web platforms use separate collection)
        const seekerSnap = await getDoc(doc(db, 'seekers', seekerId));
        if (!seekerSnap.exists()) {
          console.warn(`[getCandidateDetails] No seeker doc either for=${seekerId}`);
          return { candidateName, candidateEmail, candidatePhone, candidateLocation,
            candidateBio, candidateSkills, candidateExpectedSalary, candidateNoticePeriod,
            resumeUrl, education, experience };
        }
      }

      const snap = userSnap.exists() ? userSnap : await getDoc(doc(db, 'seekers', seekerId));
      const d = snap.data() || {};

      console.log(`[getCandidateDetails] User doc keys for ${seekerId}:`, Object.keys(d));

        // ── Name: try all known paths ──────────────────────────────
        candidateName =
          d.seekerProfile?.fullName ||
          d.profile?.fullName ||
          d.profile?.name ||
          d.personalInfo?.name ||
          d.personalDetails?.name ||
          d.personalDetails?.fullName ||
          d.basicInfo?.name ||
          d.basicInfo?.fullName ||
          d.jobSeekerProfile?.fullName ||
          d.jobSeekerProfile?.name ||
          d.fullName ||
          d.name ||
          d.displayName ||
          'Candidate';

        console.log(`[getCandidateDetails] Resolved name='${candidateName}'`);

        // ── Email ──────────────────────────────────────────────────
        candidateEmail =
          d.email ||
          d.seekerProfile?.email ||
          d.profile?.email ||
          '';

        // ── Phone ──────────────────────────────────────────────────
        candidatePhone =
          d.seekerProfile?.phone ||
          d.profile?.phone ||
          d.personalInfo?.phone ||
          d.phone ||
          '';

        // ── Location ───────────────────────────────────────────────
        candidateLocation =
          d.seekerProfile?.locationPreference ||
          d.profile?.location ||
          d.personalInfo?.city ||
          d.location ||
          d.city ||
          '';

        // ── Bio / Summary ──────────────────────────────────────────
        candidateBio =
          d.seekerProfile?.bio ||
          d.profile?.bio ||
          d.profile?.summary ||
          d.bio ||
          d.summary ||
          '';

        // ── Skills: handle array OR comma-separated string ─────────
        const rawSkills =
          d.seekerProfile?.skills ||
          d.profile?.skills ||
          d.skills ||
          [];
        if (Array.isArray(rawSkills)) {
          candidateSkills = rawSkills;
        } else if (typeof rawSkills === 'string' && rawSkills.trim()) {
          candidateSkills = rawSkills.split(',').map((s: string) => s.trim()).filter(Boolean);
        }

        // ── Salary ─────────────────────────────────────────────────
        candidateExpectedSalary =
          d.seekerProfile?.expectedSalary ||
          d.profile?.expectedSalary ||
          d.jobPreferences?.expectedSalary ||
          d.expectedSalary ||
          '';

        // ── Notice Period ──────────────────────────────────────────
        candidateNoticePeriod =
          d.seekerProfile?.noticePeriod ||
          d.profile?.noticePeriod ||
          d.jobPreferences?.noticePeriod ||
          d.noticePeriod ||
          'Immediate';

        // ── Resume URL ─────────────────────────────────────────────
        resumeUrl =
          d.seekerProfile?.resumeUrl ||
          d.profile?.resumeUrl ||
          d.resumeUrl ||
          '';

        // ── Education summary ──────────────────────────────────────
        const edu = d.seekerProfile?.education || d.profile?.education || d.education;
        if (Array.isArray(edu) && edu.length > 0) {
          const latest = edu[edu.length - 1];
          education = [latest.degree, latest.institution, latest.year]
            .filter(Boolean).join(' • ');
        } else if (typeof edu === 'string') {
          education = edu;
        }

        // ── Experience summary ─────────────────────────────────────
        const exp = d.seekerProfile?.experience || d.profile?.experience || d.experience;
        if (Array.isArray(exp) && exp.length > 0) {
          const latest = exp[exp.length - 1];
          experience = [latest.title || latest.role, latest.company, latest.duration]
            .filter(Boolean).join(' at ');
        } else if (typeof exp === 'string') {
          experience = exp;
        }

    } catch (err) {
      console.warn('[jobService] getCandidateDetails failed:', err);
    }

    return {
      candidateName, candidateEmail, candidatePhone, candidateLocation,
      candidateBio, candidateSkills, candidateExpectedSalary,
      candidateNoticePeriod, resumeUrl, education, experience,
    };
  },

  /**
   * Apply for a job (seeker only)
   */
  async applyForJob(seekerId: string, jobId: string): Promise<JobApplication> {
    const job = await this.getJobById(jobId);
    if (!job) throw new Error('Job not found');

    // Fetch all candidate details using the robust resolver
    const candidateDetails = await this.getCandidateDetails(seekerId);

    const newApp: JobApplication = {
      id: `app-${Date.now()}`,
      jobId,
      jobTitle: job.title,
      company: job.company,
      seekerId,
      appliedDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      employerId: job.recruiterId || '',
      candidateName: candidateDetails.candidateName,
      candidateEmail: candidateDetails.candidateEmail,
      candidatePhone: candidateDetails.candidatePhone,
      candidateLocation: candidateDetails.candidateLocation,
      candidateBio: candidateDetails.candidateBio,
      candidateSkills: candidateDetails.candidateSkills,
      candidateExpectedSalary: candidateDetails.candidateExpectedSalary,
      candidateNoticePeriod: candidateDetails.candidateNoticePeriod,
      resumeUrl: candidateDetails.resumeUrl,
    };

    try {
      await setDoc(doc(db, 'applications', newApp.id), newApp);
      const jobRef = doc(db, 'jobs', jobId);
      await updateDoc(jobRef, {
        applicantsCount: (job.applicantsCount || 0) + 1
      });
      return newApp;
    } catch (e) {
      mockApplications.unshift(newApp);
      return newApp;
    }
  },

  /**
   * Get applications submitted by a seeker
   */
  async getSeekerApplications(seekerId: string): Promise<JobApplication[]> {
    try {
      const q = query(collection(db, 'applications'), where('seekerId', '==', seekerId));
      const querySnapshot = await getDocs(q);
      const apps: JobApplication[] = [];
      querySnapshot.forEach((docSnap) => {
        apps.push({ id: docSnap.id, ...docSnap.data() } as JobApplication);
      });
      return apps.length > 0 ? apps : mockApplications.filter(app => app.seekerId === seekerId);
    } catch (e) {
      return mockApplications.filter(app => app.seekerId === seekerId);
    }
  },

  /**
   * Get job applications submitted for recruiter's jobs
   * Handles web platform + mobile field naming differences.
   * Live-hydrates candidate details from users collection.
   */
  async getRecruiterJobApplications(recruiterId: string): Promise<JobApplication[]> {
    try {
      const allApps: JobApplication[] = [];
      const seenIds = new Set<string>();

      const addApps = (snapshot: any) => {
        snapshot.forEach((docSnap: any) => {
          const data = docSnap.data();
          const app = { id: docSnap.id, ...data } as JobApplication;
          // Normalise seekerId from any web platform field name
          app.seekerId = data.seekerId || data.userId || data.applicantId || data.uid || '';
          // Normalise status
          app.status = data.status || 'pending';
          // Normalise candidateName from web platform field names
          if (!app.candidateName) {
            app.candidateName = data.applicantName || data.name || data.fullName || '';
          }
          // Normalise candidateEmail
          if (!app.candidateEmail) {
            app.candidateEmail = data.applicantEmail || data.email || '';
          }
          // Normalise candidatePhone
          if (!app.candidatePhone) {
            app.candidatePhone = data.applicantPhone || data.phone || '';
          }
          // Normalise jobTitle from web platform
          if (!app.jobTitle) {
            app.jobTitle = data.title || data.position || '';
          }
          if (!seenIds.has(app.id)) {
            seenIds.add(app.id);
            allApps.push(app);
          }
        });
      };

      // ── Strategy 1: query jobs by recruiterId, then get their apps ──
      try {
        const jobsQ1 = query(collection(db, 'jobs'), where('recruiterId', '==', recruiterId));
        const jobsSnap1 = await getDocs(jobsQ1);
        const jobIds1: string[] = [];
        jobsSnap1.forEach((d) => jobIds1.push(d.id));
        if (jobIds1.length > 0) {
          const appsQ = query(collection(db, 'applications'), where('jobId', 'in', jobIds1));
          addApps(await getDocs(appsQ));
        }
      } catch (e) { console.warn('[jobService] Strategy1 failed:', e); }

      // ── Strategy 2: query jobs by userId (web platform) ──
      try {
        const jobsQ2 = query(collection(db, 'jobs'), where('userId', '==', recruiterId));
        const jobsSnap2 = await getDocs(jobsQ2);
        const jobIds2: string[] = [];
        jobsSnap2.forEach((d) => jobIds2.push(d.id));
        if (jobIds2.length > 0) {
          const appsQ = query(collection(db, 'applications'), where('jobId', 'in', jobIds2));
          addApps(await getDocs(appsQ));
        }
      } catch (e) { console.warn('[jobService] Strategy2 failed:', e); }

      // ── Strategy 3: apps directly keyed by employerId ──
      try {
        const q3 = query(collection(db, 'applications'), where('employerId', '==', recruiterId));
        addApps(await getDocs(q3));
      } catch (e) { console.warn('[jobService] Strategy3 failed:', e); }

      // ── Strategy 4: apps keyed by recruiterId directly ──
      try {
        const q4 = query(collection(db, 'applications'), where('recruiterId', '==', recruiterId));
        addApps(await getDocs(q4));
      } catch (e) { console.warn('[jobService] Strategy4 failed:', e); }

      console.log(`[jobService] Found ${allApps.length} total applications for recruiter ${recruiterId}`);

      // ── Live-hydrate missing candidate details from users collection ──
      const hydratedApps = await Promise.all(
        allApps.map(async (app) => {
          const seekerUid = app.seekerId;
          if (!seekerUid) {
            console.warn('[jobService] App has no seekerId:', app.id, Object.keys(app));
            return app;
          }

          // Only hydrate if name/email/phone missing
          const needsHydration =
            !app.candidateName ||
            app.candidateName === 'Anonymous Candidate' ||
            app.candidateName === 'Candidate' ||
            !app.candidateEmail ||
            !app.candidatePhone ||
            !app.candidateSkills ||
            app.candidateSkills.length === 0;

          if (!needsHydration) {
            console.log(`[jobService] App ${app.id}: candidate already has name='${app.candidateName}'`);
            return app;
          }

          try {
            console.log(`[jobService] Hydrating candidate for app=${app.id}, seekerId=${seekerUid}`);
            const details = await this.getCandidateDetails(seekerUid);
            console.log(`[jobService] Hydrated: name='${details.candidateName}', email='${details.candidateEmail}'`);
            return {
              ...app,
              candidateName: (app.candidateName && !['Anonymous Candidate','Candidate',''].includes(app.candidateName))
                ? app.candidateName : details.candidateName,
              candidateEmail: app.candidateEmail || details.candidateEmail,
              candidatePhone: app.candidatePhone || details.candidatePhone,
              candidateLocation: app.candidateLocation || details.candidateLocation,
              candidateBio: app.candidateBio || details.candidateBio,
              candidateSkills: (app.candidateSkills && app.candidateSkills.length > 0)
                ? app.candidateSkills : details.candidateSkills,
              candidateExpectedSalary: app.candidateExpectedSalary || details.candidateExpectedSalary,
              candidateNoticePeriod: app.candidateNoticePeriod || details.candidateNoticePeriod,
              resumeUrl: app.resumeUrl || details.resumeUrl,
            };
          } catch (e) {
            console.warn('[jobService] Hydration failed for', seekerUid, e);
            return app;
          }
        })
      );

      return hydratedApps;
    } catch (e) {
      console.error('[jobService] getRecruiterJobApplications failed:', e);
      const recruiterJobIds = mockJobs.filter(j => j.recruiterId === recruiterId).map(j => j.id);
      return mockApplications.filter(app => recruiterJobIds.includes(app.jobId));
    }
  },


  /**
   * Update the status of a job application (recruiter/employer action)
   */
  async updateApplicationStatus(
    appId: string,
    status: 'pending' | 'reviewing' | 'interviewing' | 'accepted' | 'rejected'
  ): Promise<void> {
    try {
      const appRef = doc(db, 'applications', appId);
      await updateDoc(appRef, { status });
    } catch (e) {
      console.warn('[jobService] Firestore application status update failed, using mock local fallback');
    } finally {
      const idx = mockApplications.findIndex(app => app.id === appId);
      if (idx !== -1) {
        mockApplications[idx].status = status;
      }
    }
  },
  
  /**
   * Update an existing job listing
   */
  async updateJob(jobId: string, jobData: Partial<Job>): Promise<void> {
    try {
      const jobRef = doc(db, 'jobs', jobId);
      await updateDoc(jobRef, jobData);
    } catch (e) {
      console.warn('[jobService] Firestore job update failed, using mock local fallback');
      const idx = mockJobs.findIndex(j => j.id === jobId);
      if (idx !== -1) {
        mockJobs[idx] = { ...mockJobs[idx], ...jobData } as Job;
      }
    }
  },

  /**
   * Delete a job listing permanently
   */
  async deleteJob(jobId: string): Promise<void> {
    try {
      const jobRef = doc(db, 'jobs', jobId);
      await deleteDoc(jobRef);
    } catch (e) {
      console.warn('[jobService] Firestore job delete failed, using mock local fallback');
      const idx = mockJobs.findIndex(j => j.id === jobId);
      if (idx !== -1) {
        mockJobs.splice(idx, 1);
      }
    }
  }
};
