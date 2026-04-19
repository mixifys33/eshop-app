import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import API_BASE from '../constants/api';

const { width, height } = Dimensions.get('window');

const AllProducts = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedActions, setExpandedActions] = useState(null);
  
  // Image viewer modal state
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Delete confirmation modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { toast, showSuccess, showError, showWarning, showInfo, hideToast } = useToast();

  const fetchProducts = useCallback(async () => {
    try {
      const sellerData = await AsyncStorage.getItem('currentSeller');
      if (!sellerData) {
        showError('Please log in to view products');
        navigation.navigate('SellerLogin');
        return;
      }

      const seller = JSON.parse(sellerData);
      const sellerId = seller._id || seller.id;

      const response = await fetch(`${API_BASE}/products/seller/${sellerId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      setProducts(data.products || []);
      
      if (data.products?.length === 0) {
        showInfo('No products found. Create your first product!');
      }
      
    } catch (error) {
      console.error('Error fetching products:', error);
      showError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError, showInfo, navigation]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProductsMemo = useMemo(() => {
    if (!searchQuery.trim()) {
      return products;
    } else {
      return products.filter(product =>
        product.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  }, [products, searchQuery]);

  useEffect(() => {
    setFilteredProducts(filteredProductsMemo);
  }, [filteredProductsMemo]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, [fetchProducts]);

  const handleDeleteProduct = (product) => {
    setProductToDelete(product);
    setDeleteConfirmationText('');
    setDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalVisible(false);
    setProductToDelete(null);
    setDeleteConfirmationText('');
    setIsDeleting(false);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    // Check if the typed name matches exactly
    if (deleteConfirmationText.trim() !== productToDelete.title.trim()) {
      showError('Product name does not match. Please type the exact product name to confirm deletion.');
      return;
    }

    setIsDeleting(true);
    
    try {
      showInfo('Deleting product and cleaning up images...', 3000);
      
      // Step 1: Delete images from ImageKit first
      const imagesToDelete = productToDelete.images?.filter(img => 
        img.fileId || img.imagekitFileId
      ) || [];
      
      if (imagesToDelete.length > 0) {
        showInfo(`Deleting ${imagesToDelete.length} images from cloud storage...`, 2000);
        
        for (const image of imagesToDelete) {
          const fileIdToDelete = image.fileId || image.imagekitFileId;
          
          try {
            const deleteImageResponse = await fetch(`${API_BASE}/imagekit/delete/${fileIdToDelete}`, {
              method: 'DELETE'
            });
            
            if (deleteImageResponse.ok) {
              // Image deleted successfully from ImageKit
            } else {
              console.warn('Failed to delete image from ImageKit:', fileIdToDelete);
              // Continue with product deletion even if some images fail to delete
            }
          } catch (imageError) {
            console.warn('Error deleting image from ImageKit:', imageError);
            // Continue with product deletion even if image deletion fails
          }
        }
      }
      
      // Step 2: Delete product from database
      showInfo('Removing product from database...', 2000);
      const response = await fetch(`${API_BASE}/products/${productToDelete._id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete product from database');
      }

      const result = await response.json();
      
      showSuccess(`Product "${productToDelete.title}" has been completely deleted!`, 4000);
      
      // Refresh the products list
      fetchProducts();
      closeDeleteModal();
      
    } catch (error) {
      console.error('Error deleting product:', error);
      showError(`Failed to delete product: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleActions = useCallback((productId) => {
    setExpandedActions(expandedActions === productId ? null : productId);
  }, [expandedActions]);

  const openImageViewer = useCallback((product, imageIndex = 0) => {
    // Filter out images that don't have valid URLs
    const validImages = product.images?.filter(img => 
      img.url || img.uri || img.thumbnailUrl || (typeof img === 'string' && img.startsWith('http'))
    ) || [];
    
    if (validImages.length === 0) {
      showWarning('No images available for this product');
      return;
    }
    
    setSelectedProduct({
      ...product,
      images: validImages
    });
    setCurrentImageIndex(Math.min(imageIndex, validImages.length - 1));
    setImageViewerVisible(true);
  }, [showWarning]);

  const closeImageViewer = useCallback(() => {
    setImageViewerVisible(false);
    setSelectedProduct(null);
    setCurrentImageIndex(0);
  }, []);

  const navigateImage = useCallback((direction) => {
    if (!selectedProduct?.images) return;
    
    const totalImages = selectedProduct.images.length;
    if (direction === 'next') {
      setCurrentImageIndex((prev) => (prev + 1) % totalImages);
    } else {
      setCurrentImageIndex((prev) => (prev - 1 + totalImages) % totalImages);
    }
  }, [selectedProduct]);

  const ProductCard = React.memo(({ product }) => {
    // Memoize image URL calculation
    const imageData = useMemo(() => {
      const imageUrl = product.images?.[0]?.url || 
                       product.images?.[0]?.uri || 
                       product.images?.[0]?.thumbnailUrl ||
                       (product.images?.[0] && typeof product.images[0] === 'string' ? product.images[0] : null);
      
      return {
        imageUrl,
        hasValidImage: imageUrl && imageUrl.startsWith('http')
      };
    }, [product.images]);
    
    // Memoize currency calculation
    const currencyData = useMemo(() => {
      const getCurrencySymbol = (currency) => {
        switch(currency?.toUpperCase()) {
          case 'UGX': return 'UGX ';
          case 'USD': return '$';
          case 'EUR': return 'EUR ';
          case 'GBP': return 'GBP ';
          default: return currency ? `${currency} ` : 'UGX ';
        }
      };
      
      return {
        currencySymbol: getCurrencySymbol(product.currency),
        price: product.salePrice || product.sale_price || 0
      };
    }, [product.currency, product.salePrice, product.sale_price]);
    
    const isExpanded = expandedActions === product._id;

    return (
      <View style={[styles.productCard, product.isDeleted && styles.deletedCard]}>
        <View style={styles.cardContent}>
          {/* Product Image */}
          <TouchableOpacity 
            style={styles.imageContainer}
            onPress={() => openImageViewer(product, 0)}
            activeOpacity={0.7}
          >
            {imageData.hasValidImage ? (
              <Image
                source={{ uri: imageData.imageUrl }}
                style={styles.productImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="image-outline" size={24} color="#666" />
                <Text style={styles.placeholderText}>
                  {product.images?.length > 0 ? 'Image Unavailable' : 'No Image'}
                </Text>
              </View>
            )}
            
            {/* Image count badge */}
            {product.images?.length > 1 && (
              <View style={styles.imageCountBadge}>
                <Text style={styles.imageCountText}>
                  +{product.images.length - 1}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Product Info */}
          <View style={styles.productInfo}>
            <View style={styles.headerRow}>
              <Text style={styles.productTitle} numberOfLines={2}>
                {product.title}
              </Text>
              <TouchableOpacity
                onPress={() => toggleActions(product._id)}
                style={styles.moreButton}
              >
                <Ionicons name="ellipsis-vertical" size={18} color="#666" />
              </TouchableOpacity>
            </View>

            {product.isDeleted && (
              <View>
                <Text style={styles.deletedText}>{'\u26A0'} Scheduled for deletion</Text>
              </View>
            )}

            <View style={styles.detailsRow}>
              <Text style={styles.price}>
                {currencyData.currencySymbol}{currencyData.price.toLocaleString()}
              </Text>
              <Text style={[styles.stock, product.stock < 10 && styles.lowStock]}>
                {product.stock || 0} in stock
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.category}>{product.category || 'No Category'}</Text>
              <View style={styles.rating}>
                <Ionicons name="star" size={12} color="#ffd700" />
                <Text style={styles.ratingText}>
                  {product.ratings?.toFixed(1) || product.rating?.toFixed(1) || '5.0'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Expandable Actions */}
        {isExpanded && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={[styles.actionButton, styles.viewButton]}>
              <Ionicons name="eye-outline" size={16} color="#3498db" />
              <Text style={[styles.actionText, { color: '#3498db' }]}>View</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.editButton]}>
              <Ionicons name="pencil-outline" size={16} color="#f39c12" />
              <Text style={[styles.actionText, { color: '#f39c12' }]}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.analyticsButton]}>
              <Ionicons name="bar-chart-outline" size={16} color="#9b59b6" />
              <Text style={[styles.actionText, { color: '#9b59b6' }]}>Stats</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteProduct(product)}
            >
              <Ionicons name="trash-outline" size={16} color="#e74c3c" />
              <Text style={[styles.actionText, { color: '#e74c3c' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  });

  const ImageViewerModal = () => {
    if (!selectedProduct || !imageViewerVisible) return null;

    const currentImage = selectedProduct.images[currentImageIndex];
    const imageUrl = currentImage?.url || 
                     currentImage?.uri || 
                     currentImage?.thumbnailUrl ||
                     (typeof currentImage === 'string' ? currentImage : null);

    return (
      <Modal
        visible={imageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageViewer}
        statusBarTranslucent={true}
      >
        <View style={styles.imageViewerOverlay}>
          {/* Header */}
          <View style={styles.imageViewerHeader}>
            <View style={styles.imageViewerHeaderLeft}>
              <Text style={styles.imageViewerTitle} numberOfLines={1}>
                {selectedProduct.title}
              </Text>
              <Text style={styles.imageViewerSubtitle}>
                {currentImageIndex + 1} of {selectedProduct.images.length}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.imageViewerCloseButton}
              onPress={closeImageViewer}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Main Image Display */}
          <View style={styles.imageViewerContent}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.imageViewerImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.imageViewerPlaceholder}>
                <Ionicons name="image-outline" size={64} color="#666" />
                <Text style={styles.imageViewerPlaceholderText}>
                  Image not available
                </Text>
              </View>
            )}

            {/* Navigation Arrows */}
            {selectedProduct.images.length > 1 && (
              <>
                <TouchableOpacity
                  style={[styles.imageNavButton, styles.imageNavButtonLeft]}
                  onPress={() => navigateImage('prev')}
                >
                  <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.imageNavButton, styles.imageNavButtonRight]}
                  onPress={() => navigateImage('next')}
                >
                  <Ionicons name="chevron-forward" size={24} color="white" />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Image Thumbnails */}
          {selectedProduct.images.length > 1 && (
            <View style={styles.imageViewerThumbnails}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailsContainer}
              >
                {selectedProduct.images.map((image, index) => {
                  const thumbUrl = image?.thumbnailUrl || image?.url || image?.uri || 
                                   (typeof image === 'string' ? image : null);
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.thumbnailButton,
                        currentImageIndex === index && styles.thumbnailButtonActive
                      ]}
                      onPress={() => setCurrentImageIndex(index)}
                    >
                      {thumbUrl ? (
                        <Image
                          source={{ uri: thumbUrl }}
                          style={styles.thumbnailImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.thumbnailPlaceholder}>
                          <Ionicons name="image-outline" size={16} color="#666" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Image Info */}
          <View style={styles.imageViewerInfo}>
            <Text style={styles.imageInfoText}>
              {currentImage?.fileName || `Image ${currentImageIndex + 1}`}
            </Text>
            {currentImage?.uploaded && (
              <View style={styles.imageInfoBadge}>
                <Ionicons name="cloud-done" size={12} color="#27ae60" />
                <Text style={styles.imageInfoBadgeText}>Uploaded</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const DeleteConfirmationModal = () => {
    if (!productToDelete || !deleteModalVisible) return null;

    const isNameMatch = deleteConfirmationText.trim() === productToDelete.title.trim();
    const imageCount = productToDelete.images?.filter(img => img.fileId || img.imagekitFileId).length || 0;

    return (
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContainer}>
            {/* Header */}
            <View style={styles.deleteModalHeader}>
              <View style={styles.deleteWarningIcon}>
                <Ionicons name="warning" size={32} color="#e74c3c" />
              </View>
              <Text style={styles.deleteModalTitle}>Delete Product</Text>
              <Text style={styles.deleteModalSubtitle}>
                This action cannot be undone
              </Text>
            </View>

            {/* Product Info */}
            <View style={styles.deleteProductInfo}>
              <Text style={styles.deleteProductTitle} numberOfLines={2}>
                "{productToDelete.title}"
              </Text>
              <View style={styles.deleteProductMeta}>
                <Text style={styles.deleteProductMetaText}>
                  {productToDelete.images?.length || 0} images {'\u2022'} {productToDelete.stock || 0} in stock
                </Text>
                {imageCount > 0 && (
                  <View>
                    <Text style={styles.deleteImageWarning}>
                      {'\u26A0'} {imageCount} images will be deleted from cloud storage
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Confirmation Input */}
            <View style={styles.deleteConfirmationSection}>
              <Text style={styles.deleteConfirmationLabel}>
                To confirm deletion, type the product name exactly:
              </Text>
              <Text style={styles.deleteProductNameExample}>
                {productToDelete.title}
              </Text>
              <TextInput
                style={[
                  styles.deleteConfirmationInput,
                  isNameMatch && styles.deleteConfirmationInputValid,
                  deleteConfirmationText && !isNameMatch && styles.deleteConfirmationInputInvalid
                ]}
                placeholder="Type product name here..."
                placeholderTextColor="#999"
                value={deleteConfirmationText}
                onChangeText={setDeleteConfirmationText}
                editable={!isDeleting}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {deleteConfirmationText && !isNameMatch && (
                <View>
                  <Text style={styles.deleteConfirmationError}>
                    Product name does not match
                  </Text>
                </View>
              )}
              {isNameMatch && (
                <View>
                  <Text style={styles.deleteConfirmationSuccess}>
                    {'\u2713'} Product name matches
                  </Text>
                </View>
              )}
            </View>

            {/* Warning Messages */}
            <View style={styles.deleteWarningSection}>
              <Text style={styles.deleteWarningText}>
                This will permanently delete:
              </Text>
              <View style={styles.deleteWarningList}>
                <Text style={styles.deleteWarningItem}>{'\u2022'} Product information from database</Text>
                <Text style={styles.deleteWarningItem}>{'\u2022'} All product images from cloud storage</Text>
                <Text style={styles.deleteWarningItem}>{'\u2022'} Product from your shop listings</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={closeDeleteModal}
                disabled={isDeleting}
              >
                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.deleteConfirmButton,
                  (!isNameMatch || isDeleting) && styles.deleteConfirmButtonDisabled
                ]}
                onPress={confirmDeleteProduct}
                disabled={!isNameMatch || isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons name="trash" size={16} color="white" />
                    <Text style={styles.deleteConfirmButtonText}>Delete Forever</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('SellerDashboard')}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Products</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading Products...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('SellerDashboard')}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Products</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateProduct')}
        >
          <Ionicons name="add" size={24} color="#3498db" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Products Count */}
      {products.length > 0 && (
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            Showing {filteredProducts.length} of {products.length} products
          </Text>
          {products.some(p => !p.images?.[0]?.url && !p.images?.[0]?.uri) && (
            <View>
              <Text style={styles.imageWarningText}>
                {'\u26A0'} Some products may have missing images due to old data format
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Products List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            {searchQuery ? (
              <>
                <Ionicons name="search" size={48} color="#ccc" />
                <Text style={styles.emptyTitle}>No products found</Text>
                <Text style={styles.emptyText}>
                  No products match your search "{searchQuery}"
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="cube-outline" size={48} color="#ccc" />
                <Text style={styles.emptyTitle}>No products yet</Text>
                <Text style={styles.emptyText}>
                  Start by adding your first product to your shop
                </Text>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => navigation.navigate('CreateProduct')}
                >
                  <Text style={styles.createButtonText}>Create Your First Product</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <View style={styles.productsContainer}>
            {filteredProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Toast Component */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onHide={hideToast}
      />

      {/* Image Viewer Modal */}
      <ImageViewerModal />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  countContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  countText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  imageWarningText: {
    fontSize: 12,
    color: '#f39c12',
    fontStyle: 'italic',
  },
  scrollView: {
    flex: 1,
  },
  productsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    overflow: 'hidden',
  },
  deletedCard: {
    opacity: 0.6,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 15,
  },
  imageContainer: {
    marginRight: 15,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  imageCountBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  imageCountText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  productInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  moreButton: {
    padding: 5,
  },
  deletedText: {
    fontSize: 12,
    color: '#e74c3c',
    marginBottom: 5,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#27ae60',
  },
  stock: {
    fontSize: 14,
    color: '#666',
  },
  lowStock: {
    color: '#e74c3c',
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  viewButton: {
    backgroundColor: '#e3f2fd',
  },
  editButton: {
    backgroundColor: '#fff3e0',
  },
  analyticsButton: {
    backgroundColor: '#f3e5f5',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Image Viewer Modal Styles
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
  },
  imageViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50, // Account for status bar
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  imageViewerHeaderLeft: {
    flex: 1,
    marginRight: 15,
  },
  imageViewerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  imageViewerSubtitle: {
    color: '#ccc',
    fontSize: 14,
  },
  imageViewerCloseButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  imageViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
    maxHeight: height * 0.6,
  },
  imageViewerPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  imageViewerPlaceholderText: {
    color: '#666',
    fontSize: 16,
    marginTop: 10,
  },
  imageNavButton: {
    position: 'absolute',
    top: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -25,
  },
  imageNavButtonLeft: {
    left: 20,
  },
  imageNavButtonRight: {
    right: 20,
  },
  imageViewerThumbnails: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 15,
  },
  thumbnailsContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  thumbnailButton: {
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailButtonActive: {
    borderColor: '#3498db',
  },
  thumbnailImage: {
    width: 60,
    height: 60,
  },
  thumbnailPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  imageInfoText: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
  },
  imageInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 174, 96, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageInfoBadgeText: {
    color: '#27ae60',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },

  // Delete Confirmation Modal Styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deleteModalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  deleteModalHeader: {
    alignItems: 'center',
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  deleteWarningIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffebee',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  deleteModalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  deleteProductInfo: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  deleteProductTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  deleteProductMeta: {
    alignItems: 'center',
  },
  deleteProductMetaText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  deleteImageWarning: {
    fontSize: 12,
    color: '#f39c12',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  deleteConfirmationSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  deleteConfirmationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  deleteProductNameExample: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  deleteConfirmationInput: {
    borderWidth: 2,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: 'white',
  },
  deleteConfirmationInputValid: {
    borderColor: '#27ae60',
    backgroundColor: '#f8fff9',
  },
  deleteConfirmationInputInvalid: {
    borderColor: '#e74c3c',
    backgroundColor: '#fff8f8',
  },
  deleteConfirmationError: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 8,
  },
  deleteConfirmationSuccess: {
    fontSize: 12,
    color: '#27ae60',
    marginTop: 8,
    fontWeight: '500',
  },
  deleteWarningSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  deleteWarningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  deleteWarningList: {
    paddingLeft: 8,
  },
  deleteWarningItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  deleteModalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  deleteCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  deleteConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteConfirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  deleteConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default AllProducts;
