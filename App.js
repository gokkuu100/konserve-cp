import { AntDesign, Feather, Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StatusBar, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './ThemeContext';

// Import your screens
import AgencyFeedbackScreen from './components/AgencyFeedbackScreen';
import { MessageDetails, Messages } from './components/AgencyMessagesScreen';
import ChatComponent from './components/ChatComponent';
import CollectionAgenciesScreen from './components/CollectionAgenciesScreen';
import EditProfileScreen from './components/EditProfileScreen';
import FeedbackScreen from './components/FeedbackScreen';
import GoogleMapScreen from './components/GoogleMapScreen';
import HomePageScreen from './components/HomePageScreen';
import LoginScreen from './components/LoginScreen';
import OptionsScreen from './components/OptionsScreen';
import OrgMessageScreen from './components/OrgMessageScreen';
import { PaymentCancelScreen, PaymentSuccessScreen } from './components/PaymentResultsScreen';
import PaymentScreen from './components/PaymentScreen';
import RegisterScreen from './components/RegisterScreen';
import ReportDetailScreen from './components/ReportDetailScreen';
import ReportEnvironmentScreen from './components/ReportEnvironmentScreen';
import RewardPointsScreen from './components/RewardPointsScreen';
import Services from './components/Services';
import SettingsScreen from './components/SettingsScreen';
import SubscriptionPlan from './components/SubscriptionPlan';
import SubscriptionPlanScreen from './components/SubscriptionPlanScreen';
import UserDashboardScreen from './components/UserDashboardScreen';
import WasteCalendarScreen from './components/WasteCalendarScreen';
import WasteIdentificationScreen from './components/WasteIdentificationScreen';

// Import managers
import AgencyMessageDetailScreen from './components/AgencyMessageDetailScreen';
import AgencyReviewScreen from './components/AgencyReviewScreen';
import MarketDirectChat from './components/MarketDirectChat';
import MarketMessagesInbox from './components/MarketMessagesInbox';
import WasteMarketplace from './components/MarketScreen';
import { supabase } from './supabase/config/supabaseConfig';
import ProfileManager from './supabase/manager/auth/ProfileManager';
import MessageManager from './supabase/manager/messaging/MessageManager';

// Configure notifications handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// This is our main bottom tab navigator
function MainTabNavigator() {
  const { theme, isDarkMode } = useTheme();
  const { user, userId } = useAuth();
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [userConstituency, setUserConstituency] = useState(null);
  
  // Setup global messageReadListeners if it doesn't exist
  useEffect(() => {
    if (!global.messageReadListeners) {
      global.messageReadListeners = [];
    }
    
    // Function to check for unread messages
    const checkUnreadMessages = async () => {
      if (!userId || !userConstituency) return;
      
      try {
        const { count, error } = await MessageManager.getUnreadMessageCount(
          userId, 
          userConstituency
        );
        
        if (error) {
          console.error('Error checking unread messages:', error);
          return;
        }
        
        setHasUnreadMessages(count > 0);
      } catch (error) {
        console.error('Exception checking unread messages:', error);
      }
    };
    
    // Get user constituency if needed
    const getUserConstituency = async () => {
      try {
        const { data, error } = await ProfileManager.getUserProfile(userId);
        if (!error && data && data.constituency) {
          setUserConstituency(data.constituency);
        }
      } catch (error) {
        console.error('Error getting user constituency:', error);
      }
    };
    
    // Setup
    if (userId && !userConstituency) {
      getUserConstituency();
    }
    
    if (userId && userConstituency) {
      checkUnreadMessages();
    }
    
    // Set up periodic checks
    const intervalId = setInterval(() => {
      if (userId && userConstituency) {
        checkUnreadMessages();
      }
    }, 60000); // Check every minute
    
    // Add listener for when messages are read
    const messageReadListener = () => {
      setHasUnreadMessages(false);
    };
    
    global.messageReadListeners.push(messageReadListener);
    
    return () => {
      clearInterval(intervalId);
      // Remove listener
      const index = global.messageReadListeners.indexOf(messageReadListener);
      if (index > -1) {
        global.messageReadListeners.splice(index, 1);
      }
    };
  }, [userId, userConstituency]);
  
  return (
    <Tab.Navigator 
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          height: 90,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          backgroundColor: theme.surface,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          borderBottomWidth: 0,
          ...Platform.select({
            android: {
              elevation: 8,
              borderBottomColor: 'transparent',
              borderBottomWidth: 0,
            },
            ios: {
              shadowColor: isDarkMode ? '#000' : '#fff',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: isDarkMode ? 0.3 : 0.1,
              shadowRadius: 3,
              borderBottomWidth: 0,
            }
          }),
        },
        tabBarItemStyle: {
          flex: 1,
          paddingHorizontal: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 3,
          color: theme.text,
        },
        headerShown: false,
      }}
      safeAreaInsets={{ bottom: 10 }}
    >
      <Tab.Screen 
        name="Services" 
        component={Services} 
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name="options-outline" 
              size={24} 
              color={focused ? theme.primary : theme.text} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Rewards" 
        component={RewardPointsScreen} 
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <AntDesign 
              name="Trophy" 
              size={24} 
              color={focused ? theme.primary : theme.text} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="AIScreen" 
        component={WasteIdentificationScreen} 
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <AntDesign 
              name="camerao" 
              size={24} 
              color={focused ? theme.primary : theme.text} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Chats" 
        component={ChatComponent} 
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{ position: 'relative' }}>
              <Ionicons 
                name="chatbubble-outline" 
                color={focused ? theme.primary : theme.text} 
                size={size} 
              />
              {hasUnreadMessages && (
                <View 
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: -6,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: theme.primary,
                  }}
                />
              )}
            </View>
          )
        }}
      />
      <Tab.Screen 
        name="Home" 
        component={HomePageScreen} 
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <Feather 
              name="home" 
              size={24} 
              color={focused ? theme.primary : theme.text} 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Main App component
