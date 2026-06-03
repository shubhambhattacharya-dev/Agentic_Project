import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminDashboard } from '@/components/AdminDashboard';

// ─── MOCKS ────────────────────────────────────────────────────────────
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('mock-token'), isSignedIn: true }),
}));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

function mockFetchResponses(responses: Record<string, any>) {
  fetchMock.mockImplementation((url: string) => {
    for (const [pattern, resp] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        return Promise.resolve({
          ok: resp.ok !== false,
          status: resp.status || 200,
          json: () => Promise.resolve(resp),
        });
      }
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) });
  });
}

function renderAdmin() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <AdminDashboard />
    </QueryClientProvider>
  );
}

const mockRefunds = [
  {
    id: 'refund-abc123',
    amount: 350,
    reason: 'Damaged can',
    damageClaim: true,
    status: 'PENDING',
    order: {
      id: 'gigi-101',
      customer: { id: 'c1', name: 'Rahul Sharma', email: 'rahul@test.com' },
      items: [{ product: { name: 'Lemon Lime' }, quantity: 3 }],
    },
  },
  {
    id: 'refund-def456',
    amount: 800,
    reason: 'Wrong item delivered',
    damageClaim: false,
    status: 'PENDING',
    order: {
      id: 'gigi-102',
      customer: { id: 'c2', name: 'Pooja Patel', email: 'pooja@test.com' },
      items: [{ product: { name: 'Trial Pack' }, quantity: 1 }],
    },
  },
];

const mockMetrics = {
  summary: {
    totalRequests: 142,
    totalCostUSD: 0.8234,
    totalCostINR: 70.0,
    totalTokens: 45000,
    avgLatencyMs: 1200,
  },
  recent: [],
};

const mockCustomers = [
  { id: 'c1', name: 'Rahul Sharma', email: 'rahul@test.com', role: 'CUSTOMER', _count: { orders: 5 } },
  { id: 'c2', name: 'Shubham Bhattacharya', email: 'shubham@test.com', role: 'ADMIN', _count: { orders: 12 } },
];

