import { useAuth } from '../contexts/AuthContext';
// Remove any imports from '../auth'

const YourComponent = () => {
  const { user, userId, isAuthenticated, loading, signIn, signOut } = useAuth();
  
  // ... rest of your component code
}; 