export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const navigationRef = useRef(null);
  
  // This effect handles the splash screen and app initialization
  useEffect(() => {
    async function initializeApp() {
      try {
        await SplashScreen.preventAutoHideAsync();
      } catch (e) {
        console.error('Error preventing splash screen auto hide:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    initializeApp();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      // Hide splash screen once app is ready
      SplashScreen.hideAsync().catch(e => {
        console.warn('Error hiding splash screen:', e);
      });
    }
  }, [appIsReady]);

  // Deep link handling effect
  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('Deep link received:', event.url);
    });
    
    // Check for initial URL
    Linking.getInitialURL().then(url => {
      if (url) console.log('Initial URL:', url);
    });
    
    return () => subscription.remove();
  }, []);

  // Linking configuration for deep linking
  const linking = {
    prefixes: [
      'konseveapp://', 
      'https://konserveapp.com',
      'https://auth.expo.io/@princegoku/konserveapp'
    ],
    config: {
      screens: {
        PaymentScreen: 'payment',
        PaymentSuccess: 'payment/success', // Handle Paystack success redirect
        PaymentCancel: 'payment/cancel',   // Handle Paystack cancel redirect
        Login: 'login',
        Register: 'register',
        MainTabs: {
          screens: {
            Home: 'home',
            Maps: 'maps',
            Rewards: 'rewards',
            Chats: 'chats',
            Services: 'services',
            SubscriptionPlanScreen: 'subscriptionPlanScreen'
          }
        }
      }
    },
  };

  if (!appIsReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7b68ee" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent navigationRef={navigationRef} linking={linking} />
      </ThemeProvider>
    </AuthProvider>
  );
}

