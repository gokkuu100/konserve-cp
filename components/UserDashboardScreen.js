import { AntDesign, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  Image,
  Linking,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import ProfileManager from '../supabase/manager/auth/ProfileManager';
import { supabase } from '../supabase/manager/config/supabaseConfig';
import LocationSelectionModal from './LocationSelectionModal';

const UserDashboardScreen = ({ navigation }) => {
  const { user, userId, isAuthenticated, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState(null);
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [expiredSubscriptions, setExpiredSubscriptions] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState({});
  const [agencies, setAgencies] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [expandedSubscription, setExpandedSubscription] = useState(null);
  const [userStats, setUserStats] = useState({
    reportsSubmitted: 0,
    totalPoints: 0,
    activeSubscriptions: 0
  });
  const { theme, isDarkMode } = useTheme();

  // ... existing code ...
  useEffect(() => {
    // Check authentication status
    if (authLoading) {
      console.log('Auth is still loading...');
      return;
    }
    
    if (!isAuthenticated || !user) {
      console.log('User not authenticated, redirecting to login');
      navigation.replace('Login');
      return;
    }

    console.log('User authenticated, loading dashboard data');
    loadDashboardData();
    fetchUnreadNotificationsCount();
  }, [isAuthenticated, authLoading, user]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data: profile, error: profileError } = await ProfileManager.getUserProfile();
        if (!profileError && profile) {
          setUserData(profile);
        } else {
          console.error('Profile fetch error:', profileError);
        }
      } catch (profileError) {
        console.error('Profile fetch error:', profileError);
      }

      const { data: subscriptionHistory, error: historyError } = await supabase
        .from('subscription_history')
        .select(`
          id, 
          subscription_id, 
          user_id, 
          plan_id, 
          agency_id, 
          start_date, 
          end_date, 
          status, 
          payment_method, 
          amount, 
          payment_transaction_id,
          custom_collection_dates,
          created_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (historyError) {
        console.error('Error fetching subscription history:', historyError);
        setError('Failed to load subscription data. Please try again.');
        return;
      }

      const activeHistory = subscriptionHistory?.filter(sub => sub.status === 'active') || [];
      const expiredHistory = subscriptionHistory?.filter(sub => sub.status === 'expired') || [];

      const planIds = [...new Set([
        ...activeHistory.map(sub => sub.plan_id), 
        ...expiredHistory.map(sub => sub.plan_id)
      ])].filter(Boolean);
      
      const agencyIds = [...new Set([
        ...activeHistory.map(sub => sub.agency_id),
        ...expiredHistory.map(sub => sub.agency_id)
      ])].filter(Boolean);

      const subscriptionIds = [...new Set([
        ...activeHistory.map(sub => sub.subscription_id),
        ...expiredHistory.map(sub => sub.subscription_id)
      ])].filter(Boolean);

      if (planIds.length > 0) {
        const { data: plans, error: plansError } = await supabase
          .from('subscription_plans')
          .select(`
            id, 
            agency_id, 
            name, 
            description, 
            price, 
            duration_days, 
            features, 
            is_active, 
            plan_type,
            max_collection_days,
            collection_days
          `)
          .in('id', planIds);

        if (plansError) {
          console.error('Error fetching subscription plans:', plansError);
        } else {
          const plansMap = {};
          plans.forEach(plan => {
            plansMap[plan.id] = plan;
          });
          setSubscriptionPlans(plansMap);
        }
      }

      // 5. Fetch agency details with comprehensive information
      if (agencyIds.length > 0) {
        try {
          const { data: agenciesData, error: agencyError } = await supabase
            .from('agencies')
            .select(`
              id, 
              name, 
              logo_url, 
              description,
              contact_number,
              constituency,
              county,
              rating,
              reviews_count,
              service_radius
            `)
            .in('id', agencyIds);

          if (!agencyError && agenciesData) {
            const agenciesMap = {};
            agenciesData.forEach(agency => {
              agenciesMap[agency.id] = agency;
            });
            setAgencies(agenciesMap);
          } else {
            console.error('Error fetching agency details:', agencyError);
          }
        } catch (agencyFetchError) {
          console.error('Agency fetch error:', agencyFetchError);
        }
      }

      if (subscriptionIds.length > 0) {
        try {
          const { data: userSubscriptions, error: userSubError } = await supabase
            .from('user_subscriptions')
            .select(`
              id,
              user_id,
              agency_id,
              plan_id,
              status,
              start_date,
              end_date,
              auto_renew,
              custom_collection_dates,
              payment_method,
              amount,
              currency,
              payment_status,
              metadata
            `)
            .in('id', subscriptionIds);

          if (!userSubError && userSubscriptions) {
            const enhancedActive = activeHistory.map(sub => {
              const userSub = userSubscriptions.find(us => us.id === sub.subscription_id);
              return userSub ? { ...sub, userSubscription: userSub } : sub;
            });
            
            const enhancedExpired = expiredHistory.map(sub => {
              const userSub = userSubscriptions.find(us => us.id === sub.subscription_id);
              return userSub ? { ...sub, userSubscription: userSub } : sub;
            });

            setActiveSubscriptions(enhancedActive);
            setExpiredSubscriptions(enhancedExpired);
          } else {
            console.error('Error fetching user subscriptions:', userSubError);
            setActiveSubscriptions(activeHistory);
            setExpiredSubscriptions(expiredHistory);
          }
        } catch (userSubFetchError) {
          console.error('User subscription fetch error:', userSubFetchError);
          setActiveSubscriptions(activeHistory);
          setExpiredSubscriptions(expiredHistory);
        }
      } else {
        setActiveSubscriptions(activeHistory);
        setExpiredSubscriptions(expiredHistory);
      }

      try {
        const statsResult = await ProfileManager.getUserStats(userId);
        if (statsResult && !statsResult.error) {
          const { error, ...stats } = statsResult;
          setUserStats({
            ...stats,
            activeSubscriptions: activeHistory.length
          });
        }
      } catch (statsError) {
        console.error('Stats error:', statsError);
        setUserStats({
          reportsSubmitted: 0,
          totalPoints: 0,
          activeSubscriptions: activeHistory.length
        });
      }

    } catch (error) {
      console.error('Dashboard data error:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUnreadNotificationsCount = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('count', { count: 'exact' })
        .eq('user_id', userId)
        .eq('read', false);
        
      if (!error) {
        setUnreadNotifications(data.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
      setUnreadNotifications(0);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatAmount = (amount, currency = 'KES') => {
    if (!amount) return 'N/A';
    return `${currency} ${parseFloat(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return '#4CAF50'; // Green
      case 'pending':
        return '#FFC107'; // Yellow
      case 'expired':
        return '#F44336'; // Red
      case 'cancelled':
        return '#9E9E9E'; // Grey
      default:
        return '#9E9E9E'; // Grey default
    }
  };

  const calculateDaysRemaining = (endDateString) => {
    if (!endDateString) return 0;
    
    const endDate = new Date(endDateString);
    const today = new Date();
    
    endDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  const getSubscriptionPlanDetails = (planId) => {
    return subscriptionPlans[planId] || { name: 'Unknown Plan', price: 0, duration_days: 0 };
  };

  const getAgencyName = (agencyId) => {
    return agencies[agencyId]?.name || `Agency ID: ${agencyId}`;
  };

  const handleLocationSelect = (county, constituency) => {
    // Handle location selection logic here
    setShowLocationModal(false);
  };

  const toggleSubscriptionExpand = (subscriptionId) => {
    if (expandedSubscription === subscriptionId) {
      setExpandedSubscription(null);
    } else {
      setExpandedSubscription(subscriptionId);
    }
  };

  const renderSubscriptionCard = (subscription, isActive = true) => {
    const planDetails = getSubscriptionPlanDetails(subscription.plan_id);
    const agencyDetails = agencies[subscription.agency_id] || {};
    const agencyName = agencyDetails.name || `Agency ID: ${subscription.agency_id}`;
    const daysRemaining = isActive ? calculateDaysRemaining(subscription.end_date) : 0;
    const isExpanded = expandedSubscription === subscription.id;
    const agencyLogo = agencyDetails.logo_url;
    
    // Specific checks for plan types and collection days
    const isCustomPlan = planDetails && planDetails.plan_type === 'custom';
    
    const hasAgencyCollectionDays = planDetails && 
      planDetails.collection_days && 
      Array.isArray(planDetails.collection_days) && 
      planDetails.collection_days.length > 0;
    
    // Parse custom_collection_dates from JSONB
    let customCollectionDates = [];
    try {
      if (subscription.custom_collection_dates) {
        if (typeof subscription.custom_collection_dates === 'string') {
          customCollectionDates = JSON.parse(subscription.custom_collection_dates);
        } else if (Array.isArray(subscription.custom_collection_dates)) {
          customCollectionDates = subscription.custom_collection_dates;
        } else if (typeof subscription.custom_collection_dates === 'object') {
          customCollectionDates = Object.values(subscription.custom_collection_dates);
        }
      }
    } catch (error) {
      console.error('Error parsing custom_collection_dates:', error);
      customCollectionDates = [];
    }
    
    const hasCustomCollectionDates = Array.isArray(customCollectionDates) && 
      customCollectionDates.length > 0;
    
    // Debug logging to help identify the issue
    console.log('Subscription ID:', subscription.id);
    console.log('Is Custom Plan:', isCustomPlan);
    console.log('Custom Collection Dates:', subscription.custom_collection_dates);
    console.log('Parsed Custom Collection Dates:', customCollectionDates);
    
    const formatCustomDate = (date) => {
      if (!date) return 'Unknown Day';
      
      // If it's already a day name, return it directly
      if (typeof date === 'string' && 
          ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].includes(date)) {
        return date;
      }
      
      // Try to format as a date if it's a timestamp
      try {
        return formatDate(date);
      } catch (error) {
        return typeof date === 'string' ? date : 'Unknown Day';
      }
    };
    
    return (
      <TouchableOpacity 
        key={subscription.id}
        style={[styles.subscriptionCard, { 
          backgroundColor: isDarkMode ? theme.cardBackground : '#FFFFFF',
          borderColor: isDarkMode ? theme.border : 'transparent',
          borderWidth: isDarkMode ? 1 : 0
        }]}
        onPress={() => toggleSubscriptionExpand(subscription.id)}
        activeOpacity={0.7}
      >
        {/* Card Header */}
        <View style={styles.subscriptionCardHeader}>
          {/* Logo */}
          {agencyLogo ? (
            <Image 
              source={{ uri: agencyLogo }} 
              style={styles.agencyLogoSmall}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.agencyLogoPlaceholderSmall, { backgroundColor: '#e0f2e9' }]}>
              <Text style={styles.agencyLogoPlaceholderText}>
                {agencyName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          
          {/* Agency and Plan Name */}
          <View style={styles.subscriptionCardInfo}>
            <Text style={[styles.subscriptionCardAgencyName, { color: theme.text }]} numberOfLines={1}>
              {agencyName}
            </Text>
            <Text style={[styles.subscriptionCardPlanName, { color: theme.textSecondary }]} numberOfLines={1}>
                {planDetails.name || `Plan ID: ${subscription.plan_id}`}
              </Text>
            {isCustomPlan && (
              <Text style={styles.customPlanBadge}>Custom Plan</Text>
              )}
            </View>
          
          {/* Days Left Badge for Active Subscriptions */}
          {isActive && (
            <View style={[styles.daysContainer, { 
              backgroundColor: daysRemaining < 5 ? '#FEE2E2' : daysRemaining < 10 ? '#FEF3C7' : '#DCFCE7',
            }]}>
              <Text style={[styles.daysText, { 
                color: daysRemaining < 5 ? '#DC2626' : daysRemaining < 10 ? '#D97706' : '#16A34A'
              }]}>
                {daysRemaining} days left
              </Text>
          </View>
          )}
          
          {/* Status Badge for Inactive Subscriptions */}
          {!isActive && (
            <View style={[styles.statusChip, { 
              backgroundColor: getStatusColor(subscription.status) + '20',
            }]}>
              <Text style={[styles.statusChipText, { color: getStatusColor(subscription.status) }]}>
                {subscription.status || 'Unknown'}
            </Text>
          </View>
          )}
        </View>
        
        {/* Expanded Details Section */}
        {isExpanded && (
          <Animated.View style={styles.expandedDetailsContainer}>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        
            {/* Basic Subscription Details */}
            <View style={styles.fullDetailsSection}>
              <Text style={[styles.detailsSectionTitle, { color: theme.text }]}>
                Subscription Details
              </Text>
              
              {/* Add Plan Type in subscription details */}
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Plan Type</Text>
                <View style={styles.planTypeContainer}>
                  {isCustomPlan ? (
                    <View style={styles.customPlanTypeBadge}>
                      <Text style={styles.customPlanTypeText}>Custom</Text>
                    </View>
                  ) : (
                    <View style={styles.standardPlanTypeBadge}>
                      <Text style={styles.standardPlanTypeText}>Standard</Text>
                    </View>
                  )}
                </View>
            </View>
            
              {/* Status Row */}
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Status</Text>
                <View style={styles.statusValueContainer}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(subscription.status) }]} />
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {subscription.status ? subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1) : 'Unknown'}
                </Text>
            </View>
          </View>
          
              {/* Other Details */}
          <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Start Date</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {formatDate(subscription.start_date)}
              </Text>
            </View>
            
              <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>End Date</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {formatDate(subscription.end_date)}
              </Text>
            </View>
              
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Payment Method</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {subscription.payment_method || 'N/A'}
                </Text>
          </View>
          
            <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Amount</Text>
                <Text style={[styles.detailValue, { color: theme.text, fontWeight: 'bold' }]}>
                  {formatAmount(subscription.amount)}
                  </Text>
                </View>
              </View>
              
            {/* Collection Days Section - Key Focus Area */}
            <View style={styles.collectionDaysSection}>
              <Text style={[styles.detailsSectionTitle, { color: theme.text }]}>
                Collection Days
              </Text>
              
              {/* Agency's Standard Collection Days - Show for all plans */}
              {hasAgencyCollectionDays && (
                <View style={{ marginBottom: isCustomPlan && hasCustomCollectionDates ? 16 : 0 }}>
                  <Text style={[styles.collectionSubtitle, { color: theme.textSecondary }]}>
                    Agency Standard Collection Days:
                  </Text>
                  <View style={styles.collectionDaysContainer}>
                    {planDetails.collection_days.map((day, index) => (
                      <View key={`agency-${index}`} style={[styles.collectionDayChip, { backgroundColor: '#EEF2FF' }]}>
                        <Text style={[styles.collectionDayText, { color: '#4F46E5' }]}>
                          {day}
                  </Text>
                </View>
                    ))}
              </View>
            </View>
          )}
          
              {/* Custom Collection Days  */}
              {isCustomPlan && (
                <View>
                  <Text style={[styles.collectionSubtitle, { color: theme.textSecondary, marginTop: hasAgencyCollectionDays ? 16 : 0 }]}>
                    Custom Days Picked:
                  </Text>
                  {hasCustomCollectionDates ? (
                    <View style={styles.collectionDaysContainer}>
                      {customCollectionDates.map((date, index) => (
                        <View key={`custom-${index}`} style={[styles.collectionDayChip, { backgroundColor: '#F0FDF4' }]}>
                          <Text style={[styles.collectionDayText, { color: '#16A34A' }]}>
                            {formatCustomDate(date)}
              </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.noCollectionDaysText, { color: theme.textSecondary }]}>
                      No custom collection days specified
                    </Text>
                  )}
            </View>
          )}
          
              {/* No Collection Days Message */}
              {!hasAgencyCollectionDays && !isCustomPlan && (
                <View>
                  <Text style={[styles.noCollectionDaysText, { color: theme.textSecondary }]}>
                    No collection days specified
              </Text>
            </View>
          )}
        </View>
        
            {/* Progress Bar for Active Subscriptions */}
        {isActive && (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
                    Subscription Progress
                  </Text>
                  <Text style={[styles.daysRemainingText, { 
                    color: daysRemaining < 5 ? '#DC2626' : daysRemaining < 10 ? '#D97706' : '#16A34A'
                  }]}>
                    {daysRemaining} days remaining
                </Text>
              </View>
                <View style={[styles.progressBarBackground, { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    width: `${Math.min(100, Math.max(5, daysRemaining / (planDetails.duration_days || 30) * 100))}%`,
                    backgroundColor: daysRemaining < 5 ? '#DC2626' : daysRemaining < 10 ? '#D97706' : '#16A34A'
                  }
                ]} 
              />
            </View>
              </View>
            )}
            
            {/* Plan Details Section */}
            <View style={styles.planSection}>
              <Text style={[styles.detailsSectionTitle, { color: theme.text }]}>
                Plan Details
                </Text>
              
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Plan Name</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {planDetails.name || 'Unknown Plan'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Plan Type</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {isCustomPlan ? 'Custom' : 'Standard'}
                </Text>
              </View>
              
              {planDetails.price && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Standard Price</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {formatAmount(planDetails.price)}
                  </Text>
              </View>
            )}
              
              {planDetails.duration_days && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Duration</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {planDetails.duration_days} days
                  </Text>
          </View>
        )}
        
              {planDetails.description && (
                <View style={styles.descriptionContainer}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Description</Text>
                  <Text style={[styles.descriptionText, { color: theme.text }]}>
                    {planDetails.description}
                  </Text>
          </View>
        )}
        
              {/* Features with null checking */}
              {planDetails.features && (
                <View style={styles.featuresContainer}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary, marginBottom: 8 }]}>Features</Text>
                  {typeof planDetails.features === 'object' && !Array.isArray(planDetails.features) ? (
                    // Features as an object
                    Object.keys(planDetails.features).map((key, index) => (
                      <View key={`feature-${index}`} style={styles.featureItem}>
                        <AntDesign name="check" size={14} color="#16A34A" />
                        <Text style={[styles.featureText, { color: theme.text }]}>
                          {String(planDetails.features[key])}
                        </Text>
                      </View>
                    ))
                  ) : Array.isArray(planDetails.features) ? (
                    // Features as an array
                    planDetails.features.map((feature, index) => (
                      <View key={`feature-${index}`} style={styles.featureItem}>
                        <AntDesign name="check" size={14} color="#16A34A" />
                        <Text style={[styles.featureText, { color: theme.text }]}>
                          {String(feature)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    // Fallback for other cases
                    <View>
                      <Text style={[styles.noCollectionDaysText, { color: theme.textSecondary }]}>
                        No features available
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            
            {/* Agency Information Section */}
            <View style={styles.agencySection}>
              <Text style={[styles.detailsSectionTitle, { color: theme.text }]}>Agency Information</Text>
              
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Agency Name</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {agencyName}
                </Text>
              </View>
              
              {agencyDetails.constituency && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Location</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {agencyDetails.constituency}{agencyDetails.county ? `, ${agencyDetails.county}` : ''}
                  </Text>
                </View>
              )}
              
              {agencyDetails.rating && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Rating</Text>
                  <View style={styles.ratingContainer}>
                    <AntDesign name="star" size={14} color="#FFC107" />
                    <Text style={[styles.ratingText, { color: theme.text }]}>
                      {agencyDetails.rating.toFixed(1)} {agencyDetails.reviews_count ? `(${agencyDetails.reviews_count})` : ''}
                    </Text>
                  </View>
                </View>
              )}
              
              {agencyDetails.description && (
                <View style={styles.descriptionContainer}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>About</Text>
                  <Text style={[styles.descriptionText, { color: theme.text }]}>
                    {agencyDetails.description}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Contact Button */}
        {agencyDetails.contact_number && (
              <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={() => {
                    const phoneNumber = agencyDetails.contact_number;
                if (Platform.OS === 'android') {
                      Linking.openURL(`tel:${phoneNumber}`);
                } else {
                      Linking.openURL(`telprompt:${phoneNumber}`);
                }
              }}
            >
                  <Ionicons name="call-outline" size={16} color="#FFFFFF" />
              <Text style={styles.contactButtonText}>Contact Agency</Text>
            </TouchableOpacity>
                
                {!isActive && (
      <TouchableOpacity 
                    style={styles.renewButton}
                    onPress={() => navigation.navigate('SubscriptionRenewal', { 
                      subscriptionId: subscription.subscription_id,
                      planId: subscription.plan_id,
                      agencyId: subscription.agency_id
                    })}
                  >
                    <Ionicons name="refresh" size={16} color="#FFFFFF" />
                    <Text style={styles.renewButtonText}>Renew Plan</Text>
                  </TouchableOpacity>
                )}
        </View>
            )}
          </Animated.View>
        )}
      </TouchableOpacity>
    );
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.background} 
      />
      
      {/* Header with notifications button */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Dashboard</Text>
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications" size={24} color={theme.text} />
          {unreadNotifications > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#16A34A']}
            tintColor="#16A34A"
          />
        }
      >
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: '#FEE2E2' }]}>
            <AntDesign name="exclamationcircle" size={24} color="#DC2626" />
            <Text style={[styles.errorText, { color: '#B91C1C' }]}>{error}</Text>
            <TouchableOpacity style={[styles.retryButton, { backgroundColor: '#DC2626' }]} onPress={loadDashboardData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Welcome section with user profile */}
        <View style={[styles.welcomeCard, { 
          backgroundColor: theme.cardBackground,
          borderColor: isDarkMode ? theme.border : 'transparent', 
          borderWidth: isDarkMode ? 1 : 0
        }]}>
          <View style={styles.welcomeCardHeader}>
            <View style={styles.welcomeUserInfo}>
              <Text style={[styles.greetingText, { color: theme.textSecondary }]}>
                Welcome back,
              </Text>
              <Text style={[styles.userName, { color: theme.text }]}>
                {userData?.full_name || userData?.user_name || user?.user_metadata?.full_name || user?.email || 'User'}
              </Text>
              <Text style={[styles.memberSince, { color: theme.textSecondary }]}>
                Member since {userData?.created_at ? formatDate(userData.created_at) : 'N/A'}
              </Text>
            </View>
          
            {userData?.avatar_url ? (
              <Image 
                source={{ uri: userData.avatar_url }} 
                style={styles.userAvatar} 
              />
            ) : (
              <View style={[styles.userAvatarPlaceholder, {
                backgroundColor: isDarkMode ? '#2E7D32' : '#16A34A'
              }]}>
                <Text style={styles.userAvatarPlaceholderText}>
                  {userData?.user_name ? userData.user_name.charAt(0).toUpperCase() : 
                   userData?.fullName ? userData.fullName.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
          </View>
          
          <View style={[styles.statsContainer, {
            backgroundColor: isDarkMode ? '#1e2721' : '#f9fafb'
          }]}>
            <View style={styles.statItem}>
              <View style={[styles.statIconBg, { 
                backgroundColor: isDarkMode ? '#193549' : '#E0F2FE' 
              }]}>
                <Ionicons name="calendar" size={20} color={isDarkMode ? '#4dabf5' : '#0284C7'} />
              </View>
              <View>
                <Text style={[styles.statValue, { color: theme.text }]}>{activeSubscriptions.length}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Active Plans</Text>
              </View>
            </View>
            
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            
            <View style={styles.statItem}>
              <View style={[styles.statIconBg, { 
                backgroundColor: isDarkMode ? '#3e3320' : '#FEF3C7' 
              }]}>
                <Ionicons name="time-outline" size={20} color={isDarkMode ? '#ffc14d' : '#D97706'} />
              </View>
              <View>
                <Text style={[styles.statValue, { color: theme.text }]}>{expiredSubscriptions.length}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Past Plans</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.editProfileButton, { backgroundColor: '#16A34A' }]}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Ionicons name="settings-outline" size={16} color="#FFFFFF" />
            <Text style={[styles.editProfileButtonText, { color: '#FFFFFF' }]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Active Subscriptions Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Active Subscriptions</Text>
          {activeSubscriptions.length > 3 && (
            <TouchableOpacity onPress={() => navigation.navigate('AllSubscriptions', { type: 'active' })}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {activeSubscriptions.length > 0 ? (
          <View style={styles.subscriptionsList}>
            {activeSubscriptions.slice(0, 3).map(subscription => 
              renderSubscriptionCard(subscription, true)
            )}
            
            {activeSubscriptions.length > 3 && (
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('AllSubscriptions', { type: 'active' })}
              >
                <Text style={styles.viewAllButtonText}>See All {activeSubscriptions.length} Active Subscriptions</Text>
                <AntDesign name="arrowright" size={16} color="#16A34A" />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={[styles.emptyStateContainer, { 
            backgroundColor: theme.cardBackground,
            borderColor: isDarkMode ? theme.border : 'transparent',
            borderWidth: isDarkMode ? 1 : 0
          }]}>
            <MaterialCommunityIcons 
              name="calendar-blank" 
              size={50} 
              color={isDarkMode ? theme.textSecondary : '#cccccc'} 
            />
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
              No active subscriptions
            </Text>
            <TouchableOpacity 
              style={styles.browsePlansButton}
              onPress={() => navigation.navigate('CollectionAgencies')}
            >
              <Text style={styles.browsePlansButtonText}>Browse Plans</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Past Subscriptions Section */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Past Subscriptions</Text>
          {expiredSubscriptions.length > 3 && (
                <TouchableOpacity onPress={() => navigation.navigate('AllSubscriptions', { type: 'expired' })}>
              <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              )}
            </View>
            
        {expiredSubscriptions.length > 0 ? (
          <View style={styles.subscriptionsList}>
            {expiredSubscriptions.slice(0, 3).map(subscription => 
              renderSubscriptionCard(subscription, false)
            )}
            
            {expiredSubscriptions.length > 3 && (
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('AllSubscriptions', { type: 'expired' })}
              >
                <Text style={styles.viewAllButtonText}>See All {expiredSubscriptions.length} Past Subscriptions</Text>
                <AntDesign name="arrowright" size={16} color="#16A34A" />
            </TouchableOpacity>
          )}
        </View>
        ) : (
          <View style={[styles.emptyStateContainer, { backgroundColor: theme.cardBackground }]}>
            <MaterialCommunityIcons name="history" size={50} color={isDarkMode ? '#555' : '#cccccc'} />
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>No past subscriptions found</Text>
          </View>
        )}
        
        {/* Add a button to browse plans at the bottom if no active subscriptions */}
        {activeSubscriptions.length === 0 && (
          <View style={styles.bottomButtonContainer}>
            <TouchableOpacity 
              style={styles.bottomBrowsePlansButton}
              onPress={() => navigation.navigate('CollectionAgencies')}
            >
              <Text style={styles.bottomBrowsePlansButtonText}>Browse Collection Plans</Text>
              <AntDesign name="arrowright" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.bottomPadding} />
      </ScrollView>

      <LocationSelectionModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSelect={handleLocationSelect}
        selectedCounty={userData?.county}
        selectedConstituency={userData?.constituency}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#777',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  notificationButton: {
    position: 'relative',
    padding: 6,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#DC2626',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    color: '#D32F2F',
    marginLeft: 8,
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: '#D32F2F',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  
  // Welcome card styles
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  welcomeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeUserInfo: {
    flex: 1,
  },
  greetingText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 13,
    color: '#666',
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  userAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginBottom: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#e0e0e0',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#16A34A',
  },
  editProfileButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  
  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '500',
  },
  
  // Subscription card styles
  subscriptionsList: {
    marginBottom: 8,
  },
  subscriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  subscriptionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  agencyLogoSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  agencyLogoPlaceholderSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0f2e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  agencyLogoPlaceholderText: {
    color: '#16A34A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  subscriptionCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  subscriptionCardAgencyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  subscriptionCardPlanName: {
    fontSize: 13,
    color: '#666',
  },
  daysContainer: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Expanded details styles
  expandedDetailsContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 14,
  },
  fullDetailsSection: {
    marginBottom: 16,
  },
  detailsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  statusValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  detailLinkText: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '500',
  },
  
  // Progress section
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
  },
  daysRemainingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  
  // Plan section styles
  planSection: {
    marginBottom: 16,
  },
  descriptionContainer: {
    marginTop: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginTop: 4,
  },
  featuresContainer: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  
  // Agency section styles
  agencySection: {
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 4,
  },
  
  // Action buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  contactButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 6,
  },
  renewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  renewButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 6,
  },
  
  // View All button styles
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  viewAllButtonText: {
    color: '#16A34A',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 6,
  },
  
  // Empty state styles
  emptyStateContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  browsePlansButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  browsePlansButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Bottom button container
  bottomButtonContainer: {
    marginTop: 24,
    marginBottom: 12,
    alignItems: 'center',
  },
  bottomBrowsePlansButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  bottomBrowsePlansButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    marginRight: 8,
  },
  bottomPadding: {
    height: 40,
  },
  
  // Collection days section styles
  collectionDaysSection: {
    marginBottom: 16,
  },
  collectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  collectionDaysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  collectionDayChip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  collectionDayText: {
    color: '#4F46E5',
    fontSize: 13,
    fontWeight: '500',
  },
  noCollectionDaysText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  
  // Custom plan badge in the card header
  customPlanBadge: {
    fontSize: 11,
    color: '#16A34A',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  
  // Plan type badges
  planTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customPlanTypeBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  customPlanTypeText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '600',
  },
  standardPlanTypeBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  standardPlanTypeText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default UserDashboardScreen;