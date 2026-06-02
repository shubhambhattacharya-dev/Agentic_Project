# Gigi AI Ops Implementation Roadmap

This document is the working path for the GIGI support agent project. It tracks what is already done, where the current code has mistakes, and what to implement next.

## Current Status

You are currently in the agent/backend prototype phase.

Already done:

- Express server bootstrap with Helmet, CORS, rate limiting, JSON body limit, health route.
- Environment validation with Zod.
- Pino logger setup.
- Groq client wrapper and structured output helper.
- Tool registry with Zod validation before handler execution.
- Basic ReAct-style agent loop in `src/modules/agent/agent.service.ts`.
- Mock order and refund service with in-memory arrays.
- Basic token cost calculator and verification scripts.

Not yet production-ready:

- No real `/api/chat` route.
- Tools are not mounted during server startup.
- No persistent DB.
- No order ownership validation.
- No RAG pipeline.
- No human approval dashboard.
- No metrics persistence/dashboard.
- No session history persistence.

## Current Code Mistakes And Limits

### 1. Server has no real domain routes

File: `src/server.ts`

- Line 38: `// 5. Register Domain Routes`
- Line 41: only `/api/health` exists.

Problem:

The app has no chat, order, refund, RAG, or admin metrics APIs. Founder cannot test the main product from HTTP routes.

Fix:

Add these routes:

```txt
POST /api/chat
GET /api/orders/:orderId/status
POST /api/orders/:orderId/cancel
POST /api/refunds/request
GET /api/admin/refunds/pending
POST /api/admin/refunds/:id/approve
POST /api/admin/refunds/:id/reject
GET /api/admin/metrics
```

### 2. Tools are created but not initialized by server

File: `src/modules/tools/tool.init.ts`

- Line 70: `initializeTools()` exists.

File: `src/server.ts`

- No import/call for `initializeTools()`.

Problem:

The production server does not register tools unless a verification script registers them separately.

Fix:

Call `initializeTools()` once during server startup after DB initialization.

### 3. Order ownership validation is missing

File: `src/modules/tools/tool.init.ts`

- Line 78: `cancelOrder(args.id)`
- Line 91: `processRefund(args.id)`

File: `src/modules/order/order.service.ts`

- Line 51: `cancelOrder(id)`
- Line 84: `processRefund(id)`

Problem:

Any user who knows an order ID can cancel or refund that order. This is the biggest security flaw.

Fix:

Tool execution must receive trusted context from auth/session:

```ts
type ToolContext = {
  customerId: string;
  customerEmail: string;
  role: "customer" | "admin";
};
```

Then every order tool must verify:

```txt
order.customerId === context.customerId
```

Do not trust email or customer ID from the LLM prompt.

### 4. In-memory DB will lose data

File: `src/modules/order/order.service.ts`

- Line 6: `PRODUCTS` array.
- Line 13: `ORDERS` array.
- Line 47: search reads from in-memory `ORDERS`.

Problem:

Server restart resets orders/products. Multi-user actions can also create race-condition behavior like double refund or double stock restore.

Fix:

MVP:

```txt
SQLite + migrations + seed data
```

Production path:

```txt
Postgres + pgvector + Prisma/Drizzle
```

### 5. Refund rule is wrong

File: `src/modules/order/order.service.ts`

- Line 105: `order.totalAmount <= 200`

File: `src/modules/tools/tool.init.ts`

- Line 89: hardcoded `gigi-101` security block.

Problem:

Project requirement is damaged can + amount under INR 500 auto approve. Current code uses INR 200 and hardcoded order ID logic.

Fix:

Implement:

```txt
if damageClaim === true and order.totalAmount < 500:
  auto approve refund
else:
  create refund request with PENDING_HUMAN_APPROVAL
```

### 6. Status model does not match business rules

File: `src/modules/order/order.types.ts`

- Lines 6-14: current status enum.

File: `src/modules/order/order.service.ts`

- Line 19: `PROCESSING`
- Line 28: `DELIVERED`
- Line 37: `PENDING`

