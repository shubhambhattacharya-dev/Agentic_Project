import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';

// ─── MOCKS ────────────────────────────────────────────────────────────
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('tk'), isSignedIn: true }),
  UserButton: () => <div data-testid="user-button" />,
}));

vi.mock('@/lib/storefront-data', () => {
  const mockStorefront = {
    nav: ['Home', 'Shop all', 'Distributors', 'Contact'],
    heroSlides: [
      {
        eyebrow: 'Sugar-free energy',
        title: 'Power up with vitamin-rich clean energy.',
        copy: 'A bright, sugar-free energy drink built around green tea caffeine.',
        image: 'https://example.com/slide1.png',
        accent: 'green' as const,
        bullets: ['75mg caffeine', 'Zero sugar', 'Natural flavours'],
      },
      {
        eyebrow: 'Focus for active days',
        title: 'A tropical boost for workouts.',
        copy: 'Light fruit flavour, functional ingredients.',
        image: 'https://example.com/slide2.png',
        accent: 'yellow' as const,
        bullets: ['Green tea caffeine', '5 B vitamins'],
      },
    ],
    logos: ['GoRally', 'Cult', 'Google', 'TCS'],
    products: [
      {
        id: 'lemon-lime',
        name: 'Lemon Lime',
        image: 'https://example.com/ll.png',
        accent: '#7ed321',
        price: 125,
        description: 'Crisp citrus energy with a sharper lime finish.',
        benefits: ['Zero sugar', 'Natural fruit flavours', '75mg caffeine'],
        options: [
          { label: 'One can', price: 125 },
          { label: '4 Pack', price: 396 },
          { label: '24 Pack', price: 2250 },
        ],
      },
      {
        id: 'pineapple-coconut',
        name: 'Pineapple Coconut',
        image: 'https://example.com/pc.png',
        accent: '#f4db3f',
        price: 125,
        description: 'A smoother tropical profile for steady energy.',
        benefits: ['Zero sugar', 'Vitamin-rich', 'Green tea extract'],
        options: [
          { label: 'One can', price: 125 },
          { label: '4 Pack', price: 396 },
        ],
      },
      {
        id: 'mixed-pack',
        name: 'Trial Pack',
        image: 'https://example.com/mix.png',
        accent: '#111111',
        price: 396,
        description: 'A mixed pack with both flavours.',
        benefits: ['2 cans each', 'Low calorie'],
        options: [{ label: 'Mixed 4 Pack', price: 396 }],
      },
    ],
    nutrition: [
      ['Calories', '7.5 Kcal'],
      ['Total fat', '0.0g'],
      ['Vitamin C', '33.6mg'],
    ],
    formulaImage: 'https://example.com/formula.jpg',
    events: [
      { title: 'Gyms and Studios', copy: 'Sampling sessions for members.', image: 'https://example.com/gym.jpg' },
      { title: 'Corporate Offices', copy: 'A free pop-up tasting for teams.', image: 'https://example.com/corp.jpg' },
    ],
  };
  return {
    getStorefront: vi.fn().mockResolvedValue(mockStorefront),
  };
});

vi.mock('@/lib/api', () => ({
  getHealth: vi.fn().mockResolvedValue({ success: true, status: 'healthy', timestamp: new Date().toISOString() }),
  sendChatMessage: vi.fn().mockResolvedValue({ success: true, data: { message: 'I can help!', sessionId: 's1' } }),
}));

vi.mock('@/components/AdminDashboard', () => ({
  AdminDashboard: () => <div data-testid="admin-dashboard">Admin Dashboard</div>,
}));

vi.mock('@/components/UserNav', () => ({
  UserNav: () => <div data-testid="user-nav" />,
}));

vi.mock('@/lib/account', () => ({
  getAccount: vi.fn().mockResolvedValue({ id: 'c1', role: 'CUSTOMER', email: 'test@test.com', name: 'Test', orders: [] }),
}));

// ─── HELPERS ──────────────────────────────────────────────────────────
function renderApp() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: Infinity } } });
  return render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  );
}

