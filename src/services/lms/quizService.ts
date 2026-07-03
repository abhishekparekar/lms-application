import { 
  collection, 
  getDocs, 
  doc, 
  setDoc,
  query, 
  where,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface QuizQuestion {
  id: string;
  courseId: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export interface QuizResult {
  id: string;
  userId: string;
  courseId: string;
  score: number;
  total: number;
  passed: boolean;
  completedAt: string;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Normalise a raw Firestore question object into QuizQuestion
// Handles every field naming convention superadmin might use
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function normaliseQuestion(raw: any, index: number, courseId: string): QuizQuestion | null {
  const text: string =
    raw.text || raw.question || raw.questionText || raw.q || raw.title || raw.name || '';

  if (!text) return null;

  // Options
  let options: string[] = [];
  if (Array.isArray(raw.options)) options = raw.options;
  else if (Array.isArray(raw.choices)) options = raw.choices;
  else if (Array.isArray(raw.answers)) options = raw.answers;
  else if (Array.isArray(raw.opts)) options = raw.opts;
  else if (raw.option1 || raw.option2) {
    for (let i = 1; i <= 6; i++) { if (raw[`option${i}`]) options.push(raw[`option${i}`]); }
  } else if (raw.a || raw.b) {
    ['a', 'b', 'c', 'd', 'e'].forEach((k) => { if (raw[k]) options.push(raw[k]); });
  }

  if (options.length < 2) return null;

  // Correct index
  let correctIndex = 0;
  const tryNumber = (v: any): number | null => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const upper = v.toUpperCase();
      const li = ['A','B','C','D','E'].indexOf(upper);
      if (li >= 0) return li;
      const p = parseInt(v, 10);
      if (!isNaN(p)) return p;
    }
    return null;
  };

  const candidates = [
    raw.correctIndex, raw.correctOption, raw.answerIndex, raw.answer,
    raw.correct, raw.correctAnswer, raw.rightAnswer, raw.rightIndex,
  ];
  for (const c of candidates) {
    const n = tryNumber(c);
    if (n !== null) { correctIndex = n; break; }
  }

  correctIndex = Math.max(0, Math.min(correctIndex, options.length - 1));

  return {
    id: raw.id || raw.questionId || `q_${courseId}_${index}`,
    courseId,
    text,
    options,
    correctIndex,
  };
}

function parseQuestions(rawArr: any[], courseId: string): QuizQuestion[] {
  const results: QuizQuestion[] = [];
  rawArr.forEach((raw, idx) => {
    const q = normaliseQuestion(raw, idx, courseId);
    if (q) results.push(q);
  });
  return results;
}

function extractRawArray(data: any): any[] | null {
  const raw =
    data.questions || data.quiz || data.testSeries || data.quizQuestions ||
    data.list || data.questionsList || data.items || data.questionList ||
    data.tests || data.examQuestions || null;
  return Array.isArray(raw) && raw.length > 0 ? raw : null;
}

export const quizService = {
  /**
   * Get quiz questions for a course.
   * Searches ALL possible Firestore locations the superadmin might have used:
   *   1. Embedded arrays in the course document itself
   *   2. Subcollections under courses/{courseId}
   *   3. Root-level collection docs whose ID === courseId
   *   4. Root-level collection docs where courseId field === courseId
   */
  async getQuestionsForCourse(courseId: string): Promise<QuizQuestion[]> {
    console.log(`[QuizService] Fetching questions for courseId="${courseId}"`);

    // STEP 1 â”€â”€ Embedded inside the course document
    try {
      const snap = await getDoc(doc(db, 'courses', courseId));
      if (snap.exists()) {
        const raw = extractRawArray(snap.data());
        if (raw) {
          const qs = parseQuestions(raw, courseId);
          if (qs.length > 0) {
            console.log(`[QuizService] âœ… ${qs.length} q from courses/${courseId} embedded`);
            return qs;
          }
        }
      }
    } catch (e) { console.warn('[QuizService] Step 1:', e); }

    // STEP 2 â”€â”€ Subcollections under courses/{courseId}
    const subcollections = ['questions','quizQuestions','quizzes','testSeries','tests','quiz','exam','assessments'];
    for (const sub of subcollections) {
      try {
        const snap = await getDocs(collection(db, 'courses', courseId, sub));
        if (!snap.empty) {
          const qs: QuizQuestion[] = [];
          snap.forEach((d) => {
            const q = normaliseQuestion({ id: d.id, ...d.data() }, qs.length, courseId);
            if (q) qs.push(q);
          });
          if (qs.length > 0) {
            console.log(`[QuizService] âœ… ${qs.length} q from courses/${courseId}/${sub}`);
            return qs;
          }
        }
      } catch (_) {}
    }

    // STEP 3 & 4 â”€â”€ Root-level collections
    const rootCollections = ['testSeries','tests','quizQuestions','quizzes','questions','quiz','exams','assessments'];
    for (const coll of rootCollections) {
      // 3a: doc ID === courseId
      try {
        const snap = await getDoc(doc(db, coll, courseId));
        if (snap.exists()) {
          const raw = extractRawArray(snap.data());
          if (raw) {
            const qs = parseQuestions(raw, courseId);
            if (qs.length > 0) {
              console.log(`[QuizService] âœ… ${qs.length} q from ${coll}/${courseId} (doc-ID)`);
              return qs;
            }
          }
          // Maybe the doc itself is a single question
          const singleQ = normaliseQuestion({ id: snap.id, ...snap.data() }, 0, courseId);
          if (singleQ) {
            console.log(`[QuizService] âœ… 1 q from ${coll}/${courseId} (single-doc)`);
            return [singleQ];
          }
        }
      } catch (_) {}

      // 3b: query by courseId field variants
      for (const field of ['courseId','course_id','courseID']) {
        try {
          const snap = await getDocs(query(collection(db, coll), where(field, '==', courseId)));
          if (!snap.empty) {
            const qs: QuizQuestion[] = [];
            snap.forEach((d) => {
              const data = d.data();
              const embedded = extractRawArray(data);
              if (embedded) {
                parseQuestions(embedded, courseId).forEach((q) => qs.push(q));
              } else {
                const q = normaliseQuestion({ id: d.id, ...data }, qs.length, courseId);
                if (q) qs.push(q);
              }
            });
            if (qs.length > 0) {
              console.log(`[QuizService] âœ… ${qs.length} q from ${coll} where ${field}=="${courseId}"`);
              return qs;
            }
          }
        } catch (_) {}
      }
    }

    console.warn(`[QuizService] âŒ No questions for courseId="${courseId}". Checked: embedded, subcollections, root: [${rootCollections.join(', ')}]`);
    return [];
  },

  /**
   * Submit quiz result and generate a certificate if passed
   */
  async submitQuizResult(
    userId: string,
    courseId: string,
    courseTitle: string,
    userName: string,
    score: number,
    total: number,
    passed: boolean
  ): Promise<string | null> {
    try {
      const resultId = `result_${userId}_${courseId}_${Date.now()}`;
      await setDoc(doc(db, 'quizResults', resultId), {
        id: resultId,
        userId,
        courseId,
        courseTitle,
        userName,
        score,
        total,
        passed,
        completedAt: new Date().toISOString(),
      });

      if (passed) {
        const certId = `cert_${userId}_${courseId}`;
        const certRef = doc(db, 'certificates', certId);
        const certSnap = await getDoc(certRef);
        if (certSnap.exists()) {
          console.log(`[QuizService] Certificate already exists for cert_${userId}_${courseId}, skipping regeneration.`);
          return certId;
        }

        const credentialId = `LMS-${Date.now().toString(36).toUpperCase()}`;
        await setDoc(certRef, {
          id: certId,
          courseId,
          courseTitle,
          userId,
          userName,
          issuedDate: new Date().toLocaleDateString('en-IN', {
            day: '2-digit', month: 'long', year: 'numeric',
          }),
          credentialId,
          score,
        }, { merge: true });
        console.log(`[QuizService] ✅ Certificate created: cert_${userId}_${courseId}`);
        return certId;
      }
      return null;
    } catch (e) {
      console.error('[QuizService] submitQuizResult failed:', e);
      throw e;
    }
  },
};
