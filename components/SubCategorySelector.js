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

const SubCategorySelector = ({ 
  subCategories = [],
  value, 
  onChange, 
  label = "Subcategory", 
  placeholder = "Select or enter subcategory",
  required = false,
  allowCustom = true,
  disabled = false
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customSubCategory, setCustomSubCategory] = useState('');

  const filteredSubCategories = subCategories.filter(subCategory =>
    subCategory.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSelect = (subCategory) => {
    onChange(subCategory);
    setModalVisible(false);
    setSearchText('');
    setShowCustomInput(false);
    setCustomSubCategory('');
  };

  const handleCustomSubmit = () => {
    if (!customSubCategory.trim()) {
      Alert.alert('Error', 'Please enter a subcategory name');
      return;
    }
    
    if (customSubCategory.trim().length < 2) {
      Alert.alert('Error', 'Subcategory name must be at least 2 characters');
      return;
    }

    const trimmedSubCategory = customSubCategory.trim();
    
    // Check if subcategory already exists (case insensitive)
    const existingSubCategory = subCategories.find(subCat => 
      subCat.toLowerCase() === trimmedSubCategory.toLowerCase()
    );
    
    if (existingSubCategory) {
      handleSelect(existingSubCategory);
      return;
    }

    // Add new custom subcategory
    handleSelect(trimmedSubCategory);
  };

  const renderSubCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.subCategoryItem,
        value === item && styles.selectedItem
      ]}
      onPress={() => handleSelect(item)}
    >
      <Text style={[
        styles.subCategoryText,
        value === item && styles.selectedText
      ]}>
        {item}
      </Text>
      {value === item && (
        <Ionicons name="checkmark" size={20} color="#3498db" />
      )}
    </TouchableOpacity>
  );

  if (disabled) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        <View style={[styles.selector, styles.disabledSelector]}>
          <Text style={styles.disabledText}>Select a category first</Text>
          <Ionicons name="chevron-down" size={20} color="#444" />
        </View>
      </View>
    );
  }

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
              <Text style={styles.modalTitle}>Select Subcategory</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setModalVisible(false);
                  setShowCustomInput(false);
                  setCustomSubCategory('');
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
                    placeholder="Search subcategories..."
                    placeholderTextColor="#666"
                    value={searchText}
                    onChangeText={setSearchText}
                  />
                </View>

                <FlatList
                  data={filteredSubCategories}
                  renderItem={renderSubCategoryItem}
                  keyExtractor={(item, index) => `${item}-${index}`}
                  style={styles.subCategoryList}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No subcategories found</Text>
                      {allowCustom && (
                        <Text style={styles.emptySubtext}>
                          Try searching or create a custom subcategory
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
                    <Text style={styles.customButtonText}>Create Custom Subcategory</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.customInputContainer}>
                <Text style={styles.customInputLabel}>Enter Custom Subcategory</Text>
                <TextInput
                  style={styles.customInput}
                  placeholder="e.g., Gaming Laptops, Running Shoes"
                  placeholderTextColor="#666"
                  value={customSubCategory}
                  onChangeText={setCustomSubCategory}
                  autoFocus={true}
                  maxLength={50}
                />
                
                <View style={styles.customInputButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowCustomInput(false);
                      setCustomSubCategory('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      !customSubCategory.trim() && styles.disabledButton
                    ]}
                    onPress={handleCustomSubmit}
                    disabled={!customSubCategory.trim()}
                  >
                    <Text style={styles.submitButtonText}>Add Subcategory</Text>
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
  disabledSelector: {
    backgroundColor: '#2a2a2a',
    borderColor: '#444',
  },
  selectorText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  placeholderText: {
    color: '#666',
  },
  disabledText: {
    color: '#444',
    fontSize: 16,
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
  subCategoryList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  subCategoryItem: {
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
  subCategoryText: {
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

export default SubCategorySelector;