Problem:

Your planned rules say `placed` can cancel and `shipping/shipped` cannot. Code currently uses mixed statuses.

Fix:

Use one clear enum:

```txt
PLACED
PACKED
SHIPPED
DELIVERED
CANCELLED
REFUND_PENDING_APPROVAL
REFUNDED
```

Cancellation:

```txt
PLACED/PACKED -> allowed
SHIPPED/DELIVERED -> blocked with "Sorry, we already despatched it."
```

### 7. Agent service still has weak typing and no session layer

File: `src/modules/agent/agent.service.ts`

- Line 17: `maxIterations = 10`
- Line 40: message mapping is manual.
- Line 59: `as any`
- Line 112: tool execution has no trusted user context.

Problem:

The agent can call tools, but it cannot enforce customer ownership. It also does not save/load session history.

Fix:

Next version of `AgentService.run()` should accept:

```ts
{
  sessionId: string;
  customerContext: ToolContext;
  messages: ChatMessage[];
}
```

Then pass `customerContext` into `executeTool()`.

### 8. Groq model should have startup validation and fallback

File: `src/config/env.ts`

- Line 9: default `GROQ_MODEL_LLM`.
- Line 10: default `GROQ_MODEL_SLM`.

Problem:

Model IDs and org permissions can change. If configured model is unavailable, chat can fail at runtime.

Fix:

Use stable defaults and validate model availability on startup:

```txt
primary: llama-3.3-70b-versatile
fast/cheap: llama-3.1-8b-instant
```

If primary fails with model-not-found or permission issue, fallback to the cheap model and log a warning.

### 9. LLMOps is only logging, not storing

File: `src/modules/llmops/llmops.service.ts`

- Line 32: local token estimate.
- Line 79: `logLLMUsage()`.

File: `src/modules/agent/agent.service.ts`

- Line 71: logs usage after Groq response.

Problem:

There is no metrics DB table or dashboard API. Also local `tiktoken` should be treated as estimate only for Llama models.

Fix:

Use `response.usage` as source of truth whenever Groq returns it. Persist:

```txt
traceId
sessionId
model
promptTokens
completionTokens
costUSD
costINR
latencyMs
toolCalls
success
error
createdAt
```

### 10. README may overclaim production status

File: `README.md`

- Line 1 and architecture claims describe the project as production-grade.

Problem:

The current code is a good prototype, not a finished production-grade system.

Fix:

Phrase it as:

```txt
Production-oriented prototype with a roadmap to production-grade deployment.
```

## Correct Implementation Path

## File And Folder Work Map

Use this as the navigation map while implementing. Your current agent work is in `src/modules/agent/agent.service.ts`. If you were thinking of `agents/agent.service.ts`, align on the existing folder name: `src/modules/agent`.

### Existing Files To Continue Editing

```txt
src/server.ts
```

Purpose:

- Main Express entrypoint.
- Add real API routes here or mount route files from `src/routes`.
- Call `initializeTools()` during startup.
- Later call DB initialization and static dashboard serving.

Use for:

```txt
/api/health
/api/chat
/api/admin/metrics
/api/admin/refunds/*
```

Tools/libraries:

```txt
express
helmet
cors
express-rate-limit
zod request validation
```

```txt
src/modules/agent/agent.service.ts
```

Purpose:

- Main ReAct/tool-calling agent loop.
- Continue your current work here.
- Add trusted customer context support.
- Add LLMOps latency tracking around Groq calls.
- Save session messages later.

Important next change:

```ts
run({
  sessionId,
  customerContext,
  messages
})
```

Tools/libraries:

```txt
groq-sdk
ToolRegistry
LLMOps service
Zod types
```

```txt
src/modules/agent/agent.types.ts
```

Purpose:

- Keep chat message schemas and agent input/output schemas.
- Add `AgentRunInputSchema`, `CustomerContextSchema`, and session message types.

Tools/libraries:

```txt
zod
```

```txt
src/modules/tools/tool.registry.ts
```

Purpose:

