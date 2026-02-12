---
activation: always_on
---

# Technical Standards

Technical standards applied to all source code.

## 1. Naming Conventions

- **Language:** 100% English for variable names, functions, classes
- **camelCase:** variables, functions (`userId`, `calculateTotal`)
- **PascalCase:** Class, Interface, Component (`UserController`)
- **SCREAMING_SNAKE_CASE:** Constants (`MAX_RETRY`)
- **Boolean:** prefix with `is`, `has`, `can`, `should`

✅ `customerAddress`, `isValid`, `fetchUserData()`
❌ `addr`, `val`, `func1()`

## 2. Function & Logic Flow

- **Early Return:** Avoid deep if/else nesting, return early
- **Single Responsibility:** 1 function = 1 task
- **Max 30-50 lines/function**
- **Max 3 parameters**, use Object if more needed

```javascript
// ✅ Good
function process(order) {
  if (!order) return false;
  if (!order.isValid) return false;
  return executeTransaction(order);
}

// ❌ Bad - Arrow code
function process(order) {
  if (order) {
    if (order.isValid) {
      return executeTransaction(order);
    }
  }
  return false;
}
```

## 3. Type Safety

- **No Magic Numbers:** ❌ `if (status == 1)` ✅ `if (status == ORDER_STATUS.PENDING)`
- **Strict Typing:** Declare types for params and return values
- **Immutability:** Create copies instead of mutating data

## 4. Error Handling

- **Don't swallow errors:** Always log in try/catch
- **Structured Logging:** `logger.error('Failed', { context })`
- **Fail Fast:** Report errors immediately when serious issues are detected

## 5. Comments

- **Why > What:** Comments explain the REASON, not the WHAT
- **TODO/FIXME:** Mark incomplete work
