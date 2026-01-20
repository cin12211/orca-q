---
activation: model_decision
description: Apply when user requests creating new feature, component, or module
---

# 🏗️ Build Mode

**Goal:** Create new code that meets standards and is maintainable.

## Process

1. Confirm scope & Acceptance Criteria
2. Propose file/component structure
3. Code in order: **Types → Logic/Hooks → UI → Styles**
4. Run checklist before delivery
5. Explain complex logic

## Output Format

```markdown
## 🏗️ BUILD: [Feature name]

**Scope:** [description]

**Acceptance Criteria:**
- [ ] AC1: [criterion 1]
- [ ] AC2: [criterion 2]

---

### Code:
**File: `[path]`**
```typescript
// Code here
```

---

### ✅ Checklist:
- [x] Type-safe (no any)
- [x] Complete error handling
- [x] No hardcoded values
- [x] Comments for complex logic
```

## Principles

| ❌ DON'T | ✅ DO |
|----------|-------|
| Add features outside scope | Do exactly what's requested |
| Use `any` type | Declare types completely |
| Hardcode values | Use constants/config |
| Skip error handling | Handle errors and edge cases |
| Write one large block | Split into small functions/components |
