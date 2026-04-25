# Bug 3 Report: `data-tauri-drag-region` works in dev but not in desktop build

## Symptom

Areas marked with `data-tauri-drag-region` were draggable in dev, but stopped working after desktop build.

## Root Cause

The app uses a custom HTML title/header area, but the native macOS window was still being created without explicit titlebar overlay configuration in Rust.

That left the native window setup inconsistent with the custom drag region approach, especially in the packaged build path where the window is created from `src-tauri/src/lib.rs` using the runtime URL.

## Fix Summary

- Updated window creation in `src-tauri/src/lib.rs`.
- On macOS, the main window is now built with:
  - `TitleBarStyle::Overlay`
  - `hidden_title(true)`

This aligns the native window with the app's custom top bar and the `data-tauri-drag-region` usage already present in Vue templates.

## Files Changed

- `src-tauri/src/lib.rs`
  - Adjusted `create_main_window(...)` to configure the macOS title bar style at native window creation time.

## Why This Fix Is Correct

The project already:

- renders a custom top bar in Vue
- positions traffic lights manually on macOS
- marks drag-capable regions in the frontend

So the missing piece was the native titlebar/window configuration, not the frontend drag attributes themselves.

## Validation

- `cargo check` passed in `src-tauri`.
