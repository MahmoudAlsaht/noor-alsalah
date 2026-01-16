'use client';

import { useState, useCallback, useEffect } from 'react';
import { registerPlugin } from '@capacitor/core';
import { isNativeApp } from '@/lib/platform';

interface AlarmSchedulerPlugin {
    pickRingtone(options: { currentUri?: string }): Promise<{ uri: string | null; name: string }>;
    playAlarmSound(options: { sound: string; isPreview: boolean }): Promise<void>;
    stopAlarmSound(): Promise<void>;
}
const AlarmScheduler = registerPlugin<AlarmSchedulerPlugin>('AlarmScheduler');

const STORAGE_KEY_URI = 'selected-alarm-sound-uri';
const STORAGE_KEY_NAME = 'selected-alarm-sound-name';

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

/**
 * Hook return type
 */
export interface UseAlarmSoundReturn {
    selectedSound: string; // The selected URI
    soundName: string;     // Friendly name
    setSelectedSound: (uri: string, name: string) => void;
    pickSystemRingtone: () => Promise<void>;
    playAlarm: (loop?: boolean) => void;
    stopAlarm: () => void;
    isPlaying: boolean;
}

/**
 * Load sound preference from localStorage (for lazy init)
 */
function loadSoundPreference(): { uri: string; name: string } {
    if (typeof window === 'undefined') {
        return { uri: '', name: 'نغمة النظام' };
    }
    try {
        const uri = localStorage.getItem(STORAGE_KEY_URI) || '';
        const name = localStorage.getItem(STORAGE_KEY_NAME) || 'نغمة النظام';
        return { uri, name };
    } catch {
        return { uri: '', name: 'نغمة النظام' };
    }
}

/**
 * useAlarmSound Hook
 * 
 * Manages alarm sound selection and playback.
 */
export function useAlarmSound(): UseAlarmSoundReturn {
    const [selectedSound, setSelectedSoundState] = useState<string>(() => loadSoundPreference().uri);
    const [soundName, setSoundNameState] = useState<string>(() => loadSoundPreference().name);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        const audio = getGlobalAudio();
        if (audio && !audio.paused) {
            setTimeout(() => setIsPlaying(true), 0);
        }
    }, []);

    const setSelectedSound = useCallback((uri: string, name: string) => {
        setSelectedSoundState(uri);
        setSoundNameState(name);
        localStorage.setItem(STORAGE_KEY_URI, uri);
        localStorage.setItem(STORAGE_KEY_NAME, name);
    }, []);

    const stopAlarm = useCallback(() => {
        const audio = getGlobalAudio();
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            setGlobalAudio(null);
        }
        // Also tell native to stop
        if (isNativeApp()) {
            AlarmScheduler.stopAlarmSound().catch(() => { });
        }
        setIsPlaying(false);
    }, []);

    const pickSystemRingtone = useCallback(async () => {
        try {
            const result = await AlarmScheduler.pickRingtone({
                currentUri: selectedSound || undefined
            });
            if (result.uri !== undefined) {
                setSelectedSound(result.uri || '', result.name || 'نغمة النظام');
            }
        } catch (error) {
            console.error('Failed to pick ringtone', error);
        }
    }, [selectedSound, setSelectedSound]);

    const playAlarm = useCallback(async (loop: boolean = true) => {
        stopAlarm();

        if (isNativeApp()) {
            try {
                await AlarmScheduler.playAlarmSound({
                    sound: selectedSound,
                    isPreview: !loop // If loop=true, it's likely a real alarm, if loop=false it's a preview
                });
                setIsPlaying(true);
            } catch (error) {
                console.error('Native playback failed', error);
            }
            return;
        }

        // Web Fallback
        if (!selectedSound || selectedSound.startsWith('content://')) {
            console.warn('Web view cannot play content:// URIs');
            // Show UI feedback anyway
            setIsPlaying(true);
            setTimeout(() => setIsPlaying(false), 3000);
            return;
        }

        const audio = new Audio();
        audio.loop = loop;
        audio.src = selectedSound;

        setGlobalAudio(audio);
        audio.play().then(() => {
            setIsPlaying(true);
        }).catch(() => {
            setIsPlaying(true);
            setTimeout(() => setIsPlaying(false), 3000);
        });
    }, [selectedSound, stopAlarm]);

    return {
        selectedSound,
        soundName,
        setSelectedSound,
        pickSystemRingtone,
        playAlarm,
        stopAlarm,
        isPlaying,
    };
}
