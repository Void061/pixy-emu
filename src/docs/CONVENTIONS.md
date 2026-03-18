# 📐 Backend Conventions – Colyseus + Prisma

---

# 🧠 Core Principles

The backend must strictly follow:

* Clean Code
* SOLID Principles
* Domain-driven design mindset
* Strong Type Safety (TypeScript-first)
* Separation of concerns
* Server-authoritative design

> **NEVER TRUST THE CLIENT**
> All input must be validated server-side.
> Always prevent: IDOR, XSS, CSRF, injection, overflow, and other security issues.

---

# 🏗️ Architecture Overview

The backend is structured in **clear layers** to ensure maintainability, security, and scalability:

```id="layerflow"
Controller → Actions → Domain/Models → Services → Database → Controller
```

---

## 🧩 Layers Definition

### 1. Controller / Room Handlers (Colyseus Rooms)

* Handle client messages
* Translate messages into **actions/use-cases**
* Validate input
* Do NOT contain business logic

Example:

```ts
// rooms/GameRoom.ts
onMessage("movePlayer", (client, data) => {
  const valid = validateMove(data)
  if (!valid) return
  movePlayerAction(client.sessionId, data)
})
```

---

### 2. Actions / Use Cases

* Single responsibility functions
* Encapsulate **a full logical operation**
* Call **domain models** and **services**
* May update room state

Example:

```ts
export function movePlayerAction(sessionId: string, input: MoveInput) {
  const player = PlayersModel.get(sessionId)
  if (!player.canMove(input)) return
  player.move(input)
  // update room state
}
```

---

### 3. Domain / Models (Server-side Entities)

```id="modelslayer"
/models/*
```

* Always use **local models**, never direct Prisma entities
* Encapsulate **business logic** and rules
* Should be independent from database
* Provides **methods** for game rules

Example:

```ts
class Player {
  move(input: MoveInput) { ... }
  canUseItem(item: Item) { ... }
}
```

---

### 4. Services

```id="serviceslayer"
/services/*
```

* Interact with external systems: database, payments, analytics
* Translate between **Prisma models** and **local domain models**
* Never leak Prisma entities to domain

Example:

```ts
export function getPlayerFromDb(playerId: string): Player {
  const dbPlayer = prisma.player.findUnique({ where: { id: playerId }})
  return Player.fromDb(dbPlayer)
}
```

---

### 5. Database Layer

* Prisma ORM
* Only **persistent storage**
* Do not include logic here
* Always return data that is converted to **local models**

---

# 🔄 Input Validation & Security

* NEVER TRUST THE CLIENT
* Validate all data:

  * Types
  * Ranges
  * Ownership / permissions
* Prevent:

  * IDOR (check entity ownership)
  * XSS (sanitize inputs)
  * SQL injection (Prisma already parameterizes queries)
  * Overflow / negative values / invalid enums
* Rate limiting / throttling messages where needed

---

# 🧱 Project Structure

```id="projectstructure"
src/
  rooms/             # Colyseus rooms
  actions/           # Use-case actions
  models/            # Local game entities
  services/          # DB / external integrations
  utils/             # Helpers, validators
  prisma/            # Prisma schema & client
  types/             # Shared types
```

---

# 🔒 TypeScript Rules

* Strong typing everywhere
* No `any`
* Define explicit types for:

  * Client messages
  * Room state
  * Models
  * DB mappings

---

# 🧼 Clean Code Rules

* Single responsibility per function
* Small, readable functions
* Clear naming
* Early returns
* Avoid deep nesting
* Prefer declarative style

---

# 🚫 Anti-Patterns

* Logic inside rooms/controllers ❌
* Direct DB access outside services ❌
* Sharing Prisma models outside services ❌
* Trusting client data ❌
* Monolithic actions ❌
* Unvalidated inputs ❌

---

# 🔁 Flow Example (Server-Authoritative)

```id="serverflow"
Client → Room → Action → Domain Model → Service → DB → Domain Model → Room → Client
```

> All rules enforced server-side

---

# 📚 Documentation (MANDATORY)

### DEV_GUIDE.md

* Architecture overview
* Room flow examples
* Actions structure
* Domain / model responsibilities
* Validation rules

### REQUIREMENTS.md

* Game mechanics
* Feature definitions
* Constraints
* Security rules

**Rule:** Always update docs when code changes

---

# ✅ Golden Rules

1. Never trust the client
2. All logic goes in **domain models / actions**
3. Controllers/rooms only route & validate
4. Prisma only persists, never drives logic
5. Always update DEV_GUIDE + REQUIREMENTS

---
