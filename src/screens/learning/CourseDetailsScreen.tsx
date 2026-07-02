import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  useColorScheme,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { courseService, lmsService, Course } from '@/services/lms/lmsService';
import { Colors } from '@/constants/theme';
import { Spinner } from '@/components/loaders/Spinner';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/services/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { paymentService } from '@/services/payments/paymentService';
import { quizService } from '@/services/lms/quizService';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface CourseDetailsScreenProps {
  courseId: string;
  onBack: () => void;
  onWatchVideo: (courseId: string, lessonIndex: number) => void;
  onTakeTest?: (courseId: string) => void;
}

export const CourseDetailsScreen: React.FC<CourseDetailsScreenProps> = ({
  courseId,
  onBack,
  onWatchVideo,
  onTakeTest,
}) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [course, setCourse] = useState<Course | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasQuiz, setHasQuiz] = useState(false);

  // Checkout Modal State
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    setLoading(course === null);

    const unsubscribeCourse = onSnapshot(
      doc(db, 'courses', courseId),
      (docSnap) => {
        if (docSnap.exists()) {
          setCourse({ id: docSnap.id, ...docSnap.data() } as Course);
        }
        setLoading(false);
      },
      async (err) => {
        console.warn('Error listening to course details:', err);
        const details = await courseService.getCourseById(courseId);
        setCourse(details);
        setLoading(false);
      }
    );

    quizService.getQuestionsForCourse(courseId).then((quizQs) => {
      setHasQuiz(quizQs && quizQs.length > 0);
    }).catch(() => setHasQuiz(false));

    let unsubscribeUser: (() => void) | undefined;
    let unsubscribeEnrollment: (() => void) | undefined;
    if (user) {
      unsubscribeUser = onSnapshot(
        doc(db, 'users', user.uid),
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();

            const ids = new Set<string>();
            ['enrolledCourses', 'purchasedCourses', 'courses'].forEach((field) => {
              const val = data[field];
              if (Array.isArray(val)) {
                val.forEach((item: any) => {
                  if (typeof item === 'string') ids.add(item);
                  else if (item && typeof item === 'object') {
                    if (item.id) ids.add(item.id);
                    else if (item.courseId) ids.add(item.courseId);
                  }
                });
              } else if (val && typeof val === 'object') {
                Object.keys(val).forEach((k) => { if (data[field][k]) ids.add(k); });
              }
            });

            if (data.seekerProfile) {
              const sp = data.seekerProfile;
              ['enrolledCourses', 'purchasedCourses'].forEach((field) => {
                if (Array.isArray(sp[field])) {
                  sp[field].forEach((item: any) => {
                    if (typeof item === 'string') ids.add(item);
                    else if (item && item.id) ids.add(item.id);
                  });
                }
              });
            }

            if (ids.has(courseId)) setIsEnrolled(true);

            const progressVal = (data.courseProgress && data.courseProgress[courseId]) || 0;
            setProgress(progressVal);
          }
        },
        (err) => console.error('Error listening to user enroll progress in CourseDetails:', err)
      );

      unsubscribeEnrollment = onSnapshot(
        doc(db, 'enrollments', `${user.uid}_${courseId}`),
        (docSnap) => {
          if (docSnap.exists()) {
            setIsEnrolled(true);
          }
        },
        (err) => {}
      );
    }

    return () => {
      unsubscribeCourse();
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeEnrollment) unsubscribeEnrollment();
    };
  }, [courseId, user]);

  const handleEnrollOrBuy = async () => {
    if (!user || !course) return;
    if (course.price > 0) {
      setCheckoutVisible(true);
    } else {
      setActionLoading(true);
      try {
        await courseService.enrollInCourse(user.uid, course.id);
        setIsEnrolled(true);
        Alert.alert('Success', `You have successfully enrolled in ${course.title}!`);
      } catch (e) {
        Alert.alert('Enrollment Failed', 'Could not complete enrollment.');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleProcessCheckout = async () => {
    if (!user || !course) return;
    
    // Validate card details using paymentService
    if (!paymentService.validateCardDetails(cardNumber, expiry, cvc)) {
      Alert.alert('Invalid Card Details', 'Please check your card number (15-16 digits), expiry MM/YY (4 digits), and CVC (3 digits).');
      return;
    }

    setPaymentLoading(true);
    try {
      const result = await paymentService.processPayment(course.price, `Course: ${course.title}`);
      if (result.success) {
        await courseService.enrollInCourse(user.uid, course.id);
        setIsEnrolled(true);
        setCheckoutVisible(false);
        setCardNumber('');
        setExpiry('');
        setCvc('');
        Alert.alert(
          'Payment Successful',
          `You have purchased and enrolled in ${course.title}!\n\nTransaction ID: ${result.transactionId}`
        );
      } else {
        Alert.alert('Payment Failed', result.errorMessage || 'Transaction could not be completed.');
      }
    } catch (e: any) {
      Alert.alert('Payment Error', e.message || 'An unexpected checkout error occurred.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleTakeQuiz = () => {
    if (!course) return;
    const isUserAdmin = user?.role === 'admin';
    if (progress < 100 && !isUserAdmin) {
      Alert.alert(
        'Course Incomplete',
        `You must complete all lessons (100% progress) before taking the final exam.\n\nYour progress: ${progress}%\n\nFinish all lessons to unlock the test.`
      );
      return;
    }
    if (!hasQuiz) {
      Alert.alert(
        'No Test Available',
        'The superadmin has not added test questions for this course yet. Please check back later.'
      );
      return;
    }
    if (onTakeTest) {
      onTakeTest(course.id);
    }
  };

  if (!course) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" />
        ) : (
          <>
            <Text style={[styles.errorText, { color: colors.text }]}>Course not found.</Text>
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
              <Text style={styles.backBtnText}>Go Back</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  const isAdmin = user?.role === 'admin';
  const isSeeker = user?.role === 'seeker';
  const isRecruiter = user?.role === 'recruiter';
  const isFreeCourse = course.price === 0 || (course as any).isFree === true;
  const isCourseEnrolledUser = user && course.enrolledUsers && course.enrolledUsers.includes(user.uid);
  const isEnrolledOrAdmin = isEnrolled || isFreeCourse || isCourseEnrolledUser || isAdmin;
  const isCourseComplete = progress >= 100;
  const canTakeQuiz = isCourseComplete || isAdmin;

  // Resolve syllabus items robustly from all potential fields
  let syllabusList: string[] = [];
  if (course.syllabus && Array.isArray(course.syllabus) && course.syllabus.length > 0) {
    syllabusList = course.syllabus;
  } else if (course.modules && Array.isArray(course.modules) && course.modules.length > 0) {
    const extracted: string[] = [];
    course.modules.forEach((m) => {
      if (m.lessons && Array.isArray(m.lessons)) {
        m.lessons.forEach((l) => extracted.push(l.title || `Lesson ${extracted.length + 1}`));
      }
    });
    if (extracted.length > 0) syllabusList = extracted;
  } else if ((course as any).lessons && Array.isArray((course as any).lessons) && (course as any).lessons.length > 0) {
    syllabusList = (course as any).lessons.map((l: any, idx: number) => l.title || `Lesson ${idx + 1}`);
  }

  if (syllabusList.length === 0) {
    const count = course.lessonsCount || 5;
    for (let i = 1; i <= count; i++) {
      syllabusList.push(`Lecture ${i}: Course Core Concepts & Hands-on Training`);
    }
  }

  const courseImageUrl = course.imageUrl || course.thumbnail || null;
  const courseCategory = course.category || '';
  const courseInstructor = course.instructor || '';
  const courseDuration = course.duration || '';
  const courseLessonsCount = course.lessonsCount || syllabusList.length || 0;
  const courseRating = course.rating || null;
  const courseDescription = course.description || '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
          <Text style={[styles.headerBackText, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          Course Overview
        </Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}>
        {courseImageUrl ? (
          <Image source={{ uri: courseImageUrl }} style={styles.bannerImage} />
        ) : (
          <View style={[styles.bannerImage, { backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="book" size={48} color="#FFFFFF" />
          </View>
        )}

        <View style={styles.bodyContent}>
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryText}>{courseCategory}</Text>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{course.title}</Text>
          
          <Text style={styles.instructor}>
            Instructed by <Text style={styles.instructorName}>{courseInstructor}</Text>
          </Text>

          <View style={styles.metaRow}>
            {!!courseDuration && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
                <Text style={styles.metaText}>{courseDuration}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Ionicons name="play-circle-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
              <Text style={styles.metaText}>{courseLessonsCount} lessons</Text>
            </View>
            {courseRating !== null && (
              <View style={styles.metaItem}>
                <Ionicons name="star" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                <Text style={styles.metaText}>{courseRating.toFixed(1)} rating</Text>
              </View>
            )}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
          <Text style={styles.description}>{courseDescription}</Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Lessons & Syllabus</Text>
          {syllabusList.length === 0 ? (
            <View style={{ padding: 16, backgroundColor: '#F3F4F6', borderRadius: 8 }}>
              <Text style={{ color: '#6B7280', fontSize: 14 }}>No syllabus has been added to this course yet.</Text>
            </View>
          ) : (
            syllabusList.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                style={[
                  styles.syllabusItem, 
                  isEnrolledOrAdmin ? styles.syllabusItemEnrolled : null
                ]}
                disabled={!isEnrolledOrAdmin}
                onPress={() => onWatchVideo(course.id, index)}
              >
                <View style={styles.bulletPoint}>
                  <Text style={styles.bulletText}>{index + 1}</Text>
                </View>
                <Text style={[styles.syllabusText, { color: colors.text }]}>{item}</Text>
                {isEnrolledOrAdmin && (
                  <View style={styles.playIconContainer}>
                    <Ionicons name="play-circle" size={16} color="#4F46E5" style={{ marginRight: 4 }} />
                    <Text style={styles.playIconText}>Watch</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
          {/* Course Progress Bar (for enrolled users) */}
          {isEnrolledOrAdmin && (
            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressSectionLabel}>Your Progress</Text>
                <Text style={[styles.progressSectionPct, { color: isCourseComplete ? '#10B981' : '#208AEF' }]}>
                  {progress}% {isCourseComplete ? '✓ Complete' : ''}
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[
                  styles.progressBarFillCourse,
                  { width: `${progress}%`, backgroundColor: isCourseComplete ? '#10B981' : '#208AEF' }
                ]} />
              </View>
            </View>
          )}

          {/* Quiz Unlock Banner — shown only when 100% complete AND superadmin quiz exists */}
          {isEnrolledOrAdmin && isCourseComplete && hasQuiz && (
            <TouchableOpacity style={styles.quizUnlockBanner} onPress={handleTakeQuiz} activeOpacity={0.85}>
              <View style={styles.quizUnlockLeft}>
                <View style={styles.quizUnlockIconContainer}>
                  <Ionicons name="school" size={24} color="#10B981" />
                </View>
                <View>
                  <Text style={styles.quizUnlockTitle}>Final Exam Unlocked!</Text>
                  <Text style={styles.quizUnlockSub}>Course completed – take the test to earn your certificate</Text>
                </View>
              </View>
              <Ionicons name="arrow-forward" size={18} color="#10B981" />
            </TouchableOpacity>
          )}

          {/* Still in progress notice — show when enrolled but not complete and quiz exists */}
          {isEnrolledOrAdmin && !isCourseComplete && hasQuiz && (
            <View style={styles.quizLockedBanner}>
              <View style={styles.quizLockedIconContainer}>
                <Ionicons name="lock-closed" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quizLockedTitle}>Final Exam Locked</Text>
                <Text style={styles.quizLockedSub}>Complete all lessons to unlock the test ({progress}% done)</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom, height: 80 + insets.bottom }]}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Total Price</Text>
          <Text style={[styles.priceValue, { color: colors.text }]}>
            {course.price === 0 ? 'Free' : `₹${course.price}`}
          </Text>
        </View>
        
        {isSeeker || isAdmin ? (
          isEnrolledOrAdmin ? (
            <View style={styles.enrolledActions}>
              {/* Quiz button: only show if BOTH complete AND quiz exists */}
              {onTakeTest && hasQuiz && canTakeQuiz && (
                <TouchableOpacity
                  style={[styles.smallBtn, styles.examBtn]}
                  onPress={handleTakeQuiz}
                >
                  <Ionicons name="document-text-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.examBtnText}>Take Exam</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.smallBtn, styles.resumeBtn]}
                onPress={() => onWatchVideo(course.id, 0)}
              >
                <Ionicons name={isCourseComplete ? "refresh-outline" : "play-circle-outline"} size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.resumeBtnText}>{isCourseComplete ? 'Revisit' : 'Continue'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Button
              title={course.price === 0 ? "Enroll Now" : "Buy Course"}
              onPress={handleEnrollOrBuy}
              loading={actionLoading}
              style={styles.actionBtn}
            />
          )
        ) : isRecruiter ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>Recruiter Account</Text>
          </View>
        ) : (
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>Access Restricted</Text>
          </View>
        )}
      </View>

      {/* Checkout Modal */}
      <Modal
        visible={checkoutVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCheckoutVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Secure Checkout</Text>
              <TouchableOpacity onPress={() => setCheckoutVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              {/* Invoice details */}
              <View style={styles.invoiceCard}>
                <Text style={styles.invoiceCourseTitle}>{course?.title}</Text>
                <Text style={styles.invoiceInstructor}>Instructor: {course?.instructor}</Text>
                <View style={styles.invoiceDivider} />
                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceLabel}>Course Price</Text>
                  <Text style={styles.invoiceValue}>₹{(course?.price || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceLabel}>Tax & Fees</Text>
                  <Text style={styles.invoiceValue}>₹0.00</Text>
                </View>
                <View style={styles.invoiceDivider} />
                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceTotalLabel}>Total Due</Text>
                  <Text style={styles.invoiceTotalValue}>₹{(course?.price || 0).toFixed(2)}</Text>
                </View>
              </View>

              {/* Payment form */}
              <Text style={[styles.paymentTitle, { color: colors.text }]}>Card Information</Text>
              
              <Input
                label="Card Number"
                placeholder="4111 2222 3333 4444"
                keyboardType="numeric"
                value={cardNumber}
                onChangeText={setCardNumber}
                maxLength={16}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Expiry (MM/YY)"
                    placeholder="12/28"
                    keyboardType="numeric"
                    value={expiry}
                    onChangeText={setExpiry}
                    maxLength={5}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Input
                    label="CVC"
                    placeholder="123"
                    keyboardType="numeric"
                    secureTextEntry
                    value={cvc}
                    onChangeText={setCvc}
                    maxLength={3}
                  />
                </View>
              </View>

              <Button
                title={paymentLoading ? "Processing Payment..." : `Pay ₹${(course?.price || 0).toFixed(2)}`}
                onPress={handleProcessCheckout}
                loading={paymentLoading}
                style={styles.payBtn}
              />

              <View style={styles.securityNoteRow}>
                <Ionicons name="lock-closed-outline" size={13} color="#9CA3AF" style={{ marginRight: 6 }} />
                <Text style={styles.paymentSecurityNote}>
                  256-bit SSL encrypted connection. Payment details are simulated.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  iconButton: {
    paddingRight: 16,
  },
  backArrow: {
    fontSize: 16,
    color: '#208AEF',
    fontWeight: '600',
  },
  headerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 16,
  },
  headerBackText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  bannerImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#E5E7EB',
  },
  bodyContent: {
    padding: 20,
  },
  categoryContainer: {
    backgroundColor: '#E6F4FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  categoryText: {
    color: '#208AEF',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    lineHeight: 26,
  },
  instructor: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  instructorName: {
    fontWeight: '600',
    color: '#111827',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 12,
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 24,
  },
  syllabusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  syllabusItemEnrolled: {
    backgroundColor: '#ffffff',
    borderColor: '#208AEF',
  },
  bulletPoint: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E6F4FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulletText: {
    color: '#208AEF',
    fontSize: 12,
    fontWeight: '700',
  },
  syllabusText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  playIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playIconText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '700',
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#208AEF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  priceContainer: {
    justifyContent: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  actionBtn: {
    flex: 1,
    marginLeft: 24,
    maxWidth: 200,
  },
  enrolledActions: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
    justifyContent: 'flex-end',
    marginLeft: 16,
  },
  smallBtn: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  testBtn: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  testBtnLocked: {
    backgroundColor: '#F9FAFB',
    borderColor: '#F3F4F6',
    opacity: 0.7,
  },
  testBtnText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 13,
  },
  testBtnTextLocked: {
    color: '#9CA3AF',
  },
  // Exam (unlocked quiz) button in bottom bar
  examBtn: {
    backgroundColor: '#10B981',
    flex: 1,
    maxWidth: 140,
  },
  examBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  resumeBtn: {
    backgroundColor: '#208AEF',
    flex: 1,
    maxWidth: 140,
  },
  resumeBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  // Course progress section inside syllabus area
  progressSection: {
    marginTop: 20,
    marginBottom: 8,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressSectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  progressSectionPct: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFillCourse: {
    height: '100%',
    borderRadius: 4,
  },
  // Quiz unlock banner (shown when complete)
  quizUnlockBanner: {
    marginTop: 16,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quizUnlockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  quizUnlockIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quizUnlockTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 2,
  },
  quizUnlockSub: {
    fontSize: 12,
    color: '#047857',
  },
  quizLockedBanner: {
    marginTop: 16,
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quizLockedIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quizLockedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  quizLockedSub: {
    fontSize: 12,
    color: '#B45309',
  },
  infoBox: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  infoBoxText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 20,
    color: '#6B7280',
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  invoiceCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
  },
  invoiceCourseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  invoiceInstructor: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  invoiceLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  invoiceValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  invoiceTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  invoiceTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#208AEF',
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  payBtn: {
    marginTop: 8,
    height: 52,
    borderRadius: 12,
  },
  securityNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  paymentSecurityNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
