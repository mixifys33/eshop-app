import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

class CartWishlistService {
  // Cart Methods
  static async getCart() {
    try {
      const cartData = await AsyncStorage.getItem('cart');
      return cartData ? JSON.parse(cartData) : [];
    } catch (error) {
      console.error('Error getting cart:', error);
      return [];
    }
  }

  static async addToCart(product, quantity = 1) {
    try {
      console.log('=== CartWishlistService.addToCart START ===');
      console.log('Product:', product.id, product.name);
      console.log('Quantity to add:', quantity);
      
      const cart = await this.getCart();
      console.log('Current cart:', cart);
      
      const existingItem = cart.find(item => item.id === product.id);
      console.log('Existing item:', existingItem);
      
      if (existingItem) {
        existingItem.quantity += quantity;
        console.log(`Updated existing item quantity to: ${existingItem.quantity}`);
      } else {
        cart.push({ ...product, quantity });
        console.log(`Added new item with quantity: ${quantity}`);
      }
      
      await AsyncStorage.setItem('cart', JSON.stringify(cart));
      console.log('Cart saved to storage:', cart);
      console.log('=== CartWishlistService.addToCart END ===');
      
      return { success: true, cart };
    } catch (error) {
      console.error('Error adding to cart:', error);
      return { success: false, error };
    }
  }

  static async removeFromCart(productId) {
    try {
      const cart = await this.getCart();
      const updatedCart = cart.filter(item => item.id !== productId);
      await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));
      return { success: true, cart: updatedCart };
    } catch (error) {
      console.error('Error removing from cart:', error);
      return { success: false, error };
    }
  }

  static async updateCartQuantity(productId, quantity) {
    try {
      const cart = await this.getCart();
      const updatedCart = cart.map(item => {
        if (item.id === productId) {
          return { ...item, quantity };
        }
        return item;
      });
      
      await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));
      return { success: true, cart: updatedCart };
    } catch (error) {
      console.error('Error updating cart quantity:', error);
      return { success: false, error };
    }
  }

  static async clearCart() {
    try {
      await AsyncStorage.removeItem('cart');
      return { success: true };
    } catch (error) {
      console.error('Error clearing cart:', error);
      return { success: false, error };
    }
  }

  static async getCartCount() {
    try {
      const cart = await this.getCart();
      return cart.reduce((total, item) => total + item.quantity, 0);
    } catch (error) {
      console.error('Error getting cart count:', error);
      return 0;
    }
  }

  // Wishlist Methods
  static async getWishlist() {
    try {
      const wishlistData = await AsyncStorage.getItem('wishlist');
      return wishlistData ? JSON.parse(wishlistData) : [];
    } catch (error) {
      console.error('Error getting wishlist:', error);
      return [];
    }
  }

  static async addToWishlist(product) {
    try {
      const wishlist = await this.getWishlist();
      const existingItem = wishlist.find(item => item.id === product.id);
      
      if (existingItem) {
        return { success: false, message: 'Item already in wishlist' };
      }
      
      wishlist.push(product);
      await AsyncStorage.setItem('wishlist', JSON.stringify(wishlist));
      return { success: true, wishlist };
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      return { success: false, error };
    }
  }

  static async removeFromWishlist(productId) {
    try {
      const wishlist = await this.getWishlist();
      const updatedWishlist = wishlist.filter(item => item.id !== productId);
      await AsyncStorage.setItem('wishlist', JSON.stringify(updatedWishlist));
      return { success: true, wishlist: updatedWishlist };
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      return { success: false, error };
    }
  }

  static async toggleWishlist(product) {
    try {
      const wishlist = await this.getWishlist();
      const existingItem = wishlist.find(item => item.id === product.id);
      
      if (existingItem) {
        // Remove from wishlist
        const result = await this.removeFromWishlist(product.id);
        return { ...result, action: 'removed' };
      } else {
        // Add to wishlist
        const result = await this.addToWishlist(product);
        return { ...result, action: 'added' };
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      return { success: false, error };
    }
  }

  static async isInWishlist(productId) {
    try {
      const wishlist = await this.getWishlist();
      return wishlist.some(item => item.id === productId);
    } catch (error) {
      console.error('Error checking wishlist:', error);
      return false;
    }
  }

  static async getWishlistCount() {
    try {
      const wishlist = await this.getWishlist();
      return wishlist.length;
    } catch (error) {
      console.error('Error getting wishlist count:', error);
      return 0;
    }
  }

  static async clearWishlist() {
    try {
      await AsyncStorage.removeItem('wishlist');
      return { success: true };
    } catch (error) {
      console.error('Error clearing wishlist:', error);
      return { success: false, error };
    }
  }

  // Move between cart and wishlist
  static async moveToWishlist(productId) {
    try {
      const cart = await this.getCart();
      const product = cart.find(item => item.id === productId);
      
      if (!product) {
        return { success: false, message: 'Product not found in cart' };
      }
      
      // Add to wishlist (without quantity)
      const { id, quantity, ...productWithoutQuantity } = product;
      await this.addToWishlist({ id, ...productWithoutQuantity });
      
      // Remove from cart
      await this.removeFromCart(productId);
      
      return { success: true };
    } catch (error) {
      console.error('Error moving to wishlist:', error);
      return { success: false, error };
    }
  }

  static async moveToCart(productId, quantity = 1) {
    try {
      const wishlist = await this.getWishlist();
      const product = wishlist.find(item => item.id === productId);
      
      if (!product) {
        return { success: false, message: 'Product not found in wishlist' };
      }
      
      // Add to cart
      await this.addToCart(product, quantity);
      
      // Remove from wishlist
      await this.removeFromWishlist(productId);
      
      return { success: true };
    } catch (error) {
      console.error('Error moving to cart:', error);
      return { success: false, error };
    }
  }

  // Utility methods
  static showAddToCartAlert(productName) {
    Alert.alert(
      'Added to Cart! 🛒',
      `${productName} has been added to your cart`,
      [{ text: 'OK' }]
    );
  }

  static showAddToWishlistAlert(productName) {
    Alert.alert(
      'Added to Wishlist! ❤️',
      `${productName} has been added to your wishlist`,
      [{ text: 'OK' }]
    );
  }

  static showRemoveFromWishlistAlert(productName) {
    Alert.alert(
      'Removed from Wishlist',
      `${productName} has been removed from your wishlist`,
      [{ text: 'OK' }]
    );
  }
}

export default CartWishlistService;