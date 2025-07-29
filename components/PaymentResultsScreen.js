import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import SubscriptionManager from '../supabase/manager/agency/SubscriptionManager';

export function PaymentSuccessScreen() {
  const [verificationStatus, setVerificationStatus] = useState('verifying');
  const [subscription, setSubscription] = useState(null);
  const route = useRoute();
  const navigation = useNavigation();
  
  useEffect(() => {
    verifyPayment();
  }, []);
  
  const verifyPayment = async () => {
    try {
      // Get the reference and subscription_id from route parameters
      const { reference, subscription_id } = route.params;
      
      if (!reference || !subscription_id) {
        console.error('Missing reference or subscription_id in route params');
        setVerificationStatus('failed');
        return;
      }
      
      console.log(`Verifying payment with reference: ${reference}, subscription_id: ${subscription_id}`);
      
      // Call the verify payment function from your manager
      const { data, error } = await SubscriptionManager.verifyPaystackPayment(reference, subscription_id);
      
      if (error) {
        console.error('Payment verification error:', error);
        setVerificationStatus('failed');
        return;
      }
      
      if (data?.success && data?.is_successful) {
        const { data: subscriptionData, error: subscriptionError } = 
          await SubscriptionManager.getSubscriptionDetails(subscription_id);
        
        if (subscriptionError) {
          console.error('Error loading subscription details:', subscriptionError);
          setVerificationStatus('success');
          return;
        }
        
        setSubscription(subscriptionData);
        setVerificationStatus('success');
      } else {
        console.error('Payment verification failed:', data);
        setVerificationStatus('failed');
      }
    } catch (error) {
      console.error('Error in payment verification:', error);
      setVerificationStatus('failed');
    }
  };
  
  const goToHome = () => {
    // Reset navigation stack to avoid going back to payment screens
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
    });
  };
  
  const goToSubscriptions = () => {
    navigation.navigate('MainTabs', { screen: 'Services' });
  };
  
  if (verificationStatus === 'verifying') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#7b68ee" />
        <Text style={styles.message}>Verifying your payment...</Text>
      </View>
    );
  }
  
  if (verificationStatus === 'failed') {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>❌</Text>
        <Text style={styles.title}>Payment Verification Failed</Text>
        <Text style={styles.message}>We couldn't verify your payment. Please try again or contact support.</Text>
        <TouchableOpacity style={styles.button} onPress={goToSubscriptions}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={goToHome}>
          <Text style={styles.secondaryButtonText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✅</Text>
      <Text style={styles.title}>Payment Successful!</Text>
      <Text style={styles.message}>Thank you for your payment. Your subscription has been activated.</Text>
      
      {subscription && (
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Plan:</Text>
            <Text style={styles.detailValue}>{subscription.plan_name}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration:</Text>
            <Text style={styles.detailValue}>{subscription.duration_days} days</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Valid Until:</Text>
            <Text style={styles.detailValue}>
              {new Date(subscription.end_date).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount:</Text>
            <Text style={styles.detailValue}>{subscription.price}</Text>
          </View>
        </View>
      )}
      
      <TouchableOpacity style={styles.button} onPress={goToHome}>
        <Text style={styles.buttonText}>Continue to App</Text>
      </TouchableOpacity>
    </View>
  );
}

export function PaymentCancelScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  useEffect(() => {
    updateCancelledStatus();
  }, []);
  
  const updateCancelledStatus = async () => {
    try {
      const { subscription_id } = route.params || {};
      
      if (subscription_id) {
        // Update subscription status to cancelled
        await SubscriptionManager.updateSubscriptionStatus(subscription_id, 'cancelled');
      }
    } catch (error) {
      console.error('Error updating cancelled status:', error);
    }
  };
  
  const goToHome = () => {
    // Reset navigation stack
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
    });
  };
  
  const goToSubscriptions = () => {
    navigation.navigate('MainTabs', { screen: 'Services' });
  };
  
  return (
    <View style={styles.container}>
      <Text style={[styles.icon, styles.cancelIcon]}>🚫</Text>
      <Text style={styles.title}>Payment Cancelled</Text>
      <Text style={styles.message}>Your payment was cancelled. You can try again whenever you're ready.</Text>
      <TouchableOpacity style={styles.button} onPress={goToSubscriptions}>
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={goToHome}>
        <Text style={styles.secondaryButtonText}>Go to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  icon: {
    fontSize: 60,
    marginBottom: 20,
  },
  cancelIcon: {
    color: '#ff6b6b',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
    lineHeight: 22,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#888',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  button: {
    width: '100%',
    backgroundColor: '#7b68ee',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});