// Separate component to use theme and auth context
function AppContent({ navigationRef, linking }) {
  const { theme, isDarkMode } = useTheme();
  const { isAuthenticated, loading, userId } = useAuth();
  const [notificationsInitialized, setNotificationsInitialized] = useState(false);
  
  console.log('AppContent rendering, auth state:', isAuthenticated ? 'Authenticated' : 'Not authenticated');
  
  // Register for push notifications
  const registerForPushNotificationsAsync = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      // Only ask if permissions have not already been determined
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      // Stop here if the user did not grant permissions
      if (finalStatus !== 'granted') {
        console.log('Notification permission not granted');
        return;
      }
      
      // Get the push token
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const pushToken = tokenData.data;
      console.log('Push token:', pushToken);
      
      // Save token to Supabase if user is authenticated
      if (userId) {
        await saveTokenToSupabase(pushToken, userId);
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  };
  
  // Save token to Supabase
  const saveTokenToSupabase = async (token, userId) => {
    if (!userId || !token) return;
    
    try {
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({ 
          user_id: userId,
          push_token: token,
          device_type: Platform.OS,
          last_used: new Date().toISOString()
        });
        
      if (error) {
        console.error('Error saving push token:', error);
      }
    } catch (error) {
      console.error('Exception saving push token:', error);
    }
  };
  
  // Set up notification response handler
  useEffect(() => {
    if (isAuthenticated && !notificationsInitialized) {
      // Register for push notifications
      registerForPushNotificationsAsync();
      
      // Set up notification response handler
      const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        
        // Check if notification contains navigation data
        if (data?.screen && navigationRef.current) {
          // Navigate to the screen specified in the notification
          navigationRef.current.navigate(data.screen, data.params);
        }
      });
      
      setNotificationsInitialized(true);
      
      // Cleanup
      return () => {
        Notifications.removeNotificationSubscription(responseListener);
      };
    }
  }, [isAuthenticated, navigationRef.current, notificationsInitialized, userId]);
  
  // Create navigation theme based on app theme
  const navigationTheme = {
    ...(isDarkMode ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDarkMode ? DarkTheme.colors : DefaultTheme.colors),
      primary: theme.primary,
      background: theme.background,
      card: theme.surface,
      text: theme.text,
      border: theme.border,
      notification: theme.primary,
    },
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer 
      ref={navigationRef} 
      theme={navigationTheme}
      linking={linking}
    >
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.statusBar} 
      />
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          cardStyle: { backgroundColor: theme.background }
        }}
      >
        {!isAuthenticated ? (
          // Auth screens
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          // App screens
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen name="Maps" component={GoogleMapScreen} />
            <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
            <Stack.Screen name="Options" component={OptionsScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="ReportEnvironment" component={ReportEnvironmentScreen} />
            <Stack.Screen name="Feedback" component={FeedbackScreen} />
            <Stack.Screen name="CollectionAgencies" component={CollectionAgenciesScreen} />
            <Stack.Screen name="SubscriptionPlan" component={SubscriptionPlan} />
            <Stack.Screen name="Messages" component={Messages} />
            <Stack.Screen name="MessageDetails" component={MessageDetails} />
            <Stack.Screen name="WasteCalendar" component={WasteCalendarScreen} />
            <Stack.Screen name="AgencyFeedback" component={AgencyFeedbackScreen} />
            <Stack.Screen name="SubscriptionPlanScreen" component={SubscriptionPlanScreen} />
            <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
            <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
            <Stack.Screen name="PaymentCancel" component={PaymentCancelScreen} />
            <Stack.Screen name="OrgMessages" component={OrgMessageScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="UserDashboard" component={UserDashboardScreen} />
            <Stack.Screen name="AgencyReviews" component={AgencyReviewScreen} />
            <Stack.Screen name="MarketPlace" component={WasteMarketplace} />
            <Stack.Screen name="MarketDirectChat" component={MarketDirectChat} />
            <Stack.Screen name="MarketInbox" component={MarketMessagesInbox} />
            <Stack.Screen name="AgencyMessageDetail" component={AgencyMessageDetailScreen} />


          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});