- Central tool execution gateway.
- Add support for passing `ToolContext` into every handler.
- Continue validating LLM arguments with Zod.

Important next change:

```ts
executeTool(name, argumentsStr, context)
```

Tools/libraries:

```txt
zod
pino logger
```

```txt
src/modules/tools/tool.init.ts
```

Purpose:

- Register all tools once during server startup.
- Add `getOrderStatus`, `cancelOrder`, `requestRefund`, and `searchGigiKnowledge`.
- Remove hardcoded refund block logic.

Tools/libraries:

```txt
ToolRegistry
Zod schemas
order.service
refund.service
rag.service
```

```txt
src/modules/order/order.service.ts
```

Purpose:

- Current mock order logic.
- First refactor target after `/api/chat`.
- Replace in-memory arrays with DB queries.
- Enforce ownership and cancellation rules.

Tools/libraries:

```txt
SQLite for MVP
Postgres/Prisma later
Zod order types
```

```txt
src/modules/order/order.types.ts
```

Purpose:

- Order, product, status schemas.
- Update status enum to match business flow.

Use statuses:

```txt
PLACED
PACKED
SHIPPED
DELIVERED
CANCELLED
REFUND_PENDING_APPROVAL
REFUNDED
```

```txt
src/modules/llmops/llmops.service.ts
```

Purpose:

- Cost calculation currently lives here.
- Add latency tracking and DB persistence.
- Keep local token counting as estimate only.

Tools/libraries:

```txt
Groq response.usage as source of truth
tiktoken only for estimate
SQLite/Postgres metrics table
```

### New Files/Folders To Add

```txt
src/config/db.ts
```

Purpose:

- DB connection.
- SQLite MVP connection first.
- Later replace/upgrade to Prisma/Postgres.

Use in phase:

```txt
Phase 1: Persistent Mock Shopify DB
```

Tools/libraries:

```txt
MVP: SQLite
Production: Postgres + Prisma/Drizzle
```

```txt
src/modules/customer/customer.types.ts
src/modules/customer/customer.service.ts
```

Purpose:

- Resolve customer by email/session.
- Provide trusted `customerId/customerEmail` to tools.
- Do not let LLM invent customer identity.

Use in phase:

```txt
Phase 2: Secure Order And Refund Tools
```

```txt
src/modules/refund/refund.types.ts
src/modules/refund/refund.service.ts
```

Purpose:

- Keep refund workflow separate from order service.
- Implement auto approval and human approval queue.
- Write audit-friendly refund request rows.

Use in phase:

```txt
Phase 2 and Phase 5
```

Business rules:

```txt
damaged + amount < 500 -> auto approved
amount >= 500 -> pending human approval
```

```txt
src/modules/rag/rag.types.ts
src/modules/rag/rag.service.ts
src/modules/rag/rag.ingest.ts
```

Purpose:

- Store verified GIGI product, FAQ, ingredients, shipping, and refund policy context.
- Search relevant chunks for user questions.
- Return citations/source metadata.

Use in phase:

```txt
Phase 3: Local RAG
```

Tools/libraries:

```txt
@xenova/transformers for local embeddings
BM25/keyword scoring fallback
SQLite vector storage for MVP
Postgres + pgvector for production
```

```txt
src/modules/session/session.types.ts
src/modules/session/session.service.ts
```

Purpose:

- Store/load multi-turn chat history.
- Link session to customer.
- Persist user, assistant, and tool messages.

Use in phase:

```txt
Phase 4: Agent API + Sessions
```

Tools/libraries:

```txt
SQLite-backed sessions for MVP
Redis-backed sessions for production
```

```txt
src/modules/admin/admin.routes.ts
src/modules/chat/chat.routes.ts
src/modules/order/order.routes.ts
src/modules/refund/refund.routes.ts
```

Purpose:

- Keep `server.ts` clean by moving route handlers into route files.
- Add Zod request validation per route.

Use in phase:

```txt
Phase 0 onward
```

Suggested endpoints:

