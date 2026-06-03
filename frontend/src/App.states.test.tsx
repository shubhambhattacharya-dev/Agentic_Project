import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-token'),
    isSignedIn: true,
  }),
  UserButton: () => <div data-testid="user-button">UserButton</div>,
  SignIn: () => <div>Sign In</div>,
}));

// Mock storefront with empty products
vi.mock('@/lib/storefront-data', () => ({
  getStorefront: vi.fn().mockResolvedValue({
    nav: ['Home', 'Shop all'],
    heroSlides: [{
      eyebrow: 'Test',
      title: 'Test Title',
      copy: 'Test copy',
      image: 'test.jpg',
      accent: 'green',
      bullets: ['Bullet 1'],
    }],
    logos: ['Logo1'],
    products: [], // Empty products!
    nutrition: [['Calories', '10']],
    formulaImage: 'test.jpg',
    events: [{
      title: 'Test Event',
      copy: 'Event copy',
      image: 'event.jpg',
    }],
  }),
}));

function renderApp() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  );
}

describe('App — Empty & Loading States', () => {
  it('renders without crashing when products array is empty', async () => {
    renderApp();
    // Should still render the hero section
    expect(await screen.findByText('Test Title')).toBeDefined();
  });

  it('renders hero slide content', async () => {
    renderApp();
    expect(await screen.findByText('Test copy')).toBeDefined();
  });

  it('renders navigation items', async () => {
    renderApp();
    const items = await screen.findAllByText('Home');
    expect(items.length).toBeGreaterThan(0);
  });

  it('renders cart drawer in empty state', async () => {
    renderApp();
    await screen.findByText('Test Title');
    
    // Open cart
    const cartBtn = screen.getByRole('button', { name: /cart/i });
    if (cartBtn) {
      fireEvent.click(cartBtn);
      expect(screen.getByText('Your cart is empty')).toBeDefined();
    }
  });

  it('renders footer', async () => {
    renderApp();
    expect(await screen.findByText(/Gigi Energy/)).toBeDefined();
  });

  it('renders ask GIGI chat launcher', async () => {
    renderApp();
    expect(await screen.findByText('Ask GIGI')).toBeDefined();
  });
});
