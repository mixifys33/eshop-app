import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const currencies = [
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'UGX' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'RWF' },
];

const CurrencySelector = ({ 
  value, 
  onChange, 
  label = "Currency", 
  placeholder = "Select currency",
  required = false 
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  const selectedCurrency = currencies.find(curr => curr.code === value);
  
  const filteredCurrencies = currencies.filter(currency =>
    currency.name.toLowerCase().includes(searchText.toLowerCase()) ||
    currency.code.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSelect = (currency) => {
    onChange(currency.code);
    setModalVisible(false);
    setSearchText('');
  };

  const renderCurrencyItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.currencyItem,
        value === item.code && styles.selectedItem
      ]}
      onPress={() => handleSelect(item)}
    >
      <View style={styles.currencyInfo}>
        <Text style={[
          styles.currencyCode,
          value === item.code && styles.selectedText
        ]}>
          {item.code}
        </Text>
        <Text style={[
          styles.currencyName,
          value === item.code && styles.selectedText
        ]}>
          {item.name}
        </Text>
      </View>
      <Text style={[
        styles.currencySymbol,
        value === item.code && styles.selectedText
      ]}>
        {item.symbol}
      </Text>
      {value === item.code && (
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
        <View style={styles.selectorContent}>
          {selectedCurrency ? (
            <View style={styles.selectedCurrency}>
              <Text style={styles.selectedCode}>{selectedCurrency.code}</Text>
              <Text style={styles.selectedName}>{selectedCurrency.name}</Text>
            </View>
          ) : (
            <Text style={styles.placeholder}>{placeholder}</Text>
          )}
        </View>
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
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search currencies..."
                placeholderTextColor="#666"
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>

            <FlatList
              data={filteredCurrencies}
              renderItem={renderCurrencyItem}
              keyExtractor={(item) => item.code}
              style={styles.currencyList}
              showsVerticalScrollIndicator={false}
            />
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
  selectorContent: {
    flex: 1,
  },
  selectedCurrency: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  selectedName: {
    fontSize: 14,
    color: '#ccc',
  },
  placeholder: {
    fontSize: 16,
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
  currencyList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 5,
  },
  selectedItem: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  currencyName: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 2,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginRight: 10,
  },
  selectedText: {
    color: '#3498db',
  },
});

export default CurrencySelector;