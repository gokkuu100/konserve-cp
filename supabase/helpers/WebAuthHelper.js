import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from '../config/supabaseConfig';

// Prepare the browser to handle redirects
WebBrowser.maybeCompleteAuthSession();

export default {
  /**
   * Sign in with OAuth for production app (not for Expo Go)
   */
  signInWithOAuth: async (provider = 'google') => {
    try {
      // Create proper redirect URL for standalone app
      const redirectUrl = Linking.createURL('auth');
      console.log(`Starting ${provider} OAuth with redirect: ${redirectUrl}`);
      
      // Start the OAuth flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: Platform.OS !== 'web', // Skip for mobile, not for web
          scopes: 'email profile',
        }
      });
      
      if (error) throw error;
      if (!data?.url) throw new Error('No auth URL returned');
      
      // Log for debugging
      console.log(`Opening auth URL: ${data.url}`);
      
      // For web, just redirect in the same window
      if (Platform.OS === 'web') {
        window.location.href = data.url;
        return { inProgress: true };
      }
      
      // Clear any previous sessions when starting new auth
      global.authSucceeded = false;
      global.authSession = null;
      global.authUser = null;
      
      // For mobile, open in browser and handle redirect
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );
      
      console.log("Browser session result:", result);
      
      // Check if we have a session after browser closes
      // Sometimes the URL event listener might miss the redirect
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData?.session) {
        console.log("Found active session after browser close");
        return {
          session: sessionData.session,
          user: sessionData.session.user,
          success: true
        };
      }
      
      // If we have a success type, try to extract the token from URL
      if (result.type === 'success' && result.url) {
        try {
          console.log("Successful redirect with URL:", result.url);
          const { data: authData } = await supabase.auth.exchangeCodeForSession(result.url);
          
          if (authData?.session) {
            return {
              session: authData.session,
              user: authData.session.user,
              success: true
            };
          }
        } catch (err) {
          console.log("Error exchanging code:", err);
        }
      }
      
      // Check global variables set by DeepLinkHandler
      if (global.authSucceeded && global.authSession) {
        console.log("Found session from deep link handler");
        const session = global.authSession;
        const user = global.authUser || session.user;
        
        // Clear globals
        global.authSucceeded = false;
        global.authSession = null;
        global.authUser = null;
        
        return {
          session,
          user,
          success: true
        };
      }
      
      // If we get here, authentication failed or was canceled
      return { 
        canceled: result.type === 'cancel',
        success: false
      };
    } catch (error) {
      console.error(`${provider} sign-in error:`, error);
      return { error, success: false };
    }
  },
  
  /**
   * Get the current session
   */
  getSession: async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { 
        session: data.session, 
        user: data.session?.user
      };
    } catch (error) {
      console.error("Error getting session:", error);
      return { error };
    }
  }
};