import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile as updateFirebaseProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export interface SeekerProfile {
  fullName: string;
  phone: string;
  bio: string;
  education: Array<{
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startYear: string;
    endYear: string;
  }>;
  experience: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  skills: string[];
  resumeUrl?: string;
  portfolioUrl?: string;
}

export interface RecruiterProfile {
  companyName: string;
  companyWebsite: string;
  industry: string;
  position: string;
  bio: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'seeker' | 'recruiter' | 'admin';
  createdAt: string;
  avatarUrl?: string;
  profileCompleted?: boolean;
  profileCompleteness?: number;
  seekerProfile?: SeekerProfile;
  recruiterProfile?: RecruiterProfile;
  userType?: string;
  originalRole?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  referredBy?: string;
  franchiseId?: string;
  location?: string;
  state?: string;
  district?: string;
  taluka?: string;
}

export const authService = {
  /**
   * Log in user — only real Firebase credentials accepted
   */
  async login({ email, password }: { email: string; password?: string }) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password || '');
    const userProfile = await this.getUserProfile(userCredential.user.uid);
    return { user: userProfile, firebaseUser: userCredential.user };
  },

  /**
   * Register user — only real Firebase credentials accepted
   */
  async register({ 
    email, 
    password, 
    firstName, 
    lastName, 
    phone, 
    userType, 
    referralCode 
  }: { 
    email: string; 
    password?: string; 
    firstName: string; 
    lastName: string; 
    phone: string; 
    userType: 'jobseeker' | 'employer' | 'agent';
    referralCode?: string;
  }) {
    if (!password) {
      throw new Error('Password is required for registration.');
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const displayName = `${firstName} ${lastName}`.trim();
    await updateFirebaseProfile(userCredential.user, { displayName });

    let franchiseId = '';
    let referredBy = '';
    if (referralCode) {
      try {
        const franchiseDoc = await getDoc(doc(db, 'franchises', referralCode));
        if (franchiseDoc.exists()) {
          franchiseId = referralCode;
          referredBy = franchiseDoc.data()?.name || referralCode;
        } else {
          referredBy = referralCode; // fallback/agent matching
        }
      } catch (e) {
        console.log('[AuthService] Error checking referral code:', e);
        referredBy = referralCode;
      }
    }

    const role: 'seeker' | 'recruiter' = (userType === 'jobseeker') ? 'seeker' : 'recruiter';

    const newUser: UserProfile = {
      uid: userCredential.user.uid,
      email,
      displayName,
      role,
      userType,
      createdAt: new Date().toISOString(),
      profileCompleted: false,
      firstName,
      lastName,
      phone,
      location: '',
      state: '',
      district: '',
      taluka: '',
      ...(referralCode ? { referredBy, franchiseId } : {})
    };

    if (role === 'seeker') {
      newUser.seekerProfile = {
        fullName: displayName,
        phone,
        bio: '',
        education: [],
        experience: [],
        skills: []
      };
    } else {
      newUser.recruiterProfile = {
        companyName: '',
        companyWebsite: '',
        industry: '',
        position: '',
        bio: ''
      };
    }

    await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
    return { user: newUser, firebaseUser: userCredential.user };
  },

  /**
   * Log out user
   */
  async logout() {
    await signOut(auth);
  },

  /**
   * Get user profile
   */
  async getUserProfile(uid: string): Promise<UserProfile> {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const originalRole = data.role || data.userType || data.user_type || 'seeker';
      let normalizedRole: 'seeker' | 'recruiter' | 'admin' = 'seeker';
      
      if (originalRole === 'jobseeker' || originalRole === 'seeker') {
        normalizedRole = 'seeker';
      } else if (
        originalRole === 'employer' || 
        originalRole === 'recruiter' || 
        originalRole === 'superadmin' || 
        originalRole === 'team' || 
        originalRole === 'agent' || 
        originalRole === 'franchise' || 
        originalRole === 'admin'
      ) {
        normalizedRole = 'recruiter';
      }
      
      return { 
        uid: docSnap.id, 
        ...data, 
        role: normalizedRole,
        originalRole: originalRole,
        userType: data.userType || data.user_type || (normalizedRole === 'seeker' ? 'jobseeker' : 'employer')
      } as UserProfile;
    }
    
    // Fallback if Firestore document does not exist for a user logged in
    const currentUser = auth.currentUser;
    const fallbackProfile: UserProfile = {
      uid,
      email: currentUser?.email || '',
      displayName: currentUser?.displayName || 'User',
      role: 'seeker',
      userType: 'jobseeker',
      originalRole: 'seeker',
      createdAt: new Date().toISOString(),
      profileCompleted: false,
    };
    await setDoc(docRef, fallbackProfile);
    return fallbackProfile;
  },

  /**
   * Update user profile
   */
  async updateUserProfile(uid: string, profileData: Partial<UserProfile>): Promise<UserProfile> {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, profileData);
    return this.getUserProfile(uid);
  }
};
