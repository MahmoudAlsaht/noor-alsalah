# Technical Architecture & Standards

## Tech Stack
- **Framework**: Next.js 16+ (App Router)
- **Library**: React 19+ (RSC, Actions)
- **Language**: TypeScript (Strict Mode)
- **State Management**: React Hooks + LocalStorage (No Redux/Zustand needed for this scale)
- **Core Libraries**:
    - `adhan`: For astronomical calculation (CalculationMethod.Jordan).
    - `date-fns`: For robust time formatting and date manipulation.
    - `lucide-react`: For lightweight, consistent iconography.

## Coding Standards (Strict)
1.  **File Size Limit**: **Strictly < 500 Lines**. If a component exceeds this, it MUST be refactored into smaller sub-components.
2.  **Functionality Separation**: Logic (Hooks) must be separate from UI (Components).
    - `src/hooks/usePrayerTimes.ts` (Logic Only)
    - `src/components/PrayerCard.tsx` (UI Only)
3.  **Maintainability**:
    - Use meaningful variable names (`nextPrayerTime` vs `t`).
    - Add JSDoc comments for complex calculation logic.
4.  **Security**:
    - No external API calls for core functionality (prevents leaking location or usage data).
    - `dangerouslySetInnerHTML` is FORBIDDEN.
5.  **Licenses**:
    - All libraries (`adhan`, `date-fns`, `lucide-react`) use **MIT/Apache** licenses, which allow personal and commercial use without legal issues.

## Testing Strategy
1.  **Unit Tests (Critical)**:
    - Test `usePrayerTimes` against a known set of Ministry of Awqaf dates to verify accuracy.
    - Test `usePrayerTracker` to ensure persistence works.
2.  **Manual Verification**:
    - Daily check against official physical calendar.
