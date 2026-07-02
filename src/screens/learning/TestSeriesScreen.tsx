import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Colors } from '@/constants/theme';
import { Button } from '@/components/common/Button';
import { quizService, QuizQuestion } from '@/services/lms/quizService';
import { courseService } from '@/services/lms/lmsService';
import { useAuth } from '@/hooks/useAuth';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface TestSeriesScreenProps {
  courseId: string;
  onBack: () => void;
  onFinishQuiz: (passed: boolean) => void;
}

const SECONDS_PER_QUESTION = 90; // 1.5 min per question
const PASS_PERCENT = 0.60; // 60% to pass

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

async function getUserCourseProgress(userId: string, courseId: string): Promise<number> {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return 0;
  const data = snap.data();

  if (data.courseProgress && typeof data.courseProgress[courseId] === 'number') {
    return data.courseProgress[courseId];
  }

  if (data.completedLessons && data.completedLessons[courseId]) {
    const completed = data.completedLessons[courseId];
    const count = Array.isArray(completed)
      ? completed.length
      : typeof completed === 'object'
        ? Object.keys(completed).length
        : 0;
    const courseSnap = await getDoc(doc(db, 'courses', courseId));
    if (courseSnap.exists()) {
      const cData = courseSnap.data();
      const total = cData.lessonsCount || (Array.isArray(cData.syllabus) ? cData.syllabus.length : 0);
      if (total > 0) return Math.min(100, Math.round((count / total) * 100));
    }
  }

  return 0;
}

