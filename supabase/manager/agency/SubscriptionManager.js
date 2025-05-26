import { supabase } from '../config/supabaseConfig';
import authManager from '../auth/AuthManager';
import { SUBSCRIPTION_STATUS, PAYMENT_STATUS } from '../config/constants';

class SubscriptionManager {
  async getUserId() {
    const userId = await authManager.getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return userId;
  }

  async fetchSubscriptionPlans(agencyId) {
    try {
      console.log('Fetching plans for agency:', agencyId);
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, agency_id, name, description, price, duration_days, features, is_active, plan_type, max_collection_days')
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;

      // Ensure features is properly parsed as JSON if it's stored as a string
      const plansWithFeatures = data.map(plan => ({
        ...plan,
        features: typeof plan.features === 'string' ? JSON.parse(plan.features) : (plan.features || {})
      }));

      return { data: plansWithFeatures, error: null };
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      return { data: [], error };
    }
  }

  async createSubscription(subscriptionData) {
    try {
      if (!subscriptionData.user_id || !subscriptionData.agency_id || !subscriptionData.plan_id) {
        throw new Error('Missing required fields for subscription creation');
      }
      
      // Format custom collection dates as JSONB if provided
      let customCollectionDates = null;
      if (subscriptionData.custom_collection_dates) {
        if (Array.isArray(subscriptionData.custom_collection_dates)) {
          customCollectionDates = JSON.stringify(subscriptionData.custom_collection_dates);
        } else if (typeof subscriptionData.custom_collection_dates === 'string') {
          // If it's already a JSON string, use it directly
          customCollectionDates = subscriptionData.custom_collection_dates;
        }
      }
      
      // Create metadata object
      const metadata = {
        ...(subscriptionData.metadata || {}),
        plan_type: subscriptionData.plan_type || 'standard',
        custom_collection_dates: customCollectionDates ? JSON.parse(customCollectionDates) : []
      };
      
      // Create subscription record
      const subscriptionRecord = {
        user_id: subscriptionData.user_id,
        agency_id: subscriptionData.agency_id,
        plan_id: subscriptionData.plan_id,
        status: subscriptionData.status || 'pending',
        auto_renew: subscriptionData.auto_renew !== undefined ? subscriptionData.auto_renew : false,
        custom_collection_dates: customCollectionDates,
        payment_method: subscriptionData.payment_method || 'mpesa',
        amount: subscriptionData.amount,
        currency: subscriptionData.currency || 'KES',
        metadata: JSON.stringify(metadata),
        payment_status: 'pending'
      };
      
      // Insert subscription record
      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert(subscriptionRecord)
        .select()
        .single();
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error creating subscription:', error);
      return { data: null, error };
    }
  }

  async createPaymentTransaction(paymentData) {
    try {
      if (!paymentData.subscription_id || !paymentData.user_id || !paymentData.amount) {
        throw new Error('Missing required fields for payment transaction');
      }

      // Format payment details as JSON if needed
      let paymentDetails = paymentData.payment_details;
      if (paymentDetails && typeof paymentDetails !== 'string') {
        paymentDetails = JSON.stringify(paymentDetails);
      }

      const transactionRecord = {
        subscription_id: paymentData.subscription_id,
        user_id: paymentData.user_id,
        amount: paymentData.amount,
        currency: paymentData.currency || 'KES',
        payment_method: paymentData.payment_method || 'mpesa',
        payment_provider: paymentData.payment_provider || 'paystack',
        provider_transaction_id: paymentData.provider_transaction_id || null,
        status: paymentData.status || 'pending',
        payment_details: paymentDetails
      };
      
      const { data, error } = await supabase
        .from('payment_transactions')
        .insert(transactionRecord)
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Error creating payment transaction:', error);
      return { data: null, error };
    }
  }

  async initializePayment(paymentData) {
    try {
      // Validate payment data
      if (!paymentData.subscription_id || !paymentData.amount) {
        throw new Error('Missing required payment fields');
      }
      
      // Make sure we have valid customer information
      if (!paymentData.customer || !paymentData.customer.email) {
        throw new Error('Missing customer information');
      }
      
      // Prepare the simplified payload to match our edge function
      const payload = {
        subscription_id: paymentData.subscription_id,
        amount: paymentData.amount,
        currency: paymentData.currency || 'KES',
        customer: paymentData.customer,
        metadata: paymentData.metadata || {}
      };
      
      console.log('Sending payment request to Edge Function:', payload);
      
      // Call the edge function to initialize payment with Paystack
      const { data, error } = await supabase.functions.invoke('initialize-paystack-payment', {
        body: payload
      });
      
      if (error) {
        console.error('Edge Function error:', error);
        throw error;
      }
      
      // Process the response
      console.log('Payment initialized successfully:', data);
      return { data, error: null };
    } catch (error) {
      console.error('Error initializing payment:', error);
      return { data: null, error };
    }
  }

