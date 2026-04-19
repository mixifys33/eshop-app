import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import aiService from '../services/aiService';
import CartWishlistService from '../services/cartWishlistService';
import Markdown from 'react-native-markdown-display';

const { height } = Dimensions.get('window');

// Markdown renderer for AI responses using react-native-markdown-display
const MarkdownText = ({ text, isError }) => {
  if (!text) return null;
  const baseColor = isError ? '#c0392b' : '#2c2c2c';
  const mdStyles = {
    body: { color: baseColor, fontSize: 14, lineHeight: 21 },
    heading1: { color: baseColor, fontSize: 16, fontWeight: '800', marginTop: 8, marginBottom: 3, lineHeight: 24 },
    heading2: { color: baseColor, fontSize: 15, fontWeight: '700', marginTop: 6, marginBottom: 2, lineHeight: 22 },
    heading3: { color: baseColor, fontSize: 14, fontWeight: '700', marginTop: 4, marginBottom: 2, lineHeight: 20 },
    strong: { fontWeight: '700', color: baseColor },
    em: { fontStyle: 'italic', color: baseColor },
    code_inline: {
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      backgroundColor: '#f0e6f6',
      color: '#7b1fa2',
      fontSize: 13,
      borderRadius: 3,
      paddingHorizontal: 4,
    },
    code_block: {
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      backgroundColor: '#f9f0ff',
      color: '#7b1fa2',
      fontSize: 13,
      borderRadius: 8,
      padding: 10,
      marginVertical: 6,
    },
    fence: {
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      backgroundColor: '#f9f0ff',
      color: '#7b1fa2',
      fontSize: 13,
      borderRadius: 8,
      padding: 10,
      marginVertical: 6,
    },
    bullet_list: { marginVertical: 4 },
    ordered_list: { marginVertical: 4 },
    list_item: { marginVertical: 2 },
    bullet_list_icon: { color: '#9b59b6', marginRight: 6 },
    ordered_list_icon: { color: '#9b59b6', marginRight: 6 },
    hr: { backgroundColor: '#e8d5f5', marginVertical: 8 },
    blockquote: {
      backgroundColor: '#f9f0ff',
      borderLeftColor: '#9b59b6',
      borderLeftWidth: 3,
      paddingLeft: 10,
      marginVertical: 4,
    },
    link: { color: '#9b59b6', textDecorationLine: 'underline' },
    paragraph: { marginVertical: 2 },
  };
  return <Markdown style={mdStyles}>{text}</Markdown>;
};

