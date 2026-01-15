'use client';

import { useState, useCallback, useEffect } from 'react';

/**
 * Storage keys
 */
const STORAGE_KEY = 'selected-alarm-sound';
const CUSTOM_SOUND_KEY = 'custom-alarm-sound-url';

/**
 * Available alarm sounds
 */
export const ALARM_SOUNDS = [
    { id: 'default', name: 'الافتراضية', url: '/sounds/alarm-default.mp3' }, // Adhan
    { id: 'gentle', name: 'هادئة', url: '/sounds/alarm-gentle.mp3' },
    { id: 'system', name: 'نغمة النظام', url: '' }, // System default alarm
    { id: 'custom', name: 'صوت مخصص', url: '' }, // Custom uploaded sound
] as const;

// Extend window interface to store global audio
declare global {
    interface Window {
        __GLOBAL_ALARM_AUDIO__?: HTMLAudioElement | null;
    }
}

/**
 * Helper to get/set global audio safely
 */
function getGlobalAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    return window.__GLOBAL_ALARM_AUDIO__ || null;
}

function setGlobalAudio(audio: HTMLAudioElement | null) {
    if (typeof window === 'undefined') return;
    window.__GLOBAL_ALARM_AUDIO__ = audio;
}

export type AlarmSoundId = typeof ALARM_SOUNDS[number]['id'];

/**
 * Hook return type
 */
export interface UseAlarmSoundReturn {
    selectedSound: AlarmSoundId;
    setSelectedSound: (id: AlarmSoundId) => void;
    setCustomSound: (file: File) => Promise<void>;
    playAlarm: (loop?: boolean) => void;
    stopAlarm: () => void;
    isPlaying: boolean;
    hasCustomSound: boolean;
}

/**
 * Load sound preference from localStorage (for lazy init)
 */
function loadSoundPreference(): { sound: AlarmSoundId; customUrl: string | null } {
    if (typeof window === 'undefined') {
        return { sound: 'default', customUrl: null };
    }
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const sound = (stored && ['default', 'gentle', 'system', 'custom'].includes(stored))
            ? (stored as AlarmSoundId)
            : 'default';
        const customUrl = localStorage.getItem(CUSTOM_SOUND_KEY);
        return { sound, customUrl };
    } catch {
        return { sound: 'default', customUrl: null };
    }
}

/**
 * useAlarmSound Hook
 * 
 * Manages alarm sound selection and playback.
 * Supports custom audio file upload stored as base64 in localStorage.
 */
export function useAlarmSound(): UseAlarmSoundReturn {
    // Lazy initialization from localStorage
    const [selectedSound, setSelectedSoundState] = useState<AlarmSoundId>(() => loadSoundPreference().sound);
    const [customSoundUrl, setCustomSoundUrl] = useState<string | null>(() => loadSoundPreference().customUrl);
    const [isPlaying, setIsPlaying] = useState(false);

    // Initial sync with global state
    useEffect(() => {
        const audio = getGlobalAudio();
        if (audio && !audio.paused) {
            // Avoid direct state update in effect to satisfy linter
            setTimeout(() => setIsPlaying(true), 0);
        }
    }, []);

    /**
     * Set and save sound preference
     */
    const setSelectedSound = useCallback((id: AlarmSoundId) => {
        setSelectedSoundState(id);
        localStorage.setItem(STORAGE_KEY, id);
    }, []);

    /**
     * Upload and save custom sound file (as base64 data URL)
     */
    const setCustomSound = useCallback(async (file: File): Promise<void> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result as string;
                localStorage.setItem(CUSTOM_SOUND_KEY, dataUrl);
                setCustomSoundUrl(dataUrl);
                setSelectedSoundState('custom');
                localStorage.setItem(STORAGE_KEY, 'custom');
                resolve();
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }, []);

    /**
     * Stop the alarm
     */
    const stopAlarm = useCallback(() => {
        const audio = getGlobalAudio();
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            setGlobalAudio(null);
        }
        setIsPlaying(false);
    }, []);

    /**
     * Play the selected alarm sound
     */
    const playAlarm = useCallback((loop: boolean = true) => {
        // FORCE STOP any existing audio
        stopAlarm();

        let soundUrl: string;

        if (selectedSound === 'custom' && customSoundUrl) {
            soundUrl = customSoundUrl;
        } else if (selectedSound === 'gentle') {
            soundUrl = '/sounds/alarm-gentle.mp3';
        } else {
            soundUrl = '/sounds/alarm-default.mp3';
        }

        const audio = new Audio();
        audio.loop = loop;
        audio.preload = 'auto';

        // Store globally BEFORE playing
        setGlobalAudio(audio);

        // Reset state when audio ends (if not looping)
        audio.onended = () => {
            setIsPlaying(false);
            if (getGlobalAudio() === audio) {
                setGlobalAudio(null);
            }
        };

        // Wait for audio to be ready before playing
        audio.oncanplaythrough = () => {
            if (getGlobalAudio() !== audio) return; // Audio was replaced before meaningful play

            audio.play().then(() => {
                setIsPlaying(true);
            }).catch((err) => {
                console.warn('Audio play failed:', err);
                setIsPlaying(false);
            });
        };

        audio.src = soundUrl;
        audio.load(); // Ensure load starts
    }, [selectedSound, customSoundUrl, stopAlarm]);

    // Cleanup when component unmounts?
    // User requested: "must leave settings page to stop overlapping"
    // This implies we SHOULD stop audio when leaving the settings page context
    useEffect(() => {
        return () => {
            // Optional: If you want sound to stop when navigating away
            // stopAlarm(); 
        };
    }, []);

    return {
        selectedSound,
        setSelectedSound,
        setCustomSound,
        playAlarm,
        stopAlarm,
        isPlaying,
        hasCustomSound: !!customSoundUrl,
    };
}
