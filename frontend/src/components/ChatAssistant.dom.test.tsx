import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatAssistant } from '@/components/ChatAssistant';

// --- MOCKS ------------------------------------------------------------
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('mock-token'), isSignedIn: true }),
}));

let mockHealthResult: any = { success: true, status: 'healthy', timestamp: new Date().toISOString() };
let mockChatResult: any = { success: true, data: { message: 'Your order is on the way!', sessionId: 's1' } };
let mockChatError: Error | null = null;

vi.mock('@/lib/api', () => ({
  getHealth: vi.fn(() => mockHealthResult instanceof Error ? Promise.reject(mockHealthResult) : Promise.resolve(mockHealthResult)),
  sendChatMessage: vi.fn(() => mockChatError ? Promise.reject(mockChatError) : Promise.resolve(mockChatResult)),
}));

function renderChat() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: Infinity } } });
  return render(
    <QueryClientProvider client={qc}>
      <ChatAssistant />
    </QueryClientProvider>
  );
}

// --- TESTS ------------------------------------------------------------
describe('ChatAssistant — DOM Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHealthResult = { success: true, status: 'healthy', timestamp: new Date().toISOString() };
    mockChatResult = { success: true, data: { message: 'Your order is on the way!', sessionId: 's1' } };
    mockChatError = null;
  });

  // -- OPEN / CLOSE ---------------------------------------------------
  it('renders the "Ask GIGI" launcher button', () => {
    renderChat();
    expect(screen.getByText('Ask GIGI')).toBeDefined();
  });

  it('opens the chat panel when launcher is clicked', () => {
    renderChat();
    fireEvent.click(screen.getByText('Ask GIGI'));
    expect(screen.getByText('GIGI Support')).toBeDefined();
    expect(screen.getByPlaceholderText('Ask about orders, refunds, shipping...')).toBeDefined();
    expect(screen.getByLabelText('Send message')).toBeDefined();
  });

  it('closes the chat panel when close button is clicked', async () => {
    renderChat();
    fireEvent.click(screen.getByText('Ask GIGI'));
    fireEvent.click(screen.getByLabelText('Close chat'));
    await waitFor(() => {
      expect(screen.getByText('Ask GIGI')).toBeDefined();
    });
  });

  // -- INITIAL STATE --------------------------------------------------
  it('displays the greeting message on open', () => {
    renderChat();
    fireEvent.click(screen.getByText('Ask GIGI'));
    expect(screen.getByText(/Hi, I am GIGI/)).toBeDefined();
  });

  it('shows "Backend connected" when health check passes', async () => {
    renderChat();
    fireEvent.click(screen.getByText('Ask GIGI'));
    expect(await screen.findByText('Backend connected')).toBeDefined();
  });

  // -- SEND MESSAGE FLOW ----------------------------------------------
  it('sends a message when form is submitted', async () => {
    const { sendChatMessage } = await import('@/lib/api');
    renderChat();
    fireEvent.click(screen.getByText('Ask GIGI'));

    const input = screen.getByPlaceholderText('Ask about orders, refunds, shipping...');
    fireEvent.change(input, { target: { value: 'Where is my order gigi-101?' } });
    fireEvent.click(screen.getByLabelText('Send message'));

    await waitFor(() => {
      expect(sendChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: 'Where is my order gigi-101?' }),
          ]),
          token: 'mock-token',
        })
      );
    });
  });

  it('displays user message in the chat', async () => {
    renderChat();
    fireEvent.click(screen.getByText('Ask GIGI'));

    const input = screen.getByPlaceholderText('Ask about orders, refunds, shipping...');
    fireEvent.change(input, { target: { value: 'What products do you have?' } });
    fireEvent.click(screen.getByLabelText('Send message'));

    expect(screen.getByText('What products do you have?')).toBeDefined();
  });

  it('displays assistant response after sending message', async () => {
    renderChat();
    fireEvent.click(screen.getByText('Ask GIGI'));

    const input = screen.getByPlaceholderText('Ask about orders, refunds, shipping...');
    fireEvent.change(input, { target: { value: 'Track my order' } });
    fireEvent.click(screen.getByLabelText('Send message'));

    expect(await screen.findByText('Your order is on the way!')).toBeDefined();
  });

  it('shows loading indicator while waiting for response', async () => {
    // Make the API call take some time
    let resolveChat: (value: unknown) => void;
    mockChatResult = new Promise((resolve) => { resolveChat = resolve; }) as any;

    const { sendChatMessage } = await import('@/lib/api');
    (sendChatMessage as any).mockImplementation(() => mockChatResult);

    renderChat();
    fireEvent.click(screen.getByText('Ask GIGI'));

    const input = screen.getByPlaceholderText('Ask about orders, refunds, shipping...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByLabelText('Send message'));

    // Should show loading indicator
    expect(screen.getByText('Let me check.')).toBeDefined();

    // Resolve the promise
    resolveChat!({ success: true, data: { message: 'Hi there!', sessionId: 's1' } });

    await waitFor(() => {
      expect(screen.getByText('Hi there!')).toBeDefined();
    });
  });

  // -- ERROR HANDLING -------------------------------------------------
  it('shows error message when backend is down', async () => {
    mockHealthResult = new Error('Network Error');
    renderChat();
    fireEvent.click(screen.getByText('Ask GIGI'));
    expect(await screen.findByText('Backend unavailable')).toBeDefined();
  });

  it('shows error message when chat API fails', async () => {
    const { sendChatMessage } = await import('@/lib/api');
    vi.mocked(sendChatMessage).mockRejectedValueOnce(new Error('Failed to fetch'));
    renderChat();
    fireEvent.click(screen.getByText('Ask GIGI'));

    const input = screen.getByPlaceholderText('Ask about orders, refunds, shipping...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByLabelText('Send message'));

    expect(await screen.findByText(/could not reach support/)).toBeDefined();
  });

  // -- EDGE CASES -----------------------------------------------------
  it('does not send empty messages', async () => {
    const { sendChatMessage } = await import('@/lib/api');
    renderChat();
    fireEvent.click(screen.getByText('Ask GIGI'));

    const input = screen.getByPlaceholderText('Ask about orders, refunds, shipping...');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByLabelText('Send message'));

    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it('does not send whitespace-only messages', async () => {
    const { sendChatMessage } = await import('@/lib/api');
    renderChat();
    fireEvent.click(screen.getByText('Ask GIGI'));

    const input = screen.getByPlaceholderText('Ask about orders, refunds, shipping...');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByLabelText('Send message'));

    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it('clears input after sending a message', async () => {
    renderChat();
    fireEvent.click(screen.getByText('Ask GIGI'));

    const input = screen.getByPlaceholderText('Ask about orders, refunds, shipping...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(screen.getByLabelText('Send message'));

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('preserves message history across multiple sends', async () => {
    renderChat();
    fireEvent.click(screen.getByText('Ask GIGI'));

    // Send first message
    const input = screen.getByPlaceholderText('Ask about orders, refunds, shipping...');
    fireEvent.change(input, { target: { value: 'First question' } });
    fireEvent.click(screen.getByLabelText('Send message'));
    await screen.findByText('Your order is on the way!');

    // Send second message
    fireEvent.change(input, { target: { value: 'Second question' } });
    fireEvent.click(screen.getByLabelText('Send message'));
    await waitFor(() => {
      const responses = screen.getAllByText('Your order is on the way!');
      expect(responses.length).toBe(2);
    });
  });

  it('disables send button while request is pending', async () => {
    let resolveChat: (value: unknown) => void;
    mockChatResult = new Promise((resolve) => { resolveChat = resolve; }) as any;

    const { sendChatMessage } = await import('@/lib/api');
    (sendChatMessage as any).mockImplementation(() => mockChatResult);

    renderChat();
    fireEvent.click(screen.getByText('Ask GIGI'));

    const input = screen.getByPlaceholderText('Ask about orders, refunds, shipping...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByLabelText('Send message'));

    // Button should be disabled
    const sendBtn = screen.getByLabelText('Send message');
    expect(sendBtn).toBeDisabled();

    resolveChat!({ success: true, data: { message: 'Hi!', sessionId: 's1' } });
  });

  it('submits form on Enter key press', async () => {
    const { sendChatMessage } = await import('@/lib/api');
    renderChat();
    fireEvent.click(screen.getByText('Ask GIGI'));

    const input = screen.getByPlaceholderText('Ask about orders, refunds, shipping...');
    fireEvent.change(input, { target: { value: 'Enter test' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(sendChatMessage).toHaveBeenCalled();
    });
  });
});
