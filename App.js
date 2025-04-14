import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet, Text, SafeAreaView, Platform } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

// Import your screens
import LoginScreen from './components/LoginScreen';
import AppScreen from './components/AppScreen';
import RegisterScreen from './components/RegisterScreen';
import ChatComponent from './components/ChatComponent';
import SupabaseManager from './components/SupabaseManager';
import GoogleMapScreen from './components/GoogleMapScreen';
import RewardPointsScreen from './components/RewardPointsScreen';
import HomePageScreen from './components/HomePageScreen';
import ReportDetailScreen from './components/ReportDetailScreen';
import OptionsScreen from './components/OptionsScreen';
import EditProfileScreen from './components/EditProfileScreen';
import ReportEnvironmentScreen from './components/ReportEnvironmentScreen';
import FeedbackScreen from './components/FeedbackScreen';
import Services from './components/Services';
import CollectionAgenciesScreen from './components/CollectionAgenciesScreen';
import SubscriptionPlan from './components/SubscriptionPlan';
import { MessageDetails, Messages } from './components/MessagesScreen';
import WasteCalendarScreen from './components/WasteCalendarScreen';

// Placeholder screens for the navigation items that aren't implemented yet
const UpdatesScreen = () => <View style={styles.center}><Text>Updates Screen</Text></View>;
const CallsScreen = () => <View style={styles.center}><Text>Calls Screen</Text></View>;
const CommunitiesScreen = () => <View style={styles.center}><Text>Communities Screen</Text></View>;
const SettingsScreen = () => <View style={styles.center}><Text>Settings Screen</Text></View>;

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// This is our main bottom tab navigator
function BottomTabNavigator() {
  return (
    <Tab.Navigator 
      screenOptions={{
        tabBarActiveTintColor: '#7b68ee',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          height: 90,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          // Remove bottom border by setting borderBottomWidth to 0
          borderBottomWidth: 0,
          // Add elevation for Android but only for the top
          ...Platform.select({
            android: {
              elevation: 8,
              // The following properties help remove the bottom line on Android
              borderBottomColor: 'transparent',
              borderBottomWidth: 0,
            },
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              // The following property helps remove the bottom line on iOS
              borderBottomWidth: 0,
            }
          }),
        },
        tabBarItemStyle: {
          // This helps to evenly distribute the tabs
          flex: 1,
          paddingHorizontal: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 3,
        },
        headerShown: false,
      }}
      safeAreaInsets={{ bottom: 10 }}
    >
      <Tab.Screen 
        name="Services" 
        component={Services} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Maps" 
        component={GoogleMapScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Rewards" 
        component={RewardPointsScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Chats" 
        component={ChatComponent} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" color={color} size={size} />
          ),
          tabBarBadge: 59,
          tabBarBadgeStyle: {
            backgroundColor: '#4CAF50',
            color: 'white',
          }
        }}
      />
      <Tab.Screen 
        name="Home" 
        component={HomePageScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Wrap the bottom tab navigator in a SafeAreaView to handle notches and home indicators
function MainAppNavigator() {
  return (
    <View style={styles.container}>
      <BottomTabNavigator />
    </View>
  );
}

// Main App component
export default function App() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    // Check if the user is already authenticated
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const authenticated = await SupabaseManager.isAuthenticated();
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error("Auth check error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7b68ee" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={isAuthenticated ? "MainTabs" : "Login"}>
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="App"
          component={AppScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MainTabs"
          component={MainAppNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatComponent}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomePageScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ReportDetail"
          component={ReportDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Options"
          component={OptionsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ReportCases"
          component={ReportEnvironmentScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Feedback"
          component={FeedbackScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Services"
          component={Services}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CollectionAgencies"
          component={CollectionAgenciesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SubscriptionPlan"
          component={SubscriptionPlan}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Messages"
          component={Messages}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MessageDetails"
          component={MessageDetails}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Calendar"
          component={WasteCalendarScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    // Remove the bottom border by setting borderBottomWidth to 0
    borderBottomWidth: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});