const ProductAIChat = ({ visible, onClose, product, messages, setMessages, suggestions, setSuggestions, chatHistories, setChatHistories, navigation }) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [inputHeight, setInputHeight] = useState(40); // auto-resize
  const flatListRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const historyAnim = useRef(new Animated.Value(800)).current;
  const inputRef = useRef(null);

  const getWelcomeMessage = () => ({
    id: 'welcome',
    text: `Hi! I'm your AI shopping assistant. I know all about the **${product?.name}**. Ask me anything — specs, value, compatibility, or whether it's right for you.`,
    isBot: true,
    timestamp: new Date(),
  });

  // Animate in/out — only seed welcome message if chat is empty
  useEffect(() => {
    if (visible) {
      if (messages.length === 0) {
        setMessages([getWelcomeMessage()]);
        setSuggestions(aiService.getSuggestions(product));
      }
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      setShowHistory(false);
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Animate history panel
  useEffect(() => {
    Animated.timing(historyAnim, {
      toValue: showHistory ? 0 : 800,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [showHistory]);

  // Save current chat to history, then start fresh
  const startNewChat = () => {
    const hasRealMessages = messages.some(m => !m.isBot || m.id !== 'welcome');
    if (hasRealMessages) {
      const firstUserMsg = messages.find(m => !m.isBot);
      const preview = firstUserMsg?.text?.slice(0, 60) || 'Chat session';
      setChatHistories(prev => [
        {
          id: `history-${Date.now()}`,
          preview,
          timestamp: new Date(),
          messages: [...messages],
        },
        ...prev,
      ]);
    }
    setMessages([getWelcomeMessage()]);
    setSuggestions(aiService.getSuggestions(product));
    setInputText('');
    setShowHistory(false);
  };

  // Restore a past chat session
  const restoreChat = (session) => {
    // Save current chat first if it has content
    const hasRealMessages = messages.some(m => !m.isBot || m.id !== 'welcome');
    if (hasRealMessages) {
      const firstUserMsg = messages.find(m => !m.isBot);
      const preview = firstUserMsg?.text?.slice(0, 60) || 'Chat session';
      setChatHistories(prev => {
        const alreadySaved = prev.some(h => h.id === session.id);
        const updated = alreadySaved ? prev : [
          { id: `history-${Date.now()}`, preview, timestamp: new Date(), messages: [...messages] },
          ...prev,
        ];
        return updated.filter(h => h.id !== session.id);
      });
    } else {
      setChatHistories(prev => prev.filter(h => h.id !== session.id));
    }
    setMessages(session.messages);
    setSuggestions([]);
    setShowHistory(false);
  };

  // Delete a history entry
  const deleteHistory = (id) => {
    setChatHistories(prev => prev.filter(h => h.id !== id));
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const sendMessage = async (text) => {
    const trimmed = (text || inputText).trim();
    if (!trimmed || isTyping) return;

    setInputText('');
    setInputHeight(40); // reset to single line
    inputRef.current?.blur(); // dismiss keyboard on mobile
    setSuggestions([]);

    const userMsg = {
      id: `user-${Date.now()}`,
      text: trimmed,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    scrollToBottom();

    try {
      const allMessages = [...messages, userMsg];
      const { reply, relatedProducts } = await aiService.sendMessage(allMessages, product);

      const botMsg = {
        id: `bot-${Date.now()}`,
        text: reply,
        isBot: true,
        timestamp: new Date(),
        relatedProducts: relatedProducts?.length > 0 ? relatedProducts : null,
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          text: "Sorry, I couldn't connect right now. Please try again.",
          isBot: true,
          isError: true,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
      scrollToBottom();
    }
  };

  const renderMessage = ({ item }) => {
    if (item.isBot) {
      return (
        <View style={styles.botMessageWrapper}>
          <View style={styles.botRow}>
            <View style={styles.botAvatar}>
              <Ionicons name="sparkles" size={14} color="white" />
            </View>
            <View style={[styles.bubble, styles.botBubble, item.isError && styles.errorBubble]}>
              <MarkdownText text={item.text} isError={item.isError} />
            </View>
          </View>
          {item.relatedProducts && item.relatedProducts.length > 0 && (
            <View style={styles.productCardsSection}>
              <Text style={styles.productCardsSectionTitle}>Products from our store</Text>
              <FlatList
                data={item.relatedProducts}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={p => String(p._id)}
                contentContainerStyle={styles.productCardsList}
                renderItem={({ item: p }) => (
                  <ProductCard
                    p={p}
                    navigation={navigation}
                    onClose={onClose}
                  />
                )}
              />
            </View>
          )}
        </View>
      );
    }
    return (
      <View style={styles.userRow}>
        <View style={[styles.bubble, styles.userBubble]}>
          <Text style={styles.userText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => (
    <View style={styles.botRow}>
      <View style={styles.botAvatar}>
        <Ionicons name="sparkles" size={14} color="white" />
      </View>
      <View style={[styles.bubble, styles.botBubble, styles.typingBubble]}>
        <View style={styles.typingDots}>
          <TypingDot delay={0} />
          <TypingDot delay={200} />
          <TypingDot delay={400} />
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.aiIconBadge}>
                <Ionicons name="sparkles" size={18} color="white" />
              </View>
              <View>
                <Text style={styles.headerTitle}>AI Assistant</Text>
                <Text style={styles.headerSub} numberOfLines={1}>
                  About: {product?.name}
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.newChatBtn} onPress={startNewChat}>
                <Ionicons name="add-circle-outline" size={18} color="#9b59b6" />
                <Text style={styles.newChatText}>New Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.historyBtn, showHistory && styles.historyBtnActive]}
                onPress={() => setShowHistory(v => !v)}
              >
                <Ionicons name="time-outline" size={20} color={showHistory ? '#9b59b6' : '#555'} />
                {chatHistories.length > 0 && (
                  <View style={styles.historyBadge}>
                    <Text style={styles.historyBadgeText}>{chatHistories.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={22} color="#555" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={isTyping ? renderTypingIndicator : null}
            onContentSizeChange={scrollToBottom}
          />

          {/* Suggestion chips */}
          {suggestions.length > 0 && (
            <View style={styles.chipsWrapper}>
              <FlatList
                data={suggestions}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, i) => `chip-${i}`}
                contentContainerStyle={styles.chips}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.chip}
                    onPress={() => sendMessage(item)}
                  >
                    <Text style={styles.chipText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* Input bar */}
          <View style={styles.inputBar}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { height: Math.min(Math.max(inputHeight, 40), 100) }]}
              placeholder="Ask anything about this product..."
              placeholderTextColor="#aaa"
              value={inputText}
              onChangeText={setInputText}
              onContentSizeChange={e => setInputHeight(e.nativeEvent.contentSize.height)}
              multiline
              maxLength={500}
              onSubmitEditing={() => sendMessage()}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || isTyping) && styles.sendBtnDisabled]}
              onPress={() => sendMessage()}
              disabled={!inputText.trim() || isTyping}
            >
              {isTyping ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={18} color="white" />
              )}
            </TouchableOpacity>
          </View>

          {/* History panel — slides up over the chat */}
          <Animated.View
            pointerEvents={showHistory ? 'auto' : 'none'}
            style={[styles.historyPanel, { transform: [{ translateY: historyAnim }] }]}
          >
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Past Conversations</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)}>
                <Ionicons name="chevron-down" size={22} color="#555" />
              </TouchableOpacity>
            </View>
            {chatHistories.length === 0 ? (
              <View style={styles.historyEmpty}>
                <Ionicons name="chatbubbles-outline" size={36} color="#ccc" />
                <Text style={styles.historyEmptyText}>No past chats yet</Text>
                <Text style={styles.historyEmptySubText}>Start a new chat and it'll be saved here when you click "New Chat"</Text>
              </View>
            ) : (
              <FlatList
                data={chatHistories}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingBottom: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.historyItem} onPress={() => restoreChat(item)}>
                    <View style={styles.historyItemIcon}>
                      <Ionicons name="chatbubble-ellipses-outline" size={18} color="#9b59b6" />
                    </View>
                    <View style={styles.historyItemContent}>
                      <Text style={styles.historyItemPreview} numberOfLines={2}>{item.preview}</Text>
                      <Text style={styles.historyItemTime}>
                        {new Date(item.timestamp).toLocaleDateString()} · {item.messages.length} messages
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.historyDeleteBtn}
                      onPress={() => deleteHistory(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={17} color="#e74c3c" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
              />
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

// Interactive product card for comparison results
const ProductCard = ({ p, navigation, onClose }) => {
  const [inWishlist, setInWishlist] = useState(false);
  const [inCart, setInCart] = useState(false);

  // Normalize to the same shape the rest of the app uses
  const normalizedProduct = {
    id: String(p._id),
    name: p.title,
    price: p.salePrice || p.regularPrice,
    originalPrice: p.regularPrice !== p.salePrice ? p.regularPrice : null,
    image: p.image || null,
    brand: p.brand || '',
    stock: p.stock,
    category: p.category,
    shopName: p.shopName,
  };

  useEffect(() => {
    const checkStatus = async () => {
      const wishlist = await CartWishlistService.getWishlist();
      setInWishlist(wishlist.some(w => w.id === normalizedProduct.id));
      const cart = await CartWishlistService.getCart();
      setInCart(cart.some(c => c.id === normalizedProduct.id));
    };
    checkStatus();
  }, []);

  const handleNavigate = () => {
    // Navigate first, then close — avoids modal unmounting before navigation
    navigation?.navigate('ProductDetails', { product: normalizedProduct });
    onClose();
  };

  const handleAddToCart = async () => {
    if (p.stock <= 0) return;
    const result = await CartWishlistService.addToCart(normalizedProduct, 1);
    if (result.success) {
      setInCart(true);
      CartWishlistService.showAddToCartAlert(normalizedProduct.name);
    }
  };

  const handleToggleWishlist = async () => {
    const result = await CartWishlistService.toggleWishlist(normalizedProduct);
    if (result.success) {
      setInWishlist(result.action === 'added');
      if (result.action === 'added') {
        CartWishlistService.showAddToWishlistAlert(normalizedProduct.name);
      } else {
        CartWishlistService.showRemoveFromWishlistAlert(normalizedProduct.name);
      }
    }
  };

  const price = p.salePrice
    ? `UGX ${Number(p.salePrice).toLocaleString()}`
    : `UGX ${Number(p.regularPrice).toLocaleString()}`;

  return (
    <TouchableOpacity style={styles.productCard} onPress={handleNavigate} activeOpacity={0.85}>
      <View>
        {p.image ? (
          <Image source={{ uri: p.image }} style={styles.productCardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.productCardImage, styles.productCardImagePlaceholder]}>
            <Ionicons name="image-outline" size={28} color="#ccc" />
          </View>
        )}
        <TouchableOpacity style={styles.wishlistIcon} onPress={handleToggleWishlist}>
          <Ionicons
            name={inWishlist ? 'heart' : 'heart-outline'}
            size={16}
            color={inWishlist ? '#e74c3c' : '#fff'}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.productCardInfo}>
        <Text style={styles.productCardName} numberOfLines={2}>{p.title}</Text>
        <Text style={styles.productCardPrice}>{price}</Text>
        <Text style={styles.productCardBrand} numberOfLines={1}>
          {p.brand || p.shopName}{p.verified ? ' ✓' : ''}
        </Text>
        <View style={styles.productCardBottom}>
          <View style={[styles.productCardStock, { backgroundColor: p.stock > 0 ? '#e8f5e9' : '#fdecea' }]}>
            <Text style={[styles.productCardStockText, { color: p.stock > 0 ? '#2e7d32' : '#c62828' }]}>
              {p.stock > 0 ? 'In Stock' : 'Out of Stock'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.cartIcon, inCart && styles.cartIconAdded, p.stock <= 0 && styles.cartIconDisabled]}
            onPress={handleAddToCart}
            disabled={p.stock <= 0}
          >
            <Ionicons
              name={inCart ? 'checkmark' : 'cart-outline'}
              size={15}
              color={p.stock <= 0 ? '#ccc' : inCart ? '#2e7d32' : '#9b59b6'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Animated typing dot
const TypingDot = ({ delay }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: -6, duration: 300, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(600),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.dot, { transform: [{ translateY: anim }] }]} />
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: height * 0.92,
    height: height * 0.82,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  keyboardView: {
    flex: 1,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  aiIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#9b59b6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerSub: {
    fontSize: 11,
    color: '#888',
    maxWidth: 220,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3e5f5',
    borderWidth: 1,
    borderColor: '#e1bee7',
  },
  newChatText: {
    fontSize: 12,
    color: '#9b59b6',
    fontWeight: '600',
  },
  historyBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  historyBtnActive: {
    backgroundColor: '#f3e5f5',
  },
  historyBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#9b59b6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyBadgeText: {
    fontSize: 9,
    color: 'white',
    fontWeight: '700',
  },
  historyPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '75%',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  historyEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
    paddingBottom: 40,
  },
  historyEmptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#aaa',
  },
  historyEmptySubText: {
    fontSize: 12,
    color: '#bbb',
    textAlign: 'center',
    lineHeight: 18,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    gap: 12,
  },
  historyItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3e5f5',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  historyItemContent: {
    flex: 1,
    gap: 3,
  },
  historyItemPreview: {
    fontSize: 13,
    color: '#2c2c2c',
    fontWeight: '500',
    lineHeight: 18,
  },
  historyItemTime: {
    fontSize: 11,
    color: '#aaa',
  },
  historyDeleteBtn: {
    padding: 4,
  },
  messageList: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  botRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    gap: 8,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#9b59b6',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  botBubble: {
    backgroundColor: '#f3e5f5',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: '#9b59b6',
    borderBottomRightRadius: 4,
  },
  errorBubble: {
    backgroundColor: '#fdecea',
  },
  botText: {
    fontSize: 14,
    color: '#2c2c2c',
    lineHeight: 20,
  },
  userText: {
    fontSize: 14,
    color: 'white',
    lineHeight: 20,
  },
  typingBubble: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    height: 16,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#9b59b6',
  },
  chipsWrapper: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingVertical: 8,
  },
  chips: {
    paddingHorizontal: 14,
    gap: 8,
  },
  chip: {
    backgroundColor: '#f3e5f5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#e1bee7',
  },
  chipText: {
    fontSize: 12,
    color: '#7b1fa2',
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#ebebeb',
    ...Platform.select({ web: { outlineStyle: 'none', resize: 'none' } }),
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#9b59b6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#ccc',
  },
  botMessageWrapper: {
    marginBottom: 12,
  },
  productCardsSection: {
    marginTop: 10,
    marginLeft: 36,
  },
  productCardsSectionTitle: {
    fontSize: 11,
    color: '#9b59b6',
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productCardsList: {
    gap: 10,
    paddingRight: 8,
  },
  productCard: {
    width: 140,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ede7f6',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#9b59b6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  productCardImage: {
    width: '100%',
    height: 100,
    backgroundColor: '#f9f4ff',
  },
  productCardImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productCardInfo: {
    padding: 8,
    gap: 3,
  },
  productCardName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 16,
  },
  productCardPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9b59b6',
  },
  productCardBrand: {
    fontSize: 11,
    color: '#888',
  },
  productCardStock: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  productCardStockText: {
    fontSize: 10,
    fontWeight: '600',
  },
  productCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  wishlistIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f3e5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1bee7',
  },
  cartIconAdded: {
    backgroundColor: '#e8f5e9',
    borderColor: '#a5d6a7',
  },
  cartIconDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#eee',
  },
});

export default ProductAIChat;
