import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "../App";

// 1. Mock storefront-data API
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
      // Simulate slight network delay
      await new Promise((resolve) => setTimeout(resolve, 10));
      return mockStorefront;
    }),
  };
});

// 2. Mock API helper
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
        messageHistory: [],
      },
    }),
  };
});

// 3. Helper to render App with TanStack Query Provider
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

    // Check announcement bar
    expect(screen.getAllByText(/free Bengaluru shipping above Rs. 500/i)[0]).toBeInTheDocument();

    // Check header logo and cart
    expect(screen.getByRole("link", { name: /Gigi home/i })).toBeInTheDocument();
    expect(document.querySelector(".cart-button") as HTMLElement).toBeInTheDocument();

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

    // Verify price updates to Rs. 396
    expect(within(lemonLimeCard).getByText("Rs. 396")).toBeInTheDocument();
    expect(within(lemonLimeCard).queryByText("Rs. 125")).not.toBeInTheDocument();
  });

  it("manages cart flow: add, quantity modification, and item deletion", async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.queryByText("Loading storefront...")).not.toBeInTheDocument();
    });

    // Verify initial cart button doesn't show quantity count
    const headerCartBtn = document.querySelector(".cart-button") as HTMLElement;
    expect(headerCartBtn.querySelector("em")).toBeNull();

    // Find Lemon Lime card and add to cart
    const lemonLimeCard = screen.getByRole("heading", { name: "Lemon Lime" }).closest(".product-card") as HTMLElement;
    const addToCartBtn = within(lemonLimeCard).getByRole("button", { name: /Add to Cart/i });
    fireEvent.click(addToCartBtn);

    // Adding to cart should automatically open the Cart Drawer
    const cartDrawer = screen.getByRole("complementary");
    expect(cartDrawer).toHaveClass("is-open");
    expect(within(cartDrawer).getByText("Your cart")).toBeInTheDocument();
    expect(within(cartDrawer).getByRole("heading", { name: "Lemon Lime" })).toBeInTheDocument();
    expect(within(cartDrawer).getByText("One can")).toBeInTheDocument();

    // Expected price of item and estimated total in drawer should be Rs. 125
    expect(cartDrawer.querySelector(".cart-item strong")).toHaveTextContent("Rs. 125");
    expect(cartDrawer.querySelector(".cart-total strong")).toHaveTextContent("Rs. 125");

    // Check that cart badge count in the header updated to 1
    expect(within(headerCartBtn).getByText("1")).toBeInTheDocument();

    // Click the increase quantity button
    const increaseBtn = within(cartDrawer).getByRole("button", { name: /Increase quantity/i });
    fireEvent.click(increaseBtn);

    // Quantity should now be 2, total should update to Rs. 250
    expect(within(cartDrawer).getByText("2")).toBeInTheDocument();
    expect(cartDrawer.querySelector(".cart-total strong")).toHaveTextContent("Rs. 250");
    expect(within(headerCartBtn).getByText("2")).toBeInTheDocument();

    // Click decrease quantity button
    const decreaseBtn = within(cartDrawer).getByRole("button", { name: /Decrease quantity/i });
    fireEvent.click(decreaseBtn);
    expect(within(cartDrawer).getByText("1")).toBeInTheDocument();
    expect(cartDrawer.querySelector(".cart-total strong")).toHaveTextContent("Rs. 125");
    expect(within(headerCartBtn).getByText("1")).toBeInTheDocument();

    // Clicking decrease again should reduce quantity to 0 and remove the item
    fireEvent.click(decreaseBtn);
    expect(within(cartDrawer).getByText("Your cart is empty")).toBeInTheDocument();
    expect(headerCartBtn.querySelector("em")).toBeNull();

    // Close the cart drawer
    const closeCartBtn = within(cartDrawer).getByRole("button", { name: /Close cart/i });
    fireEvent.click(closeCartBtn);
    expect(cartDrawer).not.toHaveClass("is-open");
  });

  it("handles the search overlay display", async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.queryByText("Loading storefront...")).not.toBeInTheDocument();
    });

    const searchOverlay = screen.getByPlaceholderText("Search flavours, events, distributors...").closest(".search-overlay") as HTMLElement;
    expect(searchOverlay).not.toHaveClass("is-open");

    // Click the Search button in header
    const searchHeaderBtn = screen.getByRole("button", { name: /Search/i });
    fireEvent.click(searchHeaderBtn);

    // Search overlay should open
    expect(searchOverlay).toHaveClass("is-open");

    // Close search overlay
    const closeSearchBtn = within(searchOverlay).getByRole("button", { name: /Close search/i });
    fireEvent.click(closeSearchBtn);
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

    // Check health connection status (will be green/healthy because of mock)
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
