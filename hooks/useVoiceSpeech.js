/**
 * useVoiceSpeech
 * ──────────────
 * Cross-platform text-to-speech hook.
 *
 * Web    → browser SpeechSynthesis API
 * Mobile → expo-speech
 *
 * Returns:
 *   isSpeaking  boolean
 *   speak(text)
 *   stop()
 */
import { useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';

// Strip markdown so the AI doesn't read "asterisk asterisk bold asterisk asterisk"
function stripMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/---+/g, '')
    .trim();
}

export default function useVoiceSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  const speak = useCallback(async (text) => {
    const clean = stripMarkdown(text);
    if (!clean) return;

    if (Platform.OS === 'web') {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(clean);
      utt.lang = 'en-UG';
      utt.rate = 1.05;
      utt.pitch = 1;
      utt.onstart = () => setIsSpeaking(true);
      utt.onend = () => setIsSpeaking(false);
      utt.onerror = () => setIsSpeaking(false);
      utteranceRef.current = utt;
      window.speechSynthesis.speak(utt);
    } else {
      try {
        const Speech = await import('expo-speech');
        Speech.stop();
        setIsSpeaking(true);
        Speech.speak(clean, {
          language: 'en-UG',
          rate: 1.0,
          pitch: 1.0,
          onDone: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
          onStopped: () => setIsSpeaking(false),
        });
      } catch (_) {
        setIsSpeaking(false);
      }
    }
  }, []);

  const stop = useCallback(async () => {
    if (Platform.OS === 'web') {
      window.speechSynthesis?.cancel();
    } else {
      try {
        const Speech = await import('expo-speech');
        Speech.stop();
      } catch (_) {}
    }
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, speak, stop };
}
