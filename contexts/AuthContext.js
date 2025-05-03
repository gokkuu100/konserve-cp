import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase/config/supabaseConfig';
import AuthManager from '../supabase/manager/auth/AuthManager';

// AuthManager is already instantiated as a singleton in its module
// No need to create a new instance with 'new'

export const AuthContext = createContext({
  user: null,
  userId: null,
  session: null,
  isAuthenticated: false,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  refreshSession: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        // Get initial session
        const currentSession = await AuthManager.getSession();
        
        if (mounted) {
          console.log('Initial auth session:', currentSession?.user?.id ? 'Authenticated' : 'Not authenticated');
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setLoading(false);
        }

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log('Auth state changed:', event, newSession?.user?.id);
            if (mounted) {
              setSession(newSession);
              setUser(newSession?.user ?? null);
            }
          }
        );

        return () => {
          mounted = false;
          if (subscription) subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();
  }, []);

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const { data, error } = await AuthManager.loginUser(email, password);
      if (error) throw error;
      
      // Explicitly update state after successful login
      if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await AuthManager.signOut();
      if (error) throw error;
      
      // Explicitly clear state after sign out
      setSession(null);
      setUser(null);
      
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      setLoading(true);
      const { session, error } = await AuthManager.refreshSession();
      if (error) throw error;
      
      if (session) {
        setSession(session);
        setUser(session.user);
      }
      
      return { success: true, session };
    } catch (error) {
      console.error('Session refresh error:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    userId: user?.id,
    session,
    isAuthenticated: !!user,
    loading,
    signIn,
    signOut,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};