import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Platform 
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface RazorpayCheckoutModalProps {
  visible: boolean;
  amount: number; // in INR
  description: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onSuccess: (data: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  onCancel: () => void;
  onFailure: (errorMsg: string) => void;
}

export const RazorpayCheckoutModal: React.FC<RazorpayCheckoutModalProps> = ({
  visible,
  amount,
  description,
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  onSuccess,
  onCancel,
  onFailure,
}) => {
  const [webViewLoading, setWebViewLoading] = useState(true);
  const keyId = "rzp_test_SndmEhyiZ6FWtK"; // Provided key

  const checkoutHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
      <title>Razorpay Secure Checkout</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background-color: #F9FAFB;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .container {
          text-align: center;
          padding: 20px;
        }
        .status-text {
          margin-top: 15px;
          font-size: 16px;
          color: #4B5563;
          font-weight: 500;
        }
        .loader {
          border: 4px solid #E5E7EB;
          border-top: 4px solid #4F46E5;
          border-radius: 50%;
          width: 44px;
          height: 44px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    </head>
    <body>
      <div class="container">
        <div id="loader" class="loader"></div>
        <div id="status" class="status-text">Connecting to Razorpay Secure Gateway...</div>
      </div>
      <script>
        const options = {
          key: "${keyId}",
          amount: "${amount * 100}", // Convert INR to paise
          currency: "INR",
          name: "LMS Job Portal",
          description: "${description}",
          order_id: "${orderId}",
          prefill: {
            name: "${customerName}",
            email: "${customerEmail}",
            contact: "${customerPhone}"
          },
          theme: {
            color: "#4F46E5"
          },
          handler: function(response) {
            document.getElementById('status').innerText = 'Payment Successful! Finalizing transaction...';
            document.getElementById('loader').style.display = 'block';
            window.ReactNativeWebView.postMessage(JSON.stringify({
              event: 'success',
              data: {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              }
            }));
          },
          modal: {
            ondismiss: function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                event: 'dismiss'
              }));
            }
          }
        };

        const rzp = new Razorpay(options);

        rzp.on('payment.failed', function(response) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            event: 'failed',
            data: response.error ? response.error.description : 'Payment failed'
          }));
        });

        window.onload = function() {
          // Hide loader when checkout opens
          setTimeout(() => {
            document.getElementById('loader').style.display = 'none';
            document.getElementById('status').innerText = 'Please complete your payment in the checkout window.';
            rzp.open();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.event === 'success') {
        onSuccess(message.data);
      } else if (message.event === 'dismiss') {
        onCancel();
      } else if (message.event === 'failed') {
        onFailure(message.data || 'Transaction failed');
      }
    } catch (e) {
      console.warn('[RazorpayCheckoutModal] Error parsing message:', e);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.container}>
        {/* Header Bar */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Secure Payment</Text>
          <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* WebView Checkout Container */}
        <View style={styles.webContainer}>
          <WebView
            source={{ html: checkoutHtml }}
            onMessage={handleMessage}
            onLoadStart={() => setWebViewLoading(true)}
            onLoadEnd={() => setWebViewLoading(false)}
            originWhitelist={['*']}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
          {webViewLoading && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.loadingText}>Loading Payment Gateway...</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  closeBtn: {
    padding: 4,
  },
  webContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loaderOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  },
});
