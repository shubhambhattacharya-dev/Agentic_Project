import "dotenv/config"
import {z} from 'zod'

const envSchema = z.object({
    // Groq LLM
    GROQ_API: z.string().min(1, "Groq API key missing in .env!"),
    GROQ_MODEL_LLM: z.string().default("llama-3.3-70b-versatile"),
    GROQ_MODEL_SLM: z.string().default("llama-3.1-8b-instant"),

    // Server
    PORT: z.coerce.number().default(5000),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    ALLOWED_ORIGINS: z.string().default("*"),
    LOG_LEVEL: z.string().default("info"),

    // Database
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

    // Clerk Authentication
    CLERK_PUBLISHABLE_KEY: z.string().default(""),
    CLERK_SECRET_KEY: z.string().default(""),
    CLERK_WEBHOOK_SECRET: z.string().default(""),

    // Sentry Error Monitoring
    SENTRY_DSN: z.string().optional().default(""),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
    if (process.env.NODE_ENV === "test") {
        console.warn("Running in test mode with missing env vars — using defaults")
    } else {
        console.error("Environment validation failed !! check your .env file")
        console.error(parsed.error.format())
        process.exit(1)
    }
}

if (parsed.data.NODE_ENV === "production" && !parsed.data.CLERK_SECRET_KEY) {
    console.warn("WARNING: CLERK_SECRET_KEY is not set. Authentication will not work in production!")
}

// In test mode with validation failure, provide safe defaults
export const env = parsed.success ? parsed.data : {
    GROQ_API: "gsk_test_mock",
    GROQ_MODEL_LLM: "llama-3.3-70b-versatile",
    GROQ_MODEL_SLM: "llama-3.1-8b-instant",
    PORT: 0,
    NODE_ENV: "test" as const,
    ALLOWED_ORIGINS: "*",
    LOG_LEVEL: "silent",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    CLERK_PUBLISHABLE_KEY: "",
    CLERK_SECRET_KEY: "",
    CLERK_WEBHOOK_SECRET: "",
    SENTRY_DSN: "",
}