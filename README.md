# 🥤 Gigi AI Ops — Production-Grade D2C Customer Support AI Agent

Gigi AI Ops is a highly secure, resilient, and enterprise-ready backend for a D2C Customer Support AI Agent, specifically designed for a modern energy drink brand. Built with a strict TypeScript + ESM stack and powered by Groq's Llama models, this system bridges LLM reasoning with database actions securely using a robust **Zod Gateway Validation Pattern**.

This codebase represents a senior-architect-level implementation of **Agentic AI backend engineering** and **LLMOps**, focusing on system hardening, strict type safety, modular design, and robust runtime constraints.

---

## 🏗️ Architectural Core Pillars

### 1. 🛡️ The Zod Gateway Pattern (Prompt Injection Guard)
In production, LLMs are prone to hallucinations, structural drift, and adversarial prompt injections. Gigi AI Ops introduces a zero-trust model:
- Every dynamic parameter outputted by the LLM is intercepted and validated at the runtime boundary using strict **Zod Schemas** before reaching any database handler.
- If validation fails, the error is gracefully caught, merged, and reported back to the model without crashing the execution context.

### 2. ⚙️ Scalable & Modular Tool Registry (`src/modules/tools`)
An encapsulated, registry-driven architecture for dynamic LLM function calling:
- **Plug-and-Play Tools:** New capabilities (e.g., `cancelOrder`, `processRefund`, `checkInventory`) can be registered seamlessly using the `RegisterToolOptions<T>` interface without modifying the core orchestrator (SOLID Open-Closed Principle).
- **TypeScript Generic Inference:** Handlers automatically infer their parameters' types directly from their validation schemas, ensuring complete compile-time validation.

### 3. 🚦 Security & Custom Exception Boundaries
- **Runtime Sandboxing:** Integrates a customized `ToolSecurityError` boundary to classify customer-level violations (e.g., exceeding automated refund thresholds) separately from internal server errors.
- **Graceful Error Trapping:** Converts security violations to standard responses (`securityBlocked: true`) instead of throwing uncaught database exceptions or returning 500 crashes to the client.

### 4. ⚡ Enterprise-Grade System Hardening
- **Fast Structured Logging:** Implements **Pino** for rapid, structured JSON logging in production and highly-readable colorized logs in development (replaces slow synchronous `console.log`).
- **Web App Hardening:** Express server is configured with **Helmet** (secure HTTP headers), custom **CORS** restrictions, and an active **Rate Limiter** (100 requests per 15 minutes limit) to mitigate brute-force and DDoS vectors.
- **Resilience:** Integrates dynamic API retry mechanisms with exponential backoff on AI calls to handle rate-limiting and service disruptions gracefully.

---

## 🛠️ Tech Stack & Utilities

| Technology | Purpose | Description |
| :--- | :--- | :--- |
| **Node.js + TS (ESM)** | Runtime & Typings | Standard modern ES Module resolution (`nodenext`) with strict compiler rules. |
| **Express 5** | REST Gateway | Robust, hardened routing framework for the client-facing APIs. |
| **Zod v4** | Schema Validation | Comprehensive runtime gateway validation for requests, configurations, and tool calls. |
| **Groq SDK** | AI Orchestration | Lightning-fast inference utilizing `llama-3.3-70b-versatile` & `llama-3.3-8b-instant`. |
| **Pino + Pino-Pretty** | Structured Logs | Lightweight, fast, JSON structured logging with log-level support. |
| **Tsx** | Sandbox execution | Safe TypeScript runtime execution in development. |

---

## 📁 Repository Directory Structure

```text
src/
├── config/
│   ├── env.ts          # Zod validated environmental environment variables
│   └── logger.ts       # Configured Pino structured logger
├── middleware/
│   └── error.ts        # Global Express errorRequestHandler boundary
├── modules/
│   ├── ai/
│   │   └── ai.service.ts     # Groq LLM integration with resilient retry loops
│   ├── order/
│   │   ├── order.types.ts    # Database schemas for Products and Orders
│   │   └── order.service.ts  # Mock database table queries & operations (Cancel/Refund)
│   └── tools/
│       ├── tool.types.ts     # Schema validation and inferred TS interfaces for tools
│       ├── tool.registry.ts  # Encapsulated Tool Registry & Execution Engine
│       └── tool.verify.ts    # Test verification sandbox and runner
└── server.ts           # Hardened production server entrypoint
```

---

## 🚀 Getting Started & Setup

### 1. Environment Variables Configuration
Clone the project and create a `.env` file in the root directory:
```env
PORT=5000
GROQ_API=your_groq_api_key_here
GROQ_MODEL_LLM=llama-3.3-70b-versatile
GROQ_MODEL_SLM=llama-3.3-8b-instant
ALLOWED_ORIGINS=*
NODE_ENV=development
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run TS Compilation Check
Verify that the codebase compiles with **zero errors** under strict type check rules:
```bash
npx tsc --noEmit
```

### 4. Run the Sandbox Verification Suite
Run the verification script to simulate AI tool execution, validation failures, and security-threshold blocks:
```bash
npx tsx src/modules/tools/tool.verify.ts
```

---

## 🧪 Verification Sandbox Results

When running the verification suite (`tool.verify.ts`), the system outputs clean, production-grade Pino logs displaying safe trapping:

1. **Test 1: Successful cancellation of `gigi-103` (Amount ₹150)**
   - Registers valid parameters, cancels the order, restores product catalog stock, and returns a secure `ToolExecutionResult`.
2. **Test 2: Security Blocked Case (`gigi-101` amount ₹240)**
   - Detects the refund exceeds the automated ₹200 threshold, throws `ToolSecurityError`, logs a warning, and safely intercepts the call with `securityBlocked: true`.
3. **Test 3: Zod Schema Failure**
   - Passes an empty string `""` to the schema. The Zod gateway catches the validation mismatch immediately and prevents any mock database actions.
4. **Test 4: Unregistered Tool Call**
   - Gracefully rejects the request for unregistered tools like `orderPizza` without throwing uncaught exceptions.
