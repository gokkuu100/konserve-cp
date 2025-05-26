import { useNavigation, useRoute } from '@react-navigation/native';
import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../contexts/AuthContext';
import SubscriptionManager from '../supabase/manager/agency/SubscriptionManager';
import { useTheme } from '../ThemeContext';

export default function PaymentScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [subscriptionId, setSubscriptionId] = useState(null);
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();
  
  // Use proxy for testing in development
  // This will be true when running in Expo Go, false when running as a standalone app
  const useProxy = Constants.appOwnership === 'expo';
  
  useEffect(() => {
    console.log("App ownership:", Constants.appOwnership);
    console.log("Using proxy for payment:", useProxy);
    
    // Get payment data from route params
    const { paymentData } = route.params || {};
    
    if (!paymentData) {
      Alert.alert('Error', 'Missing payment information');
      navigation.goBack();
      return;
    }
    
    console.log('Payment data received:', paymentData);
    
    // Initialize payment
    initializePayment(paymentData);
    
    // Set up a listener for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  const handleDeepLink = async (event) => {
    console.log('Received deep link in payment screen:', event.url);
    
    try {
      // Extract reference and subscription_id from URL
      const url = new URL(event.url);
      const reference = url.searchParams.get('reference');
      const deepLinkSubscriptionId = url.searchParams.get('subscription_id') || subscriptionId;
      
      if (reference && deepLinkSubscriptionId) {
        // Show loading state
        setIsLoading(true);
        
        if (url.pathname.includes('/success')) {
          console.log('Processing successful payment with ref:', reference);
          
          // Verify payment with Supabase
          const { data, error } = await SubscriptionManager.verifyPaystackPayment(
            reference, 
            deepLinkSubscriptionId
          );
          
          if (error) {
            console.error('Payment verification error:', error);
            Alert.alert('Verification Error', 'Could not verify your payment. Please contact support.');
            navigation.goBack();
            return;
          }
          
          if (data?.success && data?.is_successful) {
            navigation.navigate('PaymentSuccess', { 
              reference, 
              subscription_id: deepLinkSubscriptionId 
            });
          } else {
            Alert.alert('Payment Issue', 'Your payment could not be verified. Please try again.');
            navigation.goBack();
          }
        } else if (url.pathname.includes('/cancel')) {
          // Update subscription status to cancelled
          await SubscriptionManager.updateSubscriptionStatus(deepLinkSubscriptionId, 'cancelled');
          
          navigation.navigate('PaymentCancel', { 
            reference, 
            subscription_id: deepLinkSubscriptionId 
          });
        }
      } else {
        console.error('Missing reference or subscription ID in deep link');
        Alert.alert('Error', 'Invalid payment response');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Deep link handling error:', error);
      Alert.alert('Error', 'An error occurred while processing your payment');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };
  
  const initializePayment = async (paymentData) => {
    try {
      setIsLoading(true);
      setSubscriptionId(paymentData.subscriptionId);
      
      console.log(`Initializing payment with useProxy=${useProxy}`);
      
      // Format the payment data for the SubscriptionManager.initializePayment method
      const formattedPaymentData = {
        subscription_id: paymentData.subscriptionId,
        amount: paymentData.amount,
        currency: paymentData.currency || 'KES',
        customer: {
          email: user?.email || '',
          name: user?.user_metadata?.full_name || user?.email || 'Customer'
        },
        metadata: {
          agency_name: paymentData.agencyName,
          plan_name: paymentData.planName,
          custom_days: paymentData.customDays || [],
          transaction_id: paymentData.transactionId
        }
      };
      
      console.log('Formatted payment data:', formattedPaymentData);
      
      const { data, error } = await SubscriptionManager.initializePayment(formattedPaymentData);
      
      if (error) {
        console.error('Payment initialization error:', error);
        Alert.alert('Payment Error', 'Could not initialize payment. Please try again later.');
        navigation.goBack();
        return;
      }
      
      console.log('Payment initialization successful:', data);
      
      if (data && data.checkout_url) {
        setPaymentUrl(data.checkout_url);
        setPaymentReference(data.reference);
      } else {
        Alert.alert('Error', 'No payment URL received');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
      Alert.alert('Error', 'Could not process payment');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNavigationStateChange = async (navState) => {
    // Track WebView navigation
    console.log('WebView navigating to:', navState.url);
    
    try {
      // Check for successful completion or cancellation in URL
      const url = new URL(navState.url);
      
      // For testing with useProxy
      if (useProxy) {
        // Check for standard Paystack redirect URLs
        if (url.search.includes('trxref=') || url.pathname.includes('/payment/success') || 
            url.searchParams.has('status') && url.searchParams.get('status') === 'success') {
          
          // Extract reference from Paystack response
          const reference = url.searchParams.get('reference') || 
                          url.searchParams.get('trxref') || 
                          paymentReference;
          
          if (reference) {
            console.log('Success redirect detected with reference:', reference);
            
            // Verify payment status
            const { data, error } = await SubscriptionManager.verifyPaystackPayment(
              reference, 
              subscriptionId
            );
            
            if (error) {
              console.error('Payment verification error:', error);
              Alert.alert('Verification Error', 'Could not verify your payment');
              navigation.goBack();
              return;
            }
            
            if (data?.success && data?.is_successful) {
              // Update subscription status to active
              if (subscriptionId) {
                await SubscriptionManager.updateSubscriptionStatus(subscriptionId, 'active');
              }
              
              navigation.navigate('PaymentSuccess', { 
                reference, 
                subscription_id: subscriptionId 
              });
            } else {
              Alert.alert('Payment Issue', 'Your payment could not be verified. Please try again.');
              navigation.goBack();
            }
          }
        } else if (url.pathname.includes('/payment/cancel') || 
                  url.searchParams.has('status') && url.searchParams.get('status') === 'cancelled') {
          
          const reference = url.searchParams.get('reference') || paymentReference;
          
          // Update subscription status to cancelled
          if (subscriptionId) {
            await SubscriptionManager.updateSubscriptionStatus(subscriptionId, 'cancelled');
          }
          
          navigation.navigate('PaymentCancel', { 
            reference, 
            subscription_id: subscriptionId 
          });
        }
      } 
      // For production with app schema
      else if (navState.url.startsWith('myapp://')) {
        // App schema URLs will be handled by the deep link handler
        console.log('App schema URL detected:', navState.url);
        // These will be handled by the Linking event listener
      }
    } catch (error) {
      console.error('Error handling navigation state change:', error);
    }
  };
  
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, {
        backgroundColor: isDarkMode ? theme.background : '#fff'
      }]}>
        <ActivityIndicator size="large" color="#7b68ee" />
        <Text style={[styles.loadingText, {
          color: isDarkMode ? theme.text : '#333'
        }]}>Preparing payment...</Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, {
      backgroundColor: isDarkMode ? theme.background : '#fff'
    }]}>
      <WebView
        source={{ uri: paymentUrl }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        originWhitelist={['*']} // Allow any origin
        backgroundColor={isDarkMode ? theme.background : '#fff'}
        forceDarkOn={isDarkMode}
        renderLoading={() => (
          <View style={[styles.webViewLoading, {
            backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)'
          }]}>
            <ActivityIndicator size="large" color="#7b68ee" />
            <Text style={[styles.loadingText, {
              color: isDarkMode ? theme.text : '#333'
            }]}>Loading payment gateway...</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  webViewLoading: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
});