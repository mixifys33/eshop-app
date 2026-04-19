import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CategorySelector = ({ 
  categories = [],
  value, 
  onChange, 
  label = "Category", 
  placeholder = "Select or enter category",
  required = false,
  allowCustom = true
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  const filteredCategories = categories.filter(category =>
    category.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSelect = (category) => {
    onChange(category);
    setModalVisible(false);
    setSearchText('');
    setShowCustomInput(false);
    setCustomCategory('');
  };

  const handleCustomSubmit = () => {
    if (!customCategory.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }
    
    if (customCategory.trim().length < 2) {
      Alert.alert('Error', 'Category name must be at least 2 characters');
      return;
    }

    const trimmedCategory = customCategory.trim();
    
    // Check if category already exists (case insensitive)
    const existingCategory = categories.find(cat => 
      cat.toLowerCase() === trimmedCategory.toLowerCase()
    );
    
    if (existingCategory) {
      handleSelect(existingCategory);
      return;
    }

    // Add new custom category
    handleSelect(trimmedCategory);
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        value === item && styles.selectedItem
      ]}
      onPress={() => handleSelect(item)}
    >
      <Text style={[
        styles.categoryText,
        value === item && styles.selectedText
      ]}>
        {item}
      </Text>
      {value === item && (
        <Ionicons name="checkmark" size={20} color="#3498db" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[
          styles.selectorText,
          !value && styles.placeholderText
        ]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setModalVisible(false);
                  setShowCustomInput(false);
                  setCustomCategory('');
                  setSearchText('');
                }}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {!showCustomInput ? (
              <>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search categories..."
                    placeholderTextColor="#666"
                    value={searchText}
                    onChangeText={setSearchText}
                  />
                </View>

                <FlatList
                  data={filteredCategories}
                  renderItem={renderCategoryItem}
                  keyExtractor={(item, index) => `${item}-${index}`}
                  style={styles.categoryList}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No categories found</Text>
                      {allowCustom && (
                        <Text style={styles.emptySubtext}>
                          Try searching or create a custom category
                        </Text>
                      )}
                    </View>
                  }
                />

                {allowCustom && (
                  <TouchableOpacity
                    style={styles.customButton}
                    onPress={() => setShowCustomInput(true)}
                  >
                    <Ionicons name="add" size={20} color="#3498db" />
                    <Text style={styles.customButtonText}>Create Custom Category</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.customInputContainer}>
                <Text style={styles.customInputLabel}>Enter Custom Category</Text>
                <TextInput
                  style={styles.customInput}
                  placeholder="e.g., Pet Supplies, Art & Crafts"
                  placeholderTextColor="#666"
                  value={customCategory}
                  onChangeText={setCustomCategory}
                  autoFocus={true}
                  maxLength={50}
                />
                
                <View style={styles.customInputButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowCustomInput(false);
                      setCustomCategory('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      !customCategory.trim() && styles.disabledButton
                    ]}
                    onPress={handleCustomSubmit}
                    disabled={!customCategory.trim()}
                  >
                    <Text style={styles.submitButtonText}>Add Category</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  required: {
    color: '#e74c3c',
  },
  selector: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  placeholderText: {
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#2c2c2c',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    margin: 20,
    marginBottom: 10,
    borderRadius: 8,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingVertical: 12,
  },
  categoryList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 5,
  },
  selectedItem: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
  },
  categoryText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  selectedText: {
    color: '#3498db',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    margin: 20,
    marginTop: 10,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3498db',
    gap: 8,
  },
  customButtonText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '500',
  },
  customInputContainer: {
    padding: 20,
  },
  customInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  customInput: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
  },
  customInputButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#666',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#3498db',
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#555',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CategorySelector;