import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Image,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import SupabaseManager from './SupabaseManager';

const PaymentProcessing = ({ route, navigation }) => {
  const { subscription_id, payment_id, checkout_data, agency } = route.params;
  const [status, setStatus] = useState('processing');
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  
  useEffect(() => {
    let subscription;

    const initializePaymentProcessing = async () => {
      // Subscribe to payment status updates
      subscription = SupabaseManager.subscribeToPaymentUpdates(
        payment_id,
        handlePaymentStatusUpdate
      );

      // Check initial payment status
      const { data, error } = await SupabaseManager.checkPaymentStatus(payment_id);
      if (!error && data) {
        handlePaymentStatusUpdate(data);
      }
    };

    initializePaymentProcessing();

    // Cleanup subscription
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [payment_id]);

  const handlePaymentStatusUpdate = async (paymentData) => {
    setPaymentDetails(paymentData);
    setStatus(paymentData.status);
    setPaymentMethod(paymentData.payment_method);

    switch (paymentData.status) {
      case 'completed':
        Alert.alert(
          'Payment Successful',
          'Your subscription has been activated successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Home'),
            },
          ]
        );
        break;

      case 'failed':
        Alert.alert(
          'Payment Failed',
          paymentData.error_message || 'Unable to process your payment. Please try again.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
        break;

      case 'pending':
        // Show appropriate UI for pending status
        break;

      default:
        // Handle other statuses
        break;
    }
  };

  const renderPaymentStatus = () => {
    switch (status) {
      case 'processing':
      case 'pending':
        return (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.statusText}>Processing your payment...</Text>
            <Text style={styles.subText}>
              {paymentMethod === 'mpesa' 
                ? 'Please check your phone for the M-Pesa prompt'
                : 'Please wait while we process your payment'}
            </Text>
          </View>
        );
      case 'completed':
        return (
          <View style={styles.statusContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
            <Text style={styles.statusText}>Payment Successful!</Text>
            <Text style={styles.subText}>Your subscription is now active</Text>
          </View>
        );
      case 'failed':
        return (
          <View style={styles.statusContainer}>
            <Ionicons name="close-circle" size={64} color="#f44336" />
            <Text style={styles.statusText}>Payment Failed</Text>
            <Text style={styles.subText}>{paymentDetails?.error_message || 'Please try again'}</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Processing</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.agencyInfo}>
          <Image
            source={require('../assets/resized.jpg')}
            style={styles.agencyLogo}
          />
          <Text style={styles.agencyName}>{agency.name}</Text>
        </View>

        {checkout_data ? (
          <WebView
            source={{ uri: checkout_data.checkout_url }}
            style={styles.webview}
            onNavigationStateChange={(navState) => {
              // Handle navigation state changes for card payment
              if (navState.url.includes('payment-success')) {
                handlePaymentStatusUpdate({ status: 'completed' });
              } else if (navState.url.includes('payment-failed')) {
                handlePaymentStatusUpdate({ 
                  status: 'failed',
                  error_message: 'Card payment failed. Please try again.'
                });
              }
            }}
          />
        ) : (
          renderPaymentStatus()
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  agencyInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  agencyLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  agencyName: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  webview: {
    flex: 1,
    marginTop: 16,
  },
});

export default PaymentProcessing;