```txt
chat.routes.ts   -> POST /api/chat
order.routes.ts  -> GET /api/orders/:orderId/status, POST /api/orders/:orderId/cancel
refund.routes.ts -> POST /api/refunds/request
admin.routes.ts  -> metrics + HITL approval endpoints
```

```txt
src/public/index.html
src/public/styles.css
src/public/app.js
```

Purpose:

- Founder dashboard.
- Chat playground.
- Metrics cards.
- HITL refund approval desk.
- Recent tool calls.

Use in phase:

```txt
Phase 5: Dashboard
```

Tools/libraries:

```txt
Vanilla HTML/CSS/JS for fastest MVP
Later: Next.js/React if needed
```

```txt
scripts/seed.ts
scripts/ingest-gigi-knowledge.ts
```

Purpose:

- Seed mock Shopify DB.
- Ingest verified GIGI FAQ/product/shipping content into RAG chunks.

Use in phase:

```txt
Phase 1 and Phase 3
```

### Optional Later Folders

```txt
src/jobs/
```

Purpose:

- BullMQ workers for async jobs.

Use only after MVP works:

```txt
knowledge-ingestion
metrics-rollup
refund-notification
shopify-sync
failed-tool-retry
```

Tools/libraries:

```txt
Redis
BullMQ
```

```txt
tests/
```

Purpose:

- Unit and integration tests.

Important tests:

```txt
ownership cannot be bypassed
placed order cancellation succeeds
shipped order cancellation blocks
small damaged refund auto approves
large refund creates HITL request
RAG refuses unverified answers
metrics are persisted
```

Tools/libraries:

```txt
Vitest or Jest
Supertest for Express APIs
```

### Phase 0: Stabilize Current Agent Work fix 


Goal:

Make the existing agent service usable from a real API route.

Tasks:

- Rename/confirm current file: repo has `src/modules/agent/agent.service.ts`, not `agent.server.ts`.
- Add `POST /api/chat`.
- Call `initializeTools()` in `src/server.ts`.
- Add a strict system prompt for GIGI support.
- Add request schema:

```ts
{
  sessionId?: string;
  customerEmail: string;
  message: string;
}
```

Temporary MVP assumption:

Customer identity can be simulated by `customerEmail`, but it must be resolved server-side before tool execution.

Done when:

- `npm run dev` starts.
- `POST /api/chat` can answer a plain message.
- Tool calls work through HTTP, not only verification scripts.

### Phase 1: Persistent Mock Shopify DB

Goal:

Remove in-memory arrays and create reliable mock Shopify state.

MVP stack:

```txt
SQLite
Prisma or raw SQL
```

Production path:

```txt
Postgres + Prisma/Drizzle
```

Tables:

```txt
customers
products
orders
order_items
refund_requests
agent_sessions
agent_messages
tool_calls
agent_runs
knowledge_chunks
```

Seed data:

```txt
gigi-103 -> PLACED -> cancel success case
gigi-102 -> DELIVERED, amount < 500 -> damaged refund auto approve
gigi-101 -> DELIVERED or PLACED, amount >= 500 -> refund HITL case
```

Done when:

- Restarting server does not reset cancellations/refunds.
- Order tools read/write from DB.

### Phase 2: Secure Order And Refund Tools

Goal:

Make tools safe and business-rule correct.

Tools:

```txt
getOrderStatus(orderId)
cancelOrder(orderId)
requestRefund(orderId, reason, damageClaim)
```

Important:

The LLM only supplies action parameters. It does not supply trusted customer identity.

Correct rule:

```txt
Backend session/auth -> ToolContext -> service validates order ownership
```

Refund logic:

```txt
damaged + amount < 500 -> auto refund
otherwise -> PENDING_HUMAN_APPROVAL
```

Cancellation logic:

```txt
PLACED/PACKED -> cancel
SHIPPED/DELIVERED -> block
```

Done when:

- User A cannot cancel User B order.
- `gigi-103` cancel succeeds.
- shipped/delivered cancel returns the dispatch message.
- small damaged refund auto approves.
- large damaged refund appears in pending approval list.

