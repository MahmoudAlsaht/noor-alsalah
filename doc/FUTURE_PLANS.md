# Future Development Plans & Backlog

This document tracks upcoming features, enhancements, and known issues scheduled for future development sessions.

## Next Session Priorities

### 1. Navigation & Gestures
- **Issue:** Android back button behavior is inconsistent or non-functional in some web-view contexts.
- **Requirement:** Implement proper Back Button handling using Capacitor's `App` plugin.
    - Handle physical/gesture back button to navigate `router.back()` if history exists.
    - Exit app (minimize) if on the home screen.

### 2. Haptic & Audio Feedback
- **Goal:** Improve app "feel" and responsiveness.
- **Requirements:**
    - **Haptics:** Implement `Haptics.impact({ style: ImpactStyle.Light })` on button clicks (settings toggles, prayer checks, navigation).
    - **Sound Effects:** Add subtle "click" or "tap" sounds for interactions (optional toggle in settings).

## Backlog
- [ ] **Midnight Rescheduling:** Logic to refresh prayer times exactly at midnight for the new day.
- [ ] **Custom Alarm Duration:** Allow users to set how long the full-screen alarm stays active (currently fixed at 2 mins).
