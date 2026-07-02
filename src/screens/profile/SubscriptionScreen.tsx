import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, Alert } from 'react-native';
import { Colors } from '@/constants/theme';
import { paymentService } from '@/services/payments/paymentService';
import { Button } from '@/components/common/Button';

interface SubscriptionScreenProps {
  onBack: () => void;
}

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({
  onBack,
}) => {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const plans = [
    {
      id: 'basic',
      name: 'Free Starter',
      price: 'Free',
      description: 'Access standard courses and apply to up to 5 jobs monthly.',
      features: ['Access standard tutorials', 'Apply to 5 jobs / month', 'Community support'],
      buttonText: 'Current Plan',
      disabled: true,
      accent: '#6B7280',
    },
    {
      id: 'plus',
      name: 'Seeker Plus',
      price: '₹799/mo',
      value: 799,
      description: 'Unlock premium certifications and unlimited job applications.',
      features: ['All Premium Courses', 'Unlimited Job Applications', 'Direct chat with recruiters', 'Verified credential badge'],
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

  const handleCheckout = async (planName: string, price: number) => {
    setLoadingPlan(planName);
    try {
      const result = await paymentService.processPayment(price, `${planName} Subscription Upgrade`);
      if (result.success) {
        Alert.alert(
          'Payment Successful!',
          `You have upgraded to ${planName}. Transaction ID: ${result.transactionId}`
        );
      } else {
        Alert.alert('Payment Failed', result.errorMessage || 'Could not finalize payment.');
      }
    } catch (e) {
      Alert.alert('Error', 'An unexpected billing error occurred.');
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
              onPress={() => plan.value && handleCheckout(plan.name, plan.value)}
              disabled={plan.disabled}
              loading={loadingPlan === plan.name}
              style={{ backgroundColor: plan.accent }}
            />
          </View>
        ))}
      </ScrollView>
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
    color: '#208AEF',
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