### Phase 3: Local RAG For GIGI FAQ/Product/Shipping

Goal:

Answer GIGI product, ingredient, FAQ, and shipping questions from verified context.

Do not put unverified claims like Berry flavor, L-theanine, or state restrictions unless you have a trusted source.

MVP approach:

```txt
Hybrid RAG = keyword/BM25 style scoring + local embeddings + vector similarity
```

Tools/libraries:

```txt
@xenova/transformers for local embeddings
SQLite table for MVP vector storage
Postgres + pgvector for production
```

Files:

```txt
src/modules/rag/rag.types.ts
src/modules/rag/rag.service.ts
src/modules/rag/rag.ingest.ts
```

Agent tool:

```txt
searchGigiKnowledge(query)
```

Done when:

- "Lemon Lime drink mein kya active elements hain?" returns only verified retrieved context.
- The answer includes source title or source URL.
- If retrieval confidence is low, agent says it does not have verified information.

### Phase 4: LLMOps Persistence

Goal:

Track real cost and latency, not just console logs.

Add timing around every Groq call:

```txt
startedAt = Date.now()
call Groq
latencyMs = Date.now() - startedAt
```

Persist:

```txt
model
promptTokens
completionTokens
costUSD
costINR
latencyMs
sessionId
toolCount
success
error
createdAt
```

Admin endpoint:

```txt
GET /api/admin/metrics
```

Done when:

- Dashboard can show total cost, average latency, total chats, tool failure count.

### Phase 5: Human-In-The-Loop Dashboard

Goal:

Founder can see and approve/reject high-risk refunds.

Admin APIs:

```txt
GET /api/admin/refunds/pending
POST /api/admin/refunds/:id/approve
POST /api/admin/refunds/:id/reject
```

Dashboard panels:

```txt
Metrics cards
Pending refund queue
Approval/rejection buttons
Support chat playground
Recent tool calls
RAG source viewer
```

UI note:

Use the GIGI energy green accent, but keep the dashboard operational and readable. Avoid making it only decorative.

Done when:

- Large refund request appears in dashboard.
- Admin approve changes DB status to `REFUNDED`.
- Admin reject changes DB status to `REFUND_REJECTED` or equivalent.

### Phase 6: Redis And BullMQ

Only add this after Phases 1-5 work.

Use Redis for:

```txt
session cache in production
rate limit backing store
BullMQ queue backend
```

Use BullMQ queues for:

```txt
knowledge-ingestion
metrics-rollup
refund-notification
shopify-sync
failed-tool-retry
```

Do not add BullMQ too early. It will increase complexity before the core demo works.

### Phase 7: Production Hardening

Add:

```txt
auth middleware
admin role checks
idempotency keys for cancel/refund
audit logs
PII-safe logs
request IDs
tool timeout boundaries
RAG evaluation set
integration tests
deployment config
```

Done when:

- Repeat refund/cancel requests do not double-process.
- Logs do not leak full customer address unnecessarily.
- Tests cover ownership, cancellation, refund, RAG fallback, and metrics persistence.

## Founder Demo Script

Use these exact demo cases:

```txt
1. Ask: "Lemon Lime mein sugar hai kya?"
   Expected: RAG answer from verified GIGI context.

2. Ask: "Mera order gigi-103 cancel kar do."
   Expected: Order is PLACED, cancellation succeeds.

3. Ask: "Mera shipped order cancel kar do."
   Expected: "Sorry, we already despatched it."

4. Ask: "Mera can damaged mila, order gigi-102 ka refund chahiye."
   Expected: Amount below INR 500, refund auto approved.

5. Ask: "Mera order gigi-101 damaged hai, refund chahiye."
   Expected: Amount above/equal INR 500, HITL request appears in admin dashboard.

6. Admin clicks Approve.
   Expected: Refund status changes to REFUNDED and metrics/tool logs update.
```

## Recommended Build Order From Today

