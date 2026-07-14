import axiosInstance from '../axiosInstance';

export interface SupportChatContext {
  role?: 'investor' | 'entrepreneur';
  upcomingMeetings?: number;
  activeDeals?: number;
}

export interface SupportChatResponse {
  success: boolean;
  reply: string;
  source: 'gemini' | 'local';
}

export interface SupportTicketInput {
  name: string;
  email: string;
  message: string;
}

// Sends a message to the backend-proxied AI support bot. The Gemini API key
// lives on the server — nothing sensitive is ever sent from here.
export const sendSupportChatMessage = async (
  message: string,
  context?: SupportChatContext
): Promise<SupportChatResponse> => {
  const res = await axiosInstance.post('/support/chat', { message, context });
  return res.data;
};

export const submitSupportTicket = async (ticket: SupportTicketInput) => {
  const res = await axiosInstance.post('/support', ticket);
  return res.data;
};

// Best-effort helper to pull light context for personalizing bot replies.
// Reuses existing authenticated endpoints — if either call fails or the
// response shape differs, it just omits that field rather than throwing.
const extractCount = (payload: unknown): number | undefined => {
  if (Array.isArray(payload)) return payload.length;
  if (payload && typeof payload === 'object' && Array.isArray((payload as any).data)) {
    return (payload as any).data.length;
  }
  return undefined;
};

export const fetchSupportChatContext = async (): Promise<Pick<SupportChatContext, 'upcomingMeetings' | 'activeDeals'>> => {
  const [meetingsRes, dealsRes] = await Promise.allSettled([
    axiosInstance.get('/meetings'),
    axiosInstance.get('/deals')
  ]);

  return {
    upcomingMeetings: meetingsRes.status === 'fulfilled' ? extractCount(meetingsRes.value.data) : undefined,
    activeDeals: dealsRes.status === 'fulfilled' ? extractCount(dealsRes.value.data) : undefined
  };
};
