export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  errorMessage?: string;
}

export const paymentService = {
  /**
   * Process a mobile/web pay transaction
   */
  async processPayment(amount: number, description: string): Promise<PaymentResult> {
    console.log(`[PaymentService] Initiating payment for amount: ₹${amount} (${description})`);
    
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simple validation (mock random success)
    if (amount <= 0) {
      return {
        success: false,
        errorMessage: 'Invalid payment amount',
      };
    }

    const transactionId = `tx_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    console.log(`[PaymentService] Payment successful. Transaction ID: ${transactionId}`);
    return {
      success: true,
      transactionId,
    };
  },

  /**
   * Mock credit card validator
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