1. Finish `POST /api/chat`.
2. Initialize tools from `server.ts`.
3. Add SQLite schema and seed script.
4. Replace `ORDERS` and `PRODUCTS` arrays with DB services.
5. Add tool context and ownership validation.
6. Fix refund/cancel business rules.
7. Add RAG ingestion and `searchGigiKnowledge`.
8. Persist LLMOps metrics.
9. Add admin dashboard.
10. Add Redis/BullMQ only after the MVP works end to end.

## Beginner Execution View: Start Here

This section is the practical order to follow while coding. Do not jump to RAG, Redis, BullMQ, or dashboard before the base agent and tool route flow is correct.

### A. First Fix The Current Mistakes

These are the mistakes still present in the current code. Fix these before moving to the next major phase.

#### Mistake 1: No real route layer

Current file:

```txt
src/server.ts
```

Current problem:

```txt
server.ts has only /api/health.
There is no /api/chat.
There is no routes folder.
```

Better approach:

Create route files instead of putting all logic inside `server.ts`.

Add:

```txt
src/routes/chat.routes.ts
src/routes/order.routes.ts
src/routes/refund.routes.ts
src/routes/admin.routes.ts
```

Start with only:

```txt
src/routes/chat.routes.ts
```

Why:

```txt
server.ts should only configure middleware, initialize app-level services, and mount routes.
route files should handle API request/response logic.
services should hold business logic.
```

#### Mistake 2: Tools are not initialized in server startup

Current files:

```txt
src/server.ts
src/modules/tools/tool.init.ts
```

Current problem:

`initializeTools()` exists, but `server.ts` does not call it.

Better approach:

Call it once in `server.ts` before mounting routes or before `app.listen`.

Do not call `initializeTools()` inside route handlers.

Why:

```txt
ToolRegistry is a singleton.
If tools are registered on every request, duplicate registration errors can happen.
```

#### Mistake 3: Agent can run but has no trusted customer context

Current file:

```txt
src/modules/agent/agent.service.ts
```

Current problem:

The agent receives only chat messages. It does not know which authenticated customer is speaking.

Better approach:

Later refactor `AgentService.run()` from:

```ts
run(chatMessages)
```

to:

```ts
run({
  sessionId,
  customerContext,
  messages
})
```

Do not do this before `/api/chat` works. First make the route work, then improve safety.

#### Mistake 4: Tool execution has no customer ownership check

Current files:

```txt
src/modules/tools/tool.registry.ts
src/modules/tools/tool.init.ts
src/modules/order/order.service.ts
```

Current problem:

Tools accept only LLM arguments like `orderId`. They do not verify that the current customer owns that order.

Better approach:

Tool registry should pass trusted backend context into handlers:

```ts
executeTool(name, argumentsStr, context)
```

Then order service checks:

```txt
order.customerId === context.customerId
```

#### Mistake 5: In-memory orders/products

Current file:

```txt
src/modules/order/order.service.ts
```

Current problem:

`ORDERS` and `PRODUCTS` are arrays. Data resets on restart.

Better approach:

MVP:

```txt
src/config/db.ts
SQLite
```

Production:

```txt
Postgres + Prisma/Drizzle + pgvector
```

#### Mistake 6: Refund business rule mismatch

Current files:

```txt
src/modules/order/order.service.ts
src/modules/tools/tool.init.ts
```

Current problem:

Refund threshold is INR 200 and one case is hardcoded by order ID.

Better approach:

Rule should be:

```txt
damaged can + amount < 500 -> auto approve
otherwise -> PENDING_HUMAN_APPROVAL
```

Create separate refund module later:

```txt
src/modules/refund/refund.service.ts
src/modules/refund/refund.types.ts
```

### B. Your Current Start Point: `agent.service.ts`

You are currently working around:

```txt
src/modules/agent/agent.service.ts
```

This file's final responsibility should be:

```txt
1. Accept chat messages and trusted context.
2. Send messages to Groq.
3. Receive tool calls from the model.
4. Execute tools through ToolRegistry.
5. Add tool results back into message history.
6. Stop when assistant gives final answer.
7. Log model usage, cost, latency, success/failure.
```

