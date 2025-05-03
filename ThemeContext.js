import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'react-native';
import { Platform } from 'react-native';

// Define light and dark theme colors
export const lightTheme = {
  background: '#f5f5f5',
  surface: '#ffffff',
  primary: '#357002',
  secondary: '#a7d6a9',
  text: '#333333',
  textSecondary: '#666666',
  border: '#e0e0e0',
  error: '#e53935',
  success: '#43a047',
  warning: '#ffa000',
  info: '#1e88e5',
  tabBar: '#ffffff',
  card: '#ffffff',
  statusBar: 'dark-content',
};

export const darkTheme = {
  background: '#121212',
  surface: '#1e1e1e',
  primary: '#4caf50',
  secondary: '#81c784',
  text: '#f5f5f5',
  textSecondary: '#b0b0b0',
  border: '#333333',
  error: '#ef5350',
  success: '#66bb6a',
  warning: '#ffb74d',
  info: '#42a5f5',
  tabBar: '#1e1e1e',
  card: '#2d2d2d',
  statusBar: 'light-content',
};

// Create the theme context
const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [theme, setTheme] = useState(lightTheme);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme preference from storage on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Load saved theme preference
  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('themePreference');
      if (savedTheme !== null) {
        const isDark = JSON.parse(savedTheme);
        setIsDarkMode(isDark);
        setTheme(isDark ? darkTheme : lightTheme);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading theme preference:', error);
      setIsLoading(false);
    }
  };

  // Toggle theme between light and dark
  const toggleTheme = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      setTheme(newMode ? darkTheme : lightTheme);
      await AsyncStorage.setItem('themePreference', JSON.stringify(newMode));
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Provide theme context to children
  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// AppTheme component to apply theme consistently across the app
export const AppTheme = ({ children }) => {
  const { theme, isDarkMode } = useTheme();
  
  // Update StatusBar based on theme
  useEffect(() => {
    StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(isDarkMode ? darkTheme.surface : lightTheme.surface);
    }
  }, [isDarkMode]);

  return (
    <>
      {children}
    </>
  );
};
