import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Demo component to show the business type dropdown
const BusinessTypeDemo = () => {
  const [selectedValue, setSelectedValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const businessTypes = [
    { value: '', label: 'Select Business Type', disabled: true },
    { value: 'electronics', label: '📱 Electronics & Technology' },
    { value: 'fashion', label: '👕 Fashion & Clothing' },
    { value: 'home-garden', label: '🏠 Home & Garden' },
    { value: 'sports', label: '⚽ Sports & Fitness' },
    { value: 'books', label: '📚 Books & Education' },
    { value: 'automotive', label: '🚗 Automotive & Parts' },
    { value: 'health-beauty', label: '💄 Health & Beauty' },
    { value: 'toys-games', label: '🎮 Toys & Games' },
    { value: 'food-beverages', label: '🍕 Food & Beverages' },
    { value: 'jewelry', label: '💎 Jewelry & Accessories' },
    { value: 'art-crafts', label: '🎨 Art & Crafts' },
    { value: 'services', label: '🔧 Services' },
    { value: 'other', label: '📦 Other' }
  ];

  const selectedType = businessTypes.find(type => type.value === selectedValue);
  const displayLabel = selectedType ? selectedType.label : 'Select Business Type';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Business Type Dropdown Demo</Text>
      <Text style={styles.subtitle}>Tap to see the new dropdown selector</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Business Type *</Text>
        
        <TouchableOpacity
          style={[styles.dropdownButton, isOpen && styles.dropdownButtonOpen]}
          onPress={() => setIsOpen(!isOpen)}
        >
          <Text style={[
            styles.dropdownButtonText,
            !selectedValue && styles.dropdownPlaceholder
          ]}>
            {displayLabel}
          </Text>
          <Ionicons 
            name={isOpen ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#666" 
          />
        </TouchableOpacity>

        {selectedValue ? (
          <Text style={styles.selectedInfo}>
            ✅ Selected: {selectedType.label}
          </Text>
        ) : (
          <Text style={styles.hint}>
            Please select your business category from the dropdown
          </Text>
        )}
      </View>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.dropdownModal}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderText}>Select Business Type</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.dropdownList} showsVerticalScrollIndicator={false}>
              {businessTypes.map((type, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dropdownItem,
                    type.disabled && styles.dropdownItemDisabled,
                    selectedValue === type.value && styles.dropdownItemSelected
                  ]}
                  onPress={() => {
                    if (!type.disabled) {
                      setSelectedValue(type.value);
                      setIsOpen(false);
                    }
                  }}
                  disabled={type.disabled}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    type.disabled && styles.dropdownItemTextDisabled,
                    selectedValue === type.value && styles.dropdownItemTextSelected
                  ]}>
                    {type.label}
                  </Text>
                  {selectedValue === type.value && (
                    <Ionicons name="checkmark" size={20} color="#3498db" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  formGroup: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownButtonOpen: {
    borderColor: '#3498db',
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#999',
  },
  selectedInfo: {
    marginTop: 8,
    fontSize: 14,
    color: '#27ae60',
    fontWeight: '500',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  dropdownHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dropdownList: {
    maxHeight: 400,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  dropdownItemDisabled: {
    backgroundColor: '#f8f9fa',
    opacity: 0.6,
  },
  dropdownItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dropdownItemTextDisabled: {
    color: '#999',
    fontWeight: 'bold',
  },
  dropdownItemTextSelected: {
    color: '#3498db',
    fontWeight: '600',
  },
});

export default BusinessTypeDemo;