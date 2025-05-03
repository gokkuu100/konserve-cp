import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.notificationListeners = [];
    this.lastNotificationResponse = null;
    this.NOTIFICATION_STORAGE_KEY = '@subscription_notifications';
  }

  // Initialize notification permissions and listeners
  async initialize() {
    try {
      // Request permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for notifications!');
        return false;
      }
      
      // Get push token if on a physical device
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        const token = await this.getPushToken();
        console.log('Notification token:', token);
      }
      
      // Set up notification listeners
      this.setupNotificationListeners();
      
      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }
  
  // Get push notification token
  async getPushToken() {
    try {
      // Check if device is a simulator
      if (!Constants.isDevice) {
        console.log('Must use physical device for push notifications');
        return null;
      }
      
      // Get the token
      const { data: token } = await Notifications.getExpoPushTokenAsync({
        experienceId: Constants.manifest?.id || '@username/appName',
      });
      
      // Configure Android channel
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('subscription-notifications', {
          name: 'Subscription Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4CAF50',
          sound: true,
        });
      }
      
      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }
  
  // Set up notification listeners
  setupNotificationListeners() {
    // Clean up any existing listeners
    this.removeNotificationListeners();
    
    // Handle received notifications
    const receivedListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });
    
    // Handle notification responses (when user taps)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      this.lastNotificationResponse = response;
    });
    
    this.notificationListeners = [receivedListener, responseListener];
  }
  
  // Remove notification listeners
  removeNotificationListeners() {
    this.notificationListeners.forEach(listener => {
      if (listener) Notifications.removeNotificationSubscription(listener);
    });
    this.notificationListeners = [];
  }
  
  // Schedule a local notification
  async scheduleNotification(title, body, data = {}, trigger = null) {
    try {
      // Default trigger is immediate
      if (!trigger) {
        trigger = null; // Immediate notification
      }
      
      const notificationContent = {
        title,
        body,
        data,
        sound: true,
      };
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger,
      });
      
      console.log('Scheduled notification with ID:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }
  
  // Schedule a subscription expiry notification
  async scheduleSubscriptionExpiryNotification(subscription, daysBeforeExpiry = 3) {
    try {
      if (!subscription || !subscription.end_date) {
        console.error('Invalid subscription data for notification');
        return null;
      }
      
      const endDate = new Date(subscription.end_date);
      const notificationDate = new Date(endDate);
      notificationDate.setDate(notificationDate.getDate() - daysBeforeExpiry);
      
      // Don't schedule if the notification date is in the past
      if (notificationDate <= new Date()) {
        console.log('Notification date is in the past, not scheduling');
        return null;
      }
      
      // Create a unique identifier for this subscription notification
      const notificationKey = `subscription_${subscription.id}_${daysBeforeExpiry}days`;
      
      // Check if we've already scheduled this notification
      const existingNotifications = await this.getScheduledSubscriptionNotifications();
      if (existingNotifications[notificationKey]) {
        console.log('Notification already scheduled for this subscription');
        return existingNotifications[notificationKey];
      }
      
      // Calculate seconds from now until notification time
      const secondsUntilNotification = Math.floor((notificationDate.getTime() - Date.now()) / 1000);
      
      // Schedule the notification
      const title = 'Subscription Expiring Soon';
      const body = `Your ${subscription.plan_name} subscription with ${subscription.agency_name} will expire in ${daysBeforeExpiry} days.`;
      const data = {
        subscriptionId: subscription.id,
        type: 'subscription_expiry',
        daysRemaining: daysBeforeExpiry,
        planName: subscription.plan_name,
        agencyName: subscription.agency_name,
      };
      
      const trigger = {
        seconds: secondsUntilNotification,
      };
      
      const notificationId = await this.scheduleNotification(title, body, data, trigger);
      
      // Save the scheduled notification info
      if (notificationId) {
        await this.saveScheduledNotification(notificationKey, {
          id: notificationId,
          subscriptionId: subscription.id,
          scheduledFor: notificationDate.toISOString(),
          daysBeforeExpiry,
        });
      }
      
      return notificationId;
    } catch (error) {
      console.error('Error scheduling subscription expiry notification:', error);
      return null;
    }
  }
  
  // Save a scheduled notification to storage
  async saveScheduledNotification(key, notificationInfo) {
    try {
      const existingNotifications = await this.getScheduledSubscriptionNotifications();
      existingNotifications[key] = notificationInfo;
      
      await AsyncStorage.setItem(
        this.NOTIFICATION_STORAGE_KEY,
        JSON.stringify(existingNotifications)
      );
      
      return true;
    } catch (error) {
      console.error('Error saving scheduled notification:', error);
      return false;
    }
  }
  
  // Get all scheduled subscription notifications
  async getScheduledSubscriptionNotifications() {
    try {
      const notificationsJson = await AsyncStorage.getItem(this.NOTIFICATION_STORAGE_KEY);
      return notificationsJson ? JSON.parse(notificationsJson) : {};
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return {};
    }
  }
  
  // Cancel a specific notification
  async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      return true;
    } catch (error) {
      console.error('Error canceling notification:', error);
      return false;
    }
  }
  
  // Cancel all notifications for a subscription
  async cancelSubscriptionNotifications(subscriptionId) {
    try {
      const existingNotifications = await this.getScheduledSubscriptionNotifications();
      const notificationKeys = Object.keys(existingNotifications);
      
      // Filter keys related to this subscription
      const subscriptionKeys = notificationKeys.filter(key => 
        key.startsWith(`subscription_${subscriptionId}_`)
      );
      
      // Cancel each notification
      for (const key of subscriptionKeys) {
        const notificationInfo = existingNotifications[key];
        if (notificationInfo && notificationInfo.id) {
          await this.cancelNotification(notificationInfo.id);
          delete existingNotifications[key];
        }
      }
      
      // Update storage
      await AsyncStorage.setItem(
        this.NOTIFICATION_STORAGE_KEY,
        JSON.stringify(existingNotifications)
      );
      
      return true;
    } catch (error) {
      console.error('Error canceling subscription notifications:', error);
      return false;
    }
  }
  
  // Schedule notifications for all active subscriptions
  async scheduleNotificationsForAllSubscriptions(subscriptions) {
    try {
      if (!subscriptions || !Array.isArray(subscriptions)) {
        return false;
      }
      
      // Filter for active subscriptions
      const activeSubscriptions = subscriptions.filter(sub => 
        sub.status?.toLowerCase() === 'active'
      );
      
      // Schedule notifications at different intervals
      for (const subscription of activeSubscriptions) {
        // Schedule at 7 days, 3 days, and 1 day before expiry
        await this.scheduleSubscriptionExpiryNotification(subscription, 7);
        await this.scheduleSubscriptionExpiryNotification(subscription, 3);
        await this.scheduleSubscriptionExpiryNotification(subscription, 1);
      }
      
      return true;
    } catch (error) {
      console.error('Error scheduling notifications for subscriptions:', error);
      return false;
    }
  }
}

// Create and export a singleton instance
const notificationService = new NotificationService();
export default notificationService;
