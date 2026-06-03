import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserNav } from '@/components/UserNav';

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-token'),
    isSignedIn: true,
  }),
  UserButton: () => <div data-testid="user-button">UserButton</div>,
}));

// Mock account API
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('UserNav', () => {
  it('renders the UserButton', () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { role: 'CUSTOMER' } }),
    });
    renderWithProviders(<UserNav onAdminToggle={vi.fn()} />);
    expect(screen.getByTestId('user-button')).toBeDefined();
  });

  it('does not show admin button for CUSTOMER role', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { role: 'CUSTOMER' } }),
    });
    renderWithProviders(<UserNav onAdminToggle={vi.fn()} />);
    // Admin button should not appear
    const adminBtn = screen.queryByText('Admin');
    expect(adminBtn).toBeNull();
  });

  it('shows admin button for ADMIN role', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { role: 'ADMIN' } }),
    });
    renderWithProviders(<UserNav onAdminToggle={vi.fn()} />);
    const adminBtn = await screen.findByText('Admin');
    expect(adminBtn).toBeDefined();
  });
});
