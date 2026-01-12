'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Available alarm sounds
 */
export const ALARM_SOUNDS = [
    { id: 'default', name: 'الافتراضية', url: '/sounds/alarm-default.mp3' },
    { id: 'gentle', name: 'هادئة', url: '/sounds/alarm-gentle.mp3' },
] as const;

export type AlarmSoundId = typeof ALARM_SOUNDS[number]['id'];

const STORAGE_KEY = 'selected-alarm-sound';

/**
 * Hook return type
 */
export interface UseAlarmSoundReturn {
    selectedSound: AlarmSoundId;
    setSelectedSound: (id: AlarmSoundId) => void;
    playAlarm: () => void;
    stopAlarm: () => void;
    isPlaying: boolean;
}

/**
 * useAlarmSound Hook
 * 
 * Manages alarm sound selection and playback.
 */
export function useAlarmSound(): UseAlarmSoundReturn {
    const [selectedSound, setSelectedSoundState] = useState<AlarmSoundId>('default');
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Load preference from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && ALARM_SOUNDS.some((s) => s.id === stored)) {
                setSelectedSoundState(stored as AlarmSoundId);
            }
        } catch {
            // Use default
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
     * Play the selected alarm sound
     */
    const playAlarm = useCallback(() => {
        const sound = ALARM_SOUNDS.find((s) => s.id === selectedSound);
        if (!sound) return;

        // Stop any existing audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        const audio = new Audio(sound.url);
        audio.loop = true;
        audioRef.current = audio;

        audio.play().then(() => {
            setIsPlaying(true);
        }).catch((err) => {
            console.error('Failed to play alarm:', err);
        });
    }, [selectedSound]);

    /**
     * Stop the alarm
     */
    const stopAlarm = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
            setIsPlaying(false);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, []);

    return {
        selectedSound,
        setSelectedSound,
        playAlarm,
        stopAlarm,
        isPlaying,
    };
}
