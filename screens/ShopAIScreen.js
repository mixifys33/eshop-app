import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Image, Animated, Platform,
  KeyboardAvoidingView, Dimensions, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import API from '../config';
import useVoiceInput from '../hooks/useVoiceInput';
import useVoiceSpeech from '../hooks/useVoiceSpeech';
import Markdown from 'react-native-markdown-display';

const { width: SW } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';
const IS_WIDE = SW >= 768;
const BUBBLE_MAX = IS_WIDE ? Math.min(SW * 0.55, 520) : SW * 0.78;

const C = {
  primary: '#7C3AED', primaryDark: '#5B21B6', primaryMid: '#6D28D9',
  primarySoft: '#EDE9FE', primaryXSoft: '#F5F3FF',
  user: '#2563EB', userDark: '#1D4ED8',
  bg: '#F5F3FF', surface: '#FFFFFF',
  border: '#E5E7EB', borderLight: '#F3F4F6',
  text: '#111827', textSub: '#374151', textMuted: '#9CA3AF',
  green: '#059669', greenSoft: '#D1FAE5', greenDark: '#065F46',
  red: '#DC2626', redSoft: '#FEE2E2',
  orange: '#D97706', orangeSoft: '#FEF3C7',
  blue: '#2563EB', blueSoft: '#DBEAFE',
  pink: '#DB2777', pinkSoft: '#FCE7F3',
  gold: '#F59E0B',
};

const STATUS = {
  pending:            { bg: '#FEF3C7', text: '#92400E', icon: 'time-outline' },
  processing:         { bg: '#DBEAFE', text: '#1E40AF', icon: 'refresh-outline' },
  shipped:            { bg: '#D1FAE5', text: '#065F46', icon: 'bicycle-outline' },
  delivered:          { bg: '#D1FAE5', text: '#065F46', icon: 'checkmark-circle-outline' },
  cancelled:          { bg: '#FEE2E2', text: '#991B1B', icon: 'close-circle-outline' },
  refund_in_progress: { bg: '#FCE7F3', text: '#9D174D', icon: 'return-down-back-outline' },
};

const QUICK = [
  { icon: 'bag-handle-outline',     label: 'Best products',   text: 'Show me your best products' },
  { icon: 'phone-portrait-outline', label: 'Electronics',     text: 'Show me electronics and gadgets' },
  { icon: 'pricetag-outline',       label: 'Active deals',    text: 'What deals and discounts are available right now?' },
  { icon: 'wallet-outline',         label: 'Budget picks',    text: 'Show me affordable products under UGX 100,000' },
  { icon: 'cube-outline',           label: 'My orders',       text: 'Show me my orders' },
  { icon: 'location-outline',       label: 'Track order',     text: 'Track my latest order' },
  { icon: 'bicycle-outline',        label: 'Delivery info',   text: 'How does delivery work and what are the terminals?' },
  { icon: 'card-outline',           label: 'Payment methods', text: 'What payment methods do you accept?' },
];

let _mid = 0;
const uid = () => `m_${++_mid}_${Date.now()}`;

// ─── Typewriter loading status ────────────────────────────────────────────────
const LOADING_STEPS = [
  'Processing your query...',
  'Extracting relevant details...',
  'Checking our databases...',
  'Searching for products...',
  'Reviewing your orders...',
  'Analysing the best results...',
  'Preparing your response...',
];

