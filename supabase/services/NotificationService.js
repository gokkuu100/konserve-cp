import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../config/supabaseConfig';

class NotificationService {
  /**
   * Initialize notification settings for the app
   */
  static async initializeNotifications() {

    Notifications.setNotificationHandler({
      handleNotification: async () => {

        const settingsString = await AsyncStorage.getItem('userSettings');
        const settings = settingsString ? JSON.parse(settingsString) : { notifications: true, sound: true };
        
        return {
          shouldShowAlert: settings.notifications,
          shouldPlaySound: settings.sound,
          shouldSetBadge: settings.notifications,
        };
      },
    });
  }

  /**
   * Request notification permissions
   * @returns {Promise<boolean>} Whether permissions were granted
   */
  static async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      // Only ask if permissions have not already been determined
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Save the device token to Supabase
   * @param {string} userId - The user's ID
   */
  static async registerDeviceToken(userId) {
    try {
      if (!userId) {
        console.warn('Cannot register device token: No user ID provided');
        return;
      }
      
      // Check if notifications are enabled in settings
      const settingsString = await AsyncStorage.getItem('userSettings');
      const settings = settingsString ? JSON.parse(settingsString) : { notifications: true };
      
      if (!settings.notifications) {
        console.log('Notifications are disabled in settings');
        return;
      }

  
      const tokenData = await Notifications.getExpoPushTokenAsync({
        experienceId: '@princegoku/konserve'
      });
      const pushToken = tokenData.data;
      
      console.log('Got push token:', pushToken);
      

      const { data: existingTokens, error: fetchError } = await supabase
        .from('user_push_tokens')
        .select('id, push_token')
        .eq('user_id', userId)
        .eq('push_token', pushToken);
      
      if (fetchError) {
        console.error('Error checking existing push token:', fetchError);
        return;
      }
      

      if (existingTokens && existingTokens.length > 0) {
        const { error: updateError } = await supabase
          .from('user_push_tokens')
          .update({ last_used: new Date().toISOString() })
          .eq('id', existingTokens[0].id);
        
        if (updateError) {
          console.error('Error updating push token last_used:', updateError);
        }
        return;
      }
      
 
      const { error } = await supabase
        .from('user_push_tokens')
        .insert({
          user_id: userId,
          push_token: pushToken,
          device_type: Platform.OS,
          last_used: new Date().toISOString()
        });
        
      if (error) {
        console.error('Error saving push token:', error);
      } else {
        console.log('Successfully saved push token');
      }
    } catch (error) {
      console.error('Error registering device token:', error);
    }
  }

  /**
   * Schedule a local notification
   * @param {Object} options - Notification options
   * @param {string} options.title - Notification title
   * @param {string} options.body - Notification body
   * @param {Object} options.data - Additional data to include
   * @param {Date|number} options.trigger - When to trigger the notification
   * @returns {Promise<string>} Notification identifier
   */
  static async scheduleNotification({ title, body, data = {}, trigger }) {
    try {
      // Check if notifications are enabled
      const settingsString = await AsyncStorage.getItem('userSettings');
      const settings = settingsString ? JSON.parse(settingsString) : { notifications: true, sound: true };
      
      if (!settings.notifications) {
        console.log('Notifications are disabled in settings');
        return null;
      }
      
      // Schedule the notification with custom sound
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: settings.sound ? 'twonotekonserve.mp3' : null, // Use custom sound if sound is enabled
        },
        trigger,
      });
      
      return identifier;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Cancel a scheduled notification
   * @param {string} notificationId - The notification ID to cancel
   * @returns {Promise<void>}
   */
  static async cancelNotification(notificationId) {
    if (!notificationId) return;
    
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  // Add this new method to handle received notifications
  static async handleReceivedNotification(notification) {
    try {
      // Extract the data from the notification
      const data = notification.request.content.data;
      
      // Check if we need to update unread counts or refresh data
      if (data.screen === 'Messages') {
        // We could update a global counter or trigger a refresh
        if (global.refreshAgencyMessages) {
          global.refreshAgencyMessages();
        }
      } else if (data.screen === 'OrgMessages') {
        if (global.refreshOrgMessages) {
          global.refreshOrgMessages();
        }
      } else if (data.screen === 'MarketDirectChat') {
        if (global.refreshMarketMessages) {
          global.refreshMarketMessages();
        }
      }
      
      // You can also play a custom sound here if the app is in the foreground
      // and you want to alert the user beyond the default notification
    } catch (error) {
      console.error('Error handling received notification:', error);
    }
  }
}

export default NotificationService;