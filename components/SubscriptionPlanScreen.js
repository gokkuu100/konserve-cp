import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../ThemeContext';
import SubscriptionManager from '../supabase/manager/agency/SubscriptionManager';
import ProfileManager from '../supabase/manager/auth/ProfileManager';
import DaySelector from './DaySelector'; // We'll create this component

const SubscriptionPlanScreen = ({ route, navigation }) => {
  const { agency } = route.params;
  const { user, userId, isAuthenticated, loading: authLoading } = useAuth();
  const { isDarkMode, theme } = useTheme();
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDays, setSelectedDays] = useState({});
  const [isCustomPlan, setIsCustomPlan] = useState(false);
  const [userData, setUserData] = useState(null);
  const [maxCollectionDays, setMaxCollectionDays] = useState(null);

  // Authentication check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigation.replace('Login');
      return;
    }
  }, [isAuthenticated, authLoading]);

  // Combined initialization in a single useEffect
  useEffect(() => {
    const initializeScreen = async () => {
      if (!isAuthenticated || !user) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Get user profile
        const { data: profileData, error: profileError } = await ProfileManager.getUserProfile(userId);
        if (profileError) throw profileError;
        
        setUserData(profileData);
        
        // Get subscription plans
        const { data: plansData, error: plansError } = await SubscriptionManager.fetchSubscriptionPlans(agency.id);
        if (plansError) throw plansError;
        
        if (plansData && plansData.length > 0) {
          setPlans(plansData);
          
          // Check if there's a custom plan
          const customPlan = plansData.find(plan => plan.plan_type === 'custom');
          if (customPlan) {
            setIsCustomPlan(true);
            
            // Set max collection days if available in plan data
            if (customPlan.max_collection_days) {
              setMaxCollectionDays(customPlan.max_collection_days);
            }
          }
        }
      } catch (err) {
        console.error('Error initializing screen:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeScreen();
  }, [isAuthenticated, user, userId]);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    
    // Clear selected days if switching from custom to standard plan
    if (plan.plan_type !== 'custom') {
      setSelectedDays({});
    }
    
    // Set max collection days if available in plan data
    if (plan.plan_type === 'custom' && plan.max_collection_days) {
      setMaxCollectionDays(plan.max_collection_days);
    } else {
      setMaxCollectionDays(null);
    }
  };

  const handleDaySelection = (day, selected) => {
    setSelectedDays(prev => ({
      ...prev,
      [day]: selected,
    }));
  };

  const handleProceedToPayment = async () => {
    if (!selectedPlan) {
      Alert.alert('Select a Plan', 'Please select a subscription plan first');
      return;
    }
    
    // For custom plans, validate day selection
    if (selectedPlan.plan_type === 'custom') {
      const selectedDaysCount = Object.values(selectedDays).filter(Boolean).length;
      if (selectedDaysCount === 0) {
        Alert.alert('Select Collection Days', 'Please select at least one collection day');
        return;
      }
      
      // Check if user has selected more than allowed days
      if (maxCollectionDays !== null && selectedDaysCount > maxCollectionDays) {
        Alert.alert('Too Many Days Selected', `You can only select up to ${maxCollectionDays} collection ${maxCollectionDays === 1 ? 'day' : 'days'} for this plan.`);
        return;
      }
    }
    
    try {
      setIsLoading(true);
      
      // Extract selected day names
      const selectedDayNames = Object.keys(selectedDays).filter(day => selectedDays[day]);
      
      // Create metadata for subscription
      const metadata = {
        plan_type: selectedPlan.plan_type || 'standard',
        custom_collection_dates: selectedPlan.plan_type === 'custom' ? selectedDayNames : [],
        agency_name: agency.name,
        plan_name: selectedPlan.name,
        user_name: userData ? `${userData.first_name} ${userData.last_name}` : user.email,
      };
      
      // Create subscription in database first
      const { data: subscriptionData, error: subscriptionError } = await SubscriptionManager.createSubscription({
        user_id: userId,
        agency_id: agency.id,
        plan_id: selectedPlan.id,
        status: 'pending',
        auto_renew: true,
        amount: selectedPlan.price,
        currency: 'KES',
        payment_method: 'mpesa',
        custom_collection_dates: selectedPlan.plan_type === 'custom' ? selectedDayNames : [],
        metadata: metadata
      });
      
      if (subscriptionError) throw subscriptionError;
      
      // Create payment transaction
      const { data: paymentData, error: paymentError } = await SubscriptionManager.createPaymentTransaction({
        subscription_id: subscriptionData.id,
        user_id: userId,
        amount: selectedPlan.price,
        currency: 'KES',
        payment_method: 'mpesa',
        payment_provider: 'paystack',
        status: 'pending',
        payment_details: JSON.stringify({
          plan_id: selectedPlan.id,
          plan_name: selectedPlan.name,
          plan_type: selectedPlan.plan_type || 'standard',
          agency_id: agency.id,
          agency_name: agency.name,
          custom_days: selectedPlan.plan_type === 'custom' ? selectedDayNames : [],
          user_id: userId,
          timestamp: new Date().toISOString()
        })
      });
      
      if (paymentError) throw paymentError;
      
      // Navigate to payment screen with the payment data
      navigation.navigate('PaymentScreen', { 
        paymentData: {
          transactionId: paymentData.id,
          subscriptionId: subscriptionData.id,
          amount: selectedPlan.price,
          currency: 'KES',
          agencyName: agency.name,
          planName: selectedPlan.name,
          customDays: selectedPlan.plan_type === 'custom' ? selectedDayNames : []
        }
      });
    } catch (error) {
      console.error('Error in handleProceedToPayment:', error);
      Alert.alert('Error', 'Failed to process subscription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, {
        backgroundColor: isDarkMode ? theme.background : '#f5f7fa'
      }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={[styles.loadingText, {
            color: isDarkMode ? theme.textSecondary : '#666'
          }]}>Loading subscription plans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error) {
    return (
      <SafeAreaView style={[styles.container, {
        backgroundColor: isDarkMode ? theme.background : '#f5f7fa'
      }]}>
        <View style={[styles.header, {
          backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
          borderBottomColor: isDarkMode ? '#444' : '#e0e0e0'
        }]}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? theme.text : "#000"} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {
            color: isDarkMode ? theme.text : '#000'
          }]}>Subscription Plans</Text>
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#FF6B6B" />
          <Text style={[styles.errorText, {
            color: isDarkMode ? theme.textSecondary : '#666'
          }]}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              // Re-initialize the screen 
              const initializeScreen = async () => {
                setIsLoading(true);
                setError(null);
                
                try {
                  // Get user profile
                  const { data: profileData, error: profileError } = await ProfileManager.getUserProfile(userId);
                  if (profileError) throw profileError;
                  
                  setUserData(profileData);
                  
                  // Get subscription plans
                  const { data: plansData, error: plansError } = await SubscriptionManager.fetchSubscriptionPlans(agency.id);
                  if (plansError) throw plansError;
                  
                  if (plansData && plansData.length > 0) {
                    setPlans(plansData);
                    
                    // Check if there's a custom plan
                    const customPlan = plansData.find(plan => plan.plan_type === 'custom');
                    if (customPlan) {
                      setIsCustomPlan(true);
                      
                      // Set max collection days if available in plan data
                      if (customPlan.max_collection_days) {
                        setMaxCollectionDays(customPlan.max_collection_days);
                      }
                    }
                  }
                } catch (err) {
                  console.error('Error initializing screen:', err);
                  setError('Failed to load data. Please try again.');
                } finally {
                  setIsLoading(false);
                }
              };
              
              initializeScreen();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {
      backgroundColor: isDarkMode ? theme.background : '#f5f7fa'
    }]}>
      <View style={[styles.header, {
        backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
        borderBottomColor: isDarkMode ? '#444' : '#e0e0e0'
      }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? theme.text : "#000"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {
          color: isDarkMode ? theme.text : '#000'
        }]}>Subscription Plans</Text>
      </View>
      
      <View style={[styles.agencyInfoContainer, {
        backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
        borderBottomColor: isDarkMode ? '#444' : '#e0e0e0'
      }]}>
        <Text style={[styles.agencyName, {
          color: isDarkMode ? theme.text : '#000'
        }]}>{agency.name}</Text>
        <Text style={[styles.agencyLocation, {
          color: isDarkMode ? theme.textSecondary : '#666'
        }]}>{agency.location}</Text>
      </View>
      
      <ScrollView style={styles.scrollContainer}>
        <Text style={[styles.sectionTitle, {
          color: isDarkMode ? theme.text : '#000'
        }]}>Select a Plan</Text>
        
        <View style={styles.plansContainer}>
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard, 
                {
                  backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
                  borderColor: isDarkMode ? (selectedPlan?.id === plan.id ? '#4CAF50' : '#444') : (selectedPlan?.id === plan.id ? '#4CAF50' : '#e0e0e0')
                },
                selectedPlan?.id === plan.id && {
                  borderWidth: 2,
                  backgroundColor: isDarkMode ? '#1a331a' : '#f0fff0'
                }
              ]}
              onPress={() => handleSelectPlan(plan)}
            >
              <View style={styles.planHeader}>
                <Text style={[styles.planName, {
                  color: isDarkMode ? theme.text : '#000'
                }]}>{plan.name}</Text>
                <View style={styles.priceContainer}>
                  <Text style={[styles.priceCurrency, {
                    color: isDarkMode ? theme.textSecondary : '#666'
                  }]}>KES</Text>
                  <Text style={styles.price}>{plan.price}</Text>
                  <Text style={[styles.pricePeriod, {
                    color: isDarkMode ? theme.textSecondary : '#666'
                  }]}>/month</Text>
                </View>
              </View>
              
              <Text style={[styles.planDescription, {
                color: isDarkMode ? theme.textSecondary : '#333'
              }]}>{plan.description}</Text>
              
              <View style={styles.planFeatures}>
                {plan.features && plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                    <Text style={[styles.featureText, {
                      color: isDarkMode ? theme.textSecondary : '#333'
                    }]}>{feature}</Text>
                  </View>
                ))}
              </View>
              
              {selectedPlan?.id === plan.id && (
                <View style={styles.selectedIndicator}>
                  <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        
        {isCustomPlan && selectedPlan?.plan_type === 'custom' && (
          <View style={styles.customPlanSection}>
            <Text style={[styles.sectionTitle, {
              color: isDarkMode ? theme.text : '#000'
            }]}>Select Collection Days</Text>
            <Text style={[styles.sectionDescription, {
              color: isDarkMode ? theme.textSecondary : '#666'
            }]}>
              Choose the days when you want your waste to be collected
              {maxCollectionDays ? ` (up to ${maxCollectionDays} ${maxCollectionDays === 1 ? 'day' : 'days'})` : ''}
            </Text>
            
            <DaySelector 
              onDaySelect={handleDaySelection} 
              selectedDays={selectedDays}
              maxDays={maxCollectionDays}
              isDarkMode={isDarkMode}
              theme={theme}
            />
          </View>
        )}
      </ScrollView>
      
      <View style={[styles.footer, {
        backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
        borderTopColor: isDarkMode ? '#444' : '#e0e0e0'
      }]}>
        <TouchableOpacity 
          style={[
            styles.proceedButton,
            !selectedPlan && styles.disabledButton
          ]}
          onPress={handleProceedToPayment}
          disabled={!selectedPlan}
        >
          <Text style={styles.proceedButtonText}>Proceed to Payment</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  agencyInfoContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  agencyName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  agencyLocation: {
    fontSize: 14,
    color: '#666',
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  plansContainer: {
    marginVertical: 10,
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
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedPlanCard: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: '#f0fff0',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceCurrency: {
    fontSize: 14,
    color: '#666',
    marginRight: 2,
  },
  price: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  pricePeriod: {
    fontSize: 14,
    color: '#666',
    marginLeft: 2,
  },
  planDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 16,
    lineHeight: 20,
  },
  planFeatures: {
    marginTop: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    marginLeft: 8,
    color: '#333',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  customPlanSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  footer: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  proceedButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default SubscriptionPlanScreen; 