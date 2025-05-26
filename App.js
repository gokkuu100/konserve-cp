import { AntDesign, Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import NotificationService from './supabase/services/NotificationService';
import { ThemeProvider, useTheme } from './ThemeContext';

// Import your screens
import AgencyFeedbackScreen from './components/AgencyFeedbackScreen';
import { MessageDetails, Messages } from './components/AgencyMessagesScreen';
import ChatComponent from './components/ChatComponent';
import CollectionAgenciesForBusinessScreen from './components/CollectionAgenciesForBusinessScreen';
import CollectionAgenciesScreen from './components/CollectionAgenciesScreen';
import CollectionTypeSelectionScreen from './components/CollectionTypeSelectionScreen';
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
import DeepLinkHandler from './components/DeepLinkHandler';
import MarketDirectChat from './components/MarketDirectChat';
import MarketMessagesInbox from './components/MarketMessagesInbox';
import WasteMarketplace from './components/MarketScreen';
import ProfileCompletionScreen from './components/ProfileCompletionScreen';
import { supabase } from './supabase/config/supabaseConfig';
import ProfileManager from './supabase/manager/auth/ProfileManager';
import ConstituencyManager from './supabase/manager/constituencychange/ConstituencyManager';
import MessageManager from './supabase/manager/messaging/MessageManager';
import NewsScreen from './components/NewsScreen';
import NewsDetailScreen from './components/NewsDetailScreen';

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
    }, 60000); 
    
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
        component={NewsScreen} 
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

// Placeholder for missing screen
const BusinessSubscriptionPlanScreen = ({ navigation, route }) => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Business Subscription Plan Screen</Text>
      <Text>Coming Soon</Text>
    </View>
  );
};

const App = () => {
  const [appIsReady, setAppIsReady] = useState(false);
  const navigationRef = useRef(null);
  
  // Initialize the app
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

  // Deep link handling
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
      'konserveapp://', 
      'https://konserveapp.com',
      'https://auth.expo.io/@princegoku/konserve',
      'exp://192.168.100.13:8081',
      'exp://localhost:8081'
    ],
    config: {
      screens: {
        PaymentScreen: 'payment',
        PaymentSuccess: 'payment/success', 
        PaymentCancel: 'payment/cancel',   
        Login: 'login',
        Register: 'register',
        ProfileCompletion: 'profile-completion',
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
    // Add a custom getInitialURL to handle special cases
    getInitialURL: async () => {
      const url = await Linking.getInitialURL();
      
      if (url) {
        return url;
      }
      
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          global.authSession = data.session;
          global.authUser = data.session.user;
          global.authSucceeded = true;
        }
      } catch (e) {
        console.error('Error checking session during initial navigation:', e);
      }
      
      return null;
    },
  };


  useEffect(() => {
    const backgroundSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      if (data?.screen && navigationRef.current) {
        // Navigate to the appropriate screen
        navigationRef.current.navigate(data.screen, data.params || {});
        
        // If this is a message notification, refresh the messages list
        if (data.screen === 'Messages' || data.screen === 'OrgMessages') {
          if (global.refreshMessages) {
            global.refreshMessages();
          }
        }
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(backgroundSubscription);
    };
  }, []);

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
};

