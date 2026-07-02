import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  category: 'Development' | 'Design' | 'Business' | 'Marketing' | 'Personal Development';
  duration: string;
  lessonsCount: number;
  rating: number;
  price: number;
  imageUrl: string;
  thumbnail?: string;
  syllabus: string[];
  modules?: CourseModule[];
  enrolledUsers?: string[];
  createdAt?: string;
}

export interface CourseModule {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  videoUrl: string;
}

export interface CurrentAffairs {
  id: string;
  title: string;
  category: string;
  date: string;
  summary: string;
  content?: string;
  imageUrl?: string;
  bookmarkedBy?: string[];
  createdAt?: string;
}

export interface StudyResource {
  id: string;
  title: string;
  category: string;
  type: string;
  size: string;
  pdfUrl?: string;
  downloads?: number;
  createdAt?: string;
}

export interface Certificate {
  id: string;
  courseId: string;
  courseTitle: string;
  userId: string;
  userName: string;
  issuedDate: string;
  credentialId: string;
  score: number;
}

export interface VideoProgress {
  userId: string;
  courseId: string;
  lessonId: string;
  watchedSeconds: number;
  totalSeconds: number;
  completed: boolean;
  updatedAt: string;
}

// Helper to extract enrolled course IDs in a robust way from user doc and collections
const extractEnrolledCourseIds = async (userId: string): Promise<string[]> => {
  const ids = new Set<string>();
  if (!userId) return [];

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();

      // 1. Check enrolledCourses field
      if (userData.enrolledCourses) {
        if (Array.isArray(userData.enrolledCourses)) {
          userData.enrolledCourses.forEach((item: any) => {
            if (typeof item === 'string') {
              ids.add(item);
            } else if (item && typeof item === 'object') {
              if (item.id) ids.add(item.id);
              else if (item.courseId) ids.add(item.courseId);
            }
          });
        } else if (typeof userData.enrolledCourses === 'object') {
          Object.keys(userData.enrolledCourses).forEach((key) => {
            if (userData.enrolledCourses[key]) {
              ids.add(key);
            }
          });
        }
      }

      // 2. Check purchasedCourses field
      if (userData.purchasedCourses) {
        if (Array.isArray(userData.purchasedCourses)) {
          userData.purchasedCourses.forEach((item: any) => {
            if (typeof item === 'string') {
              ids.add(item);
            } else if (item && typeof item === 'object') {
              if (item.id) ids.add(item.id);
              else if (item.courseId) ids.add(item.courseId);
            }
          });
        } else if (typeof userData.purchasedCourses === 'object') {
          Object.keys(userData.purchasedCourses).forEach((key) => {
            if (userData.purchasedCourses[key]) {
              ids.add(key);
            }
          });
        }
      }

      // 3. Check courses field
      if (userData.courses) {
        if (Array.isArray(userData.courses)) {
          userData.courses.forEach((item: any) => {
            if (typeof item === 'string') {
              ids.add(item);
            } else if (item && typeof item === 'object') {
              if (item.id) ids.add(item.id);
              else if (item.courseId) ids.add(item.courseId);
            }
          });
        } else if (typeof userData.courses === 'object') {
          Object.keys(userData.courses).forEach((key) => {
            if (userData.courses[key]) {
              ids.add(key);
            }
          });
        }
      }

      // 4. Check seekerProfile
      if (userData.seekerProfile) {
        const sp = userData.seekerProfile;
        if (Array.isArray(sp.enrolledCourses)) {
          sp.enrolledCourses.forEach((item: any) => {
            if (typeof item === 'string') ids.add(item);
            else if (item && item.id) ids.add(item.id);
            else if (item && item.courseId) ids.add(item.courseId);
          });
        }
        if (Array.isArray(sp.purchasedCourses)) {
          sp.purchasedCourses.forEach((item: any) => {
            if (typeof item === 'string') ids.add(item);
            else if (item && item.id) ids.add(item.id);
            else if (item && item.courseId) ids.add(item.courseId);
          });
        }
      }
    }
  } catch (err) {
    console.warn('[LmsService] Failed to read user document enrolled list:', err);
  }

  // 5. Check separate collections (enrollments, purchases, userCourses)
  const collectionsToCheck = ['enrollments', 'purchases', 'userCourses'];
  for (const collName of collectionsToCheck) {
    try {
      const qRef = query(collection(db, collName), where('userId', '==', userId));
      const snap = await getDocs(qRef);
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const courseId = data.courseId || data.id;
        if (courseId && typeof courseId === 'string') {
          ids.add(courseId);
        }
      });
    } catch (e) {
      // ignore query errors
    }
  }

  return Array.from(ids);
};

