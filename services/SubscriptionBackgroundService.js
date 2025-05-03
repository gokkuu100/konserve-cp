import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import SubscriptionManager from '../supabase/manager/agency/SubscriptionManager';
import AuthManager from '../supabase/manager/auth/AuthManager';
import notificationService from './NotificationService';

// Define the background task name
const SUBSCRIPTION_CHECK_TASK = 'SUBSCRIPTION_CHECK_TASK';

// Register the background task
TaskManager.defineTask(SUBSCRIPTION_CHECK_TASK, async () => {
  try {
    console.log('[Background] Checking for expired subscriptions...');
    
    // First, check if there's a logged-in user
    const session = await AuthManager.getSession();
    if (!session?.user) {
      console.log('[Background] No user logged in, skipping subscription check');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    const currentUser = session.user;
    
    // Get all user subscriptions
    const { data: subscriptions, error } = await SubscriptionManager.getUserSubscriptions(currentUser.id);
    
    if (error) {
      console.error('[Background] Error fetching subscriptions:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
    
    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Background] No subscriptions found');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    // Check for expired subscriptions
    const now = new Date();
    let updatedCount = 0;
    
    for (const subscription of subscriptions) {
      // Skip if not active
      if (subscription.status !== 'active') continue;
      
      // Check if expired
      const endDate = new Date(subscription.end_date);
      if (endDate <= now) {
        // Update subscription status to expired
        const { error: updateError } = await SubscriptionManager.updateSubscriptionStatus(
          subscription.id, 
          'expired'
        );
        
        if (!updateError) {
          updatedCount++;
          console.log(`[Background] Marked subscription ${subscription.id} as expired`);
          
          // Add to subscription history - this is now handled by updateSubscriptionStatus
        }
      } else {
        // Not expired, check if we need to schedule notifications
        const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        
        // Schedule notifications at key thresholds if within the next 8 days
        if (daysRemaining <= 8) {
          // Schedule notifications for this subscription
          if (daysRemaining <= 7 && daysRemaining > 3) {
            await notificationService.scheduleSubscriptionExpiryNotification(subscription, 7);
          }
          if (daysRemaining <= 3 && daysRemaining > 1) {
            await notificationService.scheduleSubscriptionExpiryNotification(subscription, 3);
          }
          if (daysRemaining <= 1) {
            await notificationService.scheduleSubscriptionExpiryNotification(subscription, 1);
          }
        }
      }
    }
    
    if (updatedCount > 0) {
      console.log(`[Background] Updated ${updatedCount} expired subscriptions`);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      console.log('[Background] No subscriptions needed updating');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
  } catch (error) {
    console.error('[Background] Error in subscription check task:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

class SubscriptionBackgroundService {
  // Register the background task
  async registerBackgroundCheck() {
    try {
      // Register the background fetch task
      await BackgroundFetch.registerTaskAsync(SUBSCRIPTION_CHECK_TASK, {
        minimumInterval: 60 * 60, // 1 hour in seconds
        stopOnTerminate: false,
        startOnBoot: true,
      });
      
      console.log('Background subscription check registered');
      return true;
    } catch (error) {
      console.error('Error registering background task:', error);
      return false;
    }
  }
  
  // Unregister the background task
  async unregisterBackgroundCheck() {
    try {
      await BackgroundFetch.unregisterTaskAsync(SUBSCRIPTION_CHECK_TASK);
      console.log('Background subscription check unregistered');
      return true;
    } catch (error) {
      console.error('Error unregistering background task:', error);
      return false;
    }
  }
  
  // Check if the background task is registered
  async isBackgroundCheckRegistered() {
    try {
      const status = await BackgroundFetch.getStatusAsync();
      const isRegistered = await TaskManager.isTaskRegisteredAsync(SUBSCRIPTION_CHECK_TASK);
      
      return {
        isRegistered,
        status
      };
    } catch (error) {
      console.error('Error checking background task status:', error);
      return {
        isRegistered: false,
        status: null
      };
    }
  }
  
  // Manually trigger a subscription check
  async checkSubscriptionsNow() {
    try {
      // Get current user
      const session = await AuthManager.getSession();
      if (!session?.user) {
        return { updated: false, count: 0, message: 'No user logged in' };
      }
      
      const currentUser = session.user;
      
      // Get all user subscriptions
      const { data: subscriptions, error } = await SubscriptionManager.getUserSubscriptions(currentUser.id);
      
      if (error) throw error;
      
      if (!subscriptions || subscriptions.length === 0) {
        return { updated: false, count: 0, message: 'No subscriptions found' };
      }
      
      // Check for expired subscriptions
      const now = new Date();
      let updatedCount = 0;
      
      for (const subscription of subscriptions) {
        // Skip if not active
        if (subscription.status !== 'active') continue;
        
        // Check if expired
        const endDate = new Date(subscription.end_date);
        if (endDate <= now) {
          // Update subscription status to expired
          const { error: updateError } = await SubscriptionManager.updateSubscriptionStatus(
            subscription.id, 
            'expired'
          );
          
          if (!updateError) {
            updatedCount++;
            // Subscription history is now handled by updateSubscriptionStatus
          }
        } else {
          // Not expired, schedule notifications
          await notificationService.scheduleSubscriptionExpiryNotification(subscription, 7);
          await notificationService.scheduleSubscriptionExpiryNotification(subscription, 3);
          await notificationService.scheduleSubscriptionExpiryNotification(subscription, 1);
        }
      }
      
      return { 
        updated: updatedCount > 0, 
        count: updatedCount,
        message: updatedCount > 0 ? `Updated ${updatedCount} expired subscriptions` : 'No subscriptions needed updating'
      };
    } catch (error) {
      console.error('Error checking subscriptions:', error);
      return { 
        updated: false, 
        count: 0, 
        error: error.message || 'Unknown error'
      };
    }
  }
}

// Create and export a singleton instance
const subscriptionBackgroundService = new SubscriptionBackgroundService();
export default subscriptionBackgroundService;
