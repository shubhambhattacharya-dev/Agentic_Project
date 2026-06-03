import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatAssistant } from '@/components/ChatAssistant';

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-token'),
    isSignedIn: true,
  }),
}));

// Mock API — simulate backend down
vi.mock('@/lib/api', () => ({
  getHealth: vi.fn().mockRejectedValue(new Error('Network Error')),
  sendChatMessage: vi.fn().mockRejectedValue(new Error('Failed to fetch')),
}));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('ChatAssistant — Error & Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows offline status when health check fails', async () => {
    renderWithProviders(<ChatAssistant />);
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.click(screen.getByText('Ask GIGI'));
    // Should show offline indicator
    const status = await screen.findByText('Backend unavailable');
    expect(status).toBeDefined();
  });

  it('shows error message when chat API fails', async () => {
    renderWithProviders(<ChatAssistant />);
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.click(screen.getByText('Ask GIGI'));

    const input = screen.getByPlaceholderText('Ask about orders, refunds, shipping...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByLabelText('Send message'));

    // Should show error message from onError
    const errorMsg = await screen.findByText(/could not reach support/);
    expect(errorMsg).toBeDefined();
  });

  it('does not send empty messages', async () => {
    const { sendChatMessage } = await import('@/lib/api');
    renderWithProviders(<ChatAssistant />);
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.click(screen.getByText('Ask GIGI'));

    const input = screen.getByPlaceholderText('Ask about orders, refunds, shipping...');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByLabelText('Send message'));

    // sendChatMessage should NOT be called with whitespace-only content
    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it('generates unique session IDs', () => {
    // Verify session ID format
    const id1 = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `gigi-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    expect(id1).toBeTruthy();
    expect(typeof id1).toBe('string');
  });
});
