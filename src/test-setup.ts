// Vitest global setup — set required env vars for test environment
// This runs before any test file is imported
process.env.NODE_ENV = "test";
process.env.GROQ_API = process.env.GROQ_API || "gsk_test_mock_key_for_ci";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test";
process.env.CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || "sk_test_mock";
process.env.CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY || "pk_test_mock";
process.env.CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || "whsec_test_mock";
process.env.PORT = process.env.PORT || "0";
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || "*";
