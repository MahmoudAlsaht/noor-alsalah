import '@testing-library/jest-dom/vitest';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock Notification API
Object.defineProperty(window, 'Notification', {
    value: class MockNotification {
        static permission = 'default';
        static requestPermission = vi.fn().mockResolvedValue('granted');
        constructor(public title: string, public options?: NotificationOptions) { }
    },
});
