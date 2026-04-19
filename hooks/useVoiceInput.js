/**
 * useVoiceInput — 100% on-device, zero API calls, zero cost
 * ──────────────────────────────────────────────────────────
 * Web    → browser native SpeechRecognition API (Chrome/Edge/Safari)
 * Mobile → hidden WebView running the same SpeechRecognition API,
 *          results posted back via postMessage bridge
 *
 * Usage:
 *   const { isListening, transcript, startListening, stopListening, supported, WebViewBridge } = useVoiceInput();
 *
 *   // Render <WebViewBridge /> somewhere in your component tree (mobile only, invisible)
 *   // Call startListening(onResult, onError) to begin
 *   // Call stopListening() to cancel
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';

// ─── Web: native SpeechRecognition ───────────────────────────────────────────
function useWebSpeech() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recRef = useRef(null);

  const supported =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const startListening = useCallback(
    (onResult, onError) => {
      if (!supported) {
        onError?.('Speech recognition not supported. Try Chrome or Edge.');
        return;
      }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
      rec.lang = 'en-UG';
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.continuous = false;
      recRef.current = rec;

      rec.onstart = () => { setIsListening(true); setTranscript(''); };

      rec.onresult = (e) => {
        let interim = '', final = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) final += t;
          else interim += t;
        }
        setTranscript(final || interim);
        if (final) onResult?.(final.trim());
      };

      rec.onerror = (e) => {
        setIsListening(false);
        setTranscript('');
        if (e.error !== 'no-speech') onError?.(e.error);
      };

      rec.onend = () => setIsListening(false);
      rec.start();
    },
    [supported]
  );

  const stopListening = useCallback(() => {
    recRef.current?.stop();
    setIsListening(false);
  }, []);

  // No WebView needed on web
  const WebViewBridge = useCallback(() => null, []);

  return { isListening, transcript, startListening, stopListening, supported, WebViewBridge };
}

// ─── Mobile: hidden WebView bridge ───────────────────────────────────────────
// The WebView loads a tiny HTML page that runs SpeechRecognition in the browser
// engine (which IS available in WebView on Android/iOS) and posts results back.
function useMobileSpeech() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const webViewRef = useRef(null);
  const callbacksRef = useRef({ onResult: null, onError: null });

  // The HTML injected into the hidden WebView
  const HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body><script>
var rec = null;
var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function post(type, payload) {
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload }));
}
window.addEventListener('message', function(e) {
  var msg = JSON.parse(e.data || '{}');
  if (msg.action === 'start') {
    if (!SR) { post('error', 'SpeechRecognition not supported on this device'); return; }
    rec = new SR();
    rec.lang = msg.lang || 'en-UG';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    rec.onstart = function() { post('start', null); };
    rec.onresult = function(e) {
      var interim = '', final = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else interim += t;
      }
      post('result', { interim: interim, final: final });
    };
    rec.onerror = function(e) { post('error', e.error); };
    rec.onend = function() { post('end', null); };
    rec.start();
  }
  if (msg.action === 'stop' && rec) { rec.stop(); }
});
post('ready', null);
<\/script></body></html>`;

  const onMessage = useCallback((event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      switch (msg.type) {
        case 'ready':
          break;
        case 'start':
          setIsListening(true);
          setTranscript('');
          break;
        case 'result':
          if (msg.payload.interim) setTranscript(msg.payload.interim);
          if (msg.payload.final) {
            setTranscript(msg.payload.final);
            callbacksRef.current.onResult?.(msg.payload.final.trim());
          }
          break;
        case 'error':
          setIsListening(false);
          setTranscript('');
          if (msg.payload !== 'no-speech') {
            callbacksRef.current.onError?.(msg.payload || 'Voice recognition failed');
          }
          break;
        case 'end':
          setIsListening(false);
          break;
      }
    } catch (_) {}
  }, []);

  const startListening = useCallback((onResult, onError) => {
    callbacksRef.current = { onResult, onError };
    webViewRef.current?.injectJavaScript(
      `window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ action: 'start', lang: 'en-UG' }) })); true;`
    );
  }, []);

  const stopListening = useCallback(() => {
    webViewRef.current?.injectJavaScript(
      `window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ action: 'stop' }) })); true;`
    );
    setIsListening(false);
  }, []);

  // The invisible WebView — must be rendered in the component tree
  const WebViewBridge = useCallback(() => {
    // Lazy import to avoid crashing on web
    const { WebView } = require('react-native-webview');
    return (
      <WebView
        ref={webViewRef}
        source={{ html: HTML }}
        onMessage={onMessage}
        style={{ width: 0, height: 0, position: 'absolute', opacity: 0 }}
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        originWhitelist={['*']}
      />
    );
  }, [onMessage]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    supported: true,
    WebViewBridge,
  };
}

// ─── Unified export ───────────────────────────────────────────────────────────
export default function useVoiceInput() {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useWebSpeech();
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useMobileSpeech();
}
