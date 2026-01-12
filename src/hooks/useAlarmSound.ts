'use client';

import { useState, useCallback, useRef } from 'react';

/**
 * Storage keys
 */
const STORAGE_KEY = 'selected-alarm-sound';
const CUSTOM_SOUND_KEY = 'custom-alarm-sound-url';

/**
 * Available alarm sounds
 */
export const ALARM_SOUNDS = [
    { id: 'default', name: 'الافتراضية', url: '/sounds/alarm-default.mp3' },
    { id: 'gentle', name: 'هادئة', url: '/sounds/alarm-gentle.mp3' },
    { id: 'custom', name: 'صوت مخصص', url: '' }, // Custom uploaded sound
] as const;

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
        const sound = (stored && ['default', 'gentle', 'custom'].includes(stored))
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
    const audioRef = useRef<HTMLAudioElement | null>(null);

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
     * Play the selected alarm sound
     */
    const playAlarm = useCallback((loop: boolean = true) => {
        // Stop any existing audio first
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }

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
        audioRef.current = audio;

        // Reset state when audio ends (if not looping)
        audio.onended = () => {
            setIsPlaying(false);
        };

        // Wait for audio to be ready before playing
        audio.oncanplaythrough = () => {
            audio.play().then(() => {
                setIsPlaying(true);
            }).catch((err) => {
                console.warn('Audio play failed:', err);
                setIsPlaying(false);
            });
        };

        audio.src = soundUrl;
    }, [selectedSound, customSoundUrl]);

    /**
     * Stop the alarm
     */
    const stopAlarm = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        setIsPlaying(false);
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
