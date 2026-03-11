# ResponseNavigator Component Spec

> **Suggested name:** `ResponseNavigator`
> *(Alternative names: `AgentResponseNav`, `ReplyNavigator`, `ConversationStepper`)*

---

## Overview

A floating vertical navigator that allows users to **jump between agent responses / tool call blocks** in a long conversation — eliminating the need for manual scrolling.

---

## UI Structure

```
[ ∧ ]        ← previous button
 —           ← dot indicator (each dash = 1 response block)
 —
 —           ← active dash (longer + brighter)
 —
[ ∨ ]        ← next button
```

- Fixed position on the **right edge** of the screen
- Vertically centered (`top: 50%`, `transform: translateY(-50%)`)

---

## States

| State | Behavior | Toast |
|---|---|---|
| **Middle of list** | Both buttons active | No toast |
| **Pressed up** | Scrolls to previous response | `"Previous response"` |
| **At last item** | Down button disabled | `"Already at last response"` |
| **At first item** | Up button disabled | `"Already at first response"` |

---

## Toast Behavior

- Appears to the **left** of the navigator as a pill/bubble
- **Auto-dismiss** after ~1500ms
- Animation: fade in + slide from right → left
- Style: white text, rounded pill, `rgba(40, 40, 40, 0.9)` background
- Only one toast visible at a time (replaces previous if rapid navigation)

---

## Dot Indicators

| Property | Active | Inactive |
|---|---|---|
| Width | `3px` | `2px` |
| Height | `20px` | `12px` |
| Color | `#ffffff` | `rgba(255,255,255,0.3)` |
| Border radius | `2px` | `2px` |

- Count is **dynamic** — reflects total number of response blocks
- Smooth transition when active index changes
- Gap between dots: `4px`

---

## Props Interface

```ts
interface ResponseItem {
  id: string
  type: 'message' | 'tool_call' | 'tool_result'
  ref: React.RefObject<HTMLElement>  // used for scroll targeting
}

interface ResponseNavigatorProps {
  responses: ResponseItem[]             // list of response/tool blocks
  currentIndex: number                  // currently active index
  onNavigate: (index: number) => void   // callback on navigation
  position?: 'right' | 'left'          // default: 'right'
  offset?: { x?: number; y?: number }  // fine-tune position
}
```

---

## Visual Specs

| Element | Value |
|---|---|
| Container position | `fixed`, `right: 16px`, `top: 50%` |
| Arrow button size | `36 × 36px`, `border-radius: 50%` |
| Arrow button bg | `rgba(255,255,255,0.08)` |
| Arrow button hover | `rgba(255,255,255,0.15)` |
| Arrow button disabled | `opacity: 0.25`, `cursor: not-allowed` |
| Dot gap | `4px` |
| Dot transition | `all 200ms ease` |
| Toast padding | `8px 14px` |
| Toast font size | `13px` |
| Toast border radius | `20px` |

---

## Scroll Behavior

- On navigate: call `ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })`
- Highlight the target block briefly (optional: 300ms subtle background flash)

---

## Theming

```ts
// Dark (default)
--nav-bg: transparent
--dot-active: #ffffff
--dot-inactive: rgba(255,255,255,0.3)
--btn-hover: rgba(255,255,255,0.15)
--toast-bg: rgba(40,40,40,0.9)
--toast-text: #ffffff

// Light (optional variant)
--dot-active: #111111
--dot-inactive: rgba(0,0,0,0.2)
--btn-hover: rgba(0,0,0,0.08)
--toast-bg: rgba(240,240,240,0.95)
--toast-text: #111111
```

---

## Accessibility

- Arrow buttons: `aria-label="Go to previous response"` / `"Go to next response"`
- Keyboard: `↑` / `↓` arrow keys when navigator is focused
- Disabled state: `aria-disabled="true"`
- Toast: `role="status"` with `aria-live="polite"`

---

## File Structure (suggested)

```
components/
  ResponseNavigator/
    index.tsx           ← main component
    DotIndicator.tsx    ← dot strip sub-component
    NavToast.tsx        ← toast sub-component
    useNavigator.ts     ← navigation logic hook
    types.ts            ← shared types
    styles.module.css   ← optional CSS module
```