import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, Alert } from 'react-native';
import { Colors } from '@/constants/theme';
import { paymentService } from '@/services/payments/paymentService';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import { RazorpayCheckoutModal } from '@/components/modals/RazorpayCheckoutModal';
import { db } from '@/services/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';

interface SubscriptionScreenProps {
  onBack: () => void;
}

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({
  onBack,
}) => {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { user } = useAuth();
  
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [isJobsVisible, setIsJobsVisible] = useState(true);

  React.useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'lms_config', 'tabs_visibility'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setIsJobsVisible(data.jobs !== false);
        }
      },
      (err) => {
        console.warn('Error fetching tabs visibility in SubscriptionScreen:', err);
      }
    );
    return () => unsub();
  }, []);

  // Razorpay Checkout Modal States
  const [razorpayVisible, setRazorpayVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDescription, setPaymentDescription] = useState('');
  const [paymentPlanId, setPaymentPlanId] = useState('');
  const [paymentPlanName, setPaymentPlanName] = useState('');
  const [orderId, setOrderId] = useState('');

  const plans = [
    {
      id: 'basic',
      name: 'Free Starter',
      price: 'Free',
      description: isJobsVisible 
        ? 'Access standard courses and apply to up to 5 jobs monthly.' 
        : 'Access standard courses and study materials.',
      features: isJobsVisible 
        ? ['Access standard tutorials', 'Apply to 5 jobs / month', 'Community support'] 
        : ['Access standard tutorials', 'Community support'],
      buttonText: 'Current Plan',
      disabled: true,
      accent: '#6B7280',
    },
    {
      id: 'plus',
      name: 'Seeker Plus',
      price: '₹799/mo',
      value: 799,
      description: isJobsVisible 
        ? 'Unlock premium certifications and unlimited job applications.' 
        : 'Unlock premium certifications and unlimited learning resources.',
      features: isJobsVisible 
        ? ['All Premium Courses', 'Unlimited Job Applications', 'Direct chat with recruiters', 'Verified credential badge'] 
        : ['All Premium Courses', 'Unlimited Learning Resources', 'Verified credential badge'],
      buttonText: 'Upgrade to Plus',
      disabled: false,
      accent: '#208AEF',
    },
    {
      id: 'recruiter',
      name: 'Recruiter Pro',
      price: '₹3,999/mo',
      value: 3999,
      description: 'Post unlimited job listings and search the talent database.',
      features: ['Unlimited Active Job Posts', 'Talent Search Engine', 'Direct chat with candidates', 'Priority matching recommendations'],
      buttonText: 'Upgrade to Pro',
      disabled: false,
      accent: '#10B981',
    }
  ];

  const handleCheckout = async (planName: string, planId: string, price: number) => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to upgrade your subscription plan.');
      return;
    }

    setLoadingPlan(planName);
    try {
      const order = await paymentService.createRazorpayOrder(price);
      if (order) {
        setOrderId(order.id);
        setPaymentAmount(price);
        setPaymentDescription(`${planName} Subscription Upgrade`);
        setPaymentPlanId(planId);
        setPaymentPlanName(planName);
        setRazorpayVisible(true);
      } else {
        Alert.alert('Checkout Initialization Failed', 'Could not create order with Razorpay. Please try again.');
      }
    } catch (e) {
      Alert.alert('Error', 'An unexpected checkout initialization error occurred.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handlePaymentSuccess = async (data: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => {
    setRazorpayVisible(false);
    setLoadingPlan(paymentPlanName);
    try {
      const verified = await paymentService.verifyPayment(
        data.razorpay_payment_id,
        data.razorpay_order_id,
        data.razorpay_signature
      );
      if (verified) {
        // Activate plan in Firestore
        await paymentService.activateSubscription(
          user!.uid,
          paymentPlanName,
          paymentPlanId,
          paymentAmount,
          data.razorpay_payment_id
        );
        Alert.alert(
          'Upgrade Successful! 🎉',
          `Thank you for your purchase! You have upgraded to ${paymentPlanName} successfully.`
        );
      } else {
        Alert.alert('Verification Failed', 'Payment signature could not be verified.');
      }
    } catch (e: any) {
      Alert.alert('Activation Error', e.message || 'Payment was successful, but could not activate subscription in database. Please contact support.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack} style={styles.iconButton}>
          <Text style={styles.backArrow}>⬅️ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          Subscription Plans
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {plans.map((plan) => (
          <View key={plan.id} style={[styles.planCard, { borderColor: plan.accent }]}>
            <Text style={[styles.planName, { color: plan.accent }]}>{plan.name}</Text>
            <Text style={[styles.planPrice, { color: colors.text }]}>{plan.price}</Text>
            <Text style={styles.planDesc}>{plan.description}</Text>

            <View style={styles.featuresList}>
              {plan.features.map((feat, i) => (
                <Text key={i} style={styles.featureItem}>✔️ {feat}</Text>
              ))}
            </View>

            <Button
              title={plan.buttonText}
              onPress={() => plan.value && handleCheckout(plan.name, plan.id, plan.value)}
              disabled={plan.disabled}
              loading={loadingPlan === plan.name}
              style={{ backgroundColor: plan.accent }}
            />
          </View>
        ))}
      </ScrollView>

      {/* Razorpay Web Checkout Webview Modal */}
      <RazorpayCheckoutModal
        visible={razorpayVisible}
        amount={paymentAmount}
        description={paymentDescription}
        orderId={orderId}
        customerName={user?.seekerProfile?.fullName || user?.recruiterProfile?.companyName || user?.displayName || 'User'}
        customerEmail={user?.email || ''}
        customerPhone={user?.seekerProfile?.phone || (user as any).phone || '9999999999'}
        onSuccess={handlePaymentSuccess}
        onCancel={() => setRazorpayVisible(false)}
        onFailure={(errMsg) => {
          setRazorpayVisible(false);
          Alert.alert('Payment Failed', errMsg);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 15,
    color: '#4F46E5',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  planCard: {
    borderWidth: 2,
    borderRadius: 14,
    padding: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 12,
  },
  planDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 20,
  },
  featuresList: {
    gap: 8,
    marginBottom: 24,
  },
  featureItem: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
});
