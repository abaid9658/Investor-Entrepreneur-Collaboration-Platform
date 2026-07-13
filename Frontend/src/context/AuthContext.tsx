import React, { createContext, useState, useContext, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { User, UserRole, AuthContextType } from '../types';
import { 
  loginUser, 
  registerUser, 
  logoutUserApi, 
  forgotPasswordApi, 
  resetPasswordApi 
} from '../api/services/authService';
import { updateMyProfile } from '../api/services/profileService';
import { 
  setCredentials, 
  logoutUser, 
  updateUser 
} from '../redux/slices/authSlice';
import toast from 'react-hot-toast';

// Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local storage keys
const USER_STORAGE_KEY = 'business_nexus_user';

// Auth Provider Component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useDispatch();

  // Check for stored user on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // Login handler
  const login = async (email: string, password: string, role: UserRole): Promise<any> => {
    setIsLoading(true);
    try {
      const res = await loginUser({ email, password, role });
      
      // Handle Multi-Factor Authentication (2FA) required
      if (res.data?.require2FA) {
        throw new Error('2FA_REQUIRED:' + email);
      }
      
      const loggedUser = res.data.user;
      const token = res.data.accessToken;

      setUser(loggedUser);
      dispatch(setCredentials({ user: loggedUser, accessToken: token }));
      toast.success('Successfully logged in!');
      return loggedUser;
    } catch (error: any) {
      if (error.message?.startsWith('2FA_REQUIRED:')) {
        throw error;
      }
      const errMsg = error.response?.data?.message || error.message || 'Invalid credentials or user not found';
      toast.error(errMsg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register handler
  const register = async (name: string, email: string, password: string, role: UserRole): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await registerUser({ name, email, password, role });
      
      const newUser = res.data.user;
      const token = res.data.accessToken;

      setUser(newUser);
      dispatch(setCredentials({ user: newUser, accessToken: token }));
      toast.success('Account created successfully!');
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || 'Registration failed';
      toast.error(errMsg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password handler
  const forgotPassword = async (email: string): Promise<void> => {
    try {
      await forgotPasswordApi(email);
      // Cache email locally to use during reset step
      localStorage.setItem('nexus_reset_email', email);
      toast.success('Verification code has been emailed to you!');
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || 'Failed to send recovery code';
      toast.error(errMsg);
      throw error;
    }
  };

  // Reset Password handler
  const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    try {
      const email = 
        new URLSearchParams(window.location.search).get('email') || 
        localStorage.getItem('nexus_reset_email') || 
        '';

      await resetPasswordApi({ email, code: token, newPassword });
      localStorage.removeItem('nexus_reset_email');
      toast.success('Password updated successfully! You can now log in.');
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || 'Password reset failed';
      toast.error(errMsg);
      throw error;
    }
  };

  // Logout handler
  const logout = async (): Promise<void> => {
    try {
      await logoutUserApi();
    } catch (err) {
      // Proceed with local cleanups even if backend logout cookie clear fails
    } finally {
      setUser(null);
      dispatch(logoutUser());
      toast.success('Logged out successfully');
    }
  };

  // Update profile handler
  const updateProfile = async (userId: string, updates: Partial<User>): Promise<void> => {
    try {
      setIsLoading(true);
      const res = await updateMyProfile(updates);
      const updatedUser = res.data.user;

      setUser(updatedUser);
      dispatch(updateUser(updatedUser));
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || 'Update failed';
      toast.error(errMsg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    isAuthenticated: !!user,
    isLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for using auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};