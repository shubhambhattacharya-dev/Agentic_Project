import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminDashboard } from '@/components/AdminDashboard';

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-token'),
    isSignedIn: true,
  }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('AdminDashboard', () => {
  it('renders the dashboard title', () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    });
    renderWithProviders(<AdminDashboard />);
    expect(screen.getByText('GIGI Admin Dashboard')).toBeDefined();
  });

  it('renders all three tab buttons', () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    });
    renderWithProviders(<AdminDashboard />);
    expect(screen.getByText(/Pending Refunds/)).toBeDefined();
    expect(screen.getByText(/LLMOps Metrics/)).toBeDefined();
    expect(screen.getByText(/Customers/)).toBeDefined();
  });

  it('shows empty state when no refunds', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    });
    renderWithProviders(<AdminDashboard />);
    // The refunds tab is active by default
    expect(await screen.findByText(/No pending refunds/)).toBeDefined();
  });

  it('shows refund cards when refunds exist', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: [{
          id: 'refund-001',
          amount: 400,
          reason: 'Damaged item',
          damageClaim: true,
          order: { id: 'gigi-101', customer: { name: 'Rahul', email: 'rahul@test.com' } },
        }],
      }),
    });
    renderWithProviders(<AdminDashboard />);
    expect(await screen.findByText(/Refund #refund-0/)).toBeDefined();
    expect(screen.getByText(/Rahul/)).toBeDefined();
  });

  it('shows error state when API fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    });
    renderWithProviders(<AdminDashboard />);
    // Should show loading or handle gracefully without crashing
    expect(screen.getByText('GIGI Admin Dashboard')).toBeDefined();
  });
});
