# 🥤 Gigi AI Ops — Enterprise D2C Customer Support AI Agent

Gigi AI Ops is a highly secure, resilient, and enterprise-ready backend for a D2C Customer Support AI Agent, specifically designed for a modern energy drink brand. Built with a strict TypeScript + ESM stack and powered by Groq's Llama models, this system bridges LLM reasoning with database actions securely using a robust **Hybrid RAG Pipeline** and **Session-Secure Context Injection**.

This codebase represents a senior-architect-level implementation of **Agentic AI backend engineering** and **LLMOps**, focusing on system hardening, strict type safety, modular design, and robust runtime constraints.

---

## 🏗️ Architectural Core Pillars

### 1. 🛡️ The Context-Aware Session Security (Anti-Spoofing)
In production, LLMs are prone to hallucinations, structural drift, and adversarial prompt injections. Gigi AI Ops introduces a zero-trust session model:
- Raw chat messages do not pass sensitive client credentials (like customer email) in tool arguments, as they can be easily spoofed in user prompts.
- Instead, the backend session/auth middleware injects a trusted context block (`customerId`, `customerEmail`, `role`) directly into the tool execution context.
- Tools like `getOrderStatus`, `cancelOrder`, and `requestRefund` securely read these parameters from the injected context, validating DB ownership.

### 2. 🧠 Hybrid RAG Retrieval (Zero-Hallucination FAQs)
- Deliver zero-hallucination, brand-safe answers on GIGI's catalog, ingredients, and policies with exact sources and citations.
- Ingests verified catalog products dynamically from the official live endpoints (e.g. `gigienergy.com/products.json`) and storefront policies, chunking and embedding locally using `@xenova/transformers` (`Xenova/all-MiniLM-L6-v2`).
- Retrieval is powered by a **Hybrid RAG** mechanism executing a combination of **keyword/BM25 search** and **dense local vector search** over 384-dimensional floating-point embeddings.

### 3. ⚙️ Scalable & Modular Tool Registry (`src/modules/tools`)
An encapsulated, registry-driven architecture for dynamic LLM function calling:
- **Plug-and-Play Tools:** New capabilities (e.g., `cancelOrder`, `requestRefund`, `getOrder`) are registered dynamically using the `RegisterToolOptions<T>` interface.
- **Generic Inference:** Handlers automatically infer parameter typings directly from their validation schemas, ensuring complete compile-time validation.

### 4. 🚦 Model Availability & Fallback Risk Mitigation
- Groq's `llama-3.3-70b-versatile` and `llama-3.1-8b-instant` serve as the stable tool-use and JSON mode capable models.
- At server startup, model connectivity is validated. If the primary model `GROQ_MODEL_LLM` encounters errors or is missing, the system gracefully falls back to `llama-3.3-70b-versatile` to protect runtime availability.

### 5. ⚡ Database Portability (SQLite to Postgres)
- **Local MVP:** SQLite backed by Node's built-in native `node:sqlite` database engine and Prisma. High-performance WAL mode allows transactional reliability with zero native setup.
- **Production Pathway:** PostgreSQL + `pgvector` for enterprise scale, coupled with Redis + BullMQ for background queues, metrics aggregation, and caching.

---

## 🛠️ Tech Stack & Utilities

| Technology | Purpose | Description |
| :--- | :--- | :--- |
| **Node.js + TS (ESM)** | Runtime & Typings | Standard modern ES Module resolution (`nodenext`) with strict compiler rules. |
| **Express 5** | REST Gateway | Robust, hardened routing framework for client-facing APIs. |
| **node:sqlite** | Local Persistent DB | Built-in experimental SQLite driver in Node, ensuring WAL transactional reliability with zero Windows build complications. |
| **Zod v4** | Schema Validation | Comprehensive runtime gateway validation for requests, configurations, and tool calls. |
| **@xenova/transformers**| Local Embeddings | Local inference using `Xenova/all-MiniLM-L6-v2` for 100% free semantic vectors. |
| **Groq SDK** | AI Inference | Fast inference utilizing stable Llama 3 models. |
| **Pino + Pino-Pretty** | Structured Logs | Lightweight, fast, JSON structured logging with log-level support. |

---

## 📁 Repository Directory Structure

```text
src/
├── config/
│   ├── env.ts          # Zod validated environmental environment variables
│   ├── logger.ts       # Configured Pino structured logger
│   └── db.ts           # Native node:sqlite database initializer and seeder
├── middleware/
│   └── error.ts        # Global Express errorRequestHandler boundary
├── modules/
│   ├── ai/
│   │   └── ai.service.ts     # Groq LLM integration with resilient retry loops
│   ├── order/
│   │   ├── order.types.ts    # Type schemas for Orders, Customers, and Products
│   │   └── order.service.ts  # SQLite transactional operations (Cancel/Refund)
│   ├── rag/
│   │   ├── rag.ingest.ts     # Storefront scrapers & local embedding vector generators
│   │   ├── rag.service.ts     # Cosine-similarity dense vector and BM25 hybrid search
│   │   └── rag.types.ts       # RAG database schemas
│   ├── tools/
│   │   ├── tool.types.ts     # Schema validation and inferred TS interfaces for tools
│   │   ├── tool.registry.ts  # Encapsulated Tool Registry & Execution Engine with Context Injection
│   │   └── tool.init.ts      # Plug-and-play tool definitions and bootstrapping
│   └── llmops/
│       ├── llmops.service.ts # LLM usage telemetry, cost computing (USD/INR), and logger
│       └── llmops.verify.ts  # LLMOps telemetry verification sandbox
└── server.ts           # Hardened production server entrypoint serving SaaS Dashboard SPA
```

---

## 🚀 Getting Started & Setup

### 1. Environment Variables Configuration
Clone the project and create a `.env` file in the root directory:
```env
PORT=5000
GROQ_API=your_groq_api_key_here
GROQ_MODEL_LLM=llama-3.3-70b-versatile
GROQ_MODEL_SLM=llama-3.1-8b-instant
ALLOWED_ORIGINS=*
NODE_ENV=development
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the System in Development
Launch the Express server and local SQLite database:
```bash
npm run dev
```
Open `http://localhost:5000` in your web browser to access the beautiful SaaS operational dashboard, pending refunds HITL Desk, and interactive Chat Sandbox!
