import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface NotificationState {
  unreadCount: number;
  unreadMessageCount: number;
}

const initialState: NotificationState = {
  unreadCount: 0,
  unreadMessageCount: 0,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setUnreadCount(state, action: PayloadAction<number>) {
      state.unreadCount = action.payload;
    },
    incrementUnread(state) {
      state.unreadCount += 1;
    },
    resetUnreadCount(state) {
      state.unreadCount = 0;
    },
    setUnreadMessageCount(state, action: PayloadAction<number>) {
      state.unreadMessageCount = action.payload;
    },
    incrementUnreadMessages(state) {
      state.unreadMessageCount += 1;
    },
    resetUnreadMessages(state) {
      state.unreadMessageCount = 0;
    },
  },
});

export const {
  setUnreadCount,
  incrementUnread,
  resetUnreadCount,
  setUnreadMessageCount,
  incrementUnreadMessages,
  resetUnreadMessages,
} = notificationSlice.actions;

export default notificationSlice.reducer;
