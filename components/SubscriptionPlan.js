import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import SubscriptionManager from '../supabase/manager/agency/SubscriptionManager';
import { useAuth } from '../contexts/AuthContext';

const SubscriptionPlan = ({ route, navigation }) => {
  const { agency } = route.params;
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [customDates, setCustomDates] = useState({});
  const [showCalendar, setShowCalendar] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [user, setUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const {userId, isAuthenticated, signIn, signOut, signUp } = useAuth();

  useEffect(() => {
    console.log('Checking Supabase client:', SubscriptionManager.supabase);
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigation.replace('Login');
      return;
    }
  }, [isAuthenticated, loading]);
  
  // Get current user and subscription plans on component mount
  useEffect(() => {
    async function initialize() {
      try {
        setLoading(true);
        setUser(currentUser);

        if (!agency || !agency.id) {
          throw new Error('Invalid agency information');
        }

        // Fetch subscription plans for this agency
        const { data: plansData, error: plansError } = await SubscriptionManager.fetchAgencySubscriptionPlans(agency.id);
        
        if (plansError) {
          throw plansError;
        }
        
        if (!plansData || plansData.length === 0) {
          throw new Error('No subscription plans available for this agency');
        }

        // No need for transformation, just set the plans directly
        setPlans(plansData);
      } catch (error) {
        console.error('Initialization error:', error);
        Alert.alert(
          'Error',
          'Failed to load subscription plans. Please try again.',
          [
            {
              text: 'Retry',
              onPress: () => initialize()
            },
            {
              text: 'Cancel',
              onPress: () => navigation.goBack(),
              style: 'cancel'
            }
          ]
        );
      } finally {
        setLoading(false);
      }
    }
    initialize();
  }, [agency.id, currentUser]);

  // Define the standard collection days based on agency data
  const standardCollectionDays = agency.collectionDays || ['Monday', 'Thursday'];
  
  const handleDateSelect = (day) => {
    const selectedDate = day.dateString;
    
    setCustomDates(prevDates => {
      const newDates = { ...prevDates };
      
      if (newDates[selectedDate]) {
        // If date is already selected, remove it
        delete newDates[selectedDate];
      } else {
        // If selecting a new date
        if (Object.keys(newDates).length >= 2) {
          // If already have 2 dates, remove the oldest one
          const oldestDate = Object.keys(newDates).sort()[0];
          delete newDates[oldestDate];
        }
        // Add the new date
        newDates[selectedDate] = { 
          selected: true, 
          selectedColor: '#4CAF50' 
        };
      }
      
      return newDates;
    });
  };

  const getCurrentDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const initializePayment = async () => {
    if (!selectedPlan || !paymentMethod) {
      Alert.alert('Selection Required', 'Please select a plan and payment method to continue.');
      return;
    }

    try {
      setLoading(true);
      console.log('Starting payment initialization...');

      // Validate user data
      if (!user || !user.id) {
        throw new Error('User data is missing or invalid');
      }

      // Create subscription
      const subscriptionData = {
        user_id: user.id,
        agency_id: agency.id,
        plan_id: selectedPlan.id,
        plan_type: selectedPlan.plan_type,
        custom_collection_dates: selectedPlan.plan_type === 'custom' ? Object.keys(customDates) : standardCollectionDays,
        collection_days: selectedPlan.plan_type === 'custom' ? Object.keys(customDates) : standardCollectionDays,
        payment_method: paymentMethod,
        amount: selectedPlan.price,
        status: 'pending'
      };

      console.log('Creating subscription with data:', subscriptionData);

      const { data: subscription, error: subscriptionError } = await SubscriptionManager.createSubscription(subscriptionData);

      if (subscriptionError) {
        console.error('Subscription creation error:', subscriptionError);
        throw new Error(`Subscription creation failed: ${subscriptionError.message}`);
      }

      console.log('Subscription created:', subscription);

      // Initialize payment with proper data structure
      const paymentInitData = {
        subscription_id: subscription.id,
        amount: selectedPlan.price,
        currency: 'KES',
        payment_method: paymentMethod,
        customer: {
          phone_number: user.phone_number || '',
          email: user.email || '',
          name: user.user_metadata?.full_name || user.email
        },
        metadata: {
          agency_id: agency.id,
          plan_id: selectedPlan.id,
          plan_type: selectedPlan.plan_type,
          collection_days: subscriptionData.collection_days
        }
      };

      console.log('Initializing payment with data:', paymentInitData);

      // Call the initializePayment method with the proper data
      const { data: paymentData, error: paymentError } = await SubscriptionManager.initializePayment(paymentInitData);

      if (paymentError) {
        console.error('Payment error:', paymentError);
        throw new Error(paymentError.message || 'Payment initialization failed');
      }

      console.log('Payment initialized:', paymentData);

      // Navigate based on payment method
      if (paymentMethod === 'mpesa') {
        navigation.navigate('PaymentProcessing', {
          subscription_id: subscription.id,
          payment_id: paymentData.transaction_id,
          checkout_data: paymentData,
          agency: agency
        });
      } else if (paymentMethod === 'card') {
        navigation.navigate('CardPayment', {
          checkoutUrl: paymentData.payment_url,
          subscription_id: subscription.id,
          payment_id: paymentData.transaction_id,
          agency: agency
        });
      }

    } catch (error) {
      console.error('Payment initialization error:', error);
      Alert.alert(
        'Payment Error',
        error.message || 'Unable to process your payment request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderPlanCard = (plan) => {
    const isSelected = selectedPlan && selectedPlan.id === plan.id;
    
    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          isSelected && styles.selectedPlanCard
        ]}
        onPress={() => {
          setSelectedPlan(plan);
          // Automatically show calendar if custom plan is selected
          if (plan.plan_type === 'custom') {
            setShowCalendar(true);
          } else {
            setCustomDates({});
            setShowCalendar(false);
          }
        }}
      >
        <View style={styles.planHeader}>
          <View>
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Ksh</Text>
              <Text style={styles.price}>{Math.round(plan.price)}</Text>
              <Text style={styles.priceUnit}>/mo</Text>
            </View>
          </View>
          {isSelected && (
            <View style={styles.selectedCheckmark}>
              <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
            </View>
          )}
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.featuresList}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <MaterialIcons name="check" size={16} color="#4CAF50" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
        
        {plan.plan_type === 'custom' && isSelected && (
          <View style={styles.calendarContainer}>
            <Text style={styles.calendarTitle}>Select 2 Collection Days:</Text>
            <Text style={styles.calendarSubtitle}>
              {Object.keys(customDates).length > 0 
                ? `Selected: ${Object.keys(customDates).join(', ')}` 
                : 'Please select exactly 2 days'}
            </Text>
            <Calendar
              current={getCurrentDate()}
              minDate={getCurrentDate()}
              maxDate={getDateAfterDays(30)}
              onDayPress={handleDateSelect}
              markedDates={customDates}
              theme={{
                todayTextColor: '#4CAF50',
                arrowColor: '#4CAF50',
                dotColor: '#4CAF50',
                selectedDotColor: '#ffffff',
              }}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Subscription Plan</Text>
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.agencyInfo}>
          <View style={styles.agencyIconContainer}>
            <MaterialCommunityIcons name="recycle" size={24} color="#4CAF50" />
          </View>
          <Text style={styles.agencyName}>{agency.name}</Text>
        </View>
        
        <Text style={styles.sectionTitle}>Available Plans</Text>
        
        {plans.map(renderPlanCard)}
        
        {selectedPlan && (
          <>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.paymentMethods}>
              <TouchableOpacity
                style={[
                  styles.paymentMethodCard,
                  paymentMethod === 'mpesa' && styles.selectedPaymentMethod
                ]}
                onPress={() => setPaymentMethod('mpesa')}
              >
                <Image 
                  source={require('../assets/mpesalogo.png')} 
                  style={styles.paymentMethodImage} 
                  resizeMode="contain"
                />
                <Text style={styles.paymentMethodName}>M-Pesa</Text>
                {paymentMethod === 'mpesa' && (
                  <MaterialIcons name="check-circle" size={20} color="#4CAF50" style={styles.paymentCheckmark} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.paymentMethodCard,
                  paymentMethod === 'card' && styles.selectedPaymentMethod
                ]}
                onPress={() => setPaymentMethod('card')}
              >
                <View style={styles.cardIconContainer}>
                  <MaterialCommunityIcons name="credit-card-outline" size={28} color="#1565C0" />
                </View>
                <Text style={styles.paymentMethodName}>Card Payment</Text>
                {paymentMethod === 'card' && (
                  <MaterialIcons name="check-circle" size={20} color="#4CAF50" style={styles.paymentCheckmark} />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
        
        <TouchableOpacity
          style={[
            styles.payButton,
            (!selectedPlan || loading) && styles.disabledButton
          ]}
          onPress={initializePayment}
          disabled={!selectedPlan || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.payButtonText}>Proceed to Payment</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// Helper function to get date X days from now
const getDateAfterDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    padding: 16,
  },
  agencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  agencyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  agencyName: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 20,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedPlanCard: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 2,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  priceUnit: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  selectedCheckmark: {
    alignSelf: 'flex-start',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  featuresList: {
    marginTop: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  customDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
  },
  customDateButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    marginRight: 8,
  },
  calendarContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  calendarTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  calendarSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  paymentMethods: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentMethodCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  selectedPaymentMethod: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  paymentMethodImage: {
    height: 40,
    width: 80,
    marginBottom: 8,
  },
  cardIconContainer: {
    height: 40,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentMethodName: {
    fontSize: 14,
    fontWeight: '500',
  },
  paymentCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  payButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 10,
    marginTop: 30,
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
    opacity: 0.7,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default SubscriptionPlan;