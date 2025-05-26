import { supabase } from '../config/supabaseConfig';
import authManager from '../auth/AuthManager';

class PaymentManager {
  async getUserId() {
    const userId = await authManager.getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return userId;
  }

  async getUserTransactions() {
    try {
      const userId = await this.getUserId();
      
      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          user_subscriptions (
            id,
            agency_id,
            plan_id,
            status,
            start_date,
            end_date,
            agencies (id, name),
            subscription_plans (name, price, duration_days)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching user transactions:', error);
        return { data: [], error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Exception in getUserTransactions:', error);
      return { data: [], error };
    }
  }

  async getTransactionDetails(transactionId) {
    try {
      if (!transactionId) {
        throw new Error('Transaction ID is required');
      }
      
      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          user_subscriptions (
            id,
            agency_id,
            plan_id,
            status,
            start_date,
            end_date,
            agencies (id, name, logo_url, contact_email, phone_number),
            subscription_plans (name, price, duration_days, features)
          )
        `)
        .eq('id', transactionId)
        .single();
      
      if (error) {
        console.error('Error fetching transaction details:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Exception in getTransactionDetails:', error);
      return { data: null, error };
    }
  }

  async verifyPayment(reference) {
    try {
      const { data, error } = await supabase.functions.invoke('verify-paystack-payment', {
        body: { reference }
      });
      
      if (error) {
        console.error('Error verifying payment:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Exception in verifyPayment:', error);
      return { data: null, error };
    }
  }

  async updateTransactionStatus(transactionId, status, details = {}) {
    try {
      if (!transactionId) {
        throw new Error('Transaction ID is required');
      }
      
      const { data, error } = await supabase
        .from('payment_transactions')
        .update({
          status,
          payment_details: details,
          verified_at: status === 'completed' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating transaction status:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Exception in updateTransactionStatus:', error);
      return { data: null, error };
    }
  }
}

export default new PaymentManager();
