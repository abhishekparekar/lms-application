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

export function getFallbackQuestions(courseId: string, courseTitle?: string): QuizQuestion[] {
  return [
    {
      id: `q_${courseId}_1`,
      courseId,
      text: `What is the primary objective taught in ${courseTitle || 'this course'}?`,
      options: [
        'Mastering core strategic concepts and practical application',
        'Theoretical study without real-world execution',
        'Memorizing static formulas only',
        'Avoiding practical problem solving'
      ],
      correctIndex: 0,
    },
    {
      id: `q_${courseId}_2`,
      courseId,
      text: 'Which methodology ensures maximum accuracy during skill assessment?',
      options: [
        'Structured evaluation, regular practice, and performance feedback',
        'Random guessing without reviewing materials',
        'Relying on unverified third-party sources',
        'Skipping foundational modules'
      ],
      correctIndex: 0,
    },
    {
      id: `q_${courseId}_3`,
      courseId,
      text: 'What key factor leads to continuous improvement in professional development?',
      options: [
        'Consistency, goal setting, and applying industry standards',
        'Short-term effort followed by inactivity',
        'Ignoring expert mentorship and guidance',
        'Working in isolation without team collaboration'
      ],
      correctIndex: 0,
    },
    {
      id: `q_${courseId}_4`,
      courseId,
      text: 'How should complex challenges be handled in real-world scenarios?',
      options: [
        'Break down problems into key components and execute step-by-step solutions',
        'Postpone critical decisions indefinitely',
        'Rely exclusively on intuition without analytical data',
        'Abandon project goals when obstacles arise'
      ],
      correctIndex: 0,
    },
    {
      id: `q_${courseId}_5`,
      courseId,
      text: 'Which habit sustains long-term professional growth and certification readiness?',
      options: [
        'Continuous self-learning, practice tests, and ethical execution',
        'Stagnation after initial training',
        'Compromising quality for quick completion',
        'Neglecting updated course resources'
      ],
      correctIndex: 0,
    },
  ];
}

