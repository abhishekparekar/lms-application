import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { courseService, Course } from '@/services/lms/lmsService';
import { Colors } from '@/constants/theme';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/services/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { paymentService } from '@/services/payments/paymentService';
import { quizService } from '@/services/lms/quizService';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RazorpayCheckoutModal } from '@/components/modals/RazorpayCheckoutModal';

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
  const [progress, setProgress] = useState(0);
  const [hasQuiz, setHasQuiz] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'syllabus' | 'quiz'>('overview');

  // Checkout Modal State
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Razorpay States
  const [razorpayVisible, setRazorpayVisible] = useState(false);
  const [orderId, setOrderId] = useState('');

  useEffect(() => {
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
        () => {}
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
      try {
        await courseService.enrollInCourse(user.uid, course.id);
        setIsEnrolled(true);
        Alert.alert('Success', `You have successfully enrolled in ${course.title}!`);
      } catch {
        Alert.alert('Enrollment Failed', 'Could not complete enrollment.');
      }
    }
  };

  const handleProcessCheckout = async () => {
    if (!user || !course) return;

    setPaymentLoading(true);
    try {
      const order = await paymentService.createRazorpayOrder(course.price);
      if (order) {
        setOrderId(order.id);
        setRazorpayVisible(true);
      } else {
        Alert.alert('Checkout Initialization Failed', 'Could not create order with Razorpay. Please try again.');
      }
    } catch (e: any) {
      Alert.alert('Payment Error', e.message || 'An unexpected checkout error occurred.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePaymentSuccess = async (data: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => {
    if (!user || !course) return;

    setRazorpayVisible(false);
    setCheckoutVisible(false);
    setPaymentLoading(true);
    try {
      const verified = await paymentService.verifyPayment(
        data.razorpay_payment_id,
        data.razorpay_order_id,
        data.razorpay_signature
      );
      if (verified) {
        await courseService.enrollInCourse(user.uid, course.id);
        setIsEnrolled(true);
        Alert.alert(
          'Payment Successful! 🎉',
          `You have purchased and enrolled in ${course.title}!\n\nPayment ID: ${data.razorpay_payment_id}`
        );
      } else {
        Alert.alert('Verification Failed', 'Payment signature could not be verified.');
      }
    } catch (e: any) {
      Alert.alert('Enrollment Error', e.message || 'Payment was successful, but enrollment could not be processed. Please contact support.');
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
    if (onTakeTest) {
      onTakeTest(course.id);
    }
  };

  const handleShareCourse = async () => {
    if (!course) return;
    try {
      const priceText = course.price === 0 ? 'FREE' : `₹${course.price}`;
      const appPackageUrl = `https://play.google.com/store/apps/details?id=com.lmsjobportal1.app`;
      const appCourseLink = `${appPackageUrl}&referrer=course_id%3D${course.id}`;
      const deepLink = `lmsjobportal://course/${course.id}`;

      const shareMsg = `🎓 *${course.title}*\n\n👨‍🏫 Instructor: ${course.instructor || 'Expert Trainer'}\n⏱️ Duration: ${course.duration || '2h 30m'}\n💰 Price: ${priceText}\n\n📱 *Open Course in App*:\n${appCourseLink}\n\n📲 Download App on Play Store:\n${appPackageUrl}\n\nStart learning today on LMS Job Portal App!`;

      if (Platform.OS === 'android') {
        await Share.share({
          message: shareMsg,
          title: course.title,
        });
      } else {
        await Share.share({
          message: shareMsg,
          url: appCourseLink,
          title: course.title,
        });
      }
    } catch (e: any) {
      console.warn('Share error:', e.message);
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
      {/* Top Header Navigation Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack} style={styles.headerBackButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
          <Text style={[styles.headerBackText, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          Course Details
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={handleShareCourse}
            activeOpacity={0.7}
          >
            <Ionicons name="share-social" size={20} color="#4F46E5" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}>
        {/* Course Banner Card */}
        <View style={styles.bannerWrap}>
          {courseImageUrl ? (
            <Image source={{ uri: courseImageUrl }} style={styles.bannerImage} resizeMode="cover" />
          ) : (
            <View style={[styles.bannerImage, { backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="book" size={48} color="#FFFFFF" />
            </View>
          )}
          <View style={styles.bannerOverlayRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{courseCategory || 'General'}</Text>
            </View>
            <View style={[styles.priceBadge, { backgroundColor: course.price === 0 ? '#10B981' : '#0F172A' }]}>
              <Text style={styles.priceBadgeText}>
                {course.price === 0 ? 'FREE ACCESS' : `₹${course.price}`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bodyContent}>
          {/* Course Main Title & Instructor */}
          <Text style={[styles.title, { color: colors.text }]}>{course.title}</Text>
          
          <View style={styles.instructorRow}>
            <View style={styles.instructorAvatar}>
              <Ionicons name="person" size={12} color="#4F46E5" />
            </View>
            <Text style={styles.instructorTxt}>
              Instructed by <Text style={styles.instructorNameTxt}>{courseInstructor || 'Expert Trainer'}</Text>
            </Text>
          </View>

          {/* Quick Metrics Bar */}
          <View style={styles.metaRow}>
            {!!courseDuration && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color="#4F46E5" style={{ marginRight: 4 }} />
                <Text style={styles.metaText}>{courseDuration}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Ionicons name="play-circle-outline" size={14} color="#4F46E5" style={{ marginRight: 4 }} />
              <Text style={styles.metaText}>{courseLessonsCount} lessons</Text>
            </View>
            {courseRating !== null && (
              <View style={styles.metaItem}>
                <Ionicons name="star" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                <Text style={styles.metaText}>{(courseRating || 4.8).toFixed(1)} rating</Text>
              </View>
            )}
          </View>

          {/* Tab Switcher Bar */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'overview' && styles.tabBtnActive]}
              onPress={() => setActiveTab('overview')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
                Overview
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'syllabus' && styles.tabBtnActive]}
              onPress={() => setActiveTab('syllabus')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === 'syllabus' && styles.tabTextActive]}>
                Syllabus ({syllabusList.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'quiz' && styles.tabBtnActive]}
              onPress={() => setActiveTab('quiz')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === 'quiz' && styles.tabTextActive]}>
                Test Series 🎓
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <View style={styles.tabContentBlock}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>About This Course</Text>
              <Text style={styles.description}>
                {courseDescription || 'This course offers structured step-by-step training, practical hands-on exercises, and expert guidance to help you master core concepts.'}
              </Text>

              {/* Course Features Grid */}
              <View style={styles.highlightsGrid}>
                <View style={styles.highlightCard}>
                  <Ionicons name="infinite-outline" size={20} color="#4F46E5" />
                  <Text style={styles.highlightTitle}>Lifetime Access</Text>
                  <Text style={styles.highlightSub}>Learn at your own pace</Text>
                </View>

                <View style={styles.highlightCard}>
                  <Ionicons name="ribbon-outline" size={20} color="#10B981" />
                  <Text style={styles.highlightTitle}>Certificate</Text>
                  <Text style={styles.highlightSub}>On course completion</Text>
                </View>
              </View>
            </View>
          )}

          {/* Tab 2: Syllabus & Lessons */}
          {activeTab === 'syllabus' && (
            <View style={styles.tabContentBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Course Lessons</Text>
                <Text style={styles.sectionBadgeText}>{syllabusList.length} Total</Text>
              </View>

              {syllabusList.length === 0 ? (
                <View style={{ padding: 16, backgroundColor: '#F8FAFC', borderRadius: 12 }}>
                  <Text style={{ color: '#64748B', fontSize: 14 }}>No lessons published yet.</Text>
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
                    activeOpacity={0.85}
                  >
                    <View style={styles.bulletPoint}>
                      <Text style={styles.bulletText}>{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.syllabusText, { color: colors.text }]} numberOfLines={2}>
                        {item}
                      </Text>
                      <Text style={styles.syllabusSubTxt}>Lesson {index + 1} • Video Tutorial</Text>
                    </View>
                    {isEnrolledOrAdmin ? (
                      <View style={styles.playIconContainer}>
                        <Ionicons name="play" size={14} color="#FFFFFF" />
                        <Text style={styles.playIconText}>Watch</Text>
                      </View>
                    ) : (
                      <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* Tab 3: Test Series & Quiz */}
          {activeTab === 'quiz' && (
            <View style={styles.tabContentBlock}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Final Assessment Test</Text>

              {isEnrolledOrAdmin ? (
                isCourseComplete && hasQuiz ? (
                  <TouchableOpacity style={styles.quizUnlockBanner} onPress={handleTakeQuiz} activeOpacity={0.85}>
                    <View style={styles.quizUnlockLeft}>
                      <View style={styles.quizUnlockIconContainer}>
                        <Ionicons name="school" size={24} color="#10B981" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.quizUnlockTitle}>🎉 Test Series Unlocked!</Text>
                        <Text style={styles.quizUnlockSub}>Tap here to take your final exam test</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#10B981" />
                  </TouchableOpacity>
                ) : hasQuiz ? (
                  <View style={styles.quizLockedBanner}>
                    <View style={styles.quizLockedIconContainer}>
                      <Ionicons name="lock-closed" size={20} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.quizLockedTitle}>Test Series Locked</Text>
                      <Text style={styles.quizLockedSub}>Complete all video lessons to unlock ({progress}% done)</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.quizLockedBanner}>
                    <View style={styles.quizLockedIconContainer}>
                      <Ionicons name="alert-circle-outline" size={20} color="#64748B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.quizLockedTitle}>No Test Series Yet</Text>
                      <Text style={styles.quizLockedSub}>Test questions for this course will be published soon.</Text>
                    </View>
                  </View>
                )
              ) : (
                <View style={styles.quizLockedBanner}>
                  <View style={styles.quizLockedIconContainer}>
                    <Ionicons name="lock-closed" size={20} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.quizLockedTitle}>Enrollment Required</Text>
                    <Text style={styles.quizLockedSub}>Enroll in this course to access the final exam test series.</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Student Progress Bar */}
          {isEnrolledOrAdmin && (
            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressSectionLabel}>Course Progress</Text>
                <Text style={[styles.progressSectionPct, { color: isCourseComplete ? '#10B981' : '#4F46E5' }]}>
                  {progress}% {isCourseComplete ? '✓ Completed' : ''}
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[
                  styles.progressBarFillCourse,
                  { width: `${progress}%`, backgroundColor: isCourseComplete ? '#10B981' : '#4F46E5' }
                ]} />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Active Sticky Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom, height: 76 + insets.bottom }]}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>TOTAL PRICE</Text>
          <View style={styles.priceRow}>
            {course.price > 0 && (
              <Text style={styles.strikePrice}>₹{Math.round(course.price * 2.5)}</Text>
            )}
            <Text style={[styles.priceValue, { color: course.price === 0 ? '#10B981' : '#0F172A' }]}>
              {course.price === 0 ? 'FREE' : `₹${course.price}`}
            </Text>
          </View>
        </View>
        
        <View style={styles.actionsContainer}>
          {isSeeker || isAdmin ? (
            isEnrolledOrAdmin ? (
              <View style={styles.enrolledActionsRow}>
                <TouchableOpacity
                  style={[styles.quizCompactBtn, !isCourseComplete && styles.quizCompactBtnLocked]}
                  onPress={handleTakeQuiz}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isCourseComplete ? "school" : "lock-closed"}
                    size={15}
                    color="#FFFFFF"
                  />
                  <Text style={styles.quizCompactBtnTxt}>
                    {isCourseComplete ? "Exam 🎓" : "Exam 🔒"}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.resumePrimaryBtn}
                  onPress={() => onWatchVideo(course.id, 0)}
                  activeOpacity={0.85}
                >
                  <Ionicons 
                    name={isCourseComplete ? "refresh" : "play"} 
                    size={16} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.resumePrimaryBtnTxt}>
                    {isCourseComplete ? 'Revisit Course' : 'Continue Learning'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.buyPrimaryBtn}
                onPress={handleEnrollOrBuy}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={course.price === 0 ? "flash" : "card-outline"}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.buyPrimaryBtnTxt}>
                  {course.price === 0 ? "Enroll Now • Free" : `Buy Now • ₹${course.price}`}
                </Text>
              </TouchableOpacity>
            )
          ) : isRecruiter ? (
            <View style={styles.recruiterBanner}>
              <Text style={styles.recruiterBannerText}>Employer Preview Mode</Text>
            </View>
          ) : (
            <View style={styles.recruiterBanner}>
              <Text style={styles.recruiterBannerText}>Access Restricted</Text>
            </View>
          )}
        </View>
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

              {/* Payment button */}
              <Button
                title={paymentLoading ? "Preparing Gateway..." : `Pay Securely with Razorpay`}
                onPress={handleProcessCheckout}
                loading={paymentLoading}
                style={styles.payBtn}
              />

              <View style={styles.securityNoteRow}>
                <Ionicons name="shield-checkmark" size={15} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={[styles.paymentSecurityNote, { color: '#10B981', fontWeight: '600' }]}>
                  Secured by Razorpay. All cards, UPI, netbanking accepted.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Razorpay Web Checkout Webview Modal */}
      <RazorpayCheckoutModal
        visible={razorpayVisible}
        amount={course?.price || 0}
        description={`Course Enrollment: ${course?.title}`}
        orderId={orderId}
        customerName={user?.seekerProfile?.fullName || user?.displayName || 'User'}
        customerEmail={user?.email || ''}
        customerPhone={user?.seekerProfile?.phone || '9999999999'}
        onSuccess={handlePaymentSuccess}
        onCancel={() => setRazorpayVisible(false)}
        onFailure={(errMsg) => {
          setRazorpayVisible(false);
          Alert.alert('Payment Failed', errMsg);
        }}
      />
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
    justifyContent: 'space-between',
    height: 52,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 10,
  },
  headerBackText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  bannerWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  bannerImage: {
    width: '100%',
    height: 190,
    backgroundColor: '#E2E8F0',
  },
  bannerOverlayRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  categoryBadgeText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '800',
  },
  priceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  priceBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  bodyContent: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 26,
    marginBottom: 8,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  instructorAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructorTxt: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  instructorNameTxt: {
    fontWeight: '700',
    color: '#0F172A',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  tabContentBlock: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  description: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  highlightsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  highlightCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    alignItems: 'flex-start',
  },
  highlightTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 6,
    marginBottom: 2,
  },
  highlightSub: {
    fontSize: 11,
    color: '#64748B',
  },
  syllabusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#F8FAFC',
  },
  syllabusItemEnrolled: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C7D2FE',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  bulletPoint: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulletText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '800',
  },
  syllabusText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  playIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  playIconText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  syllabusSubTxt: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
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
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 10,
  },
  priceContainer: {
    justifyContent: 'center',
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  strikePrice: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  actionsContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'flex-end',
  },
  enrolledActionsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    justifyContent: 'flex-end',
  },
  quizCompactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 14,
    elevation: 2,
  },
  quizCompactBtnLocked: {
    backgroundColor: '#D97706',
  },
  quizCompactBtnTxt: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  resumePrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
    elevation: 3,
  },
  resumePrimaryBtnTxt: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  buyPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    elevation: 3,
  },
  buyPrimaryBtnTxt: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  recruiterBanner: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  recruiterBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
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
    color: '#4F46E5',
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
