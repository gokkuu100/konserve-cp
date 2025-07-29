import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase/config/supabaseConfig';
import AuthManager from '../supabase/manager/auth/AuthManager';


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
  const [userId, setUserId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const currentSession = await AuthManager.getSession();
        
        if (mounted) {
          console.log('Initial auth session:', currentSession?.user?.id ? 'Authenticated' : 'Not authenticated');
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setUserId(currentSession?.user?.id ?? null);
          setIsAuthenticated(!!currentSession?.user);
          setLoading(false);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log('Auth state changed:', event, newSession?.user?.id);
            if (mounted) {
              setSession(newSession);
              setUser(newSession?.user ?? null);
              setUserId(newSession?.user?.id ?? null);
              setIsAuthenticated(!!newSession?.user);
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

  const signIn = async (email, password, existingSession = null) => {
    try {
      setLoading(true);
      
      let session = existingSession;
      
      // If no existing session provided, sign in with email/password
      if (!session) {
        const { data, error } = await AuthManager.loginUser(email, password);
        
        if (error) {
          throw error;
        }
        
        session = data.session;
      }
      
      if (session) {
        setUser(session.user);
        setUserId(session.user.id);
        setSession(session);
        setIsAuthenticated(true);
        
        
        return { success: true };
      } else {
        throw new Error('No session returned from authentication');
      }
    } catch (error) {
      console.error('Error signing in:', error);
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
      
      setSession(null);
      setUser(null);
      setUserId(null);
      setIsAuthenticated(false);
      
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
        setUserId(session.user.id);
        setIsAuthenticated(true);
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