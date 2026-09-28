import { db } from './firebase/config';

// Typed helpers
export const fetchJobs = async () => {
  const { getDocs, collection } = await import('firebase/firestore');
  const snapshot = await getDocs(collection(db, 'jobs'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const fetchJobById = async (id: string) => {
  const { getDoc, doc } = await import('firebase/firestore');
  const jobDoc = await getDoc(doc(db, 'jobs', id));
  if (!jobDoc.exists()) return null;
  return { id: jobDoc.id, ...jobDoc.data() };
};

export const applyToJob = async (jobId: string, userId: string) => {
  const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
  await addDoc(collection(db, 'applications'), {
    jobId,
    userId,
    appliedAt: serverTimestamp(),
  });
};

export const fetchCourses = async () => {
  const { getDocs, collection } = await import('firebase/firestore');
  const snapshot = await getDocs(collection(db, 'courses'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const fetchCourseById = async (id: string) => {
  const { getDoc, doc } = await import('firebase/firestore');
  const courseDoc = await getDoc(doc(db, 'courses', id));
  if (!courseDoc.exists()) return null;
  return { id: courseDoc.id, ...courseDoc.data() };
};

export const purchaseCourse = async (courseId: string, userId: string) => {
  const { setDoc, doc, serverTimestamp } = await import('firebase/firestore');
  await setDoc(doc(db, 'enrollments', `${userId}_${courseId}`), {
    courseId,
    userId,
    purchasedAt: serverTimestamp(),
    status: 'purchased',
  });
};

export const fetchEnrollments = async (userId: string) => {
  const { getDocs, collection, query, where } = await import('firebase/firestore');
  const q = query(collection(db, 'enrollments'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
