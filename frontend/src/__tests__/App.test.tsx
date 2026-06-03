import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "../App";

// 1. Mock Clerk hooks
vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({
    isSignedIn: true,
    isLoaded: true,
    getToken: vi.fn().mockResolvedValue("mock-token"),
  }),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  SignIn: () => <div>Sign In</div>,
  UserButton: () => <div>User Button</div>,
}));

// 1b. Mock account helper (used by UserNav)
vi.mock("../lib/account", () => ({
  getAccount: vi.fn().mockResolvedValue({ role: "CUSTOMER", name: "Test User" }),
}));

// 2. Mock storefront-data API
vi.mock("../lib/storefront-data", () => {
  const mockStorefront = {
    nav: ["Home", "Shop all", "Tasting events", "Contact"],
    heroSlides: [
      {
        eyebrow: "Sugar-free energy",
        title: "Power up with vitamin-rich clean energy.",
        copy: "A bright, sugar-free energy drink built around green tea caffeine...",
        image: "https://example.com/slide1.png",
        accent: "green",
        bullets: ["75mg caffeine", "Zero sugar"],
      },
    ],
    logos: ["GoRally", "Cult"],
    products: [
      {
        id: "lemon-lime",
        name: "Lemon Lime",
        image: "https://example.com/lemon-lime.png",
        accent: "#7ed321",
        price: 125,
        description: "Crisp citrus energy with a sharper lime finish.",
        benefits: ["Zero sugar", "75mg caffeine"],
        options: [
          { label: "One can", price: 125 },
          { label: "4 Pack", price: 396 },
        ],
      },
      {
        id: "pineapple-coconut",
        name: "Pineapple Coconut",
        image: "https://example.com/pineapple-coconut.png",
        accent: "#f4db3f",
        price: 125,
        description: "A smoother tropical profile.",
        benefits: ["Zero sugar", "Green tea extract"],
        options: [
          { label: "One can", price: 125 },
          { label: "4 Pack", price: 396 },
        ],
      },
    ],
    nutrition: [
      ["Calories", "7.5 Kcal"],
      ["Total fat", "0.0g"],
    ],
    formulaImage: "https://example.com/formula.jpg",
    events: [
      {
        title: "Gyms and Studios",
        copy: "Sampling sessions for members.",
        image: "https://example.com/gym.jpg",
      },
    ],
  };

  return {
    storefront: mockStorefront,
    getStorefront: vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return mockStorefront;
    }),
  };
});

// 3. Mock API helper
vi.mock("../lib/api", () => {
  return {
    getHealth: vi.fn().mockResolvedValue({
      success: true,
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
    }),
    sendChatMessage: vi.fn().mockResolvedValue({
      success: true,
      data: {
        message: "Hello from GIGI AI!",
        sessionId: "test-session-id",
      },
    }),
  };
});

// 4. Helper to render App with providers
function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

describe("Gigi Storefront DOM Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the loading screen initially, then loads the storefront", async () => {
    renderApp();

    // Verify loading screen renders
    expect(screen.getByText("Loading storefront...")).toBeInTheDocument();
    expect(screen.getByText("GiGi")).toBeInTheDocument();

    // Wait for the storefront to load
    await waitFor(() => {
      expect(screen.queryByText("Loading storefront...")).not.toBeInTheDocument();
    });

    // Check header logo and cart
    expect(screen.getByRole("link", { name: /Gigi home/i })).toBeInTheDocument();

    // Check product headings
    expect(screen.getByRole("heading", { name: "Lemon Lime" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pineapple Coconut" })).toBeInTheDocument();

    // Check nutrition table
    expect(screen.getByText("Calories")).toBeInTheDocument();
    expect(screen.getByText("7.5 Kcal")).toBeInTheDocument();
  });

  it("handles the product pack switcher correctly", async () => {
    renderApp();

    // Wait for store load
    await waitFor(() => {
      expect(screen.queryByText("Loading storefront...")).not.toBeInTheDocument();
    });

    // Find the Lemon Lime product card container
    const lemonLimeCard = screen.getByRole("heading", { name: "Lemon Lime" }).closest(".product-card") as HTMLElement;
    expect(lemonLimeCard).toBeInTheDocument();

    // Default option is "One can" showing price Rs. 125
    expect(within(lemonLimeCard).getByText("Rs. 125")).toBeInTheDocument();

    // Click "4 Pack" button
    const pack4Btn = within(lemonLimeCard).getByRole("button", { name: "4 Pack" });
    fireEvent.click(pack4Btn);

    // Price should update to Rs. 396
    expect(within(lemonLimeCard).getByText("Rs. 396")).toBeInTheDocument();
  });

  it("renders the search overlay in closed state with suggestions", async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.queryByText("Loading storefront...")).not.toBeInTheDocument();
    });

    // SearchOverlay renders but is closed
    const searchOverlay = document.querySelector(".search-overlay") as HTMLElement;
    expect(searchOverlay).toBeInTheDocument();
    expect(searchOverlay).not.toHaveClass("is-open");
  });

  it("interacts with Chat Assistant and submits user message", async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.queryByText("Loading storefront...")).not.toBeInTheDocument();
    });

    // Check for chat launcher button
    const chatLauncherBtn = screen.getByRole("button", { name: /Ask GIGI/i });
    expect(chatLauncherBtn).toBeInTheDocument();

    // Click to open chat assistant
    fireEvent.click(chatLauncherBtn);

    // Check panel elements are rendered
    const chatPanel = screen.getByRole("region", { name: /Gigi support assistant/i });
    expect(chatPanel).toHaveClass("is-open");
    expect(within(chatPanel).getByText("GIGI Support")).toBeInTheDocument();

    // Check health connection status
    expect(within(chatPanel).getByText("Backend connected")).toBeInTheDocument();

    // Default welcome message
    expect(within(chatPanel).getByText(/Hi, I am GIGI. Ask me about orders/i)).toBeInTheDocument();

    // Type a user message and submit the form
    const input = within(chatPanel).getByRole("textbox", { name: /Message GIGI support/i });
    fireEvent.change(input, { target: { value: "Where is my order?" } });
    expect(input).toHaveValue("Where is my order?");

    const submitForm = chatPanel.querySelector("form")!;
    fireEvent.submit(submitForm);

    // User message should display in panel, and input should clear
    await waitFor(() => {
      expect(within(chatPanel).getByText("Where is my order?")).toBeInTheDocument();
    });
    expect(input).toHaveValue("");

    // Close the chat
    const closeChatBtn = within(chatPanel).getByRole("button", { name: /Close chat/i });
    fireEvent.click(closeChatBtn);
    expect(chatPanel).not.toHaveClass("is-open");
  });
});