// ─── TESTS ────────────────────────────────────────────────────────────
describe('AdminDashboard — DOM Interactions', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── RENDERS ────────────────────────────────────────────────────────
  it('renders the dashboard title', () => {
    mockFetchResponses({});
    renderAdmin();
    expect(screen.getByText('GIGI Admin Dashboard')).toBeDefined();
  });

  it('renders all three tab buttons', () => {
    mockFetchResponses({});
    renderAdmin();
    expect(screen.getByText(/Pending Refunds/)).toBeDefined();
    expect(screen.getByText(/LLMOps Metrics/)).toBeDefined();
    expect(screen.getByText(/Customers/)).toBeDefined();
  });

  // ── TAB SWITCHING ──────────────────────────────────────────────────
  it('shows refunds tab as active by default', async () => {
    mockFetchResponses({ 'refunds/pending': { success: true, data: [] } });
    renderAdmin();
    // Refunds tab content should be visible
    expect(await screen.findByText('No pending refunds.')).toBeDefined();
  });

  it('switches to metrics tab when clicked', async () => {
    mockFetchResponses({
      'refunds/pending': { success: true, data: [] },
      '/admin/metrics': { success: true, data: mockMetrics },
    });
    renderAdmin();
    fireEvent.click(screen.getByText(/LLMOps Metrics/));
    await waitFor(() => {
      expect(screen.getByText('142')).toBeDefined();
      expect(screen.getByText('$0.8234')).toBeDefined();
    });
  });

  it('switches to customers tab when clicked', async () => {
    mockFetchResponses({
      'refunds/pending': { success: true, data: [] },
      '/admin/customers': { success: true, data: mockCustomers },
    });
    renderAdmin();
    fireEvent.click(screen.getByText(/Customers/));
    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeDefined();
      expect(screen.getByText('Shubham Bhattacharya')).toBeDefined();
    });
  });

  it('switches back to refunds tab from another tab', async () => {
    mockFetchResponses({
      'refunds/pending': { success: true, data: mockRefunds },
      '/admin/metrics': { success: true, data: mockMetrics },
    });
    renderAdmin();

    // Go to metrics
    fireEvent.click(screen.getByText(/LLMOps Metrics/));
    await waitFor(() => expect(screen.getByText('142')).toBeDefined());

    // Go back to refunds
    fireEvent.click(screen.getByText(/Pending Refunds/));
    await waitFor(() => {
      expect(screen.getByText(/Rahul Sharma/)).toBeDefined();
    });
  });

  // ── REFUNDS TAB ────────────────────────────────────────────────────
  it('renders refund cards with customer info', async () => {
    mockFetchResponses({ 'refunds/pending': { success: true, data: mockRefunds } });
    renderAdmin();
    await waitFor(() => {
      expect(screen.getByText(/Rahul Sharma/)).toBeDefined();
      expect(screen.getByText(/Pooja Patel/)).toBeDefined();
    });
  });

  it('renders refund amount', async () => {
    mockFetchResponses({ 'refunds/pending': { success: true, data: mockRefunds } });
    renderAdmin();
    await waitFor(() => {
      expect(screen.getByText(/350/)).toBeDefined();
      expect(screen.getByText(/800/)).toBeDefined();
    });
  });

  it('renders refund reason', async () => {
    mockFetchResponses({ 'refunds/pending': { success: true, data: mockRefunds } });
    renderAdmin();
    await waitFor(() => {
      expect(screen.getByText(/Damaged can/)).toBeDefined();
      expect(screen.getByText(/Wrong item delivered/)).toBeDefined();
    });
  });

  it('renders damage claim indicator', async () => {
    mockFetchResponses({ 'refunds/pending': { success: true, data: mockRefunds } });
    renderAdmin();
    await waitFor(() => {
      expect(screen.getByText(/Damage Claim: Yes/)).toBeDefined();
      expect(screen.getByText(/Damage Claim: No/)).toBeDefined();
    });
  });

  it('renders Approve and Reject buttons for each refund', async () => {
    mockFetchResponses({ 'refunds/pending': { success: true, data: mockRefunds } });
    renderAdmin();
    await waitFor(() => {
      const approveBtns = screen.getAllByText('Approve');
      const rejectBtns = screen.getAllByText('Reject');
      expect(approveBtns.length).toBe(2);
      expect(rejectBtns.length).toBe(2);
    });
  });

  it('calls approve API when Approve button is clicked', async () => {
    mockFetchResponses({
      'refunds/pending': { success: true, data: mockRefunds },
      'refund-abc123/approve': { success: true },
    });
    renderAdmin();
    await waitFor(() => expect(screen.getByText(/Rahul Sharma/)).toBeDefined());

    const approveBtns = screen.getAllByText('Approve');
    fireEvent.click(approveBtns[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/admin/refunds/refund-abc123/approve'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('calls reject API when Reject button is clicked', async () => {
    mockFetchResponses({
      'refunds/pending': { success: true, data: mockRefunds },
      'refund-abc123/reject': { success: true },
    });
    renderAdmin();
    await waitFor(() => expect(screen.getByText(/Rahul Sharma/)).toBeDefined());

    const rejectBtns = screen.getAllByText('Reject');
    fireEvent.click(rejectBtns[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/admin/refunds/refund-abc123/reject'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('shows empty state when no pending refunds', async () => {
    mockFetchResponses({ 'refunds/pending': { success: true, data: [] } });
    renderAdmin();
    expect(await screen.findByText('No pending refunds.')).toBeDefined();
  });

  // ── METRICS TAB ────────────────────────────────────────────────────
  it('displays metric cards with correct values', async () => {
    mockFetchResponses({
      'refunds/pending': { success: true, data: [] },
      '/admin/metrics': { success: true, data: mockMetrics },
    });
    renderAdmin();
    fireEvent.click(screen.getByText(/LLMOps Metrics/));

    await waitFor(() => {
      expect(screen.getByText('142')).toBeDefined(); // Total Requests
      expect(screen.getByText('$0.8234')).toBeDefined(); // Cost USD
      expect(screen.getByText(/70/)).toBeDefined(); // Cost INR
      expect(screen.getByText('1200ms')).toBeDefined(); // Avg Latency
    });
  });

  it('displays metric labels', async () => {
    mockFetchResponses({
      'refunds/pending': { success: true, data: [] },
      '/admin/metrics': { success: true, data: mockMetrics },
    });
    renderAdmin();
    fireEvent.click(screen.getByText(/LLMOps Metrics/));

    await waitFor(() => {
      expect(screen.getByText('Total Requests')).toBeDefined();
      expect(screen.getByText('Total Cost (USD)')).toBeDefined();
      expect(screen.getByText('Total Cost (INR)')).toBeDefined();
      expect(screen.getByText('Avg Latency')).toBeDefined();
    });
  });

  // ── CUSTOMERS TAB ──────────────────────────────────────────────────
  it('displays customer names and emails', async () => {
    mockFetchResponses({
      'refunds/pending': { success: true, data: [] },
      '/admin/customers': { success: true, data: mockCustomers },
    });
    renderAdmin();
    fireEvent.click(screen.getByText(/Customers/));

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeDefined();
      expect(screen.getByText('rahul@test.com')).toBeDefined();
      expect(screen.getByText('Shubham Bhattacharya')).toBeDefined();
      expect(screen.getByText('shubham@test.com')).toBeDefined();
    });
  });

  it('displays customer role badges', async () => {
    mockFetchResponses({
      'refunds/pending': { success: true, data: [] },
      '/admin/customers': { success: true, data: mockCustomers },
    });
    renderAdmin();
    fireEvent.click(screen.getByText(/Customers/));

    await waitFor(() => {
      expect(screen.getByText('CUSTOMER')).toBeDefined();
      expect(screen.getByText('ADMIN')).toBeDefined();
    });
  });

  it('displays order count per customer', async () => {
    mockFetchResponses({
      'refunds/pending': { success: true, data: [] },
      '/admin/customers': { success: true, data: mockCustomers },
    });
    renderAdmin();
    fireEvent.click(screen.getByText(/Customers/));

    await waitFor(() => {
      expect(screen.getByText('5 orders')).toBeDefined();
      expect(screen.getByText('12 orders')).toBeDefined();
    });
  });

  // ── ERROR HANDLING ─────────────────────────────────────────────────
  it('handles API error gracefully', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    });
    renderAdmin();
    // Should still render the dashboard
    expect(screen.getByText('GIGI Admin Dashboard')).toBeDefined();
  });
});
