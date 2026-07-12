import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '../redux/store';
import React from 'react';

// Mocks
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    updateProfile: vi.fn(),
  }),
  AuthProvider: ({ children }: any) => children,
}));

vi.mock('../context/SocketContext', () => ({
  useSocket: () => ({ socket: null }),
  SocketProvider: ({ children }: any) => children,
}));

vi.mock('../api/services/meetingService', () => ({
  getMyMeetings: vi.fn().mockResolvedValue({ data: [] }),
  createMeeting: vi.fn(),
  updateMeetingStatus: vi.fn(),
  deleteMeeting: vi.fn(),
}));

vi.mock('../api/services/documentService', () => ({
  getMyDocuments: vi.fn().mockResolvedValue({ data: [] }),
  uploadDocument: vi.fn(),
  deleteDocument: vi.fn(),
  signDocument: vi.fn(),
}));

vi.mock('../api/services/paymentService', () => ({
  getMyBalance: vi.fn().mockResolvedValue({
    data: { availableBalance: 0, pendingBalance: 0, totalInvested: 0, totalReceived: 0 }
  }),
  getLedger: vi.fn().mockResolvedValue({ data: [] }),
  createPaymentIntent: vi.fn(),
  confirmPayment: vi.fn(),
  getTransactionById: vi.fn(),
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
};

// ─── Login Page Tests ─────────────────────────────────────────────────────────

describe('LoginPage', () => {
  let LoginPage: any;

  beforeEach(async () => {
    const module = await import('../pages/auth/LoginPage');
    LoginPage = module.LoginPage;
  });

  it('renders email, password inputs and submit button', () => {
    render(<TestWrapper><LoginPage /></TestWrapper>);
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/••••••••/)).toBeDefined();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDefined();
  });

  it('renders role toggle with entrepreneur and investor options', () => {
    render(<TestWrapper><LoginPage /></TestWrapper>);
    expect(screen.getByRole('button', { name: 'entrepreneur' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'investor' })).toBeDefined();
  });

  it('shows forgot password link', () => {
    render(<TestWrapper><LoginPage /></TestWrapper>);
    expect(screen.getByText(/forgot password/i)).toBeDefined();
  });
});

// ─── Register Page Tests ──────────────────────────────────────────────────────

describe('RegisterPage', () => {
  let RegisterPage: any;

  beforeEach(async () => {
    const module = await import('../pages/auth/RegisterPage');
    RegisterPage = module.RegisterPage;
  });

  it('renders all form fields', () => {
    render(<TestWrapper><RegisterPage /></TestWrapper>);
    expect(screen.getByPlaceholderText(/John Doe/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Min 8 characters/i)).toBeDefined();
  });

  it('shows password mismatch error', async () => {
    render(<TestWrapper><RegisterPage /></TestWrapper>);
    const passInput = screen.getByPlaceholderText(/Min 8 characters/i);
    const confirmInput = screen.getByPlaceholderText(/Repeat password/i);

    fireEvent.change(passInput, { target: { value: 'Password1!' } });
    fireEvent.change(confirmInput, { target: { value: 'DifferentPass!' } });

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeDefined();
    });
  });

  it('renders both role cards', () => {
    render(<TestWrapper><RegisterPage /></TestWrapper>);
    expect(screen.getAllByText(/Entrepreneur/)[0]).toBeDefined();
    expect(screen.getAllByText(/Investor/)[0]).toBeDefined();
  });
});

// ─── Payments Page Tests ──────────────────────────────────────────────────────

describe('PaymentsPage', () => {
  let PaymentsPage: any;

  beforeEach(async () => {
    const module = await import('../pages/payments/PaymentsPage');
    PaymentsPage = module.PaymentsPage;
  });

  it('renders payments heading and make investment button', async () => {
    render(<TestWrapper><PaymentsPage /></TestWrapper>);
    expect(screen.getByText(/Payments & Ledger/i)).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText(/Make Investment/i)).toBeDefined();
    });
  });

  it('shows balance stats cards', () => {
    render(<TestWrapper><PaymentsPage /></TestWrapper>);
    expect(screen.getByText('Available Balance')).toBeDefined();
    expect(screen.getAllByText('Pending')[0]).toBeDefined();
    expect(screen.getByText('Total Invested')).toBeDefined();
  });

  it('opens investment modal on button click', () => {
    render(<TestWrapper><PaymentsPage /></TestWrapper>);
    const btn = screen.getByRole('button', { name: /Make Investment/i });
    fireEvent.click(btn);
    expect(screen.getByText(/Confirm Investment/i)).toBeDefined();
  });
});

// ─── Document Vault Tests ─────────────────────────────────────────────────────

describe('DocumentVaultPage', () => {
  let DocumentVaultPage: any;

  beforeEach(async () => {
    const module = await import('../pages/documents/DocumentVaultPage');
    DocumentVaultPage = module.DocumentVaultPage;
  });

  it('renders vault heading and upload zone', async () => {
    render(<TestWrapper><DocumentVaultPage /></TestWrapper>);
    expect(screen.getByText(/Document Vault/i)).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText(/Drop files here or click to upload/i)).toBeDefined();
    });
  });

  it('shows empty state when no documents', async () => {
    render(<TestWrapper><DocumentVaultPage /></TestWrapper>);
    await waitFor(() => {
      expect(screen.getByText(/No documents yet/i)).toBeDefined();
    });
  });
});
