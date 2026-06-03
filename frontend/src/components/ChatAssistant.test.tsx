import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatAssistant } from '@/components/ChatAssistant';

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-token'),
    isSignedIn: true,
  }),
}));

// Mock API
vi.mock('@/lib/api', () => ({
  getHealth: vi.fn().mockResolvedValue({ success: true, status: 'healthy', timestamp: new Date().toISOString() }),
  sendChatMessage: vi.fn().mockResolvedValue({
    success: true,
    data: { message: 'Hello! How can I help?', sessionId: 'test-123' },
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('ChatAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the launcher button when closed', () => {
    renderWithProviders(<ChatAssistant />);
    expect(screen.getByText('Ask GIGI')).toBeDefined();
  });

  it('opens the chat panel when launcher is clicked', async () => {
    renderWithProviders(<ChatAssistant />);
    fireEvent.click(screen.getByText('Ask GIGI'));
    expect(screen.getByText('GIGI Support')).toBeDefined();
    expect(screen.getByPlaceholderText('Ask about orders, refunds, shipping...')).toBeDefined();
  });

  it('displays the initial greeting message', () => {
    renderWithProviders(<ChatAssistant />);
    fireEvent.click(screen.getByText('Ask GIGI'));
    expect(screen.getByText(/Hi, I am GIGI/)).toBeDefined();
  });

  it('sends a message and displays the response', async () => {
    const { sendChatMessage } = await import('@/lib/api');
    renderWithProviders(<ChatAssistant />);

    fireEvent.click(screen.getByText('Ask GIGI'));

    const input = screen.getByPlaceholderText('Ask about orders, refunds, shipping...');
    fireEvent.change(input, { target: { value: 'What are your products?' } });

    const sendButton = screen.getByLabelText('Send message');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(sendChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: 'What are your products?' }),
          ]),
          token: 'mock-token',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Hello! How can I help?')).toBeDefined();
    });
  });

  it('closes the chat panel when close button is clicked', () => {
    renderWithProviders(<ChatAssistant />);
    fireEvent.click(screen.getByText('Ask GIGI'));
    fireEvent.click(screen.getByLabelText('Close chat'));
    expect(screen.getByText('Ask GIGI')).toBeDefined();
  });
});