export const TestSeriesScreen: React.FC<TestSeriesScreenProps> = ({
  courseId,
  onBack,
  onFinishQuiz,
}) => {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  type ScreenState = 'loading' | 'access_denied' | 'no_questions' | 'intro' | 'quiz' | 'result';

  const [screen, setScreen] = useState<ScreenState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [courseTitle, setCourseTitle] = useState('');
  const [userProgress, setUserProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Quiz state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [passed, setPassed] = useState(false);
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(600);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        if (!user) {
          setErrorMsg('Please log in to access the test series.');
          setScreen('access_denied');
          return;
        }

        const isAdmin = user.role === 'admin' || user.originalRole === 'superadmin' || user.originalRole === 'admin';

        if (!isAdmin) {
          const progress = await getUserCourseProgress(user.uid, courseId);
          setUserProgress(progress);
          if (progress < 100) {
            setErrorMsg(
              `You need to complete 100% of the course before taking the exam.\n\nYour current progress: ${progress}%\n\nFinish all lessons to unlock this test.`
            );
            setScreen('access_denied');
            return;
          }
        }

        const [course, qs] = await Promise.all([
          courseService.getCourseById(courseId),
          quizService.getQuestionsForCourse(courseId),
        ]);

        setCourseTitle(course?.title || 'Final Exam');

        if (!qs || qs.length === 0) {
          setScreen('no_questions');
          return;
        }

        setQuestions(qs);
        setSecondsLeft(qs.length * SECONDS_PER_QUESTION);
        setScreen('intro');
      } catch (e: any) {
        console.error('[TestSeriesScreen] init error:', e);
        setErrorMsg('Failed to load the test. Please try again.');
        setScreen('access_denied');
      }
    };
    init();
  }, [courseId, user]);

  useEffect(() => {
    if (screen !== 'quiz' || quizFinished) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [screen, quizFinished]);

  const handleAutoSubmit = () => {
    Alert.alert('Time Up!', 'Time expired — submitting your answers now.');
    finishQuiz();
  };

  const finishQuiz = async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    let correct = 0;
    questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctIndex) correct++;
    });

    const threshold = Math.ceil(questions.length * PASS_PERCENT);
    const didPass = correct >= threshold;

    setScore(correct);
    setPassed(didPass);
    setQuizFinished(true);
    setScreen('result');

    if (user) {
      setSubmitting(true);
      try {
        await quizService.submitQuizResult(
          user.uid,
          courseId,
          courseTitle,
          user.displayName || user.email || 'Student',
          correct,
          questions.length,
          didPass
        );
      } catch (e) {
        console.warn('[TestSeriesScreen] Failed to save result:', e);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleSelect = (optIdx: number) => {
    const q = questions[currentIdx];
    setSelectedAnswers({ ...selectedAnswers, [q.id]: optIdx });
  };

  const toggleFlag = () => {
    const q = questions[currentIdx];
    setFlaggedQuestions({ ...flaggedQuestions, [q.id]: !flaggedQuestions[q.id] });
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedAnswers({});
    setFlaggedQuestions({});
    setQuizFinished(false);
    setPassed(false);
    setScore(0);
    setSecondsLeft(questions.length * SECONDS_PER_QUESTION);
    setScreen('quiz');
  };

  if (screen === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading test series...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'access_denied') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onBack} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
            <Text style={[styles.headerBackText, { color: colors.text }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Access Verification</Text>
        </View>
        <View style={[styles.center, { padding: 24 }]}>
          <View style={styles.lockIconContainer}>
            <Ionicons name="lock-closed" size={48} color="#EF4444" />
          </View>
          <Text style={[styles.bigTitle, { color: colors.text }]}>Exam Access Locked</Text>
          <Text style={styles.subText}>{errorMsg}</Text>
          {userProgress > 0 && (
            <View style={styles.progressPreview}>
              <View style={styles.progressPreviewRow}>
                <Text style={styles.progressPreviewLabel}>Current Course Completion</Text>
                <Text style={[styles.progressPreviewPct, { color: '#4F46E5' }]}>{userProgress}%</Text>
              </View>
              <View style={styles.progressPreviewBg}>
                <View style={[styles.progressPreviewFill, { width: `${userProgress}%`, backgroundColor: '#4F46E5' }]} />
              </View>
            </View>
          )}
          <TouchableOpacity style={styles.primaryActionBtn} onPress={onBack}>
            <Ionicons name="book-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryActionBtnText}>Go Back to Course</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'no_questions') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onBack} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
            <Text style={[styles.headerBackText, { color: colors.text }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{courseTitle}</Text>
        </View>
        <View style={[styles.center, { padding: 24 }]}>
          <View style={styles.noQuestionsIconContainer}>
            <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
          </View>
          <Text style={[styles.bigTitle, { color: colors.text }]}>Exam Under Review</Text>
          <Text style={styles.subText}>
            The superadmin is currently reviewing or uploading test queries for this course syllabus.{'\n\n'}Please retry at a later time.
          </Text>
          <TouchableOpacity style={styles.primaryActionBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryActionBtnText}>Back to Syllabus</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'intro') {
    const totalSecs = questions.length * SECONDS_PER_QUESTION;
    const passCount = Math.ceil(questions.length * PASS_PERCENT);
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onBack} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
            <Text style={[styles.headerBackText, { color: colors.text }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{courseTitle}</Text>
        </View>
        <ScrollView contentContainerStyle={[styles.bodyContent, { paddingBottom: 40 + insets.bottom }]}>
          <View style={styles.introBanner}>
            <View style={styles.introIconBadge}>
              <Ionicons name="school" size={40} color="#4F46E5" />
            </View>
            <Text style={styles.introBannerTitle}>Course Certification Exam</Text>
            <Text style={styles.introBannerSub}>{courseTitle}</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Ionicons name="help-circle-outline" size={24} color="#4B5563" style={{ marginBottom: 4 }} />
              <Text style={styles.infoCardValue}>{questions.length}</Text>
              <Text style={styles.infoCardLabel}>Total Questions</Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="time-outline" size={24} color="#4B5563" style={{ marginBottom: 4 }} />
              <Text style={styles.infoCardValue}>{formatTime(totalSecs)}</Text>
              <Text style={styles.infoCardLabel}>Time Allowed</Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="ribbon-outline" size={24} color="#4B5563" style={{ marginBottom: 4 }} />
              <Text style={styles.infoCardValue}>{Math.round(PASS_PERCENT * 100)}%</Text>
              <Text style={styles.infoCardLabel}>Passing Grade</Text>
            </View>
          </View>

          <View style={styles.rulesBox}>
            <View style={styles.rulesHeaderRow}>
              <Ionicons name="document-text" size={18} color="#0369A1" />
              <Text style={styles.rulesTitle}>Exam Instructions</Text>
            </View>
            {[
              `Verify answers for all ${questions.length} multiple choice questions.`,
              `A minimum score of ${passCount}/${questions.length} correct answers is required to qualify.`,
              'Use the Flag button to bookmark specific questions for later review.',
              'The timer runs continuously once the exam starts and cannot be paused.',
              'Upon successful completion, a formal course certificate will be instantly issued.',
            ].map((rule, i) => (
              <View key={i} style={styles.ruleRow}>
                <Ionicons name="checkmark-circle" size={16} color="#0EA5E9" style={{ marginTop: 2 }} />
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => setScreen('quiz')}
            activeOpacity={0.85}
          >
            <Text style={styles.startBtnText}>Start Exam</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'result') {
    const passThreshold = Math.ceil(questions.length * PASS_PERCENT);
    const pct = Math.round((score / questions.length) * 100);
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onBack} style={styles.headerBackButton}>
            <Ionicons name="close" size={24} color={colors.text} />
            <Text style={[styles.headerBackText, { color: colors.text }]}>Exit</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Exam Summary</Text>
        </View>
        <ScrollView contentContainerStyle={[styles.bodyContent, { paddingBottom: 40 + insets.bottom }]}>
          {submitting ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={[styles.loadingText, { color: colors.text, marginTop: 16 }]}>Saving performance record...</Text>
            </View>
          ) : (
            <>
              <View style={[styles.resultIconWrapper, { backgroundColor: passed ? '#D1FAE5' : '#FEE2E2' }]}>
                <Ionicons 
                  name={passed ? "trophy" : "alert-circle"} 
                  size={56} 
                  color={passed ? "#10B981" : "#EF4444"} 
                />
              </View>
              <Text style={[styles.resultTitle, { color: colors.text }]}>
                {passed ? 'Exam Passed successfully!' : 'Passing Criteria Not Met'}
              </Text>

              <View style={styles.scoreCard}>
                <View style={styles.scoreItem}>
                  <Text style={[styles.scoreNum, { color: '#10B981' }]}>{score}</Text>
                  <Text style={styles.scoreLabel}>Correct Answers</Text>
                </View>
                <View style={styles.scoreDivider} />
                <View style={styles.scoreItem}>
                  <Text style={[styles.scoreNum, { color: '#EF4444' }]}>{questions.length - score}</Text>
                  <Text style={styles.scoreLabel}>Incorrect Answers</Text>
                </View>
                <View style={styles.scoreDivider} />
                <View style={styles.scoreItem}>
                  <Text style={[styles.scoreNum, { color: passed ? '#10B981' : '#EF4444' }]}>{pct}%</Text>
                  <Text style={styles.scoreLabel}>Percentage</Text>
                </View>
              </View>

              <Text style={styles.resultMsg}>
                {passed
                  ? `Excellent score! You obtained ${score}/${questions.length} marks. A verified digital completion certificate is now generated and linked to your profile.`
                  : `You obtained ${score}/${questions.length} marks. An aggregate score of ${Math.round(PASS_PERCENT * 100)}% (${passThreshold} correct responses) is required to pass. Retake the lessons and try again.`}
              </Text>

              <Text style={[styles.reviewTitle, { color: colors.text }]}>Detailed Review</Text>
              {questions.map((q, qi) => {
                const userAns = selectedAnswers[q.id];
                const isCorrect = userAns === q.correctIndex;
                return (
                  <View
                    key={q.id}
                    style={[
                      styles.reviewCard,
                      { borderColor: isCorrect ? '#10B981' : userAns !== undefined ? '#EF4444' : '#E5E7EB' }
                    ]}
                  >
                    <Text style={[styles.reviewQ, { color: colors.text }]}>
                      {qi + 1}. {q.text}
                    </Text>
                    {q.options.map((opt, oi) => {
                      const isCorrectOpt = oi === q.correctIndex;
                      const isUserOpt = oi === userAns;
                      return (
                        <View key={oi} style={styles.reviewOptRow}>
                          <View style={styles.reviewStatusIconCol}>
                            {isCorrectOpt && <Ionicons name="checkmark-sharp" size={16} color="#059669" />}
                            {isUserOpt && !isCorrectOpt && <Ionicons name="close-sharp" size={16} color="#DC2626" />}
                          </View>
                          <Text
                            style={[
                              styles.reviewOpt,
                              isCorrectOpt && styles.reviewCorrect,
                              isUserOpt && !isCorrectOpt && styles.reviewWrong,
                            ]}
                          >
                            {opt}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}

              <View style={styles.resultActions}>
                {passed ? (
                  <TouchableOpacity
                    style={styles.primaryActionBtn}
                    onPress={() => onFinishQuiz(true)}
                  >
                    <Ionicons name="ribbon-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryActionBtnText}>View Course Certificate</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.primaryActionBtn, { flex: 1 }]}
                      onPress={handleRestart}
                    >
                      <Ionicons name="refresh-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.primaryActionBtnText}>Retry Exam</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.secondaryActionBtn, { flex: 1 }]}
                      onPress={() => onFinishQuiz(false)}
                    >
                      <Ionicons name="book-outline" size={20} color="#4F46E5" style={{ marginRight: 6 }} />
                      <Text style={styles.secondaryActionBtnText}>Return to Course</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── QUIZ screen ─────────────────────────────────────────────
  const question = questions[currentIdx];
  const selectedOpt = selectedAnswers[question?.id];
  const isFlagged = flaggedQuestions[question?.id] || false;
  const answeredCount = Object.keys(selectedAnswers).length;
  const isTimeLow = secondsLeft <= 60;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => Alert.alert('Exit Exam', 'Are you sure you want to exit? Your progress will be lost.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Exit', style: 'destructive', onPress: onBack },
          ])}
          style={styles.headerBackButton}
        >
          <Ionicons name="close" size={24} color="#EF4444" />
          <Text style={[styles.headerBackText, { color: '#EF4444', fontWeight: '700' }]}>Exit</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{courseTitle}</Text>
        <View style={[styles.timerBadge, isTimeLow && styles.timerBadgeLow]}>
          <Ionicons name="time" size={16} color={isTimeLow ? "#EF4444" : "#4B5563"} style={{ marginRight: 4 }} />
          <Text style={[styles.timerText, isTimeLow && styles.timerLow]}>
            {formatTime(secondsLeft)}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: 20 + insets.bottom }]}
      >
        {/* Progress header & grid */}
        <View style={styles.progressHeader}>
          <View style={styles.progressHeaderInfoRow}>
            <Text style={styles.progressLabel}>
              Question {currentIdx + 1} of {questions.length}
            </Text>
            <Text style={styles.progressSubLabel}>
              {answeredCount} answered · {questions.length - answeredCount} remaining
            </Text>
          </View>
          <View style={styles.dotsRow}>
            {questions.map((q, idx) => {
              const isAnswered = selectedAnswers[q.id] !== undefined;
              const isActive = idx === currentIdx;
              const isFlaggedDot = flaggedQuestions[q.id];
              return (
                <TouchableOpacity
                  key={q.id}
                  style={[
                    styles.dot,
                    isActive && styles.dotActive,
                    isAnswered && !isActive && styles.dotAnswered,
                    isFlaggedDot && styles.dotFlagged,
                  ]}
                  onPress={() => setCurrentIdx(idx)}
                >
                  {isFlaggedDot ? (
                    <Ionicons name="flag" size={11} color="#EF4444" />
                  ) : (
                    <Text style={[
                      styles.dotText,
                      isActive && styles.dotTextActive,
                      isAnswered && !isActive && styles.dotTextAnswered
                    ]}>{idx + 1}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${((currentIdx + 1) / questions.length) * 100}%` }]} />
        </View>

        {/* Question Panel */}
        <View style={styles.questionPanel}>
          <Text style={[styles.questionText, { color: colors.text }]}>{question.text}</Text>
        </View>

        {/* Options List */}
        {question.options.map((opt, idx) => {
          const isSelected = selectedOpt === idx;
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
              onPress={() => handleSelect(idx)}
              activeOpacity={0.7}
            >
              <View style={[styles.optionRadio, isSelected && styles.optionRadioSelected]}>
                {isSelected && <View style={styles.optionRadioInner} />}
              </View>
              <Text style={[styles.optionLabel, { color: colors.text }, isSelected && styles.optionLabelSelected]}>
                {['A','B','C','D','E'][idx]}. {opt}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Flag Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.flagBtn, isFlagged && styles.flagBtnActive]}
            onPress={toggleFlag}
          >
            <Ionicons 
              name={isFlagged ? "flag" : "flag-outline"} 
              size={16} 
              color={isFlagged ? "#EF4444" : "#4B5563"} 
              style={{ marginRight: 6 }} 
            />
            <Text style={[styles.flagBtnText, isFlagged && styles.flagBtnTextActive]}>
              {isFlagged ? 'Flagged for Review' : 'Flag for Review'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Navigation Action Row */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, currentIdx === 0 && styles.navBtnDisabled]}
            disabled={currentIdx === 0}
            onPress={() => setCurrentIdx(currentIdx - 1)}
          >
            <Ionicons name="arrow-back" size={18} color={currentIdx === 0 ? "#9CA3AF" : "#4F46E5"} />
            <Text style={[styles.navBtnText, { color: currentIdx === 0 ? "#9CA3AF" : "#4F46E5" }]}>Prev</Text>
          </TouchableOpacity>

          {currentIdx === questions.length - 1 ? (
            <TouchableOpacity
              style={[
                styles.submitBtn,
                answeredCount < questions.length && styles.submitBtnDisabled
              ]}
              onPress={() => {
                if (answeredCount < questions.length) {
                  Alert.alert(
                    'Unanswered Questions',
                    `You have ${questions.length - answeredCount} unanswered question(s). Submit anyway?`,
                    [
                      { text: 'Review', style: 'cancel' },
                      { text: 'Submit', style: 'destructive', onPress: finishQuiz },
                    ]
                  );
                } else {
                  Alert.alert('Submit Exam', 'Are you sure you want to submit and complete the exam?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Submit', onPress: finishQuiz },
                  ]);
                }
              }}
            >
              <Text style={styles.submitBtnText}>Submit Exam</Text>
              <Ionicons name="checkmark-done" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.navBtnActive}
              onPress={() => setCurrentIdx(currentIdx + 1)}
            >
              <Text style={styles.navBtnActiveText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 14, fontWeight: '600' },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    justifyContent: 'space-between',
  },
  headerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 12,
  },
  headerBackText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 4,
  },
  headerTitle: { fontSize: 15, fontWeight: '800', flex: 1, textAlign: 'center', marginHorizontal: 8 },
  
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  timerBadgeLow: {
    backgroundColor: '#FEE2E2',
  },
  timerText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  timerLow: { color: '#EF4444' },

  scrollContent: { flex: 1 },
  bodyContent: { padding: 20, flexGrow: 1 },

  // Access Denied / Empty
  lockIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  noQuestionsIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  bigTitle: { fontSize: 22, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  subText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  progressPreview: { width: '100%', marginTop: 10, marginBottom: 24 },
  progressPreviewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressPreviewLabel: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  progressPreviewPct: { fontSize: 13, fontWeight: '800' },
  progressPreviewBg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressPreviewFill: { height: '100%', borderRadius: 4 },

  // Intro
  introBanner: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  introIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  introBannerTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  introBannerSub: { fontSize: 13, color: '#64748B', textAlign: 'center', fontWeight: '500' },
  
  infoGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  infoCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  infoCardValue: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 2, marginTop: 4 },
  infoCardLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600', textAlign: 'center' },
  
  rulesBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  rulesHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  rulesTitle: { fontSize: 14, fontWeight: '800', color: '#0369A1' },
  ruleRow: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  ruleText: { fontSize: 13, color: '#374151', flex: 1, lineHeight: 20 },
  startBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  startBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Quiz
  progressHeader: { marginBottom: 16 },
  progressHeaderInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressLabel: { fontSize: 13, color: '#111827', fontWeight: '700' },
  progressSubLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  dotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  dotAnswered: { backgroundColor: '#D1FAE5', borderColor: '#10B981' },
  dotFlagged: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  dotText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
  dotTextActive: { color: '#4F46E5' },
  dotTextAnswered: { color: '#10B981' },

  progressBarBg: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', backgroundColor: '#4F46E5', borderRadius: 3 },
  
  questionPanel: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  questionText: { fontSize: 16, fontWeight: '700', lineHeight: 24 },
  
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 1,
  },
  optionCardSelected: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionRadioSelected: { borderColor: '#4F46E5' },
  optionRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4F46E5' },
  optionLabel: { fontSize: 14, fontWeight: '600', flex: 1, lineHeight: 20 },
  optionLabelSelected: { fontWeight: '700', color: '#312E81' },
  
  actionRow: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 24,
  },
  flagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  flagBtnActive: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  flagBtnText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  flagBtnTextActive: { color: '#EF4444' },
  
  navRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#4F46E5',
    borderRadius: 10,
    height: 48,
    flex: 1,
    gap: 6,
  },
  navBtnDisabled: {
    borderColor: '#E5E7EB',
  },
  navBtnText: { fontSize: 14, fontWeight: '700' },
  navBtnActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    height: 48,
    flex: 1,
    gap: 6,
  },
  navBtnActiveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#10B981',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
  },
  submitBtnDisabled: { backgroundColor: '#A7F3D0' },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  // Result
  resultIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  resultTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 24 },
  scoreCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  scoreItem: { flex: 1, alignItems: 'center' },
  scoreNum: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  scoreLabel: { fontSize: 11, color: '#64748B', fontWeight: '600', textAlign: 'center' },
  scoreDivider: { width: 1, backgroundColor: '#E2E8F0' },
  resultMsg: { fontSize: 14, color: '#4B5563', lineHeight: 22, textAlign: 'center', marginBottom: 28 },
  reviewTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16 },
  reviewCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  reviewQ: { fontSize: 14, fontWeight: '700', marginBottom: 12, lineHeight: 20 },
  reviewOptRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  reviewStatusIconCol: { width: 24, justifyContent: 'center' },
  reviewOpt: { fontSize: 13, color: '#6B7280', flex: 1 },
  reviewCorrect: { color: '#059669', fontWeight: '700' },
  reviewWrong: { color: '#DC2626', fontWeight: '700' },
  
  resultActions: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 20 },
  primaryActionBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  primaryActionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  secondaryActionBtn: {
    borderWidth: 1.5,
    borderColor: '#4F46E5',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  secondaryActionBtnText: { color: '#4F46E5', fontSize: 14, fontWeight: '700' },
});
