import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, SignIn, useAuth } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./styles.css";

// Clerk publishable key from environment (with fallback for dev)
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? "";

if (!PUBLISHABLE_KEY) {
  console.error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable");
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10,
      retry: 1,
    },
  },
});

function AppWithAuth() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="loading-screen">
        <span className="site-logo">GiGi</span>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#0a0a0a",
      }}>
        <SignIn routing="hash" />
      </div>
    );
  }

  return <App />;
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

createRoot(rootElement).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <QueryClientProvider client={queryClient}>
        <AppWithAuth />
      </QueryClientProvider>
    </ClerkProvider>
  </StrictMode>,
);

