import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'cached_home_products';
const CACHE_TIMESTAMP_KEY = 'cached_home_products_ts';
const CACHE_CATEGORIES_KEY = 'cached_home_categories';

export const saveProductsCache = async (products, categories) => {
  try {
    await AsyncStorage.multiSet([
      [CACHE_KEY, JSON.stringify(products)],
      [CACHE_CATEGORIES_KEY, JSON.stringify(categories)],
      [CACHE_TIMESTAMP_KEY, String(Date.now())],
    ]);
  } catch (e) {
    console.warn('Failed to save products cache:', e);
  }
};

export const loadProductsCache = async () => {
  try {
    const [[, products], [, categories], [, ts]] = await AsyncStorage.multiGet([
      CACHE_KEY,
      CACHE_CATEGORIES_KEY,
      CACHE_TIMESTAMP_KEY,
    ]);
    if (!products || !categories) return null;
    return {
      products: JSON.parse(products),
      categories: JSON.parse(categories),
      cachedAt: ts ? Number(ts) : 0,
    };
  } catch (e) {
    console.warn('Failed to load products cache:', e);
    return null;
  }
};

export const clearProductsCache = async () => {
  await AsyncStorage.multiRemove([CACHE_KEY, CACHE_CATEGORIES_KEY, CACHE_TIMESTAMP_KEY]);
};