// ─── TESTS ────────────────────────────────────────────────────────────
describe('Storefront — Hero Section', () => {
  it('renders the first hero slide title', async () => {
    renderApp();
    expect(await screen.findByText('Power up with vitamin-rich clean energy.')).toBeDefined();
  });

  it('renders hero slide bullets', async () => {
    renderApp();
    expect((await screen.findAllByText('75mg caffeine')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Zero sugar').length).toBeGreaterThanOrEqual(1);
  });

  it('navigates to next hero slide on next button click', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');

    const nextBtn = screen.getByLabelText('Next slide');
    fireEvent.click(nextBtn);

    expect(await screen.findByText('A tropical boost for workouts.')).toBeDefined();
  });

  it('navigates back to first hero slide on previous button click', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');

    const nextBtn = screen.getByLabelText('Next slide');
    fireEvent.click(nextBtn);
    await screen.findByText('A tropical boost for workouts.');

    const prevBtn = screen.getByLabelText('Previous slide');
    fireEvent.click(prevBtn);

    expect(await screen.findByText('Power up with vitamin-rich clean energy.')).toBeDefined();
  });
});

describe('Storefront — Logo Marquee', () => {
  it('renders partner logos', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');
    const logos = screen.getAllByText('GoRally');
    expect(logos.length).toBeGreaterThan(0);
  });
});

describe('Storefront — Product Section', () => {
  it('renders all product names', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');
    expect(screen.getAllByText('Lemon Lime').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Pineapple Coconut').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Trial Pack').length).toBeGreaterThanOrEqual(1);
  });

  it('renders product descriptions', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');
    expect(screen.getByText('Crisp citrus energy with a sharper lime finish.')).toBeDefined();
  });

  it('renders product benefits', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');
    expect(screen.getAllByText('Zero sugar').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Vitamin-rich')).toBeDefined();
  });

  it('shows default price for first option', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');
    // Price should be displayed (Rs. 125 or similar)
    expect(screen.getAllByText(/125/).length).toBeGreaterThan(0);
  });

  it('switches pack option when clicked', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');

    // Find the "4 Pack" option for Lemon Lime
    const packOptions = screen.getAllByText('4 Pack');
    fireEvent.click(packOptions[0]);

    // Price should update to 396
    expect(screen.getAllByText(/396/).length).toBeGreaterThan(0);
  });

  it('renders section heading', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');
    expect(screen.getByText('Choose your flavour')).toBeDefined();
  });
});