export const courseService = {
  /**
   * Get all courses from Firestore
   */
  async getCourses(): Promise<Course[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'courses'));
      const courses: Course[] = [];
      querySnapshot.forEach((docSnap) => {
        courses.push({ id: docSnap.id, ...docSnap.data() } as Course);
      });
      return courses;
    } catch (e) {
      console.error('Failed to fetch courses:', e);
      return [];
    }
  },

  /**
   * Get course by ID
   */
  async getCourseById(id: string): Promise<Course | null> {
    try {
      const docRef = doc(db, 'courses', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Course;
      }
      return null;
    } catch (e) {
      console.error('Failed to fetch course by ID:', e);
      return null;
    }
  },

  /**
   * Get courses filtered by category
   */
  async getCoursesByCategory(category: string): Promise<Course[]> {
    try {
      const q = query(collection(db, 'courses'), where('category', '==', category));
      const querySnapshot = await getDocs(q);
      const courses: Course[] = [];
      querySnapshot.forEach((docSnap) => {
        courses.push({ id: docSnap.id, ...docSnap.data() } as Course);
      });
      return courses;
    } catch (e) {
      console.error('Failed to fetch courses by category:', e);
      return [];
    }
  },

  /**
   * Check if user is enrolled in a specific course
   */
  async getEnrollment(userId: string, courseId: string): Promise<boolean> {
    try {
      if (!userId) return false;
      const enrolledList = await extractEnrolledCourseIds(userId);
      if (enrolledList.includes(courseId)) return true;

      const courseSnap = await getDoc(doc(db, 'courses', courseId));
      if (courseSnap.exists()) {
        const cData = courseSnap.data();
        if (cData.price === 0 || cData.isFree) return true;
        const enrolledUsers: string[] = cData.enrolledUsers || [];
        if (enrolledUsers.includes(userId)) return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  async enrollInCourse(userId: string, courseId: string): Promise<void> {
    try {
      if (!userId || !courseId) return;
      
      // 1. Add course to user's enrolled list
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        enrolledCourses: arrayUnion(courseId),
        purchasedCourses: arrayUnion(courseId)
      }, { merge: true });

      // 2. Add user to the course enrolled list
      const courseRef = doc(db, 'courses', courseId);
      await setDoc(courseRef, {
        enrolledUsers: arrayUnion(userId)
      }, { merge: true });

      // 3. Add record to enrollments collection for direct query access
      const enrollRef = doc(db, 'enrollments', `${userId}_${courseId}`);
      await setDoc(enrollRef, {
        userId,
        courseId,
        enrolledAt: new Date().toISOString(),
        status: 'purchased'
      }, { merge: true });
    } catch (e) {
      console.error('Error in enrollInCourse:', e);
    }
  },

  /**
   * Get enrolled courses for a user
   */
  async getEnrolledCourses(userId: string): Promise<Course[]> {
    try {
      if (!userId) return [];
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      const enrolledIds: string[] = userData.enrolledCourses || [];
      
      const querySnapshot = await getDocs(collection(db, 'courses'));
      const courses: Course[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const courseId = docSnap.id;
        const enrolledUsers: string[] = data.enrolledUsers || [];
        if (enrolledIds.includes(courseId) || enrolledUsers.includes(userId)) {
          courses.push({ id: courseId, ...data } as Course);
        }
      });
      return courses;
    } catch (e) {
      console.error('Failed to fetch enrolled courses:', e);
      return [];
    }
  },
};