It should not do:

```txt
1. Direct database queries.
2. Refund business logic.
3. Order cancellation logic.
4. Express req/res handling.
5. RAG chunk storage.
```

Correct mental model:

```txt
agent.service.ts = brain/orchestrator
tool.registry.ts = safe tool gateway
order.service.ts = order business logic
refund.service.ts = refund business logic
rag.service.ts = knowledge retrieval
routes/*.ts = HTTP API layer
server.ts = app bootstrap
```

### C. Exact Implementation Sequence

Follow this order. Finish one chunk before moving to the next.

## Chunk 1: Add Router Layer And Basic Chat Route

Goal:

Make the agent callable from HTTP.

Create:

```txt
src/routes/chat.routes.ts
```

Edit:

```txt
src/server.ts
```

`chat.routes.ts` purpose:

```txt
Validate request body.
Create ChatMessage array.
Call AgentService.run().
Return assistant response.
```

`server.ts` purpose:

```txt
Configure Express middleware.
Call initializeTools() once.
Mount /api/chat route.
Start server.
```

Do not add DB, RAG, Redis, BullMQ in this chunk.

Done when:

```txt
POST /api/chat works.
npm run build passes.
```

Recommended request shape for now:

```json
{
  "message": "Hi, what can you help me with?"
}
```

Later this becomes:

```json
{
  "sessionId": "session-123",
  "customerEmail": "pooja@example.com",
  "message": "Cancel my order gigi-103"
}
```

## Chunk 2: Clean Tool Initialization

Goal:

Make all tools available to the agent in a predictable way.

Edit:

```txt
src/modules/tools/tool.init.ts
src/modules/tools/tool.registry.ts
src/server.ts
```

What to do:

```txt
1. Keep tool definitions in tool.init.ts.
2. Keep registration in initializeTools().
3. Call initializeTools() once from server.ts.
4. Avoid registering tools inside verify scripts for actual app flow.
```

Done when:

```txt
Agent can call getOrder/cancelOrder/processRefund through /api/chat.
No duplicate tool registration error happens.
```

## Chunk 3: Add Tool Context Design

Goal:

Prepare tool execution for secure customer ownership validation.

Edit:

```txt
src/modules/tools/tool.types.ts
src/modules/tools/tool.registry.ts
src/modules/tools/tool.init.ts
src/modules/agent/agent.service.ts
```

Add concept:

```ts
type ToolContext = {
  customerId: string;
  customerEmail: string;
  role: "customer" | "admin";
};
```

Change tool handler shape from:

```ts
handler: (args) => Promise<any>
```

to:

```ts
handler: (args, context) => Promise<any>
```

Done when:

```txt
Tool handlers receive context, even if context is still mock/simulated.
```

## Chunk 4: Add Customer And Session Modules

Goal:

Stop relying on prompt text for identity and start resolving customer server-side.

Create:

```txt
src/modules/customer/customer.types.ts
src/modules/customer/customer.service.ts
src/modules/session/session.types.ts
src/modules/session/session.service.ts
```

Purpose:

```txt
customer.service.ts -> resolve customer from email/session
session.service.ts  -> save/load multi-turn messages
```

Temporary MVP:

```txt
customerEmail comes in request body.
Backend resolves customer record.
ToolContext is created from resolved customer.
```

Production:

```txt
Auth middleware creates req.user.
ToolContext comes from req.user, not request body.
```

## Chunk 5: Add Persistent DB

Goal:

Replace arrays with persistent storage.

Create:

```txt
src/config/db.ts
scripts/seed.ts
```

Edit:

```txt
src/modules/order/order.service.ts
src/modules/order/order.types.ts
```

Tables:

```txt
customers
products
orders
order_items
refund_requests
agent_sessions
agent_messages
agent_runs
tool_calls
knowledge_chunks
```

MVP tool:

```txt
SQLite
```

Production tools:

```txt
Postgres
Prisma or Drizzle
pgvector
```

Done when:

```txt
Server restart does not reset order/refund state.
```