const TypingDots = () => {
  const [stepIdx, setStepIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [charIdx, setCharIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Advance to next step after current one finishes typing + a short pause
  useEffect(() => {
    const current = LOADING_STEPS[stepIdx];
    if (charIdx < current.length) {
      // Type next character
      const t = setTimeout(() => setCharIdx(c => c + 1), 28);
      return () => clearTimeout(t);
    }
    // Fully typed — pause then fade out and move to next step
    const pause = setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        const next = (stepIdx + 1) % LOADING_STEPS.length;
        setStepIdx(next);
        setCharIdx(0);
        setDisplayed('');
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 900);
    return () => clearTimeout(pause);
  }, [charIdx, stepIdx]);

  // Build displayed string as characters are typed
  useEffect(() => {
    setDisplayed(LOADING_STEPS[stepIdx].slice(0, charIdx));
  }, [charIdx, stepIdx]);

  return (
    <View style={{ paddingVertical: 6, paddingHorizontal: 2, minWidth: 180 }}>
      <Animated.View style={{ opacity: fadeAnim, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {/* Spinner dot */}
        <View style={{
          width: 7, height: 7, borderRadius: 4,
          backgroundColor: C.primary, opacity: 0.7,
        }} />
        <Text style={{ fontSize: 13.5, color: C.primary, fontWeight: '500', letterSpacing: 0.1 }}>
          {displayed}
          <Text style={{ color: C.primarySoft }}>|</Text>
        </Text>
      </Animated.View>
    </View>
  );
};

// ─── Markdown renderer ────────────────────────────────────────────────────────
const MD = ({ text, isUser }) => {
  if (!text) return null;
  const fg = isUser ? '#fff' : C.text;
  const mdStyles = {
    body: { color: fg, fontSize: 14.5, lineHeight: 22 },
    heading1: { color: fg, fontSize: 18, fontWeight: '800', marginTop: 8, marginBottom: 4, lineHeight: 26 },
    heading2: { color: fg, fontSize: 16, fontWeight: '800', marginTop: 6, marginBottom: 4, lineHeight: 24 },
    heading3: { color: fg, fontSize: 14.5, fontWeight: '700', marginTop: 4, marginBottom: 2, lineHeight: 22 },
    strong: { fontWeight: '700', color: fg },
    em: { fontStyle: 'italic', color: fg },
    code_inline: {
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      backgroundColor: isUser ? 'rgba(255,255,255,0.18)' : C.primarySoft,
      color: isUser ? '#fff' : C.primary,
      fontSize: 13,
      borderRadius: 3,
      paddingHorizontal: 4,
    },
    code_block: {
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      backgroundColor: isUser ? 'rgba(0,0,0,0.2)' : C.primaryXSoft,
      color: isUser ? '#fff' : C.primary,
      fontSize: 13,
      borderRadius: 8,
      padding: 10,
      marginVertical: 6,
    },
    fence: {
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      backgroundColor: isUser ? 'rgba(0,0,0,0.2)' : C.primaryXSoft,
      color: isUser ? '#fff' : C.primary,
      fontSize: 13,
      borderRadius: 8,
      padding: 10,
      marginVertical: 6,
    },
    bullet_list: { marginVertical: 4 },
    ordered_list: { marginVertical: 4 },
    list_item: { marginVertical: 2 },
    bullet_list_icon: { color: isUser ? 'rgba(255,255,255,0.7)' : C.primary, marginRight: 6 },
    ordered_list_icon: { color: isUser ? 'rgba(255,255,255,0.7)' : C.primary, marginRight: 6 },
    hr: { backgroundColor: isUser ? 'rgba(255,255,255,0.22)' : C.border, marginVertical: 8 },
    blockquote: {
      backgroundColor: isUser ? 'rgba(255,255,255,0.1)' : C.primaryXSoft,
      borderLeftColor: isUser ? 'rgba(255,255,255,0.4)' : C.primary,
      borderLeftWidth: 3,
      paddingLeft: 10,
      marginVertical: 4,
    },
    link: { color: isUser ? '#a8d8ff' : C.primary, textDecorationLine: 'underline' },
    paragraph: { marginVertical: 2 },
  };
  return <Markdown style={mdStyles}>{text}</Markdown>;
};

// ─── Message bubble with action bar ──────────────────────────────────────────
const MessageBubble = React.memo(({ msg, onCopy, onSpeak, onStopSpeak, onRetry, onEdit, speakingId }) => {
  const isUser = msg.role === 'user';
  const isBot = msg.role === 'assistant' && !msg.loading;
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(10)).current;
  const isSpeakingThis = speakingId === msg.id;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[st.msgRow, isUser ? st.msgRowUser : st.msgRowBot, { opacity: fade, transform: [{ translateY: slide }] }]}>
      {!isUser && (
        <LinearGradient colors={[C.primary, C.primaryDark]} style={st.botAvatar}>
          <Ionicons name="sparkles" size={13} color="#fff" />
        </LinearGradient>
      )}

      <View style={{ maxWidth: BUBBLE_MAX }}>
        {/* Bubble */}
        <View style={[st.bubble, isUser ? st.bubbleUser : st.bubbleBot]}>
          {msg.imageUri ? <Image source={{ uri: msg.imageUri }} style={st.msgImg} resizeMode="cover" /> : null}
          {msg.loading ? <TypingDots /> : msg.content ? <MD text={msg.content} isUser={isUser} /> : null}
        </View>

        {/* Action bar — shown below completed bubbles only */}
        {!msg.loading && msg.content ? (
          <View style={[st.bubbleActions, isUser ? st.bubbleActionsUser : st.bubbleActionsBot]}>
            {/* Copy */}
            <TouchableOpacity
              style={st.bubbleActionBtn}
              onPress={() => onCopy(msg.content)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="copy-outline" size={13} color={C.textMuted} />
            </TouchableOpacity>

            {/* Speak / Stop speak — bot only */}
            {isBot ? (
              <TouchableOpacity
                style={st.bubbleActionBtn}
                onPress={() => isSpeakingThis ? onStopSpeak() : onSpeak(msg)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons
                  name={isSpeakingThis ? 'stop-circle-outline' : 'volume-medium-outline'}
                  size={13}
                  color={isSpeakingThis ? C.primary : C.textMuted}
                />
              </TouchableOpacity>
            ) : null}

            {/* Retry — bot only */}
            {isBot ? (
              <TouchableOpacity
                style={st.bubbleActionBtn}
                onPress={() => onRetry(msg)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="refresh-outline" size={13} color={C.textMuted} />
              </TouchableOpacity>
            ) : null}

            {/* Edit — user only */}
            {isUser ? (
              <TouchableOpacity
                style={st.bubbleActionBtn}
                onPress={() => onEdit(msg.content)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="pencil-outline" size={13} color={C.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>

      {isUser && (
        <View style={st.userAvatar}>
          <Ionicons name="person" size={13} color={C.user} />
        </View>
      )}
    </Animated.View>
  );
});

// ─── Product card ─────────────────────────────────────────────────────────────
const ProductCard = React.memo(({ product, onPress, onAddToCart, onAddToWishlist }) => {
  const disc = product.originalPrice && product.price < product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const inStock = product.stock > 0;
  const cardW = IS_WIDE ? 200 : 162;

  return (
    <TouchableOpacity style={[st.pCard, { width: cardW }]} onPress={() => onPress(product)} activeOpacity={0.88}>
      {/* Image */}
      <View style={st.pImgWrap}>
        {product.image
          ? <Image source={{ uri: product.image }} style={st.pImg} resizeMode="cover" />
          : <View style={[st.pImg, st.pImgEmpty]}><Ionicons name="image-outline" size={28} color={C.textMuted} /></View>}
        {disc > 0 && (
          <LinearGradient colors={[C.red, '#B91C1C']} style={st.discBadge}>
            <Text style={st.discBadgeText}>-{disc}%</Text>
          </LinearGradient>
        )}
        {product.featured && (
          <View style={st.featBadge}>
            <Ionicons name="star" size={10} color={C.gold} />
          </View>
        )}
      </View>

      {/* Body */}
      <View style={st.pBody}>
        <Text style={st.pName} numberOfLines={2}>{product.name}</Text>
        <Text style={st.pPrice}>{product.priceFormatted}</Text>
        {product.originalPrice ? <Text style={st.pOrigPrice}>UGX {Number(product.originalPrice).toLocaleString()}</Text> : null}
        <Text style={st.pShop} numberOfLines={1}>🏪 {product.shopName}</Text>
        <View style={st.pBadgeRow}>
          <View style={[st.pBadge, { backgroundColor: inStock ? C.greenSoft : C.redSoft }]}>
            <View style={[st.pBadgeDot, { backgroundColor: inStock ? C.green : C.red }]} />
            <Text style={[st.pBadgeText, { color: inStock ? C.greenDark : C.red }]}>{inStock ? 'In Stock' : 'Out of Stock'}</Text>
          </View>
          {product.cashOnDelivery === 'Yes' && (
            <View style={[st.pBadge, { backgroundColor: C.blueSoft }]}>
              <Text style={[st.pBadgeText, { color: C.blue }]}>COD</Text>
            </View>
          )}
        </View>
      </View>

      {/* Actions */}
      <View style={st.pActions}>
        <TouchableOpacity style={st.pActBtn} onPress={e => { e.stopPropagation?.(); onAddToCart(product); }}>
          <LinearGradient colors={[C.user, C.userDark]} style={st.pActInner}>
            <Ionicons name="cart" size={14} color="#fff" />
            <Text style={st.pActText}>Cart</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={[st.pActBtn, { marginLeft: 6 }]} onPress={e => { e.stopPropagation?.(); onAddToWishlist(product); }}>
          <View style={[st.pActInner, { backgroundColor: C.redSoft }]}>
            <Ionicons name="heart" size={14} color={C.red} />
          </View>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

// ─── Order card ───────────────────────────────────────────────────────────────
const OrderCard = React.memo(({ order, onPress }) => {
  const col = STATUS[order.status] || STATUS.pending;
  const itemCount = (order.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
  const first = order.items?.[0];
  const date = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <TouchableOpacity style={st.oCard} onPress={() => onPress?.(order)} activeOpacity={0.88}>
      {/* Top row */}
      <View style={st.oTop}>
        <View style={st.oIdRow}>
          <View style={st.oIconBox}>
            <Ionicons name="receipt" size={13} color={C.primary} />
          </View>
          <Text style={st.oId}>Order #{order.shortId}</Text>
        </View>
        <View style={[st.oStatusPill, { backgroundColor: col.bg }]}>
          <Ionicons name={col.icon} size={10} color={col.text} style={{ marginRight: 3 }} />
          <Text style={[st.oStatusText, { color: col.text }]}>
            {(order.status || 'pending').replace(/_/g, ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Items preview */}
      {first && (
        <Text style={st.oItemsText} numberOfLines={1}>
          {first.name}{itemCount > 1 ? ` +${itemCount - 1} more item${itemCount > 2 ? 's' : ''}` : ''}
        </Text>
      )}

      {/* Bottom row */}
      <View style={st.oBottom}>
        <View>
          <Text style={st.oTotalLabel}>Total amount</Text>
          <Text style={st.oTotal}>UGX {Number(order.subtotal || 0).toLocaleString()}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={st.oDate}>{date}</Text>
          {order.delivery?.name && (
            <Text style={st.oDelivery}>🚚 {order.delivery.name}{order.delivery.estimatedDays ? ` · ${order.delivery.estimatedDays}d` : ''}</Text>
          )}
        </View>
      </View>

      {/* Payment row */}
      <View style={st.oPayRow}>
        <Ionicons name="card-outline" size={11} color={C.textMuted} />
        <Text style={st.oPayText}>
          {(order.paymentStatus || 'pending').replace(/_/g, ' ')}
          {order.paymentMethod ? ` · ${order.paymentMethod}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

// ─── Collapsible product section ─────────────────────────────────────────────
const ExpandableProducts = ({ products, onPress, onAddToCart, onAddToWishlist }) => {
  const [open, setOpen] = useState(false);
  if (!products?.length) return null;
  return (
    <View style={st.expandSection}>
      <TouchableOpacity style={st.expandHeader} onPress={() => setOpen(v => !v)} activeOpacity={0.8}>
        <View style={st.expandHeaderLeft}>
          <View style={st.expandIconBox}>
            <Ionicons name="cube-outline" size={13} color={C.primary} />
          </View>
          <Text style={st.expandHeaderText}>
            {products.length} product{products.length > 1 ? 's' : ''} found
          </Text>
        </View>
        <View style={st.expandChevronWrap}>
          <Text style={st.expandTapHint}>{open ? 'Collapse' : 'Tap to view'}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={C.primary} />
        </View>
      </TouchableOpacity>
      {open ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.cardsScroll} style={{ marginTop: 8 }}>
          {products.map((p, i) => (
            <ProductCard key={p.id || `p${i}`} product={p} onPress={onPress} onAddToCart={onAddToCart} onAddToWishlist={onAddToWishlist} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
};

// ─── Collapsible order section ────────────────────────────────────────────────
const ExpandableOrders = ({ orders, onPress }) => {
  const [open, setOpen] = useState(false);
  if (!orders?.length) return null;
  return (
    <View style={st.expandSection}>
      <TouchableOpacity style={st.expandHeader} onPress={() => setOpen(v => !v)} activeOpacity={0.8}>
        <View style={st.expandHeaderLeft}>
          <View style={st.expandIconBox}>
            <Ionicons name="receipt-outline" size={13} color={C.primary} />
          </View>
          <Text style={st.expandHeaderText}>
            {orders.length} order{orders.length > 1 ? 's' : ''} — tap to view
          </Text>
        </View>
        <View style={st.expandChevronWrap}>
          <Text style={st.expandTapHint}>{open ? 'Collapse' : 'Tap to view'}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={C.primary} />
        </View>
      </TouchableOpacity>
      {open ? (
        <View style={{ marginTop: 8, gap: 8 }}>
          {orders.map((o, i) => (
            <OrderCard key={o.id || `o${i}`} order={o} onPress={onPress} />
          ))}
        </View>
      ) : null}
    </View>
  );
};
const SuggestionChips = React.memo(({ suggestions, onPress, disabled }) => {
  if (!suggestions?.length) return null;
  return (
    <View style={st.sugWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.sugScroll}>
        {suggestions.map((s, i) => (
          <TouchableOpacity key={i} style={st.sugChip} onPress={() => onPress(s)} disabled={disabled} activeOpacity={0.72}>
            <Ionicons name="arrow-forward-circle-outline" size={13} color={C.primary} style={{ marginRight: 4 }} />
            <Text style={st.sugChipText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
});

// ─── Welcome / empty state ────────────────────────────────────────────────────
const WelcomeView = ({ onAction, disabled }) => (
  <View style={st.welcomeWrap}>
    {/* Hero */}
    <LinearGradient colors={[C.primary, C.primaryDark]} style={st.welcomeHero}>
      <Ionicons name="sparkles" size={36} color="#fff" />
    </LinearGradient>
    <Text style={st.welcomeTitle}>EasyShop AI</Text>
    <Text style={st.welcomeSub}>
      Your smart shopping assistant. Find products, track orders, discover deals — all in one conversation.
    </Text>

    {/* Quick action grid */}
    <View style={st.quickGrid}>
      {QUICK.map((q, i) => (
        <TouchableOpacity key={i} style={st.quickCard} onPress={() => onAction(q.text)} disabled={disabled} activeOpacity={0.8}>
          <View style={st.quickCardIcon}>
            <Ionicons name={q.icon} size={19} color={C.primary} />
          </View>
          <Text style={st.quickCardLabel}>{q.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ShopAIScreen({ navigation }) {
  const WELCOME = {
    id: 'welcome', role: 'assistant',
    content: "Hi! I'm **EasyShop AI** ✨\n\nI can find products, check live deals, track your orders, search by image, and answer any shopping question — all in one conversation.\n\nWhat can I help you with today?",
  };

  const STORAGE_KEY = 'shopai_messages';

  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [userId, setUserId] = useState(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatHistories, setChatHistories] = useState([]);
  const [activeChatId, setActiveChatId] = useState('default');
  const [historySearch, setHistorySearch] = useState('');
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingChatName, setEditingChatName] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const sidebarAnim = useRef(new Animated.Value(-280)).current;
  const scrollRef = useRef(null);
  const mountedRef = useRef(true);
  const inputRef = useRef(null);
  const bottomAnchorRef = useRef(null);

  const { isListening, transcript, startListening, stopListening, supported: voiceSupported, WebViewBridge } = useVoiceInput();
  const { isSpeaking, speak, stop: stopSpeaking } = useVoiceSpeech();

  // Auto-speak latest AI reply when enabled
  useEffect(() => {
    if (!autoSpeak) return;
    const last = messages[messages.length - 1];
    if (last && last.role === 'assistant' && last.content && !last.loading) {
      speak(last.content);
    }
  }, [messages, autoSpeak, speak]);

  // Load persisted messages + user data on mount
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        // Restore chat history
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && mountedRef.current) {
          const parsed = JSON.parse(saved);
          // Strip any loading bubbles that got frozen mid-request
          const clean = parsed.filter(m => !m.loading);
          if (clean.length > 0) {
            setMessages(clean);
            // Scroll to bottom after restore
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 200);
          }
        }
        // Cart count
        const cartRaw = await AsyncStorage.getItem('cart');
        if (cartRaw && mountedRef.current) setCartCount(JSON.parse(cartRaw).length);
        // User id + profile
        const uRaw = await AsyncStorage.getItem('currentUser') || await AsyncStorage.getItem('userData');
        if (uRaw) {
          const u = JSON.parse(uRaw);
          if (mountedRef.current) {
            setUserId(u._id || u.id || null);
            setUserProfile(u);
          }
        }
      } catch (_) {}
    })();
    return () => { mountedRef.current = false; };
  }, []);

  // Persist messages to storage whenever they change (skip loading bubbles)
  useEffect(() => {
    const toSave = messages.filter(m => !m.loading);
    // Don't bother saving if it's just the welcome message
    if (toSave.length <= 1 && toSave[0]?.id === 'welcome') return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)).catch(() => {});
  }, [messages]);

  const scrollToBottom = useCallback((animated = true) => {
    if (Platform.OS === 'web') {
      // Web: use scrollIntoView on the anchor element — most reliable
      setTimeout(() => {
        if (bottomAnchorRef.current?.scrollIntoView) {
          bottomAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        } else {
          scrollRef.current?.scrollToEnd({ animated: false });
        }
      }, 50);
    } else {
      setTimeout(() => {
        if (mountedRef.current) scrollRef.current?.scrollToEnd({ animated });
      }, 100);
    }
  }, []);

  // Scroll to bottom every time a message is added or updated
  useEffect(() => {
    if (messages.length > 1) {
      scrollToBottom();
    }
  }, [messages.length, messages[messages.length - 1]?.content?.length]);

  // Stop speech when navigating away or component unmounts
  useEffect(() => {
    return () => { stopSpeaking(); };
  }, [stopSpeaking]);

  // ── Sidebar ─────────────────────────────────────────────────────────────────
  const HISTORIES_KEY = 'shopai_histories';

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
    Animated.timing(sidebarAnim, { toValue: 0, duration: 260, useNativeDriver: true }).start();
  }, [sidebarAnim]);

  const closeSidebar = useCallback(() => {
    Animated.timing(sidebarAnim, { toValue: -280, duration: 220, useNativeDriver: true }).start(() => setSidebarOpen(false));
  }, [sidebarAnim]);

  // Load chat histories on mount
  useEffect(() => {
    AsyncStorage.getItem(HISTORIES_KEY).then(raw => {
      if (raw && mountedRef.current) setChatHistories(JSON.parse(raw));
    }).catch(() => {});
  }, []);

  // Save current chat to histories whenever messages change
  useEffect(() => {
    const toSave = messages.filter(m => !m.loading);
    if (toSave.length <= 1) return;
    const title = toSave.find(m => m.role === 'user')?.content?.slice(0, 40) || 'New chat';
    setChatHistories(prev => {
      const existing = prev.find(h => h.id === activeChatId);
      let updated;
      if (existing) {
        updated = prev.map(h => h.id === activeChatId ? { ...h, messages: toSave, updatedAt: Date.now() } : h);
      } else {
        updated = [{ id: activeChatId, title, messages: toSave, updatedAt: Date.now() }, ...prev];
      }
      AsyncStorage.setItem(HISTORIES_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, [messages]);

  const startNewChat = useCallback(() => {
    const newId = `chat_${Date.now()}`;
    setActiveChatId(newId);
    _mid = 0;
    setMessages([WELCOME]);
    setInput('');
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    closeSidebar();
  }, [closeSidebar]);

  const loadChat = useCallback((history) => {
    setActiveChatId(history.id);
    setMessages(history.messages);
    closeSidebar();
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 300);
  }, [closeSidebar]);

  const deleteChat = useCallback((chatId) => {
    if (Platform.OS === 'web') {
      // Web: use window.confirm
      if (window.confirm('Delete this conversation?')) {
        setChatHistories(prev => {
          const updated = prev.filter(h => h.id !== chatId);
          AsyncStorage.setItem(HISTORIES_KEY, JSON.stringify(updated)).catch(() => {});
          return updated;
        });
        // If deleting active chat, start fresh
        if (chatId === activeChatId) startNewChat();
      }
    } else {
      // Native: use Alert
      Alert.alert('Delete Chat', 'Delete this conversation?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: () => {
            setChatHistories(prev => {
              const updated = prev.filter(h => h.id !== chatId);
              AsyncStorage.setItem(HISTORIES_KEY, JSON.stringify(updated)).catch(() => {});
              return updated;
            });
            // If deleting active chat, start fresh
            if (chatId === activeChatId) startNewChat();
          },
        },
      ]);
    }
  }, [activeChatId, startNewChat]);

  const saveRename = useCallback((chatId, newName) => {
    if (!newName.trim()) return;
    setChatHistories(prev => {
      const updated = prev.map(h => h.id === chatId ? { ...h, title: newName.trim() } : h);
      AsyncStorage.setItem(HISTORIES_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    setEditingChatId(null);
    setEditingChatName('');
  }, []);

  // ── Bubble action handlers ──────────────────────────────────────────────────
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [inputHeight, setInputHeight] = useState(24); // auto-resize state

  // ── Visual Viewport listener for mobile web keyboard overlap ────────────────
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      document.documentElement.style.setProperty('--kb-offset', `${Math.max(offset, 0)}px`);
    };
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, []);

  const handleCopy = useCallback(async (text) => {
    try {
      await Clipboard.setStringAsync(text);
      Toast.show({ type: 'success', text1: 'Copied to clipboard', visibilityTime: 1500 });
    } catch (_) {
      Toast.show({ type: 'error', text1: 'Could not copy' });
    }
  }, []);

  const handleSpeak = useCallback((msg) => {
    setSpeakingMsgId(msg.id);
    speak(msg.content);
    // Clear the speaking indicator when done — poll isSpeaking
    const check = setInterval(() => {
      if (!isSpeaking) { setSpeakingMsgId(null); clearInterval(check); }
    }, 500);
  }, [speak, isSpeaking]);

  const handleStopSpeak = useCallback(() => {
    stopSpeaking();
    setSpeakingMsgId(null);
  }, [stopSpeaking]);

  const clearChat = () => Alert.alert('Clear Chat', 'Start a fresh conversation?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Clear', style: 'destructive', onPress: () => {
        _mid = 0;
        setMessages([WELCOME]);
        setInput('');
        AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      },
    },
  ]);

  const sendMessage = useCallback(async (overrideText) => {
    const trimmed = (overrideText ?? input).trim();
    if (!trimmed || loading) return;
    if (!overrideText) {
      setInput('');
      setInputHeight(24); // reset textarea height
      inputRef.current?.blur(); // dismiss mobile keyboard
    }

    const loadId = uid();
    const snap = messages;

    setMessages(prev => [
      ...prev,
      { id: uid(), role: 'user', content: trimmed },
      { id: loadId, role: 'assistant', content: '', loading: true },
    ]);
    setLoading(true);
    scrollToBottom();

    try {
      const [cartRaw, wishRaw] = await Promise.all([
        AsyncStorage.getItem('cart'),
        AsyncStorage.getItem('wishlist'),
      ]);

      const history = snap
        .filter(m => !m.loading && m.content && m.id !== 'welcome')
        .slice(-14)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API}/shop-ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: trimmed }],
          userContext: {
            userId,
            cartCount: cartRaw ? JSON.parse(cartRaw).length : 0,
            wishlistCount: wishRaw ? JSON.parse(wishRaw).length : 0,
            isLoggedIn: !!userId,
          },
        }),
      });

      if (!mountedRef.current) return;
      let data = {};
      try { data = await res.json(); } catch (_) { data = { error: 'Invalid response' }; }

      setMessages(prev => {
        const clean = prev.filter(m => m.id !== loadId);
        const reply = (data.reply || '').trim() || (data.error ? `Sorry: ${data.error}` : 'Sorry, I had trouble with that. Please try again.');
        return [...clean, {
          id: uid(), role: 'assistant', content: reply,
          products: Array.isArray(data.products) ? data.products : [],
          orders: Array.isArray(data.orders) ? data.orders : [],
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        }];
      });
      scrollToBottom();
    } catch (_) {
      if (!mountedRef.current) return;
      setMessages(prev => [
        ...prev.filter(m => m.id !== loadId),
        { id: uid(), role: 'assistant', content: 'Connection error. Please check your internet and try again.' },
      ]);
      scrollToBottom();
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [input, loading, messages, userId, scrollToBottom]);

  // ── Retry & Edit — defined after sendMessage to avoid TDZ ────────────────────
  const handleRetry = useCallback((botMsg) => {
    const idx = messages.findIndex(m => m.id === botMsg.id);
    if (idx <= 0) return;
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        setMessages(prev => prev.slice(0, idx));
        sendMessage(messages[i].content);
        return;
      }
    }
  }, [messages, sendMessage]);

  const handleEdit = useCallback((userContent) => {
    const idx = messages.findIndex(m => m.content === userContent && m.role === 'user');
    if (idx < 0) { setInput(userContent); return; }
    setMessages(prev => prev.slice(0, idx));
    setInput(userContent);
    inputRef.current?.focus();
  }, [messages]);

  // ── Voice input — defined after sendMessage to avoid TDZ error ──────────────
  const handleMicPress = useCallback(() => {
    if (isSpeaking) { stopSpeaking(); return; }

    if (isListening) {
      if (Platform.OS !== 'web') {
        stopListening(
          (text) => { if (text) sendMessage(text); },
          (err) => Toast.show({ type: 'error', text1: 'Voice error', text2: err, visibilityTime: 3000 })
        );
      } else {
        stopListening();
      }
      return;
    }

    if (!voiceSupported && Platform.OS === 'web') {
      Toast.show({ type: 'info', text1: 'Voice not supported', text2: 'Try Chrome or Edge', visibilityTime: 3000 });
      return;
    }

    startListening(
      (text) => { if (text) sendMessage(text); },
      (err) => Toast.show({ type: 'error', text1: 'Voice error', text2: err, visibilityTime: 3000 })
    );
  }, [isListening, isSpeaking, voiceSupported, startListening, stopListening, stopSpeaking, sendMessage]);

  const addToCart = async (product) => {
    try {
      const raw = await AsyncStorage.getItem('cart');
      const cart = raw ? JSON.parse(raw) : [];
      const ex = cart.find(i => i.id === product.id);
      if (ex) ex.quantity = (ex.quantity || 1) + 1;
      else cart.push({ ...product, quantity: 1 });
      await AsyncStorage.setItem('cart', JSON.stringify(cart));
      if (mountedRef.current) setCartCount(cart.length);
      Toast.show({ type: 'success', text1: 'Added to cart!', text2: product.name, visibilityTime: 2000 });
    } catch (_) { Toast.show({ type: 'error', text1: 'Could not add to cart' }); }
  };

  const addToWishlist = async (product) => {
    try {
      const raw = await AsyncStorage.getItem('wishlist');
      const list = raw ? JSON.parse(raw) : [];
      if (!list.find(i => i.id === product.id)) {
        list.push(product);
        await AsyncStorage.setItem('wishlist', JSON.stringify(list));
        Toast.show({ type: 'success', text1: 'Saved to wishlist!', text2: product.name, visibilityTime: 2000 });
      } else {
        Toast.show({ type: 'info', text1: 'Already in wishlist' });
      }
    } catch (_) { Toast.show({ type: 'error', text1: 'Could not save' }); }
  };

  const goToProduct = (p) => navigation.navigate('ProductDetails', {
    product: {
      _id: p.id, id: p.id, title: p.name, name: p.name,
      salePrice: p.price, regularPrice: p.originalPrice || p.price, price: p.price,
      images: p.image ? [{ url: p.image }] : [],
      category: p.category, subCategory: p.subCategory,
      brand: p.brand, stock: p.stock, description: p.description,
      sellerId: p.sellerId, cashOnDelivery: p.cashOnDelivery,
      warranty: p.warranty, colors: p.colors || [], sizes: p.sizes || [],
      freeDelivery: p.freeDelivery, deliveryFee: p.deliveryFee,
    },
  });

  const pickImage = async (source) => {
    if (loading) return;
    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Toast.show({ type: 'error', text1: 'Camera permission needed' }); return; }
        result = await ImagePicker.launchCameraAsync({
          base64: true,
          quality: 0.6,
          allowsEditing: true,
          // works on both old and new Expo SDK
          mediaTypes: ImagePicker.MediaTypeOptions
            ? ImagePicker.MediaTypeOptions.Images
            : 'images',
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Toast.show({ type: 'error', text1: 'Gallery permission needed' }); return; }
        result = await ImagePicker.launchImageLibraryAsync({
          base64: true,
          quality: 0.6,
          allowsEditing: true,
          mediaTypes: ImagePicker.MediaTypeOptions
            ? ImagePicker.MediaTypeOptions.Images
            : 'images',
        });
      }
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];

      // On some real devices base64 may be missing — fall back to uri-based upload
      if (!asset.base64 && !asset.uri) {
        Toast.show({ type: 'error', text1: 'Could not read image' }); return;
      }

      const loadId = uid();
      setMessages(prev => [
        ...prev,
        { id: uid(), role: 'user', content: '🔍 Searching by image...', imageUri: asset.uri },
        { id: loadId, role: 'assistant', content: '', loading: true },
      ]);
      setLoading(true);
      scrollToBottom();

      // Build payload — prefer base64, fall back to imageUrl for web
      const payload = asset.base64
        ? { imageBase64: asset.base64 }
        : { imageUrl: asset.uri };

      const res = await fetch(`${API}/shop-ai/image-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!mountedRef.current) return;
      let data = {};
      try { data = await res.json(); } catch (_) {}

      setMessages(prev => [
        ...prev.filter(m => m.id !== loadId),
        {
          id: uid(), role: 'assistant',
          content: (data.reply || '').trim() || 'Could not identify the product. Try describing it in text.',
          products: Array.isArray(data.products) ? data.products : [],
          orders: [],
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        },
      ]);
      scrollToBottom();
    } catch (_) {
      if (!mountedRef.current) return;
      setMessages(prev => [...prev.filter(m => !m.loading), { id: uid(), role: 'assistant', content: 'Image search failed. Please try again.' }]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const isWelcome = messages.length === 1 && messages[0].id === 'welcome';
  const canSend = input.trim().length > 0 && !loading;

  return (
    <SafeAreaView style={st.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />

      {/* Root container — needed for absolute positioning to work on web */}
      <View style={{ flex: 1, position: 'relative' }}>

      {/* ── Sidebar overlay ── */}
      {sidebarOpen ? (
        <TouchableOpacity style={st.sidebarOverlay} onPress={closeSidebar} activeOpacity={1} />
      ) : null}

      {/* ── Sidebar panel ── */}
      <Animated.View style={[st.sidebar, { transform: [{ translateX: sidebarAnim }] }]}>

        {/* Header */}
        <LinearGradient colors={[C.primaryDark, C.primary]} style={st.sidebarHeader}>
          <View style={st.sidebarHeaderRow}>
            <Ionicons name="sparkles" size={18} color="#fff" />
            <Text style={st.sidebarTitle}>EasyShop AI</Text>
          </View>
          <TouchableOpacity onPress={closeSidebar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        {/* New chat */}
        <TouchableOpacity style={st.newChatBtn} onPress={startNewChat} activeOpacity={0.85}>
          <View style={st.newChatBtnIcon}>
            <Ionicons name="add" size={16} color="#fff" />
          </View>
          <Text style={st.newChatBtnText}>New Chat</Text>
        </TouchableOpacity>

        {/* Nav links */}
        <View style={st.sidebarNav}>
          {[
            { icon: 'home-outline',        label: 'Home',         screen: 'home' },
            { icon: 'cube-outline',        label: 'All Products', screen: 'ShopAllProducts' },
            { icon: 'receipt-outline',     label: 'My Orders',    screen: 'UserOrders' },
            { icon: 'heart-outline',       label: 'Wishlist',     screen: 'Wishlist' },
          ].map(item => (
            <TouchableOpacity
              key={item.screen}
              style={st.sidebarNavItem}
              onPress={() => { closeSidebar(); navigation.navigate(item.screen); }}
              activeOpacity={0.75}
            >
              <Ionicons name={item.icon} size={17} color={C.textSub} />
              <Text style={st.sidebarNavLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={st.sidebarDivider} />

        {/* Chat history section */}
        <View style={st.sidebarHistoryHeader}>
          <Text style={st.sidebarSectionLabel}>Conversations</Text>
        </View>

        {/* Search bar */}
        <View style={st.sidebarSearch}>
          <Ionicons name="search-outline" size={14} color={C.textMuted} />
          <TextInput
            style={st.sidebarSearchInput}
            placeholder="Search chats..."
            placeholderTextColor={C.textMuted}
            value={historySearch}
            onChangeText={setHistorySearch}
            returnKeyType="search"
          />
          {historySearch.length > 0 ? (
            <TouchableOpacity onPress={() => setHistorySearch('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="close-circle" size={14} color={C.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* History list */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {chatHistories.filter(h =>
            !historySearch || h.title?.toLowerCase().includes(historySearch.toLowerCase())
          ).length === 0 ? (
            <Text style={st.sidebarEmpty}>
              {historySearch ? 'No chats match your search' : 'No saved conversations yet'}
            </Text>
          ) : null}

          {chatHistories
            .filter(h => !historySearch || h.title?.toLowerCase().includes(historySearch.toLowerCase()))
            .map(h => (
              <View key={h.id} style={[st.historyItem, h.id === activeChatId && st.historyItemActive]}>
                {editingChatId === h.id ? (
                  <View style={st.historyEditRow}>
                    <TextInput
                      style={st.historyEditInput}
                      value={editingChatName}
                      onChangeText={setEditingChatName}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={() => saveRename(h.id, editingChatName)}
                      onBlur={() => saveRename(h.id, editingChatName)}
                    />
                    <TouchableOpacity onPress={() => saveRename(h.id, editingChatName)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Ionicons name="checkmark" size={16} color={C.green} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => loadChat(h)} activeOpacity={0.8}>
                    <Text style={st.historyTitle} numberOfLines={1}>{h.title || 'Chat'}</Text>
                    <Text style={st.historyDate}>
                      {h.updatedAt ? new Date(h.updatedAt).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }) : ''}
                    </Text>
                  </TouchableOpacity>
                )}

                {editingChatId !== h.id ? (
                  <View style={st.historyActions}>
                    <TouchableOpacity
                      onPress={(e) => { e?.stopPropagation?.(); setEditingChatId(h.id); setEditingChatName(h.title || ''); }}
                      style={st.historyActionBtn}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="pencil-outline" size={13} color={C.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={(e) => { e?.stopPropagation?.(); deleteChat(h.id); }}
                      style={st.historyActionBtn}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="trash-outline" size={13} color={C.red} />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ))}
          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Bottom: user profile */}
        <TouchableOpacity
          style={st.sidebarProfile}
          onPress={() => { closeSidebar(); navigation.navigate('UserProfile'); }}
          activeOpacity={0.85}
        >
          {userProfile?.avatar ? (
            <Image source={{ uri: userProfile.avatar }} style={st.sidebarProfileImg} />
          ) : (
            <View style={st.sidebarProfileIcon}>
              <Ionicons name="person" size={18} color={C.primary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={st.sidebarProfileName} numberOfLines={1}>
              {userProfile?.name || 'Guest'}
            </Text>
            <Text style={st.sidebarProfileEmail} numberOfLines={1}>
              {userProfile?.email || 'Not logged in'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
        </TouchableOpacity>

      </Animated.View>

      {/* ── Floating header ── */}
      <LinearGradient colors={[C.primary, C.primaryDark]} style={st.header}>

        {/* Left: back + sidebar */}
        <View style={st.hLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={st.hBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={21} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openSidebar}
            style={st.hBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="menu-outline" size={22} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        </View>

        {/* Center: AI identity */}
        <View style={st.hCenter}>
          <View style={st.hAvatarWrap}>
            <LinearGradient colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.1)']} style={st.hAvatar}>
              <Ionicons name="sparkles" size={16} color="#fff" />
            </LinearGradient>
            <View style={st.hOnlineDot} />
          </View>
          <View>
            <Text style={st.hTitle}>EasyShop AI</Text>
            <View style={st.hSubRow}>
              <View style={st.hSubDot} />
              <Text style={st.hSub}>Online · Smart assistant</Text>
            </View>
          </View>
        </View>

        {/* Right: speak toggle + cart */}
        <View style={st.hRight}>
          <TouchableOpacity
            onPress={() => { stopSpeaking(); setAutoSpeak(v => !v); }}
            style={st.hBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={autoSpeak ? 'volume-high' : 'volume-mute-outline'}
              size={19}
              color={autoSpeak ? '#fff' : 'rgba(255,255,255,0.45)'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Cart')} style={st.cartBtn}>
            <Ionicons name="cart-outline" size={22} color="#fff" />
            {cartCount > 0 ? (
              <View style={st.cartBadge}>
                <Text style={st.cartBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Chat area ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={st.msgList}
          contentContainerStyle={[st.msgListContent, IS_WIDE && st.msgListWide]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollToBottom(false)}
        >
          {/* Welcome state */}
          {isWelcome && <WelcomeView onAction={sendMessage} disabled={loading} />}

          {/* Messages */}
          {!isWelcome && messages.map(msg => (
            <View key={msg.id}>
              <MessageBubble
                msg={msg}
                onCopy={handleCopy}
                onSpeak={handleSpeak}
                onStopSpeak={handleStopSpeak}
                onRetry={handleRetry}
                onEdit={handleEdit}
                speakingId={speakingMsgId}
              />

              {/* Product cards — collapsible */}
              {Array.isArray(msg.products) && msg.products.length > 0 ? (
                <ExpandableProducts
                  products={msg.products}
                  onPress={goToProduct}
                  onAddToCart={addToCart}
                  onAddToWishlist={addToWishlist}
                />
              ) : null}

              {/* Order cards — collapsible */}
              {Array.isArray(msg.orders) && msg.orders.length > 0 ? (
                <ExpandableOrders
                  orders={msg.orders}
                  onPress={() => navigation.navigate('UserOrders')}
                />
              ) : null}

              {/* Follow-up chips */}
              {Array.isArray(msg.suggestions) && msg.suggestions.length > 0 && (
                <SuggestionChips
                  suggestions={msg.suggestions}
                  onPress={sendMessage}
                  disabled={loading}
                />
              )}
            </View>
          ))}

          <View style={{ height: 20 }} />
          {/* Scroll anchor — scrolled into view on every new message */}
          <View
            ref={bottomAnchorRef}
            onLayout={() => {
              if (Platform.OS === 'web' && bottomAnchorRef.current) {
                bottomAnchorRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
              }
            }}
          />
        </ScrollView>

        {/* ── Input bar ── */}
        <View style={[st.inputBar, IS_WIDE && st.inputBarWide]}>

          {/* Live transcript bar — shown while listening */}
          {(isListening || transcript) && (
            <View style={st.transcriptBar}>
              <View style={st.transcriptDot} />
              <Text style={st.transcriptText} numberOfLines={2}>
                {isListening && !transcript ? 'Listening...' : transcript || 'Listening...'}
              </Text>
              {isListening && (
                <TouchableOpacity onPress={handleMicPress} style={st.transcriptStop}>
                  <Ionicons name="stop-circle" size={18} color={C.red} />
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={[st.inputCard, IS_WIDE && st.inputCardWide]}>

            {/* Text area row */}
            <TextInput
              ref={inputRef}
              style={[st.input, { height: Math.min(Math.max(inputHeight, 24), 120) }]}
              placeholder="Ask anything"
              placeholderTextColor={C.textMuted}
              value={input}
              onChangeText={setInput}
              onContentSizeChange={e => setInputHeight(e.nativeEvent.contentSize.height)}
              onSubmitEditing={() => { if (Platform.OS !== 'web') sendMessage(); }}
              returnKeyType="send"
              blurOnSubmit={false}
              multiline
              maxLength={500}
              editable={!loading}
            />

            {/* Toolbar row */}
            <View style={st.toolbar}>
              {/* Left: + | action icons */}
              <View style={st.toolbarLeft}>
                {/* + button */}
                <TouchableOpacity
                  style={st.toolbarPlus}
                  onPress={() => setShowAttachMenu(v => !v)}
                  disabled={loading}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="add" size={20} color={C.textSub} />
                </TouchableOpacity>

                {/* Divider */}
                <View style={st.toolbarDivider} />

                {/* Image from gallery */}
                <TouchableOpacity
                  style={st.toolbarBtn}
                  onPress={() => pickImage('gallery')}
                  disabled={loading}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="images-outline" size={19} color={loading ? C.textMuted : C.textSub} />
                </TouchableOpacity>

                {/* Camera */}
                <TouchableOpacity
                  style={st.toolbarBtn}
                  onPress={() => pickImage('camera')}
                  disabled={loading}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="camera-outline" size={19} color={loading ? C.textMuted : C.textSub} />
                </TouchableOpacity>

                {/* Products shortcut */}
                <TouchableOpacity
                  style={st.toolbarBtn}
                  onPress={() => sendMessage('Show me your best products')}
                  disabled={loading}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="bag-handle-outline" size={19} color={loading ? C.textMuted : C.textSub} />
                </TouchableOpacity>

                {/* Orders shortcut */}
                <TouchableOpacity
                  style={st.toolbarBtn}
                  onPress={() => sendMessage('Show me my orders')}
                  disabled={loading}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="cube-outline" size={19} color={loading ? C.textMuted : C.textSub} />
                </TouchableOpacity>

                {/* Deals shortcut */}
                <TouchableOpacity
                  style={st.toolbarBtn}
                  onPress={() => sendMessage('What deals and discounts are available right now?')}
                  disabled={loading}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="pricetag-outline" size={19} color={loading ? C.textMuted : C.textSub} />
                </TouchableOpacity>

                {/* Delivery shortcut */}
                <TouchableOpacity
                  style={st.toolbarBtn}
                  onPress={() => sendMessage('How does delivery work and what are the terminals?')}
                  disabled={loading}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="bicycle-outline" size={19} color={loading ? C.textMuted : C.textSub} />
                </TouchableOpacity>
              </View>

              {/* Right: mic + send */}
              <View style={st.toolbarRight}>
                {/* Mic button — active state shows pulse, tap again to stop */}
                <TouchableOpacity
                  style={[st.toolbarBtn, isListening && st.micBtnActive]}
                  onPress={handleMicPress}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={isListening ? 'mic' : isSpeaking ? 'volume-high' : 'mic-outline'}
                    size={20}
                    color={isListening ? C.red : isSpeaking ? C.primary : C.textSub}
                  />
                </TouchableOpacity>

                {/* Send button */}
                <TouchableOpacity
                  style={[st.sendBtn, canSend ? st.sendBtnOn : st.sendBtnOff]}
                  onPress={() => sendMessage()}
                  disabled={!canSend}
                  activeOpacity={0.82}
                >
                  <LinearGradient
                    colors={canSend ? [C.primary, C.primaryDark] : ['#E5E7EB', '#E5E7EB']}
                    style={st.sendBtnInner}
                  >
                    <Ionicons
                      name={loading ? 'ellipsis-horizontal' : 'arrow-up'}
                      size={17}
                      color={canSend ? '#fff' : C.textMuted}
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Hidden WebView for on-device speech recognition on mobile */}
      <WebViewBridge />

      </View>{/* end root container */}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    ...Platform.select({
      web: { height: '100dvh', display: 'flex', flexDirection: 'column' },
    }),
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 12,
    zIndex: 50,
    ...Platform.select({
      web: { position: 'sticky', top: 0, paddingVertical: 14 },
    }),
  },
  hBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  hLeft: { flexDirection: 'row', alignItems: 'center' },
  hCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  hAvatarWrap: { position: 'relative' },
  hAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' },
  hOnlineDot: { position: 'absolute', bottom: 1, right: 1, width: 9, height: 9, borderRadius: 5, backgroundColor: '#34D399', borderWidth: 1.5, borderColor: C.primaryDark },
  hTitle: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  hSubRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  hSubDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' },
  hSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  hRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cartBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  cartBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: '#F87171', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: C.primaryDark },
  cartBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  // Message list
  msgList: { flex: 1, backgroundColor: C.bg },
  msgListContent: { paddingTop: 16, paddingBottom: 8, paddingHorizontal: 0 },
  msgListWide: { paddingHorizontal: IS_WIDE ? Math.max((SW - 760) / 2, 0) : 0 },

  // Bubbles
  msgRow: { flexDirection: 'row', marginBottom: 12, paddingHorizontal: 14, alignItems: 'flex-end' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowBot: { justifyContent: 'flex-start' },
  botAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 2, flexShrink: 0 },
  userAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.blueSoft, justifyContent: 'center', alignItems: 'center', marginLeft: 8, marginBottom: 2, flexShrink: 0, borderWidth: 1.5, borderColor: C.border },
  bubble: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 11 },
  bubbleBot: {
    backgroundColor: C.surface, borderBottomLeftRadius: 5,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: C.borderLight,
  },
  bubbleUser: { backgroundColor: C.user, borderBottomRightRadius: 5 },
  msgImg: { width: 200, height: 150, borderRadius: 12, marginBottom: 8 },

  // Product cards
  cardsSection: { marginBottom: 10, marginTop: 2 },
  cardsSectionWide: { paddingHorizontal: IS_WIDE ? Math.max((SW - 760) / 2, 0) : 0 },
  cardsSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 50, marginBottom: 8 },
  cardsSectionLabel: { fontSize: 11, fontWeight: '700', color: C.primary, textTransform: 'uppercase', letterSpacing: 0.6 },
  cardsScroll: { paddingHorizontal: 50, gap: 10, paddingBottom: 4 },

  pCard: {
    backgroundColor: C.surface, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.09, shadowRadius: 10, elevation: 3,
    borderWidth: 1, borderColor: C.borderLight,
  },
  pImgWrap: { position: 'relative' },
  pImg: { width: '100%', height: 118 },
  pImgEmpty: { backgroundColor: C.borderLight, justifyContent: 'center', alignItems: 'center' },
  discBadge: { position: 'absolute', top: 8, left: 8, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  discBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  featBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#FEF3C7', borderRadius: 8, padding: 4 },
  pBody: { padding: 10 },
  pName: { fontSize: 12.5, fontWeight: '700', color: C.text, lineHeight: 17, marginBottom: 4 },
  pPrice: { fontSize: 14, fontWeight: '800', color: C.green, marginBottom: 1 },
  pOrigPrice: { fontSize: 11, color: C.textMuted, textDecorationLine: 'line-through', marginBottom: 3 },
  pShop: { fontSize: 10.5, color: C.textSub, marginBottom: 6 },
  pBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  pBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, gap: 3 },
  pBadgeDot: { width: 5, height: 5, borderRadius: 3 },
  pBadgeText: { fontSize: 10, fontWeight: '600' },
  pActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.borderLight, padding: 8, gap: 6 },
  pActBtn: { flex: 1 },
  pActInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 7, gap: 4 },
  pActText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Order cards
  ordersSection: { paddingHorizontal: 50, marginBottom: 10, gap: 8 },
  ordersSectionWide: { paddingHorizontal: IS_WIDE ? Math.max((SW - 760) / 2 + 50, 50) : 50 },
  oCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: C.borderLight,
  },
  oTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  oIdRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  oIconBox: { width: 26, height: 26, borderRadius: 8, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  oId: { fontSize: 13.5, fontWeight: '700', color: C.text },
  oStatusPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  oStatusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  oItemsText: { fontSize: 12.5, color: C.textSub, marginBottom: 10 },
  oBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  oTotalLabel: { fontSize: 10, color: C.textMuted, marginBottom: 2 },
  oTotal: { fontSize: 15, fontWeight: '800', color: C.green },
  oDate: { fontSize: 11, color: C.textMuted },
  oDelivery: { fontSize: 11, color: C.textSub, marginTop: 2 },
  oPayRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: C.borderLight },
  oPayText: { fontSize: 11.5, color: C.textMuted },

  // Suggestions
  sugWrap: { paddingLeft: 50, marginBottom: 10, marginTop: 4 },
  sugScroll: { gap: 8, paddingRight: 16 },
  sugChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.primaryXSoft, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: C.primarySoft,
  },
  sugChipText: { fontSize: 12.5, color: C.primary, fontWeight: '600' },

  // Welcome
  welcomeWrap: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16, alignItems: 'center' },
  welcomeHero: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 8 },
  welcomeTitle: { fontSize: 26, fontWeight: '800', color: C.text, marginBottom: 8, letterSpacing: -0.5 },
  welcomeSub: { fontSize: 14.5, color: C.textSub, textAlign: 'center', lineHeight: 22, marginBottom: 28, maxWidth: 340 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', width: '100%', maxWidth: IS_WIDE ? 640 : '100%' },
  quickCard: {
    width: IS_WIDE ? 140 : (SW - 60) / 2,
    backgroundColor: C.surface, borderRadius: 14, padding: 14,
    alignItems: 'flex-start',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: C.borderLight,
  },
  quickCardIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  quickCardLabel: { fontSize: 12.5, fontWeight: '700', color: C.text, lineHeight: 17 },

  // Input bar — card style matching the image
  inputBar: {
    backgroundColor: C.bg,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    ...Platform.select({
      web: {
        position: 'sticky',
        bottom: 0,
        boxShadow: '0 -4px 20px rgba(124,58,237,0.06)',
        // Shift up by keyboard height on mobile web via CSS variable set by visualViewport listener
        marginBottom: 'var(--kb-offset, 0px)',
      },
    }),
  },
  inputBarWide: { paddingHorizontal: 0 },
  inputCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    ...Platform.select({ web: { maxWidth: 760, alignSelf: 'center', width: '100%' } }),
  },
  inputCardWide: { maxWidth: 760, alignSelf: 'center', width: '100%' },
  input: {
    fontSize: 15,
    color: C.text,
    minHeight: 24,
    maxHeight: 120,
    paddingVertical: 0,
    marginBottom: 10,
    ...Platform.select({ web: { outlineStyle: 'none', resize: 'none', overflowY: 'auto' } }),
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolbarPlus: {
    width: 32, height: 32,
    justifyContent: 'center', alignItems: 'center',
    borderRadius: 16,
  },
  toolbarDivider: {
    width: 1, height: 20,
    backgroundColor: C.border,
    marginHorizontal: 6,
  },
  toolbarBtn: {
    width: 32, height: 32,
    justifyContent: 'center', alignItems: 'center',
    borderRadius: 16,
  },
  micBtnActive: {
    backgroundColor: C.redSoft,
  },

  // Bubble action bar
  bubbleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  bubbleActionsBot: { justifyContent: 'flex-start' },
  bubbleActionsUser: { justifyContent: 'flex-end' },
  bubbleActionBtn: {
    width: 26, height: 26,
    justifyContent: 'center', alignItems: 'center',
    borderRadius: 13,
    backgroundColor: C.borderLight,
  },
  sendBtn: { borderRadius: 18, overflow: 'hidden' },
  sendBtnOn: {},
  sendBtnOff: { opacity: 0.45 },
  sendBtnInner: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center' },

  // Live transcript bar
  transcriptBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.redSoft,
    borderRadius: 14, marginBottom: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    gap: 8,
    ...Platform.select({ web: { maxWidth: 760, alignSelf: 'center', width: '100%' } }),
  },
  transcriptDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.red,
  },
  transcriptText: {
    flex: 1, fontSize: 13.5, color: C.red, fontStyle: 'italic',
  },
  transcriptStop: {
    padding: 2,
  },

  // Sidebar
  sidebarOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 100,
    ...Platform.select({
      web: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' },
    }),
  },
  sidebar: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    width: 280, height: '100%',
    backgroundColor: C.surface,
    zIndex: 101, flexDirection: 'column',
    shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 20,
    ...Platform.select({
      web: { position: 'fixed', top: 0, left: 0, height: '100vh', overflowY: 'auto' },
    }),
  },
  sidebarHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16, paddingTop: 48,
    width: '100%', minHeight: 90,
  },
  sidebarHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sidebarTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  newChatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 12, padding: 11, borderRadius: 12,
    backgroundColor: C.primary,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  newChatBtnIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  newChatBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Nav links
  sidebarNav: { paddingHorizontal: 8, paddingBottom: 4 },
  sidebarNavItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 10, paddingVertical: 11, borderRadius: 10,
  },
  sidebarNavLabel: { fontSize: 14, color: C.textSub, fontWeight: '500' },
  sidebarDivider: { height: 1, backgroundColor: C.borderLight, marginHorizontal: 12, marginVertical: 4 },

  // History
  sidebarHistoryHeader: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  sidebarSectionLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  sidebarSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 12, marginBottom: 6,
    backgroundColor: C.bg, borderRadius: 10, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  sidebarSearchInput: { flex: 1, fontSize: 13, color: C.text, padding: 0, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  sidebarEmpty: { fontSize: 13, color: C.textMuted, textAlign: 'center', padding: 20 },
  historyItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, marginHorizontal: 6, marginBottom: 2,
  },
  historyItemActive: { backgroundColor: C.primaryXSoft },
  historyTitle: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 2 },
  historyDate: { fontSize: 11, color: C.textMuted },
  historyActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyActionBtn: { width: 26, height: 26, justifyContent: 'center', alignItems: 'center', borderRadius: 13 },
  historyEditRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyEditInput: {
    flex: 1, fontSize: 13, color: C.text, borderBottomWidth: 1.5, borderBottomColor: C.primary,
    paddingVertical: 2, ...Platform.select({ web: { outlineStyle: 'none' } }),
  },

  // Profile footer
  sidebarProfile: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderTopWidth: 1, borderTopColor: C.borderLight,
    backgroundColor: C.surface,
  },
  sidebarProfileImg: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: C.primarySoft },
  sidebarProfileIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  sidebarProfileName: { fontSize: 13.5, fontWeight: '700', color: C.text },
  sidebarProfileEmail: { fontSize: 11.5, color: C.textMuted },

  // Expandable sections
  expandSection: {
    marginHorizontal: 50, marginBottom: 10, marginTop: 4,
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
  },
  expandHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  expandHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expandIconBox: {
    width: 24, height: 24, borderRadius: 8,
    backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center',
  },
  expandHeaderText: { fontSize: 12.5, fontWeight: '700', color: C.text },
  expandChevronWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expandTapHint: { fontSize: 11, color: C.textMuted },
});