// ════════════════════════════════════════════════
// LMS SERVICE — batched dashboard data
// ════════════════════════════════════════════════

export interface LmsDashboardData {
  allCourses: Course[];
  enrolledCourses: Course[];
  currentAffairs: CurrentAffairs[];
  resources: StudyResource[];
  certificates: Certificate[];
  bookmarkedCaIds: string[];
  savedJobIds: string[];
  progressMap: Record<string, number>; // courseId -> progress 0-100
}


export const lmsService = {
  /**
   * Fetch all LMS data in one batch
   */
  async getLmsDashboardData(userId: string): Promise<LmsDashboardData> {
    if (!userId) {
      throw new Error('userId is required for getLmsDashboardData');
    }
    const [
      allCoursesSnap,
      userSnap,
      caSnap,
      resourcesSnap,
      certsSnap,
      enrolledIds,
      videoProgressSnap
    ] = await Promise.all([
      getDocs(collection(db, 'courses')),
      getDoc(doc(db, 'users', userId)),
      getDocs(collection(db, 'currentAffairs')),
      getDocs(collection(db, 'resources')),
      getDocs(query(collection(db, 'certificates'), where('userId', '==', userId))),
      extractEnrolledCourseIds(userId),
      getDocs(query(collection(db, 'videoProgress'), where('userId', '==', userId), where('completed', '==', true)))
    ]);

    // Parse courses
    const allCourses: Course[] = [];
    allCoursesSnap.forEach((d) => allCourses.push({ id: d.id, ...d.data() } as Course));

    // Parse user data
    const userData = userSnap.exists() ? userSnap.data() : {};
    const bookmarkedCaIds: string[] = userData.bookmarkedCaIds || [];
    const savedJobIds: string[] = userData.savedJobIds || [];
    
    // Parse progress map dynamically
    const progressMap: Record<string, number> = {};
    const completedLessons: Record<string, any[]> = {};

    // First, copy and normalize userData.completedLessons if exists
    if (userData.completedLessons) {
      Object.keys(userData.completedLessons).forEach((cid) => {
        const val = userData.completedLessons[cid];
        if (Array.isArray(val)) {
          completedLessons[cid] = val.map((item: any) => {
            if (typeof item === 'number') return item;
            if (typeof item === 'string') {
              const parsed = parseInt(item, 10);
              return isNaN(parsed) ? item : parsed;
            }
            return item;
          });
        } else if (val && typeof val === 'object') {
          const list: any[] = [];
          Object.keys(val).forEach((k) => {
            if (val[k]) {
              const parsed = parseInt(k, 10);
              list.push(isNaN(parsed) ? k : parsed);
            }
          });
          completedLessons[cid] = list;
        }
      });
    }

    // Also populate initial progress values from userData.courseProgress if exists
    if (userData.courseProgress && typeof userData.courseProgress === 'object') {
      Object.keys(userData.courseProgress).forEach((cid) => {
        const prog = userData.courseProgress[cid];
        if (typeof prog === 'number') {
          progressMap[cid] = prog;
        } else if (typeof prog === 'string') {
          const parsed = parseInt(prog, 10);
          if (!isNaN(parsed)) progressMap[cid] = parsed;
        }
      });
    }

    // 1. Accumulate completed lessons from videoProgress collection
    videoProgressSnap.forEach(docSnap => {
      const pData = docSnap.data();
      const cid = pData.courseId;
      if (cid) {
        if (!completedLessons[cid]) {
          completedLessons[cid] = [];
        }
        
        let lIdx = pData.lessonIndex;
        if (lIdx === undefined || lIdx === null) {
          const lId = pData.lessonId;
          if (typeof lId === 'number') {
            lIdx = lId;
          } else if (typeof lId === 'string') {
            const parsed = parseInt(lId, 10);
            if (!isNaN(parsed)) {
              lIdx = parsed;
            } else {
              lIdx = lId;
            }
          }
        }

        if (lIdx !== undefined && lIdx !== null) {
          if (!completedLessons[cid].includes(lIdx)) {
            completedLessons[cid].push(lIdx);
          }
        }
      }
    });

    // 2. Calculate progress percentage dynamically for all courses
    allCourses.forEach(course => {
      const completedList = completedLessons[course.id] || [];
      const syllabusCount = course.syllabus ? course.syllabus.length : (course.lessonsCount || 5);
      if (syllabusCount > 0) {
        const uniqueCompletions = new Set();
        completedList.forEach(item => {
          if (typeof item === 'number') {
            if (item >= 0 && item < syllabusCount) {
              uniqueCompletions.add(item);
            }
          } else if (typeof item === 'string') {
            const parsed = parseInt(item, 10);
            if (!isNaN(parsed)) {
              if (parsed >= 0 && parsed < syllabusCount) {
                uniqueCompletions.add(parsed);
              }
            } else {
              uniqueCompletions.add(item);
            }
          }
        });

        const completedCount = Math.min(syllabusCount, uniqueCompletions.size);
        const calculated = Math.min(100, Math.round((completedCount / syllabusCount) * 100));
        progressMap[course.id] = Math.max(progressMap[course.id] || 0, calculated);
      }
    });

    const enrolledCourses = allCourses.filter(c => 
      enrolledIds.includes(c.id) || 
      (c.enrolledUsers && c.enrolledUsers.includes(userId))
    );

    // Parse current affairs
    const currentAffairs: CurrentAffairs[] = [];
    caSnap.forEach((d) => currentAffairs.push({ id: d.id, ...d.data() } as CurrentAffairs));

    // Parse resources
    const resources: StudyResource[] = [];
    resourcesSnap.forEach((d) => resources.push({ id: d.id, ...d.data() } as StudyResource));

    // Parse certificates
    const certificates: Certificate[] = [];
    certsSnap.forEach((d) => certificates.push({ id: d.id, ...d.data() } as Certificate));

    return {
      allCourses,
      enrolledCourses,
      currentAffairs,
      resources,
      certificates,
      bookmarkedCaIds,
      savedJobIds,
      progressMap,
    };
  },

  /**
   * Toggle current affairs bookmark for user
   */
  async toggleBookmarkCurrentAffairs(userId: string, caId: string, isCurrentlyBookmarked: boolean): Promise<void> {
    const userRef = doc(db, 'users', userId);
    if (isCurrentlyBookmarked) {
      await updateDoc(userRef, { bookmarkedCaIds: arrayRemove(caId) });
    } else {
      await updateDoc(userRef, { bookmarkedCaIds: arrayUnion(caId) });
    }
  },

  /**
   * Toggle job bookmark (save/unsave a job)
   */
  async toggleBookmarkJob(userId: string, jobId: string, isCurrentlySaved: boolean): Promise<void> {
    const userRef = doc(db, 'users', userId);
    if (isCurrentlySaved) {
      await updateDoc(userRef, { savedJobIds: arrayRemove(jobId) });
    } else {
      await updateDoc(userRef, { savedJobIds: arrayUnion(jobId) });
    }
  },

  /**
   * Track a resource download event
   */
  async trackDownload(userId: string, resourceId: string, title: string): Promise<void> {
    try {
      const downloadId = `dl_${userId}_${resourceId}_${Date.now()}`;
      await setDoc(doc(db, 'downloads', downloadId), {
        userId,
        resourceId,
        title,
        downloadedAt: new Date().toISOString(),
      });
      // Increment download count on resource doc
      const resRef = doc(db, 'resources', resourceId);
      const resSnap = await getDoc(resRef);
      if (resSnap.exists()) {
        const current = resSnap.data().downloads || 0;
        await updateDoc(resRef, { downloads: current + 1 });
      }
    } catch (e) {
      console.warn('Failed to track download:', e);
    }
  },

  /**
   * Update video progress for a user
   */
  async updateVideoProgress(
    userId: string,
    courseId: string,
    lessonId: string,
    watchedSeconds: number,
    totalSeconds: number
  ): Promise<void> {
    try {
      const progressKey = `${userId}_${courseId}_${lessonId}`;
      const completed = totalSeconds > 0 && watchedSeconds / totalSeconds >= 0.9;
      await setDoc(doc(db, 'videoProgress', progressKey), {
        userId,
        courseId,
        lessonId,
        watchedSeconds,
        totalSeconds,
        completed,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Update overall course progress on user doc
      if (completed) {
        const userRef = doc(db, 'users', userId);
        // Simple: track completed lessonIds per course
        await updateDoc(userRef, {
          [`completedLessons.${courseId}`]: arrayUnion(lessonId),
        });
      }
    } catch (e) {
      console.warn('Failed to update video progress:', e);
    }
  },

  /**
   * Update video progress for a lesson and overall course progress
   */
  async updateCourseProgress(
    userId: string,
    courseId: string,
    lessonIndex: number,
    progressPercentage: number,
    totalLessonsCount: number
  ): Promise<void> {
    try {
      const progressKey = `${userId}_${courseId}_lesson_${lessonIndex}`;
      const completed = progressPercentage >= 90;
      await setDoc(doc(db, 'videoProgress', progressKey), {
        userId,
        courseId,
        lessonIndex,
        progressPercentage,
        completed,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Update overall course progress on user doc
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const completedLessons = userData.completedLessons || {};
        const completedList: number[] = completedLessons[courseId] || [];

        let changed = false;
        if (completed && !completedList.includes(lessonIndex)) {
          completedList.push(lessonIndex);
          changed = true;
        }

        const courseProgressPercent = Math.min(
          100,
          Math.round((completedList.length / totalLessonsCount) * 100)
        );

        const currentOverallProgress = (userData.courseProgress || {})[courseId] || 0;

        if (changed || courseProgressPercent !== currentOverallProgress) {
          await updateDoc(userRef, {
            [`completedLessons.${courseId}`]: completedList,
            [`courseProgress.${courseId}`]: courseProgressPercent,
          });

          // Generate certificate automatically if completion >= 80%
          if (courseProgressPercent >= 80) {
            const certId = `cert_${userId}_${courseId}`;
            const certRef = doc(db, 'certificates', certId);
            const certSnap = await getDoc(certRef);
            if (!certSnap.exists()) {
              const courseRef = doc(db, 'courses', courseId);
              const courseSnap = await getDoc(courseRef);
              const courseTitle = courseSnap.exists() ? courseSnap.data().title : 'Course';
              const credentialId = `LMS-${Date.now().toString(36).toUpperCase()}`;
              await setDoc(certRef, {
                id: certId,
                courseId,
                courseTitle,
                userId,
                userName: userData.displayName || userData.email || 'Student',
                issuedDate: new Date().toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'long', year: 'numeric'
                }),
                credentialId,
                score: courseProgressPercent,
              }, { merge: true });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to update course progress:', e);
    }
  },

  /**
   * Get saved jobs for a user — fetched directly from Firestore
   */
  async getSavedJobs(userId: string): Promise<string[]> {
    try {
      const userSnap = await getDoc(doc(db, 'users', userId));
      if (userSnap.exists()) {
        return userSnap.data().savedJobIds || [];
      }
      return [];
    } catch (e) {
      console.warn('Failed to fetch saved jobs:', e);
      return [];
    }
  },
};
