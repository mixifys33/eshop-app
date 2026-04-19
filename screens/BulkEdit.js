import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Image,
  Modal,
  Alert,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import API_BASE from '../constants/api';

const { width } = Dimensions.get('window');

const BulkEdit = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  // Bulk action states
  const [currentAction, setCurrentAction] = useState(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionValue, setActionValue] = useState('');
  const [actionType, setActionType] = useState('set'); // 'set', 'increase', 'decrease'
  const [isPercentage, setIsPercentage] = useState(false);
  const [targetCategory, setTargetCategory] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { toast, showSuccess, showError, showWarning, showInfo, hideToast } = useToast();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, categoryFilter]);

  const fetchProducts = async () => {
    try {
      const sellerData = await AsyncStorage.getItem('currentSeller');
      if (!sellerData) {
        showError('Please log in to view products');
        navigation.navigate('SellerLogin');
        return;
      }

      const seller = JSON.parse(sellerData);
      const sellerId = seller._id || seller.id;

      const response = await fetch(`${API_BASE}/products/seller/${sellerId}?limit=1000`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      showError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE}/products/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (searchQuery.trim()) {
      filtered = filtered.filter(product =>
        product.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }

    setFilteredProducts(filtered);
  };
  // Toggle product selection
  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p._id)));
    }
    setSelectAll(!selectAll);
  };

  // Execute bulk action
  const executeBulkAction = async () => {
    if (selectedProducts.size === 0) {
      showError('Please select at least one product');
      return;
    }

    if (!currentAction) return;

    if (currentAction === 'delete' && !confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsProcessing(true);

    try {
      const productIds = Array.from(selectedProducts);
      let requestBody = {
        action: currentAction,
        productIds,
      };

      switch (currentAction) {
        case 'price':
          if (!actionValue || isNaN(parseFloat(actionValue))) {
            showError('Please enter a valid price value');
            return;
          }
          requestBody.value = parseFloat(actionValue);
          requestBody.actionType = actionType;
          requestBody.isPercentage = isPercentage;
          break;

        case 'stock':
          if (!actionValue || isNaN(parseInt(actionValue))) {
            showError('Please enter a valid stock value');
            return;
          }
          requestBody.value = parseInt(actionValue);
          requestBody.actionType = actionType;
          break;

        case 'category':
          if (!targetCategory) {
            showError('Please select a target category');
            return;
          }
          requestBody.value = targetCategory;
          break;

        case 'discount':
          if (!actionValue || isNaN(parseFloat(actionValue))) {
            showError('Please enter a valid discount value');
            return;
          }
          requestBody.value = parseFloat(actionValue);
          requestBody.isPercentage = isPercentage;
          break;
      }

      const response = await fetch(`${API_BASE}/products/bulk-edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Bulk action failed');
      }

      const result = await response.json();
      showSuccess(result.message || 'Bulk action completed successfully!');
      
      // Reset states and refresh products
      setSelectedProducts(new Set());
      setCurrentAction(null);
      setActionValue('');
      setConfirmDelete(false);
      setActionModalVisible(false);
      fetchProducts();

    } catch (error) {
      console.error('Bulk action error:', error);
      showError(error.message || 'Bulk action failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Export selected products
  const exportSelectedProducts = async () => {
    if (selectedProducts.size === 0) {
      showError('Please select products to export');
      return;
    }

    try {
      showInfo('Preparing export...');
      const response = await fetch(`${API_BASE}/products/bulk-export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productIds: Array.from(selectedProducts)
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      showSuccess('Products exported successfully!');
    } catch (error) {
      showError('Failed to export products');
    }
  };
  // Render action modal
  const renderActionModal = () => (
    <Modal
      visible={actionModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setActionModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {currentAction === 'price' && 'Update Price'}
              {currentAction === 'stock' && 'Update Stock'}
              {currentAction === 'category' && 'Move Category'}
              {currentAction === 'discount' && 'Apply Discount'}
              {currentAction === 'delete' && 'Delete Products'}
            </Text>
            <TouchableOpacity
              onPress={() => setActionModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              This action will affect {selectedProducts.size} selected products.
            </Text>

            {(currentAction === 'price' || currentAction === 'stock') && (
              <View style={styles.actionConfig}>
                <Text style={styles.configLabel}>Action Type:</Text>
                <View style={styles.actionTypeButtons}>
                  {['set', 'increase', 'decrease'].map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.actionTypeButton,
                        actionType === type && styles.actionTypeButtonActive
                      ]}
                      onPress={() => setActionType(type)}
                    >
                      <Text style={[
                        styles.actionTypeButtonText,
                        actionType === type && styles.actionTypeButtonTextActive
                      ]}>
                        {type === 'set' ? 'Set to' : type === 'increase' ? 'Increase by' : 'Decrease by'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.configLabel}>
                  {currentAction === 'price' ? 'Amount (UGX):' : 'Quantity:'}
                </Text>
                <TextInput
                  style={styles.configInput}
                  placeholder={currentAction === 'price' ? 'Enter amount' : 'Enter quantity'}
                  value={actionValue}
                  onChangeText={setActionValue}
                  keyboardType="numeric"
                />

                {currentAction === 'price' && (
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setIsPercentage(!isPercentage)}
                  >
                    <Ionicons
                      name={isPercentage ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={isPercentage ? '#3498db' : '#666'}
                    />
                    <Text style={styles.checkboxLabel}>Percentage (%)</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.previewText}>
                  Will {actionType === 'set' ? 'set' : actionType} {currentAction} 
                  {actionType !== 'set' ? ' by' : ' to'} {actionValue || 0}
                  {currentAction === 'price' && isPercentage ? '%' : 
                   currentAction === 'price' ? ' UGX' : ' units'}
                </Text>
              </View>
            )}

            {currentAction === 'category' && (
              <View style={styles.actionConfig}>
                <Text style={styles.configLabel}>Target Category:</Text>
                <View style={styles.categoryList}>
                  {categories.map(category => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryOption,
                        targetCategory === category && styles.categoryOptionSelected
                      ]}
                      onPress={() => setTargetCategory(category)}
                    >
                      <Text style={[
                        styles.categoryOptionText,
                        targetCategory === category && styles.categoryOptionTextSelected
                      ]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {currentAction === 'discount' && (
              <View style={styles.actionConfig}>
                <Text style={styles.configLabel}>Discount Amount:</Text>
                <TextInput
                  style={styles.configInput}
                  placeholder="Enter discount amount"
                  value={actionValue}
                  onChangeText={setActionValue}
                  keyboardType="numeric"
                />

                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setIsPercentage(!isPercentage)}
                >
                  <Ionicons
                    name={isPercentage ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={isPercentage ? '#3498db' : '#666'}
                  />
                  <Text style={styles.checkboxLabel}>Percentage (%)</Text>
                </TouchableOpacity>

                <Text style={styles.previewText}>
                  Will reduce sale price by {actionValue || 0}{isPercentage ? '%' : ' UGX'}
                </Text>
              </View>
            )}

            {currentAction === 'delete' && (
              <View style={styles.deleteWarning}>
                <Ionicons name="warning" size={48} color="#e74c3c" />
                <Text style={styles.deleteWarningTitle}>
                  Delete {selectedProducts.size} Products?
                </Text>
                <Text style={styles.deleteWarningText}>
                  This action cannot be undone. All selected products will be permanently removed.
                </Text>
                
                {!confirmDelete && (
                  <Text style={styles.deleteInstruction}>
                    Click "Confirm Delete" below to proceed.
                  </Text>
                )}
              </View>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setActionModalVisible(false);
                setConfirmDelete(false);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                currentAction === 'delete' ? styles.deleteButton : null
              ]}
              onPress={executeBulkAction}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Text style={styles.confirmButtonText}>
                    {currentAction === 'delete' && confirmDelete ? 'Confirm Delete' : 'Apply Changes'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  // Render product item
  const renderProductItem = ({ item }) => {
    const isSelected = selectedProducts.has(item._id);
    const imageUrl = item.images?.[0]?.url || item.images?.[0]?.uri;

    return (
      <TouchableOpacity
        style={[styles.productItem, isSelected && styles.productItemSelected]}
        onPress={() => toggleProductSelection(item._id)}
      >
        <View style={styles.productCheckbox}>
          <Ionicons
            name={isSelected ? 'checkbox' : 'square-outline'}
            size={20}
            color={isSelected ? '#3498db' : '#666'}
          />
        </View>

        <View style={styles.productImageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.productImage} />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="image-outline" size={20} color="#666" />
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.sku && (
            <Text style={styles.productSku}>SKU: {item.sku}</Text>
          )}
          <Text style={styles.productCategory}>{item.category}</Text>
          {item.subCategory && (
            <Text style={styles.productSubCategory}>{item.subCategory}</Text>
          )}
        </View>

        <View style={styles.productDetails}>
          <Text style={styles.productPrice}>
            UGX {(item.salePrice || 0).toLocaleString()}
          </Text>
          {item.regularPrice > item.salePrice && (
            <Text style={styles.productOriginalPrice}>
              UGX {item.regularPrice.toLocaleString()}
            </Text>
          )}
          <Text style={[
            styles.productStock,
            item.stock < 10 ? styles.lowStock : 
            item.stock < 50 ? styles.mediumStock : styles.highStock
          ]}>
            {item.stock} in stock
          </Text>
        </View>
      </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Bulk Edit Products</Text>
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
        <Text style={styles.headerTitle}>Bulk Edit Products</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchProducts}
        >
          <Ionicons name="refresh" size={24} color="#3498db" />
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Category:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterChip, !categoryFilter && styles.filterChipActive]}
              onPress={() => setCategoryFilter('')}
            >
              <Text style={[styles.filterChipText, !categoryFilter && styles.filterChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {categories.map(category => (
              <TouchableOpacity
                key={category}
                style={[styles.filterChip, categoryFilter === category && styles.filterChipActive]}
                onPress={() => setCategoryFilter(category)}
              >
                <Text style={[styles.filterChipText, categoryFilter === category && styles.filterChipTextActive]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.selectionInfo}>
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={toggleSelectAll}
          >
            <Ionicons
              name={selectAll ? 'checkbox' : 'square-outline'}
              size={20}
              color={selectAll ? '#3498db' : '#666'}
            />
            <Text style={styles.selectAllText}>Select All</Text>
          </TouchableOpacity>
          <Text style={styles.selectionCount}>
            {selectedProducts.size} of {filteredProducts.length} selected
          </Text>
        </View>
      </View>
      {/* Bulk Actions */}
      {selectedProducts.size > 0 && (
        <View style={styles.bulkActionsContainer}>
          <Text style={styles.bulkActionsTitle}>
            Bulk Actions for {selectedProducts.size} Products
          </Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionsScroll}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setCurrentAction('price');
                setActionModalVisible(true);
                setConfirmDelete(false);
              }}
            >
              <Ionicons name="pricetag-outline" size={18} color="#3498db" />
              <Text style={styles.actionButtonText}>Update Price</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setCurrentAction('stock');
                setActionModalVisible(true);
                setConfirmDelete(false);
              }}
            >
              <Ionicons name="cube-outline" size={18} color="#3498db" />
              <Text style={styles.actionButtonText}>Update Stock</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setCurrentAction('category');
                setActionModalVisible(true);
                setConfirmDelete(false);
              }}
            >
              <Ionicons name="folder-outline" size={18} color="#3498db" />
              <Text style={styles.actionButtonText}>Move Category</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setCurrentAction('discount');
                setActionModalVisible(true);
                setConfirmDelete(false);
              }}
            >
              <Ionicons name="percent-outline" size={18} color="#3498db" />
              <Text style={styles.actionButtonText}>Apply Discount</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteActionButton]}
              onPress={() => {
                setCurrentAction('delete');
                setActionModalVisible(true);
                setConfirmDelete(false);
              }}
            >
              <Ionicons name="trash-outline" size={18} color="#e74c3c" />
              <Text style={[styles.actionButtonText, styles.deleteActionButtonText]}>Delete</Text>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity
            style={styles.exportButton}
            onPress={exportSelectedProducts}
          >
            <Ionicons name="download-outline" size={18} color="#27ae60" />
            <Text style={styles.exportButtonText}>Export Selected</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={item => item._id}
        style={styles.productsList}
        contentContainerStyle={styles.productsListContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || categoryFilter ? 
                'Try adjusting your search or filter criteria' :
                'No products available for bulk editing'
              }
            </Text>
          </View>
        }
      />

      {/* Action Modal */}
      {renderActionModal()}

      {/* Toast Component */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onHide={hideToast}
      />
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
  refreshButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },

  // Loading
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

  // Search Section
  searchSection: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  filterChipActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  selectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  selectionCount: {
    fontSize: 14,
    color: '#666',
  },

  // Bulk Actions
  bulkActionsContainer: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#bbdefb',
  },
  bulkActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  actionsScroll: {
    marginBottom: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  deleteActionButton: {
    borderColor: '#ffcdd2',
    backgroundColor: '#ffebee',
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#3498db',
  },
  deleteActionButtonText: {
    color: '#e74c3c',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f5e8',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  exportButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#27ae60',
  },

  // Products List
  productsList: {
    flex: 1,
  },
  productsListContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  productItemSelected: {
    borderColor: '#3498db',
    backgroundColor: '#f0f8ff',
  },
  productCheckbox: {
    marginRight: 15,
  },
  productImageContainer: {
    marginRight: 15,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  productImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    marginRight: 15,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productSku: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 14,
    color: '#3498db',
    marginBottom: 2,
  },
  productSubCategory: {
    fontSize: 12,
    color: '#666',
  },
  productDetails: {
    alignItems: 'flex-end',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#27ae60',
    marginBottom: 2,
  },
  productOriginalPrice: {
    fontSize: 12,
    color: '#666',
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  productStock: {
    fontSize: 12,
    fontWeight: '500',
  },
  lowStock: {
    color: '#e74c3c',
  },
  mediumStock: {
    color: '#f39c12',
  },
  highStock: {
    color: '#27ae60',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalContent: {
    padding: 20,
    maxHeight: 400,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },

  // Action Config
  actionConfig: {
    marginBottom: 20,
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  actionTypeButtons: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 8,
  },
  actionTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    alignItems: 'center',
  },
  actionTypeButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  actionTypeButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  actionTypeButtonTextActive: {
    color: 'white',
  },
  configInput: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: 'white',
    marginBottom: 15,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  previewText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 6,
  },

  // Category List
  categoryList: {
    maxHeight: 200,
  },
  categoryOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  categoryOptionSelected: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#333',
  },
  categoryOptionTextSelected: {
    color: 'white',
    fontWeight: '600',
  },

  // Delete Warning
  deleteWarning: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  deleteWarningTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e74c3c',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  deleteWarningText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 15,
  },
  deleteInstruction: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: '#95a5a6',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: '#3498db',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BulkEdit;