// Separate component to use theme and auth context
const AppContent = ({ navigationRef, linking }) => {
  const { theme, isDarkMode } = useTheme();
  const { isAuthenticated, loading, userId, userData, setUserData } = useAuth();
  const [notificationsInitialized, setNotificationsInitialized] = useState(false);
  
  console.log('AppContent rendering, auth state:', isAuthenticated ? 'Authenticated' : 'Not authenticated');
  
  // Initialize notifications
  useEffect(() => {
    const initNotifications = async () => {
      try {
        console.log('Initializing notifications...');
        
        Notifications.setNotificationHandler({
          handleNotification: async () => {
            const settingsString = await AsyncStorage.getItem('userSettings');
            const settings = settingsString ? JSON.parse(settingsString) : { notifications: true, sound: true };
            
            console.log('Notification handler called, settings:', settings);
            
            return {
              shouldShowAlert: settings.notifications,
              shouldPlaySound: settings.sound,
              shouldSetBadge: settings.notifications,
            };
          },
        });
        
        setNotificationsInitialized(true);
        console.log('Notifications initialized successfully');
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };
    
    initNotifications();
  }, []);
  
  // Register for push notifications
  useEffect(() => {
    if (isAuthenticated && userId && notificationsInitialized) {
      const registerForPushNotifications = async () => {
        try {
          console.log('Requesting notification permissions...');
          const hasPermission = await NotificationService.requestPermissions();
          console.log('Notification permission status:', hasPermission);
          
          if (hasPermission) {
            console.log('Registering device token for user:', userId);
            await NotificationService.registerDeviceToken(userId);
          } else {
            console.log('Notification permissions not granted');
          }
        } catch (error) {
          console.error('Error registering for push notifications:', error);
        }
      };
      
      registerForPushNotifications();
    }
  }, [isAuthenticated, userId, notificationsInitialized]);
  
  // Set up notification response handlers
  useEffect(() => {
    if (!notificationsInitialized) return;
    
    // Handle notifications received while app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
      // Use the new handler method
      NotificationService.handleReceivedNotification(notification);
    });
    
    // Handle notification responses (user taps on notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      if (data?.screen && navigationRef.current) {
        if (data.screen === 'Messages' && data.messageId) {
          const markAgencyMessageRead = async (messageId) => {
            const { data: message, error } = await supabase
              .from(data.messageType === 'direct' ? 'agency_messages_direct' : 'agency_messages_general')
              .update({ is_read: true })
              .eq('id', messageId)
              .single();
            
            if (error) {
              console.error('Error marking message as read:', error);
            }
          };
          
          markAgencyMessageRead(data.messageId);
        } else if (data.screen === 'OrgMessages' && data.messageId) {
        
          const markOrgMessageRead = async (messageId) => {
            const { data: message, error } = await supabase
              .from(data.messageType === 'direct' ? 'organization_directmessages' : 'organization_generalreport')
              .update({ is_read: true })
              .eq('id', messageId)
              .single();
            
            if (error) {
              console.error('Error marking message as read:', error);
            }
          };
          
          markOrgMessageRead(data.messageId);
        }
        
        // Navigate to the appropriate screen with any parameters
        if (data.params) {
          navigationRef.current.navigate(data.screen, data.params);
        } else {
          navigationRef.current.navigate(data.screen);
        }
      }
    });
    
    // Return cleanup function
    return () => {
      Notifications.removeNotificationSubscription(foregroundSubscription);
      Notifications.removeNotificationSubscription(responseSubscription);
    };
  }, [notificationsInitialized, navigationRef]);
  
  // Set up constituency change listener
  useEffect(() => {
    let constituencyChangeSubscription = null;
    
    if (isAuthenticated && userId) {
      constituencyChangeSubscription = ConstituencyManager.listenForApprovedRequests(
        userId,
        (newConstituency) => {
          Alert.alert(
            'Constituency Updated',
            `Your constituency has been updated to ${newConstituency}!`
          );
        }
      );
    }
    
    return () => {
      if (constituencyChangeSubscription) {
        supabase.removeChannel(constituencyChangeSubscription);
      }
    };
  }, [isAuthenticated, userId]);
  
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
      <DeepLinkHandler />
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
            <Stack.Screen name="ProfileCompletion" component={ProfileCompletionScreen} />
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
            <Stack.Screen name="CollectionAgenciesForBusiness" component={CollectionAgenciesForBusinessScreen} />
            <Stack.Screen name="AgencyMessageDetail" component={AgencyMessageDetailScreen} />
            <Stack.Screen name="BusinessSubscriptionPlanScreen" component={BusinessSubscriptionPlanScreen} />
            <Stack.Screen name="CollectionTypeSelection" component={CollectionTypeSelectionScreen} />
            <Stack.Screen name="News" component={NewsScreen} />
            <Stack.Screen name="NewsDetail" component={NewsDetailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

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

export default App;