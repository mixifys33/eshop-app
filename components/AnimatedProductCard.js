import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Animated, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QuantitySelector from './QuantitySelector';

const { width } = Dimensions.get('window');

// Gradient shimmer colors shown during transition
const SHIMMER_COLORS = ['#e8f4fd', '#fef9e7', '#eafaf1', '#fdf2f8', '#f0f3ff'];

// Auto-cycles through product images with a true crossfade (no white flash)
// intervalMs controls the switch speed (default 2800ms)
export const AutoImage = ({ images, style, intervalMs = 2800 }) => {
  const uris = React.useMemo(() => {
    const list = (images || [])
      .map(img => img?.url || img?.uri || (typeof img === 'string' ? img : null))
      .filter(Boolean);
    return list.length > 0
      ? list
      : ['https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400'];
  }, [JSON.stringify(images)]);

  const [current, setCurrent] = useState(0);
  const [next, setNext] = useState(1 % uris.length);
  const [shimmerIdx, setShimmerIdx] = useState(0);
  const nextOpacity = useRef(new Animated.Value(0)).current;
  const shimmerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (uris.length <= 1) return;

    const interval = setInterval(() => {
      const nextIdx = (current + 1) % uris.length;
      setNext(nextIdx);
      setShimmerIdx(s => (s + 1) % SHIMMER_COLORS.length);

      // Flash a soft gradient shimmer then crossfade to next image
      Animated.sequence([
        // Shimmer in
        Animated.timing(shimmerOpacity, { toValue: 0.55, duration: 220, useNativeDriver: true }),
        // Shimmer out + next image fades in simultaneously
        Animated.parallel([
          Animated.timing(shimmerOpacity, { toValue: 0, duration: 320, useNativeDriver: true }),
          Animated.timing(nextOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
        ]),
      ]).start(() => {
        setCurrent(nextIdx);
        nextOpacity.setValue(0);
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [uris.length, intervalMs, current]);

  return (
    <View style={[style, { overflow: 'hidden' }]}>
      {/* Base (current) image */}
      <Image
        source={{ uri: uris[current] }}
        style={[StyleSheet.absoluteFill, { resizeMode: 'cover' }]}
      />
      {/* Next image fades in on top */}
      <Animated.Image
        source={{ uri: uris[next] }}
        style={[StyleSheet.absoluteFill, { resizeMode: 'cover', opacity: nextOpacity }]}
      />
      {/* Attractive shimmer overlay during transition */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: SHIMMER_COLORS[shimmerIdx], opacity: shimmerOpacity },
        ]}
      />
    </View>
  );
};

// ─── Shared: 3-tier price block ───────────────────────────────────────────
const PriceBlock = ({ item, priceStyle, origStyle, small = false }) => (
  <View style={{ flexDirection: 'column', gap: 1 }}>
    {/* Regular price — crossed out if higher than sale */}
    {item.regularPrice ? (
      <Text style={[origStyle || s.origPrice, { fontSize: small ? 9 : 11 }]}>
        UGX {item.regularPrice?.toLocaleString()}
      </Text>
    ) : null}
    {/* Sale price — crossed out only when campaign active */}
    {item.hasCampaign && item.salePrice && item.salePrice !== item.regularPrice ? (
      <Text style={[origStyle || s.origPrice, { fontSize: small ? 9 : 11, color: '#f39c12' }]}>
        UGX {item.salePrice?.toLocaleString()}
      </Text>
    ) : null}
    {/* Final price */}
    <Text style={[priceStyle || s.price, item.hasCampaign && { color: item.campaignBannerColor || '#e74c3c' }]}>
      UGX {item.price?.toLocaleString()}
    </Text>
    {/* Campaign badge */}
    {item.hasCampaign && item.discount ? (
      <View style={[s.campBadge, { backgroundColor: item.campaignBannerColor || '#e74c3c' }]}>
        <Ionicons name="pricetag" size={8} color="#fff" />
        <Text style={s.campBadgeText}>{item.discount}</Text>
      </View>
    ) : null}
  </View>
);

// ─── Shared: discount/campaign overlay badge on image ─────────────────────
const DiscBadge = ({ item, style, textStyle }) => {
  if (!item.discount) return null;
  const bg = item.hasCampaign ? (item.campaignBannerColor || '#e74c3c') : '#e74c3c';
  return (
    <View style={[style || s.discBadge, { backgroundColor: bg }]}>
      {item.hasCampaign && <Ionicons name="flash" size={8} color="#fff" />}
      <Text style={textStyle || s.discText}>{item.discount}</Text>
    </View>
  );
};

// ─── Layout 1: Standard 2-column grid (default) ───────────────────────────
export const CardGrid = ({ item, onPress, onWishlist, onAddToCart, onQtyChange, inWishlist, cartQty }) => (
  <TouchableOpacity style={s.gridCard} onPress={onPress} activeOpacity={0.88}>
    <View style={s.imageWrap}>
      <AutoImage images={item.images?.length > 0 ? item.images : [{ url: item.image }]} style={s.gridImage} />
      <DiscBadge item={item} />
      {item.isNew && !item.hasCampaign && <View style={s.newBadge}><Text style={s.newText}>NEW</Text></View>}
      <TouchableOpacity style={[s.heartBtn, inWishlist && s.heartBtnActive]} onPress={onWishlist}>
        <Ionicons name={inWishlist ? 'heart' : 'heart-outline'} size={17} color={inWishlist ? '#e74c3c' : '#bdc3c7'} />
      </TouchableOpacity>
      {item.images?.length > 1 && (
        <View style={s.imageDots}>
          {item.images.slice(0, 4).map((_, i) => <View key={i} style={s.dot} />)}
        </View>
      )}
    </View>
    <View style={s.cardBody}>
      <Text style={s.catLabel} numberOfLines={1}>{item.category}</Text>
      <Text style={s.cardName} numberOfLines={2}>{item.name}</Text>
      <View style={s.ratingRow}>
        <Ionicons name="star" size={11} color="#f39c12" />
        <Text style={s.ratingTxt}>{item.rating}</Text>
        <Text style={s.reviewTxt}>({item.reviews})</Text>
      </View>
      <PriceBlock item={item} />
      {item.stock === 0 ? (
        <View style={s.outOfStockBtn}><Text style={s.outOfStockTxt}>Out of Stock</Text></View>
      ) : cartQty > 0 ? (
        <QuantitySelector product={item} currentQuantity={cartQty} onQuantityChange={onQtyChange} compact style={s.qty} />
      ) : (
        <TouchableOpacity style={s.addBtn} onPress={onAddToCart}>
          <Ionicons name="cart-outline" size={13} color="#fff" />
          <Text style={s.addTxt}>Add to Cart</Text>
        </TouchableOpacity>
      )}
    </View>
  </TouchableOpacity>
);

// ─── Layout 2: Wide single-column list ────────────────────────────────────
export const CardList = ({ item, onPress, onWishlist, onAddToCart, onQtyChange, inWishlist, cartQty }) => (
  <TouchableOpacity style={s.listCard} onPress={onPress} activeOpacity={0.88}>
    <View style={s.listImageWrap}>
      <AutoImage images={item.images?.length > 0 ? item.images : [{ url: item.image }]} style={s.listImage} />
      <DiscBadge item={item} style={s.discBadgeSmall} textStyle={s.discTextSmall} />
    </View>
    <View style={s.listBody}>
      <Text style={s.catLabel}>{item.category}{item.subCategory ? ` › ${item.subCategory}` : ''}</Text>
      <Text style={s.listName} numberOfLines={2}>{item.name}</Text>
      {item.brand ? <Text style={s.brandTxt}>{item.brand}</Text> : null}
      <View style={s.ratingRow}>
        <Ionicons name="star" size={11} color="#f39c12" />
        <Text style={s.ratingTxt}>{item.rating}</Text>
        <Text style={s.reviewTxt}>({item.reviews})</Text>
        {item.seller?.verified && <Ionicons name="checkmark-circle" size={12} color="#3498db" style={{ marginLeft: 6 }} />}
      </View>
      <PriceBlock item={item} small />
      {item.cashOnDelivery === 'Yes' && <Text style={s.codTxt}>Cash on Delivery</Text>}
    </View>
    <View style={s.listActions}>
      <TouchableOpacity onPress={onWishlist}>
        <Ionicons name={inWishlist ? 'heart' : 'heart-outline'} size={20} color={inWishlist ? '#e74c3c' : '#bdc3c7'} />
      </TouchableOpacity>
      {item.stock === 0 ? (
        <View style={[s.addBtn, s.disabledBtn, { marginTop: 8 }]}><Text style={s.addTxt}>Out of Stock</Text></View>
      ) : cartQty > 0 ? (
        <QuantitySelector product={item} currentQuantity={cartQty} onQuantityChange={onQtyChange} compact style={{ marginTop: 8 }} />
      ) : (
        <TouchableOpacity style={[s.addBtn, { marginTop: 8 }]} onPress={onAddToCart}>
          <Ionicons name="cart-outline" size={13} color="#fff" />
          <Text style={s.addTxt}>Add</Text>
        </TouchableOpacity>
      )}
    </View>
  </TouchableOpacity>
);

// ─── Layout 3: Large hero cards (1 per row, tall image) ───────────────────
export const CardHero = ({ item, onPress, onWishlist, onAddToCart, onQtyChange, inWishlist, cartQty }) => (
  <TouchableOpacity style={s.heroCard} onPress={onPress} activeOpacity={0.88}>
    <View style={s.heroImageWrap}>
      <AutoImage images={item.images?.length > 0 ? item.images : [{ url: item.image }]} style={s.heroImage} />
      <View style={s.heroOverlay} />
      <DiscBadge item={item} />
      {item.isNew && !item.hasCampaign && <View style={s.newBadge}><Text style={s.newText}>NEW</Text></View>}
      <TouchableOpacity style={[s.heartBtn, inWishlist && s.heartBtnActive]} onPress={onWishlist}>
        <Ionicons name={inWishlist ? 'heart' : 'heart-outline'} size={18} color={inWishlist ? '#e74c3c' : '#bdc3c7'} />
      </TouchableOpacity>
      <View style={s.heroInfo}>
        <Text style={s.heroCat}>{item.category}</Text>
        <Text style={s.heroName} numberOfLines={2}>{item.name}</Text>
        <View style={s.heroBottom}>
          <PriceBlock item={item} priceStyle={s.heroPrice} origStyle={s.heroOrigPrice} />
          {item.stock === 0 ? (
            <View style={[s.addBtn, s.disabledBtn]}><Text style={s.addTxt}>Out of Stock</Text></View>
          ) : cartQty > 0 ? (
            <QuantitySelector product={item} currentQuantity={cartQty} onQuantityChange={onQtyChange} compact />
          ) : (
            <TouchableOpacity style={s.heroAddBtn} onPress={onAddToCart}>
              <Ionicons name="cart-outline" size={15} color="#fff" />
              <Text style={s.heroAddTxt}>Add to Cart</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

// ─── Layout 4: Compact 3-column mini grid ─────────────────────────────────
export const CardMini = ({ item, onPress, onWishlist, onAddToCart, onQtyChange, inWishlist, cartQty }) => {
  const miniW = (width - 56) / 3;
  return (
    <TouchableOpacity style={[s.miniCard, { width: miniW }]} onPress={onPress} activeOpacity={0.88}>
      <View style={s.miniImageWrap}>
        <AutoImage images={item.images?.length > 0 ? item.images : [{ url: item.image }]} style={[s.miniImage, { height: miniW }]} />
        <DiscBadge item={item} style={s.discBadgeTiny} textStyle={s.discTextTiny} />
        <TouchableOpacity style={s.miniHeart} onPress={onWishlist}>
          <Ionicons name={inWishlist ? 'heart' : 'heart-outline'} size={13} color={inWishlist ? '#e74c3c' : '#bdc3c7'} />
        </TouchableOpacity>
      </View>
      <View style={s.miniBody}>
        <Text style={s.miniName} numberOfLines={2}>{item.name}</Text>
        <PriceBlock item={item} priceStyle={s.miniPrice} small />
        {item.stock === 0 ? (
          <View style={[s.miniAddBtn, s.disabledBtn]}><Text style={s.miniAddTxt}>Out</Text></View>
        ) : cartQty > 0 ? (
          <QuantitySelector product={item} currentQuantity={cartQty} onQuantityChange={onQtyChange} compact style={s.miniQty} />
        ) : (
          <TouchableOpacity style={s.miniAddBtn} onPress={onAddToCart}>
            <Ionicons name="add" size={13} color="#fff" />
            <Text style={s.miniAddTxt}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─── Layout 5: Magazine / editorial (alternating big+small) ───────────────
export const CardMagazine = ({ item, onPress, onWishlist, onAddToCart, onQtyChange, inWishlist, cartQty, tall = false }) => (
  <TouchableOpacity style={[s.magCard, tall && s.magCardTall]} onPress={onPress} activeOpacity={0.88}>
    <View style={s.magImageWrap}>
      <AutoImage images={item.images?.length > 0 ? item.images : [{ url: item.image }]} style={[s.magImage, tall && s.magImageTall]} />
      <View style={s.magOverlay} />
      <DiscBadge item={item} />
      <TouchableOpacity style={[s.heartBtn, inWishlist && s.heartBtnActive]} onPress={onWishlist}>
        <Ionicons name={inWishlist ? 'heart' : 'heart-outline'} size={15} color={inWishlist ? '#e74c3c' : '#fff'} />
      </TouchableOpacity>
    </View>
    <View style={s.magBody}>
      <Text style={s.catLabel} numberOfLines={1}>{item.category}</Text>
      <Text style={s.magName} numberOfLines={2}>{item.name}</Text>
      <View style={s.ratingRow}>
        <Ionicons name="star" size={10} color="#f39c12" />
        <Text style={s.ratingTxt}>{item.rating}</Text>
      </View>
      <View style={s.magFooter}>
        <PriceBlock item={item} small />
        {item.stock === 0 ? null : cartQty > 0 ? (
          <QuantitySelector product={item} currentQuantity={cartQty} onQuantityChange={onQtyChange} compact />
        ) : (
          <TouchableOpacity style={s.magAddBtn} onPress={onAddToCart}>
            <Ionicons name="cart-outline" size={13} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  </TouchableOpacity>
);

const CARD_W = (width - 48) / 2;

const s = StyleSheet.create({
  // Grid (layout 1)
  gridCard: { width: CARD_W, backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.09, shadowRadius: 8, borderWidth: 1, borderColor: '#f1f2f6' },
  imageWrap: { position: 'relative' },
  gridImage: { width: '100%', height: 145 },
  imageDots: { position: 'absolute', bottom: 6, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)' },
  discBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#e74c3c', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, zIndex: 2, flexDirection: 'row', alignItems: 'center', gap: 3 },
  discText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  discBadgeSmall: { position: 'absolute', top: 6, left: 6, backgroundColor: '#e74c3c', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 2 },
  discTextSmall: { color: '#fff', fontSize: 9, fontWeight: '700' },
  discBadgeTiny: { position: 'absolute', top: 4, left: 4, backgroundColor: '#e74c3c', borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1, flexDirection: 'row', alignItems: 'center', gap: 2 },
  discTextTiny: { color: '#fff', fontSize: 8, fontWeight: '700' },
  newBadge: { position: 'absolute', top: 8, right: 40, backgroundColor: '#27ae60', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, zIndex: 2 },
  newText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  campBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 2 },
  campBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  heartBtn: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 18, padding: 6, zIndex: 3, elevation: 2 },
  heartBtnActive: { backgroundColor: '#fff0f0' },
  cardBody: { padding: 10 },
  catLabel: { fontSize: 9, color: '#3498db', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  cardName: { fontSize: 13, fontWeight: '600', color: '#1a1a2e', marginBottom: 5, lineHeight: 18 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  ratingTxt: { fontSize: 11, color: '#f39c12', fontWeight: '600' },
  reviewTxt: { fontSize: 10, color: '#aaa' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  price: { fontSize: 13, fontWeight: '700', color: '#27ae60' },
  origPrice: { fontSize: 11, color: '#bbb', textDecorationLine: 'line-through' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#3498db', borderRadius: 9, paddingVertical: 8 },
  addTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  disabledBtn: { backgroundColor: '#ccc' },
  outOfStockBtn: { backgroundColor: '#f8f8f8', borderRadius: 9, paddingVertical: 8, alignItems: 'center' },
  outOfStockTxt: { fontSize: 11, color: '#e74c3c', fontWeight: '600' },
  qty: { marginTop: 2 },
  codTxt: { fontSize: 10, color: '#27ae60', marginTop: 2 },
  brandTxt: { fontSize: 11, color: '#888', marginBottom: 3 },

  // List (layout 2)
  listCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
  listImageWrap: { position: 'relative' },
  listImage: { width: 115, height: 135 },
  listBody: { flex: 1, padding: 10, justifyContent: 'center' },
  listName: { fontSize: 14, fontWeight: '600', color: '#1a1a2e', marginBottom: 3, lineHeight: 19 },
  listActions: { padding: 10, justifyContent: 'center', alignItems: 'center', minWidth: 88 },

  // Hero (layout 3)
  heroCard: { marginBottom: 14, borderRadius: 18, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.13, shadowRadius: 10 },
  heroImageWrap: { position: 'relative' },
  heroImage: { width: '100%', height: 220 },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 130, backgroundColor: 'rgba(0,0,0,0.52)' },
  heroInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 },
  heroCat: { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  heroName: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 10, lineHeight: 22 },
  heroBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroPrice: { fontSize: 15, fontWeight: '800', color: '#fff' },
  heroOrigPrice: { fontSize: 11, color: 'rgba(255,255,255,0.6)', textDecorationLine: 'line-through' },
  heroAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#3498db', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  heroAddTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Mini (layout 4)
  miniCard: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 12, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 5 },
  miniImageWrap: { position: 'relative' },
  miniImage: { width: '100%' },
  miniHeart: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 12, padding: 4 },
  miniBody: { padding: 7 },
  miniName: { fontSize: 11, fontWeight: '600', color: '#1a1a2e', marginBottom: 3, lineHeight: 15 },
  miniPrice: { fontSize: 11, fontWeight: '700', color: '#27ae60', marginBottom: 5 },
  miniAddBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: '#3498db', borderRadius: 7, paddingVertical: 5 },
  miniAddTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  miniQty: { transform: [{ scale: 0.85 }] },

  // Magazine (layout 5)
  magCard: { width: (width - 48) / 2, backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
  magCardTall: { width: width - 32 },
  magImageWrap: { position: 'relative' },
  magImage: { width: '100%', height: 130 },
  magImageTall: { height: 200 },
  magOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, backgroundColor: 'rgba(0,0,0,0.15)' },
  magBody: { padding: 9 },
  magName: { fontSize: 12, fontWeight: '600', color: '#1a1a2e', marginBottom: 4, lineHeight: 17 },
  magFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  magAddBtn: { backgroundColor: '#3498db', borderRadius: 8, padding: 7 },
});