## Chunk 6: Fix Order Business Rules

Goal:

Make cancellation safe and correct.

Edit:

```txt
src/modules/order/order.types.ts
src/modules/order/order.service.ts
src/modules/tools/tool.init.ts
```

Use statuses:

```txt
PLACED
PACKED
SHIPPED
DELIVERED
CANCELLED
REFUND_PENDING_APPROVAL
REFUNDED
```

Cancellation rules:

```txt
PLACED/PACKED -> cancel allowed
SHIPPED/DELIVERED -> cancel blocked
```

Ownership rule:

```txt
customer can only act on own order
```

## Chunk 7: Add Refund Module

Goal:

Separate refund workflow from order service.

Create:

```txt
src/modules/refund/refund.types.ts
src/modules/refund/refund.service.ts
src/routes/refund.routes.ts
```

Rules:

```txt
damaged + amount < 500 -> auto approve
damaged + amount >= 500 -> pending human approval
non-damaged/unclear -> pending human approval or support ticket
```

Done when:

```txt
Small damaged refund auto approves.
Large damaged refund appears in pending approval queue.
```

## Chunk 8: Add RAG Module

Goal:

Answer GIGI product/ingredient/shipping questions using verified data.

Create:

```txt
src/modules/rag/rag.types.ts
src/modules/rag/rag.service.ts
src/modules/rag/rag.ingest.ts
```

Add tool:

```txt
searchGigiKnowledge(query)
```

Use:

```txt
@xenova/transformers for local embeddings
BM25/keyword search fallback
SQLite vector table for MVP
Postgres + pgvector for production
```

Do not include unverified claims.

Done when:

```txt
Agent answers FAQ/product questions with source context.
Agent refuses when context is missing.
```

## Chunk 9: Add Admin Routes And LLMOps Metrics

Goal:

Make cost/latency/refund queue visible.

Create:

```txt
src/routes/admin.routes.ts
```

Edit:

```txt
src/modules/llmops/llmops.service.ts
src/modules/agent/agent.service.ts
```

Endpoints:

```txt
GET /api/admin/metrics
GET /api/admin/refunds/pending
POST /api/admin/refunds/:id/approve
POST /api/admin/refunds/:id/reject
```

Track:

```txt
model
promptTokens
completionTokens
costINR
costUSD
latencyMs
toolCalls
success
error
```

## Chunk 10: Add Founder Dashboard

Goal:

Give founder one screen to test and understand value.

Create:

```txt
src/public/index.html
src/public/styles.css
src/public/app.js
```

Panels:

```txt
Chat playground
Metrics cards
Pending refund approval desk
Recent tool calls
RAG source preview
```

Keep UI:

```txt
GIGI green accent
dark clean dashboard
readable operational layout
not too decorative
```

## Chunk 11: Add Redis And BullMQ Later

Do this only after the end-to-end MVP works.

Create:

```txt
src/jobs/
```

Use:

```txt
Redis
BullMQ
```

Queues:

```txt
knowledge-ingestion
metrics-rollup
refund-notification
shopify-sync
failed-tool-retry
```

### D. The Answer To "Purani Mistakes Ya Next Phase?"

Do this:

```txt
1. Fix current route/tool initialization mistakes first.
2. Make /api/chat work.
3. Add tool context.
4. Then move to DB.
5. Then fix order/refund rules.
6. Then RAG.
7. Then LLMOps/admin dashboard.
8. Then Redis/BullMQ.
```

Do not do this:

```txt
Do not start Redis before DB.
Do not start dashboard before APIs.
Do not start RAG before /api/chat works.
Do not add refund UI before refund service exists.
```

### E. Socratic Checkpoints

Before starting each chunk, answer these yourself:

```txt
1. Which layer am I editing: route, agent, tool, service, DB, or UI?
2. Is this file doing only its own responsibility?
3. Is user identity trusted from backend context or unsafe prompt text?
4. Can this action double-run if user retries?
5. Can I test this chunk with one command or one HTTP request?
```
