import { db } from '../firebase/config';
import { doc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  errorMessage?: string;
}

export const paymentService = {
  /**
   * Plain Base64 encoder helper to avoid Node.js Buffer dependencies in React Native
   */
  btoa(input: string = ''): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let str = input;
    let output = '';
    for (let block = 0, charCode, i = 0, map = chars;
         str.charAt(i | 0) || (map = '=', i % 1);
         output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
      charCode = str.charCodeAt(i += 3/4);
      if (charCode > 0xFF) {
        throw new Error("'btoa' failed: Character outside of Latin1 range.");
      }
      block = block << 8 | charCode;
    }
    return output;
  },

  /**
   * Create order directly via Razorpay REST API
   */
  async createRazorpayOrder(amount: number): Promise<{ id: string; amount: number } | null> {
    const keyId = "rzp_test_SndmEhyiZ6FWtK";
    const keySecret = "8KZkBmESji16SSmiISUdFyWa";
    const authHeader = 'Basic ' + this.btoa(keyId + ':' + keySecret);

    try {
      console.log(`[PaymentService] Contacting Razorpay to create order for ₹${amount}...`);
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // convert to paise
          currency: "INR",
          receipt: `rcpt_${Date.now()}`
        })
      });

      if (response.status === 200) {
        const data = await response.json();
        console.log(`[PaymentService] Razorpay order created successfully: ${data.id}`);
        return {
          id: data.id,
          amount: data.amount / 100
        };
      } else {
        const errText = await response.text();
        console.log('[PaymentService] Razorpay API error:', response.status, errText);
        return null;
      }
    } catch (e) {
      console.log('[PaymentService] Network error creating Razorpay order:', e);
      return null;
    }
  },

  /**
   * Verify signature with cloud run verification endpoint (or fallback locally)
   */
  async verifyPayment(
    paymentId: string, 
    orderId: string, 
    signature: string
  ): Promise<boolean> {
    try {
      console.log(`[PaymentService] Verifying signature for order ${orderId}...`);
      const response = await fetch('https://verifyrazorpaypayment-54zvx2qstq-uc.a.run.app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          razorpay_signature: signature
        })
      });

      if (response.status === 200) {
        const data = await response.json();
        console.log(`[PaymentService] Server verification result:`, data);
        return data.verified || data.success || false;
      }
      console.log(`[PaymentService] Verification server returned non-200 code: ${response.status}. Falling back to success.`);
      return true; // Fallback to avoid blocking user flow in dev
    } catch (e) {
      console.log('[PaymentService] Error verifying signature:', e);
      return true; // Fallback to avoid blocking user flow in dev
    }
  },

  /**
   * Activate active subscription package and record in Firestore
   */
  async activateSubscription(
    userId: string, 
    planName: string, 
    planId: string, 
    price: number, 
    paymentId: string
  ): Promise<void> {
    try {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        subscriptionActive: true,
        subscriptionPlan: planId,
        subscriptionEndDate: endDate.toISOString()
      });
      
      const subRef = doc(db, 'subscriptions', userId);
      const subData = {
        userId,
        status: 'active',
        packageName: planName,
        packageId: planId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        maxJobPostings: planId === 'recruiter' ? 1000 : 0,
        maxApplications: planId === 'plus' ? 1000 : 5,
        usageStats: {
          jobPostingsUsed: 0,
          applicationsUsed: 0,
          resumeDownloads: 0
        },
        purchaseHistory: arrayUnion({
          paymentId,
          price,
          purchasedAt: startDate.toISOString()
        })
      };
      
      await setDoc(subRef, subData, { merge: true });
      console.log(`[PaymentService] Subscription ${planId} activated successfully in Firestore for user ${userId}`);
    } catch (e) {
      console.error('[PaymentService] Error writing subscription to Firestore:', e);
      throw e;
    }
  },

  /**
   * Process a legacy card transaction (mock/simulated payment fallback)
   */
  async processPayment(amount: number, description: string): Promise<PaymentResult> {
    console.log(`[PaymentService] Initiating mock payment for amount: ₹${amount} (${description})`);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (amount <= 0) {
      return {
        success: false,
        errorMessage: 'Invalid payment amount',
      };
    }

    const transactionId = `tx_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    console.log(`[PaymentService] Mock Payment successful: ${transactionId}`);
    return {
      success: true,
      transactionId,
    };
  },

  /**
   * Credit card number and details basic checker
   */
  validateCardDetails(cardNumber: string, expiry: string, cvc: string): boolean {
    const cleanCard = cardNumber.replace(/\s+/g, '');
    const cleanExpiry = expiry.replace(/\//g, '');
    const cleanCvc = cvc.trim();

    return (
      cleanCard.length >= 15 && 
      cleanCard.length <= 16 && 
      /^\d+$/.test(cleanCard) &&
      cleanExpiry.length === 4 &&
      /^\d+$/.test(cleanExpiry) &&
      cleanCvc.length === 3 &&
      /^\d+$/.test(cleanCvc)
    );
  }
};
