import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const getStoredUser = (): User | null => {
  const data = localStorage.getItem('business_nexus_user');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

const initialState: AuthState = {
  user: getStoredUser(),
  token: localStorage.getItem('nexus_access_token'),
  isAuthenticated: !!localStorage.getItem('nexus_access_token'),
  loading: false,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: User; accessToken: string }>) {
      state.user = action.payload.user;
      state.token = action.payload.accessToken;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      localStorage.setItem('nexus_access_token', action.payload.accessToken);
      localStorage.setItem('business_nexus_user', JSON.stringify(action.payload.user));
    },
    logoutUser(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      localStorage.removeItem('nexus_access_token');
      localStorage.removeItem('business_nexus_user');
    },
    updateUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      localStorage.setItem('business_nexus_user', JSON.stringify(action.payload));
    },
    setAuthLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setAuthError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    }
  }
});

export const { 
  setCredentials, 
  logoutUser, 
  updateUser, 
  setAuthLoading, 
  setAuthError 
} = authSlice.actions;

export default authSlice.reducer;