describe('Storefront — Cart Interactions', () => {
  it('opens cart drawer when cart button is clicked', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');

    // Find and click the cart button in header
    const cartBtn = document.querySelector('.cart-button') as HTMLElement;
    fireEvent.click(cartBtn);

    expect(screen.getByText('Your cart')).toBeDefined();
    expect(screen.getByText('Your cart is empty')).toBeDefined();
  });

  it('closes cart drawer when close button is clicked', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');

    // Open cart
    const cartBtn = document.querySelector('.cart-button') as HTMLElement;
    fireEvent.click(cartBtn);
    expect(screen.getByText('Your cart')).toBeDefined();

    // Close cart
    const closeBtn = screen.getByLabelText('Close cart');
    fireEvent.click(closeBtn);

    // Cart close button should work (cart panel gets is-open removed)
    await waitFor(() => {
      const drawer = document.querySelector('.cart-drawer');
      expect(drawer).not.toHaveClass('is-open');
    });
  });

  it('adds product to cart and updates count', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');

    // Click "Add to Cart" for first product
    const addButtons = screen.getAllByText('Add to Cart');
    fireEvent.click(addButtons[0]);

    // Cart should show item count
    await waitFor(() => {
      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows cart item details after adding product', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');

    // Add Lemon Lime to cart
    const addButtons = screen.getAllByText('Add to Cart');
    fireEvent.click(addButtons[0]);

    // Open cart
    const cartBtn = document.querySelector('.cart-button') as HTMLElement;
    fireEvent.click(cartBtn);

    // Cart should show the product
    const cartPanel = document.querySelector('.cart-drawer__panel') as HTMLElement;
    expect(within(cartPanel).getByText('Lemon Lime')).toBeDefined();
    expect(within(cartPanel).getByText('One can')).toBeDefined();
  });

  it('increases quantity when + button is clicked', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');

    // Add to cart
    const addButtons = screen.getAllByText('Add to Cart');
    fireEvent.click(addButtons[0]);

    // Open cart
    const cartBtn = document.querySelector('.cart-button') as HTMLElement;
    fireEvent.click(cartBtn);

    // Click increase
    const increaseBtn = screen.getByLabelText('Increase quantity');
    fireEvent.click(increaseBtn);

    // Quantity should be 2
    const cartPanel2 = document.querySelector('.cart-drawer__panel') as HTMLElement;
    expect(within(cartPanel2).getByText('2')).toBeDefined();
  });

  it('decreases quantity when - button is clicked', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');

    // Add to cart twice
    const addButtons = screen.getAllByText('Add to Cart');
    fireEvent.click(addButtons[0]);
    fireEvent.click(addButtons[0]);

    // Open cart
    const cartBtn = document.querySelector('.cart-button') as HTMLElement;
    fireEvent.click(cartBtn);

    // Click decrease
    const decreaseBtn = screen.getByLabelText('Decrease quantity');
    fireEvent.click(decreaseBtn);

    // Quantity should be 1
    const cartPanel3 = document.querySelector('.cart-drawer__panel') as HTMLElement;
    expect(within(cartPanel3).getByText('1')).toBeDefined();
  });

  it('removes item when quantity reaches 0', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');

    // Add to cart
    const addButtons = screen.getAllByText('Add to Cart');
    fireEvent.click(addButtons[0]);

    // Open cart
    const cartBtn = document.querySelector('.cart-button') as HTMLElement;
    fireEvent.click(cartBtn);

    // Click decrease (removes item)
    const decreaseBtn = screen.getByLabelText('Decrease quantity');
    fireEvent.click(decreaseBtn);

    // Cart should be empty
    expect(screen.getByText('Your cart is empty')).toBeDefined();
  });

  it('displays correct estimated total', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');

    // Add Lemon Lime (125)
    const addButtons = screen.getAllByText('Add to Cart');
    fireEvent.click(addButtons[0]);

    // Open cart
    const cartBtn = document.querySelector('.cart-button') as HTMLElement;
    fireEvent.click(cartBtn);

    const cartPanelT = document.querySelector('.cart-drawer__panel') as HTMLElement;
    expect(within(cartPanelT).getByText('Estimated total')).toBeDefined();
    expect(within(cartPanelT).getAllByText(/125/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows Check out button', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');

    // Add item
    const addButtons = screen.getAllByText('Add to Cart');
    fireEvent.click(addButtons[0]);

    // Open cart
    const cartBtn = document.querySelector('.cart-button') as HTMLElement;
    fireEvent.click(cartBtn);

    expect(screen.getByText('Check out')).toBeDefined();
  });
});

describe('Storefront — Search Overlay', () => {
  it('opens search overlay when search button is clicked', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');

    const searchBtn = screen.getAllByLabelText(/search/i)[0];
    fireEvent.click(searchBtn);

    expect(screen.getByLabelText('Close search')).toBeDefined();
    expect(screen.getByPlaceholderText(/Search flavours/)).toBeDefined();
  });

  it('closes search overlay when close button is clicked', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');

    const searchBtn = screen.getAllByLabelText(/search/i)[0];
    fireEvent.click(searchBtn);

    const closeBtn = screen.getByLabelText('Close search');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      const overlay = document.querySelector('.search-overlay');
      expect(overlay).not.toHaveClass('is-open');
    });
  });

  it('renders search suggestions', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');

    const searchBtn = screen.getAllByLabelText(/search/i)[0];
    fireEvent.click(searchBtn);

    expect(screen.getAllByText('Lemon Lime').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Pineapple Coconut').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Trial Pack').length).toBeGreaterThanOrEqual(1);
  });
});

describe('Storefront — Events Section', () => {
  it('renders event cards', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');
    expect(screen.getByText('Gyms and Studios')).toBeDefined();
    expect(screen.getByText('Corporate Offices')).toBeDefined();
  });
});

describe('Storefront — Nutrition Section', () => {
  it('renders nutrition data', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');
    expect(screen.getByText('7.5 Kcal')).toBeDefined();
    expect(screen.getByText('0.0g')).toBeDefined();
  });
});

describe('Storefront — Footer', () => {
  it('renders footer brand info', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');
    expect(screen.getByText(/India-inspired better-for-you energy drink/)).toBeDefined();
  });

  it('renders footer links', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');
    expect(screen.getByText('Learn')).toBeDefined();
    expect(screen.getByText('Connect')).toBeDefined();
  });

  it('renders copyright', async () => {
    renderApp();
    await screen.findByText('Power up with vitamin-rich clean energy.');
    expect(screen.getByText(/2026 Gigi Energy/)).toBeDefined();
  });
});