  async verifyPaystackPayment(reference, subscriptionId) {
    try {
      console.log(`Verifying payment for reference: ${reference}, subscription: ${subscriptionId}`);
      
      // First check if we have a valid session
      const session = await supabase.auth.getSession();
      if (!session || !session.data.session) {
        console.error('No active session found for verification');
        throw new Error('Authentication required');
      }
      
      // Call the edge function with proper authorization
      const payload = {
        reference,
        subscription_id: subscriptionId
      };
      
      const { data, error } = await supabase.functions.invoke('verify-paystack-payment', {
        body: payload,
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`
        }
      });
      
      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }
      
      console.log('Verification response:', data);
      
      // Return the result directly - the edge function should handle database updates
      return { data, error: null };
    } catch (error) {
      console.error('Error verifying payment:', error);
      return { data: null, error };
    }
  }

  async checkPaymentStatus(subscriptionId) {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          user_subscriptions (
            id,
            status,
            start_date,
            end_date
          )
        `)
        .eq('subscription_id', subscriptionId)
        .single();
        
      if (error) return { data: null, error };
      
      if (data?.provider === 'paystack' && data?.provider_reference) {
        const verificationResult = await this.verifyPaystackPayment(
          data.provider_reference,
          subscriptionId
        );
        
        if (verificationResult.data?.is_successful) {
          return { 
            data: {
              ...data,
              status: PAYMENT_STATUS.SUCCESS,
              verified: true,
              verification_data: verificationResult.data
            }, 
            error: null 
          };
        }
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Error checking payment status:', error);
      return { data: null, error };
    }
  }
  async checkSubscriptionHistory(agencyId) {
    try {
      const userId = await this.getUserId();
      const now = new Date().toISOString();

      const [activeResult, pastResult] = await Promise.all([
        supabase
          .from('subscription_history')
          .select('*')
          .eq('user_id', userId)
          .eq('agency_id', agencyId)
          .eq('status', 'active')
          .lte('start_date', now)
          .gte('end_date', now)
          .single(),
        
        supabase
          .from('subscription_history')
          .select('*')
          .eq('user_id', userId)
          .eq('agency_id', agencyId)
          .or(`status.eq.expired,status.eq.cancelled,end_date.lt.${now}`)
          .single()
      ]);

      return {
        hasActiveSubscription: !activeResult.error && !!activeResult.data,
        hasPastSubscription: !pastResult.error && !!pastResult.data,
        activeSubscription: activeResult.data,
        pastSubscription: pastResult.data,
        error: null
      };
    } catch (error) {
      console.error('Error checking subscription history:', error);
      return {
        hasActiveSubscription: false,
        hasPastSubscription: false,
        activeSubscription: null,
        pastSubscription: null,
        error
      };
    }
  }

  async getUserSubscriptionHistory(userId) {
    try {
      const now = new Date().toISOString();
      
      // Get all subscriptions for the user
      const { data, error } = await supabase
        .from('subscription_history')
        .select(`
          id,
          agency_id,
          plan_id,
          start_date,
          end_date,
          status,
          agencies:agency_id (
            id,
            name,
            description,
            logo_url,
            constituency,
            rating
          )
        `)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // Split into active and past subscriptions
      const active = data.filter(sub => 
        sub.status === 'active' && 
        new Date(sub.start_date) <= new Date(now) &&
        new Date(sub.end_date) >= new Date(now)
      );
      
      const past = data.filter(sub =>
        sub.status !== 'active' ||
        new Date(sub.end_date) < new Date(now)
      );
      
      return {
        active,
        past,
        error: null
      };
    } catch (error) {
      console.error('Error getting user subscription history:', error);
      return { active: [], past: [], error };
    }
  }

  async loadUserSubscriptions() {
    try {
      const userId = await this.getUserId();
      const now = new Date().toISOString();

      // Query active subscriptions
      const { data: activeData, error: activeError } = await supabase
        .from('subscription_history')
        .select(`
          id,
          agency_id,
          plan_id,
          start_date,
          end_date,
          status,
          agencies:agency_id (
            id,
            name,
            description,
            logo_url,
            constituency,
            rating
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .lte('start_date', now)
        .gte('end_date', now);

      if (activeError) throw activeError;

      // Query past subscriptions
      const { data: pastData, error: pastError } = await supabase
        .from('subscription_history')
        .select(`
          id,
          agency_id,
          plan_id,
          start_date,
          end_date,
          status,
          agencies:agency_id (
            id,
            name,
            description,
            logo_url,
            constituency,
            rating
          )
        `)
        .eq('user_id', userId)
        .or(`status.eq.expired,status.eq.cancelled,end_date.lt.${now}`);

      if (pastError) throw pastError;

      return {
        active: this.formatSubscriptions(activeData || []),
        past: this.formatSubscriptions(pastData || []),
        error: null
      };
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      return { active: [], past: [], error };
    }
  }

  formatSubscriptions(subscriptions) {
    return subscriptions.map(sub => ({
      id: sub.id,
      agencyId: sub.agency_id,
      planId: sub.plan_id,
      startDate: sub.start_date,
      endDate: sub.end_date,
      status: sub.status,
      agency: sub.agencies
    }));
  }

  async checkActiveSubscription(agencyId) {
    try {
      const userId = await this.getUserId();
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('subscription_history')
        .select('*')
        .eq('user_id', userId)
        .eq('agency_id', agencyId)
        .eq('status', 'active')
        .lte('start_date', now)
        .gte('end_date', now)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return {
        hasActiveSubscription: !!data,
        subscription: data,
        error: null
      };
    } catch (error) {
      console.error('Error checking active subscription:', error);
      return { hasActiveSubscription: false, subscription: null, error };
    }
  }

  async updateSubscriptionStatus(subscriptionId, status) {
    try {
      if (!subscriptionId) {
        throw new Error('Subscription ID is required');
      }

      if (!['active', 'cancelled', 'expired', 'pending'].includes(status)) {
        throw new Error('Invalid subscription status');
      }

      // Update the subscription status
      const { data, error } = await supabase
        .from('user_subscriptions')
        .update({ status })
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) throw error;

      // If status is active, also update subscription_history
      if (status === 'active') {
        const now = new Date().toISOString();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        
        // Create a subscription history entry
        await supabase
          .from('subscription_history')
          .insert({
            subscription_id: subscriptionId,
            user_id: data.user_id,
            agency_id: data.agency_id,
            plan_id: data.plan_id,
            start_date: now,
            end_date: thirtyDaysLater.toISOString(),
            status: 'active'
          });
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error updating subscription status:', error);
      return { data: null, error };
    }
  }

  async checkEverSubscribedToAgency(userId, agencyId) {
    try {
      if (!userId || !agencyId) {
        throw new Error('User ID and Agency ID are required');
      }

      console.log(`Checking subscription history for user: ${userId} agency: ${agencyId}`);

      // Ensure userId is a valid UUID
      if (typeof userId !== 'string' || !userId.includes('-')) {
        console.error(`Invalid user ID format: ${userId}. Expected UUID format.`);
        throw new Error(`Invalid user ID format: ${userId}`);
      }

      // Convert agencyId to a number if it's a string
      const numericAgencyId = typeof agencyId === 'string' ? parseInt(agencyId, 10) : agencyId;
      
      if (isNaN(numericAgencyId)) {
        console.error(`Invalid agency ID: ${agencyId}. Could not convert to number.`);
        throw new Error(`Invalid agency ID: ${agencyId}`);
      }

      console.log(`Querying subscription_history with user_id=${userId} and agency_id=${numericAgencyId}`);

      // Check if user has ever had a subscription (active or expired) to this agency
      const { data, error } = await supabase
        .from('subscription_history')
        .select('id, status')
        .eq('user_id', userId) // user_id is UUID
        .eq('agency_id', numericAgencyId) // agency_id is bigint
        .or('status.eq.active,status.eq.expired')
        .limit(1);

      if (error) {
        console.error('Database error in checkEverSubscribedToAgency:', error);
        throw error;
      }

      const hasSubscribed = data && data.length > 0;
      console.log(`Subscription history result for user ${userId}: ${hasSubscribed ? 'Has subscribed' : 'Never subscribed'}`);

      return {
        data: hasSubscribed,
        error: null
      };
    } catch (error) {
      console.error('Error checking if user ever subscribed to agency:', error);
      return { data: false, error };
    }
  }
  async getSubscriptionDetails(subscriptionId) {
    try {
      // Get subscription details with plan information
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          status,
          payment_status,
          start_date,
          end_date,
          created_at,
          updated_at,
          subscription_plans (
            id,
            name,
            description,
            price,
            duration_days,
            features
          )
        `)
        .eq('id', subscriptionId)
        .single();
      
      if (error) throw error;
      
      if (!data) {
        return { data: null, error: new Error('Subscription not found') };
      }
      
      // Format the data for easier use in UI
      const formattedData = {
        id: data.id,
        status: data.status,
        payment_status: data.payment_status,
        start_date: data.start_date,
        end_date: data.end_date,
        created_at: data.created_at,
        updated_at: data.updated_at,
        plan_id: data.subscription_plans?.id,
        plan_name: data.subscription_plans?.name,
        description: data.subscription_plans?.description,
        price: data.subscription_plans?.price,
        duration_days: data.subscription_plans?.duration_days,
        features: data.subscription_plans?.features || []
      };
      
      return { data: formattedData, error: null };
    } catch (error) {
      console.error('Error fetching subscription details:', error);
      return { data: null, error };
    }
  }
}

export default new SubscriptionManager();