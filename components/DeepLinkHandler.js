import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { supabase } from '../supabase/config/supabaseConfig';
import ProfileManager from '../supabase/manager/auth/ProfileManager';

const DeepLinkHandler = () => {
  const navigation = useNavigation();
  const appState = useRef(AppState.currentState);
  const processingDeepLink = useRef(false);

  // Handler function for deep links
  const handleDeepLink = async (event) => {
    const url = event.url;
    
    // Prevent concurrent processing of the same URL
    if (processingDeepLink.current) {
      console.log('Already processing a deep link, skipping:', url);
      return;
    }
    
    try {
      processingDeepLink.current = true;
      console.log('Received deep link:', url);
      
      // Log all URL parameters for debugging
      if (url) {
        const urlObj = new URL(url);
        console.log('Deep link parameters:', urlObj.searchParams.toString());
      }
      
      // Check if this is an auth callback URL
      if (url && (
        url.includes('access_token=') || 
        url.includes('code=') || 
        url.includes('auth/callback') ||
        url.includes('error=') || 
        url.includes('type=recovery')
      )) {
        console.log('Processing auth deep link...');
        
        try {
          // Exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(url);
          
          if (error) {
            console.error('Error exchanging code for session:', error);
            Alert.alert(
              'Authentication Error', 
              'Failed to complete the authentication process. Please try again.'
            );
            return;
          }
          
          if (data?.session) {
            console.log('Authentication successful via deep link!');
            
            // Store in global for other components to access
            global.authSucceeded = true;
            global.authSession = data.session;
            global.authUser = data.user;
            
            // Check if user profile is complete
            if (data.user?.id) {
              const { data: profile, error: profileError } = 
                await ProfileManager.getUserProfile(data.user.id);
              
              if (profileError) {
                console.error('Error fetching user profile:', profileError);
              }
              
              console.log('User profile status:', profile ? 'Found' : 'Not found');
              
              // Profile doesn't exist or is incomplete (missing constituency)
              if (!profile || !profile.constituency) {
                console.log('Navigating to profile completion screen');
                // Use setTimeout to ensure navigation happens after current JS execution
                setTimeout(() => {
                  navigation.reset({
                    index: 0,
                    routes: [{ 
                      name: 'ProfileCompletion',
                      params: {
                        user: data.user,
                        email: data.user.email,
                        name: data.user.user_metadata?.full_name || ''
                      }
                    }]
                  });
                }, 100);
              } else {
                // Profile is complete, navigate to main app
                console.log('Profile complete, navigating to MainTabs');
                // Assuming you have stored signIn in a global context
                if (global.authContext && typeof global.authContext.signIn === 'function') {
                  await global.authContext.signIn(null, null, data.session);
                  // Use setTimeout to ensure navigation happens after current JS execution
                  setTimeout(() => {
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'MainTabs' }]
                    });
                  }, 100);
                }
              }
            }
          }
        } catch (err) {
          console.error('Failed to process auth deep link:', err);
          Alert.alert(
            'Authentication Error',
            'An unexpected error occurred. Please try again.'
          );
        }
      }
    } finally {
      processingDeepLink.current = false;
    }
  };

  // Set up deep link handling
  useEffect(() => {
    // This will fire when a deep link opens the app
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check for initial URL that might have opened the app
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('App opened with URL:', url);
        handleDeepLink({ url });
      }
    });
    
    // Handle app coming back to foreground
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground');
        
        // Check for a new session
        supabase.auth.getSession().then(({ data }) => {
          if (data?.session && global.authContext && !global.authContext.isAuthenticated) {
            console.log('Found session after app foregrounded');
            global.authSession = data.session;
            global.authUser = data.session.user;
            global.authSucceeded = true;
          }
        });
      }
      
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      appStateSubscription.remove();
    };
  }, [navigation]);

  return null; // This component doesn't render anything
};

export default DeepLinkHandler; 