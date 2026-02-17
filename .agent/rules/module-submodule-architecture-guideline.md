# Nuxt 3 Module & Submodule Architecture Guideline

## 🎯 Purpose

Define a consistent and scalable structure for organizing modules and
submodules in the Nuxt 3 application.

Goals:

-   Clear domain separation
-   Scalable architecture
-   Strict boundary between modules
-   Easy maintenance
-   Avoid cross-import chaos

------------------------------------------------------------------------

# 1️⃣ Core Concepts

## Module

A **module** represents a route-level business domain.

Example:

-   settings
-   dashboard
-   payroll
-   crm

Each module: - Is self-contained - Has its own public API (`index.ts`) -
May contain submodules

------------------------------------------------------------------------

## Submodule

A **submodule** is a business feature inside a module.

Example:

settings - user - fee - permission

Each submodule: - Is self-contained - Has its own folder structure - Has
its own `index.ts`

------------------------------------------------------------------------

# 2️⃣ Standard Folder Structure

    /modules
      /settings
        /user
          /components
          /hooks
          /services
          /types
          /views
          index.ts
        /fee
          /components
          /hooks
          /services
          /types
          /views
          index.ts
        /shared
          /components
          /types
        index.ts

      /dashboard
        /components
        /hooks
        /services
        /types
        /views
        index.ts

------------------------------------------------------------------------

# 3️⃣ Folder Responsibilities

## components/

-   UI-only components
-   No direct API calls
-   Can use hooks
-   Internal to submodule

------------------------------------------------------------------------

## hooks/

-   Business logic
-   State management
-   Call services
-   No UI rendering

------------------------------------------------------------------------

## services/

-   API calls
-   HTTP logic
-   Data transformation from backend
-   No reactive logic

------------------------------------------------------------------------

## types/

-   Domain types
-   DTO definitions
-   Interfaces
-   Enums

------------------------------------------------------------------------

## views/

-   Entry component used by pages
-   Compose components + hooks
-   No heavy business logic

------------------------------------------------------------------------

## shared/ (inside module)

-   Shared components between submodules
-   Shared types
-   Shared utilities

------------------------------------------------------------------------

# 4️⃣ Public API Pattern (IMPORTANT)

Every module and submodule must expose an `index.ts`.

Example:

``` ts
export { default as SettingUserListView } from './views/UserListView.vue'
export * from './hooks/useUserList'
export * from './types/user.type'
```

Rules:

-   ❌ Do NOT export internal components
-   ❌ Do NOT export private utilities
-   ✅ Only export what external layers should access

------------------------------------------------------------------------

# 5️⃣ Page Usage Rule

Pages must import ONLY from module public API.

✅ Correct:

``` ts
import { SettingUserListView } from '@/modules/settings/user'
```

❌ Wrong:

``` ts
import UserTable from '@/modules/settings/user/components/UserTable.vue'
```

------------------------------------------------------------------------

# 6️⃣ Import Boundary Rules

## Allowed

  From            Can Import
  --------------- -------------------
  settings/user   settings/shared
  settings/fee    settings/shared
  settings        user + fee
  page            module public API

------------------------------------------------------------------------

## Not Allowed

-   user ↔ fee cross import
-   dashboard → settings internal
-   page → internal component
-   services → hooks
-   components → services directly (must go through hooks)

------------------------------------------------------------------------

# 7️⃣ Naming Convention

## Folder Naming

-   Module: plural → `settings`
-   Submodule: singular → `user`, `fee`
-   Shared folder: `shared`

## File Naming

  Type        Convention
  ----------- ----------------------
  Component   PascalCase.vue
  Hook        useSomething.ts
  Service     something.service.ts
  Type        Something
  DTO         SomethingDto
  View        SomethingView.vue

------------------------------------------------------------------------

# 8️⃣ Architectural Principles

## 1. Feature-first structure

Group by business domain, not by file type globally.

❌ Bad:

    /components
    /hooks
    /services

✅ Good:

    /modules/settings/user/components

------------------------------------------------------------------------

## 2. No Cross-Feature Dependency

Submodules must not depend on each other directly.

If shared logic is needed: - Move it to module/shared - Or move to
global shared layer

------------------------------------------------------------------------

## 3. Service Layer Isolation

-   No reactive state
-   No UI dependency
-   Only API + data mapping

------------------------------------------------------------------------

## 4. Hooks Own Business Logic

Hooks: - Call services - Manage loading state - Transform data - Expose
clean API to views

------------------------------------------------------------------------

## 5. Views Are Thin

Views: - Compose components - Use hooks - No complex business logic

------------------------------------------------------------------------

# 9️⃣ Review Checklist

Before merging new module/submodule:

-   [ ] Has index.ts public API
-   [ ] No deep import in pages
-   [ ] No cross-submodule import
-   [ ] Services contain no reactive logic
-   [ ] Hooks contain business logic
-   [ ] Views are thin
-   [ ] Shared logic extracted properly

------------------------------------------------------------------------

# Conclusion

This structure ensures:

-   Clear domain boundaries
-   Scalable growth
-   Predictable architecture
-   Easy onboarding for new developers
-   Reduced technical debt

Maintain strict boundaries and avoid cross-feature dependencies.