export const quizService = {
  /**
   * Get quiz questions for a course.
   * Runs fast parallel queries with a strict 800ms timeout.
   * If queries take > 800ms or 0 questions exist in DB, returns fallback questions instantly.
   */
  async getQuestionsForCourse(courseId: string, courseTitle?: string): Promise<QuizQuestion[]> {
    const fetchFromDb = async (): Promise<QuizQuestion[]> => {
      try {
        const rootCollections = ['quizzes', 'testSeries', 'questions', 'quizQuestions', 'tests', 'quiz', 'exams'];
        const fieldNames = ['courseId', 'course_id', 'course', 'cid'];

        // Batch 1: Course doc & Root doc ID checks
        const docPromises = [
          getDoc(doc(db, 'courses', courseId)).catch(() => null),
          ...rootCollections.map(coll => getDoc(doc(db, coll, courseId)).catch(() => null))
        ];

        const docSnaps = await Promise.all(docPromises);

        const courseSnap = docSnaps[0];
        if (courseSnap && courseSnap.exists()) {
          const raw = extractRawArray(courseSnap.data());
          if (raw) {
            const qs = parseQuestions(raw, courseId);
            if (qs.length > 0) return qs;
          }
        }

        for (let i = 1; i < docSnaps.length; i++) {
          const snap = docSnaps[i];
          if (snap && snap.exists()) {
            const raw = extractRawArray(snap.data());
            if (raw) {
              const qs = parseQuestions(raw, courseId);
              if (qs.length > 0) return qs;
            }
            const singleQ = normaliseQuestion({ id: snap.id, ...snap.data() }, 0, courseId);
            if (singleQ) return [singleQ];
          }
        }

        // Batch 2: Subcollections
        const subPromises = rootCollections.map(sub =>
          getDocs(collection(db, 'courses', courseId, sub)).catch(() => null)
        );
        const subSnaps = await Promise.all(subPromises);
        for (const snap of subSnaps) {
          if (snap && !snap.empty) {
            const qs: QuizQuestion[] = [];
            snap.forEach((d) => {
              const q = normaliseQuestion({ id: d.id, ...d.data() }, qs.length, courseId);
              if (q) qs.push(q);
            });
            if (qs.length > 0) return qs;
          }
        }

        // Batch 3: Root collections where courseId matches
        const queryPromises: Promise<any>[] = [];
        for (const coll of rootCollections) {
          for (const f of fieldNames) {
            queryPromises.push(
              getDocs(query(collection(db, coll), where(f, '==', courseId))).catch(() => null)
            );
          }
        }

        const querySnaps = await Promise.all(queryPromises);
        for (const snap of querySnaps) {
          if (snap && !snap.empty) {
            const qs: QuizQuestion[] = [];
            snap.forEach((d: any) => {
              const data = d.data();
              if (data.status === 'hidden' || data.status === 'draft') return;
              const rawArr = extractRawArray(data);
              if (rawArr && rawArr.length > 0) {
                rawArr.forEach((raw: any, idx: number) => {
                  const q = normaliseQuestion(raw, idx, courseId);
                  if (q) qs.push(q);
                });
              } else {
                const singleQ = normaliseQuestion({ id: d.id, ...data }, qs.length, courseId);
                if (singleQ) qs.push(singleQ);
              }
            });
            if (qs.length > 0) return qs;
          }
        }
      } catch (e) {
        console.warn('[QuizService] Parallel query error:', e);
      }
      return [];
    };

    // Strict 800ms timeout for instant user experience
    const timeoutPromise = new Promise<QuizQuestion[]>((resolve) =>
      setTimeout(() => resolve([]), 800)
    );

    const questions = await Promise.race([fetchFromDb(), timeoutPromise]);

    if (questions && questions.length > 0) {
      return questions;
    }

    // Return instant practice test series so user never waits!
    return getFallbackQuestions(courseId, courseTitle);
  },

  /**
   * Submit quiz result.
   * - Always saves quiz attempt to quizResults.
   * - Generates certificate ONLY if:
   *     1. Student passed (score >= 60%)
   *     2. Course progress is 100%
   *     3. Certificate doesn't already exist (one-time only)
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
      const scorePct = total > 0 ? Math.round((score / total) * 100) : 0;
      const resultId = `result_${userId}_${courseId}_${Date.now()}`;
      await setDoc(doc(db, 'quizResults', resultId), {
        id: resultId,
        userId,
        courseId,
        courseTitle,
        userName,
        score,
        total,
        scorePct,
        passed,
        completedAt: new Date().toISOString(),
      });

      if (passed) {
        // Check course progress — certificate requires 100% completion
        let courseProgress = 0;
        try {
          const userSnap = await getDoc(doc(db, 'users', userId));
          if (userSnap.exists()) {
            const data = userSnap.data();
            courseProgress = (data.courseProgress && data.courseProgress[courseId]) || 0;
          }
        } catch (_) {}

        if (courseProgress < 100) {
          // Passed the quiz but hasn't finished all lectures — no cert yet
          return null;
        }

        // One-time certificate generation
        const certId = `cert_${userId}_${courseId}`;
        const certRef = doc(db, 'certificates', certId);
        const certSnap = await getDoc(certRef);
        if (certSnap.exists()) {
          // Certificate already issued — do NOT regenerate
          return certId;
        }

        const credentialId = `LMS-${Date.now().toString(36).toUpperCase()}-${userId.slice(-4).toUpperCase()}`;
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
          score: scorePct,
          passed: true,
          createdAt: new Date().toISOString(),
        }, { merge: true });

        return certId;
      }
      return null;
    } catch (e) {
      console.error('[QuizService] submitQuizResult failed:', e);
      throw e;
    }
  },
};
