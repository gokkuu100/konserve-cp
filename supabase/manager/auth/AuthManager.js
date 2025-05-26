import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from '../config/supabaseConfig';

class AuthManager {
  constructor() {
    this._currentUser = null;
    this._session = null;
    this._authStateSubscribers = new Set();
    this._initialized = false;
  }

  async initializeAuth() {
    if (this._initialized) return;
    
    try {
      // Try to get cached session from SecureStore (more secure than AsyncStorage)
      const cachedSession = await SecureStore.getItemAsync('userSession');
      if (cachedSession) {
        try {
          this._session = JSON.parse(cachedSession);
          this._currentUser = this._session.user;
          console.log('Loaded cached session for user:', this._currentUser?.id);
        } catch (e) {
          console.error('Error parsing cached session:', e);
          await SecureStore.deleteItemAsync('userSession');
        }
      }

      // Get current session from Supabase
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (data?.session) {
        console.log('Got session from Supabase for user:', data.session.user.id);
        this._session = data.session;
        this._currentUser = data.session.user;
        // Cache the session securely
        await SecureStore.setItemAsync('userSession', JSON.stringify(data.session));
      } else {
        console.log('No active session found in Supabase');
      }

      // Set up auth state change listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed in AuthManager:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          this._session = session;
          this._currentUser = session?.user || null;
          if (session) {
            await SecureStore.setItemAsync('userSession', JSON.stringify(session));
          }
        } else if (event === 'SIGNED_OUT') {
          this._session = null;
          this._currentUser = null;
          await SecureStore.deleteItemAsync('userSession');
        }

        // Notify subscribers of auth state change
        this._notifySubscribers({ event, session });
      });

      this._initialized = true;
      return subscription;
    } catch (error) {
      console.error('Error initializing auth:', error);
      this._initialized = false;
    }
  }

  // Subscribe to auth state changes
  subscribeToAuthChanges(callback) {
    if (!this._initialized) {
      this.initializeAuth();
    }
    
    this._authStateSubscribers.add(callback);
  
    callback({
      event: this._session ? 'INITIAL_SESSION' : 'NO_SESSION',
      session: this._session
    });
    
    return () => {
      this._authStateSubscribers.delete(callback);
    };
  }

  _notifySubscribers(authState) {
    this._authStateSubscribers.forEach(callback => {
      try {
        callback(authState);
      } catch (error) {
        console.error('Error in auth subscriber:', error);
      }
    });
  }

  getCurrentUser() {
    return this._currentUser;
  }

  async getCurrentUserId() {
    try {
      // First check cached user
      if (this._currentUser?.id) {
        return this._currentUser.id;
      }

      // If no cached user, check session
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        this._currentUser = data.user;
        return data.user.id;
      }

      return null;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  }

  async isAuthenticated() {
    try {
      const userId = await this.getCurrentUserId();
      return !!userId;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  async getSession() {
    if (!this._initialized) {
      await this.initializeAuth();
    }
    
    if (this._session) {
      return this._session;
    }
    
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      if (data?.session) {
        this._session = data.session;
        this._currentUser = data.session.user;
        return data.session;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  // Refresh session
  async refreshSession() {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;

      if (data?.session) {
        this._session = data.session;
        this._currentUser = data.session.user;
        await SecureStore.setItemAsync('userSession', JSON.stringify(data.session));
      }

      return { session: data?.session, error: null };
    } catch (error) {
      console.error('Error refreshing session:', error);
      return { session: null, error };
    }
  }

  // Sign out
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      this._session = null;
      this._currentUser = null;
      await SecureStore.deleteItemAsync('userSession');
      
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error };
    }
  }
  
  async registerUser({ email, password, options = {} }) {
    try {
      const sanitizedEmail = email.trim().toLowerCase();
      
      // Validate email
      if (!this.isValidEmail(sanitizedEmail)) {
        return { error: { message: 'Invalid email format' } };
      }
      
      // First, check for existing user in users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', sanitizedEmail)
        .maybeSingle();
        
      if (existingUser?.email) {
        return { error: { message: 'Email is already registered. Try logging in.' } };
      }
      
      console.log("🚀 Starting registration for:", sanitizedEmail);
      
      // Use signUp with minimal options - this was the working approach from your old code
      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password: password
      });
      
      if (error) {
        console.error('Supabase Auth signup error:', error);
        return { error };
      }
      
      if (!data?.user?.id) {
        console.error('Auth signup returned no user ID:', data);
        return { error: { message: 'Failed to create user account' } };
      }
      
      console.log("✅ Auth signup successful for user ID:", data.user.id);
      
      
      return { data };
    } catch (error) {
      console.error('Registration exception:', error);
      return { 
        error: { 
          message: error instanceof Error ? error.message : JSON.stringify(error) 
        } 
      };
    }
  }

  async deleteUser(userId) {
    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      return { error };
    } catch (error) {
      console.error('Exception in deleteUser:', error);
      return { error };
    }
  }

  async loginUser(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error);
        return { error };
      }

      // Update local state
      if (data?.session) {
        this._session = data.session;
        this._currentUser = data.session.user;
        await SecureStore.setItemAsync('userSession', JSON.stringify(data.session));
        
        await this._ensureUserProfile(data.session.user);
      }

      return { data };
    } catch (error) {
      console.error('Exception in loginUser:', error);
      return { error };
    }
  }

  async _ensureUserProfile(user) {
    try {
      if (!user || !user.id) return;
      
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (existingProfile) {
        console.log("User profile already exists for:", user.id);
        return;
      }
      
      console.log("Creating missing user profile for:", user.id);
      
      // Extract metadata from user object
      const metadata = user.user_metadata || {};
      
      // Create profile
      const { error } = await supabase
        .from('users')
        .insert([{
          user_id: user.id,
          full_name: metadata.full_name || '',
          email: user.email,
          county: metadata.county || 'Nairobi',
          constituency: metadata.constituency || '',
          created_at: new Date().toISOString(),
          reward_points: 0,
          membership_type: 'standard'
        }]);
        
      if (error) {
        console.error("Error creating user profile during login:", error);
      } else {
        console.log("User profile created successfully during login");
      }
    } catch (error) {
      console.error("Error in _ensureUserProfile:", error);
    }
  }

  async signInWithGoogle() {
    try {
      // For Expo Go testing - enable the proxy
      const isExpoGo = Constants.appOwnership === 'expo';
      const redirectUrl = this.getRedirectUrl(isExpoGo);
      
      console.log("Starting Google OAuth with redirect URL:", redirectUrl);
      
      // Start the OAuth flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          scopes: 'email profile',
        }
      });
      
      if (error) {
        throw error;
      }
      
      // If we're on mobile, we need to open the URL in a WebBrowser and handle the callback
      if (Platform.OS !== 'web') {
        console.log("Opening auth URL in WebBrowser:", data?.url);
        
        if (!data?.url) throw new Error("No URL returned from supabase auth");
        
        // First, check for any active sessions since the browser might actually succeed
        // but have redirection issues
        const existingSession = await supabase.auth.getSession();
        if (existingSession?.data?.session) {
          console.log("Found existing session, using it");
          return { data: existingSession.data, error: null };
        }
        
        // Clear URL event listener (to prevent conflicts)
        await WebBrowser.maybeCompleteAuthSession();
        
        // Open the URL in the WebBrowser with improved options
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
          {
            showInRecents: true,
            createTask: true,
            useProxy: isExpoGo,
            // Adding these options can help with iOS
            preferEphemeralSession: false,
            dismissButtonStyle: 'cancel',
          }
        );
        
        console.log("WebBrowser result:", result);
        
        // Handle the result from the browser session
        if (result.type === 'success') {
          const { url } = result;
          console.log("Success URL:", url);
          
          // Extract the access token and refresh token from the URL
          if (url) {
            // After redirect, we need to exchange the code for a session
            const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(
              url.split('#')[0] // Remove hash fragment if present
            );
            
            if (authError) throw authError;
            return { data: authData, error: null };
          }
        } else {
          console.log("Browser session didn't return success, checking for session anyway");
          const sessionCheck = await supabase.auth.getSession();
          
          if (sessionCheck?.data?.session) {
            console.log("Found session after WebBrowser close, using it");
            return { data: sessionCheck.data, error: null };
          }
          
          throw new Error('Browser session canceled or failed');
        }
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Google sign-in error in AuthManager:', error);
      return { data: null, error };
    }
  }

  isValidEmail(email) {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return regex.test(email);
  }

  // Helper function to get the right redirect URL based on platform and environment
  getRedirectUrl(isExpoGo) {
    if (Platform.OS === 'web') {
      return window.location.origin;
    }
    
    // For Expo Go testing, use the expo-development-client URL with your username
    if (isExpoGo) {
      return "https://auth.expo.io/@princegoku/konserve";
    }
    
    // For standalone apps, use your app's redirect scheme
    return Linking.createURL('auth');  // This becomes konserveapp://auth
  }
}

// Create a singleton instance
const authManagerInstance = new AuthManager();
// Initialize auth on module load
authManagerInstance.initializeAuth().catch(err => 
  console.error('Failed to initialize auth manager:', err)
);

export default authManagerInstance;