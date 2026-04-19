import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const QuantitySelector = ({ 
  product, 
  currentQuantity = 0, 
  onQuantityChange, 
  showRemoveButton = false,
  onRemove,
  style,
  compact = false,
  hideManualInput = false  // New prop to hide manual input
}) => {
  const [inputQuantity, setInputQuantity] = useState(currentQuantity.toString());
  const [showInput, setShowInput] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setInputQuantity(currentQuantity.toString());
  }, [currentQuantity]);

  const handleDecrease = () => {
    if (currentQuantity > 1) {
      onQuantityChange(currentQuantity - 1);
    } else if (currentQuantity === 1) {
      // If quantity is 1 and we decrease, remove from cart
      if (onRemove) {
        onRemove();
      } else {
        onQuantityChange(0);
      }
    }
  };

  const handleIncrease = () => {
    const maxStock = product?.stock || 999;
    if (currentQuantity < maxStock) {
      onQuantityChange(currentQuantity + 1);
    } else {
      Alert.alert(
        'Stock Limit',
        `Only ${maxStock} items available in stock.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleInputSubmit = () => {
    const newQuantity = parseInt(inputQuantity);
    const maxStock = product?.stock || 999;
    
    if (isNaN(newQuantity) || newQuantity < 1) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity (minimum 1).');
      setInputQuantity(currentQuantity.toString());
      setShowInput(false);
      setShowModal(false);
      return;
    }
    
    if (newQuantity > maxStock) {
      Alert.alert(
        'Stock Limit Exceeded',
        `Only ${maxStock} items available in stock. Setting quantity to ${maxStock}.`,
        [{ text: 'OK' }]
      );
      onQuantityChange(maxStock);
      setInputQuantity(maxStock.toString());
    } else {
      onQuantityChange(newQuantity);
    }
    
    setShowInput(false);
    setShowModal(false);
  };

  const handleInputCancel = () => {
    setInputQuantity(currentQuantity.toString());
    setShowInput(false);
    setShowModal(false);
  };

  const openQuantityModal = () => {
    setShowModal(true);
  };

  if (compact) {
    return (
      <>
        <View style={[styles.compactContainer, style]}>
          <TouchableOpacity 
            style={styles.compactButton}
            onPress={handleDecrease}
          >
            <Ionicons name="remove" size={14} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quantityDisplay}
            onPress={openQuantityModal}
          >
            <Text style={styles.quantityText}>{currentQuantity}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.compactButton,
              currentQuantity >= (product?.stock || 999) && styles.disabledButton
            ]}
            onPress={handleIncrease}
            disabled={currentQuantity >= (product?.stock || 999)}
          >
            <Ionicons 
              name="add" 
              size={14} 
              color={currentQuantity >= (product?.stock || 999) ? "#95a5a6" : "white"} 
            />
          </TouchableOpacity>
        </View>

        {/* Quantity Input Modal */}
        <Modal
          visible={showModal}
          transparent={true}
          animationType="fade"
          onRequestClose={handleInputCancel}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Enter Quantity</Text>
              <Text style={styles.modalSubtitle}>
                {product?.name} (Stock: {product?.stock || 'N/A'})
              </Text>
              
              <TextInput
                style={styles.modalInput}
                value={inputQuantity}
                onChangeText={setInputQuantity}
                keyboardType="numeric"
                placeholder="Enter quantity"
                selectTextOnFocus
                autoFocus
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.modalCancelButton}
                  onPress={handleInputCancel}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.modalConfirmButton}
                  onPress={handleInputSubmit}
                >
                  <Text style={styles.modalConfirmText}>Set Quantity</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <>
      <View style={[styles.container, style]}>
        {showRemoveButton && (
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={onRemove}
          >
            <Ionicons name="close" size={16} color="#e74c3c" />
          </TouchableOpacity>
        )}
        
        <View style={styles.quantityContainer}>
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={handleDecrease}
          >
            <Ionicons name="remove" size={16} color="#3498db" />
          </TouchableOpacity>
          
          {showInput ? (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.quantityInput}
                value={inputQuantity}
                onChangeText={setInputQuantity}
                keyboardType="numeric"
                selectTextOnFocus
                onSubmitEditing={handleInputSubmit}
                onBlur={handleInputCancel}
                autoFocus
              />
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.quantityDisplayButton}
              onPress={() => setShowInput(true)}
            >
              <Text style={styles.quantityText}>{currentQuantity}</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={handleIncrease}
            disabled={currentQuantity >= (product?.stock || 999)}
          >
            <Ionicons 
              name="add" 
              size={16} 
              color={currentQuantity >= (product?.stock || 999) ? "#bdc3c7" : "#3498db"} 
            />
          </TouchableOpacity>
        </View>
        
        {/* Manual Input Section - Only show if not hidden */}
        {!hideManualInput && (
          <View style={styles.manualInputSection}>
            <Text style={styles.inputLabel}>Enter quantity:</Text>
            <View style={styles.manualInputContainer}>
              <TextInput
                style={styles.manualInput}
                value={inputQuantity}
                onChangeText={setInputQuantity}
                keyboardType="numeric"
                placeholder="Qty"
                selectTextOnFocus
              />
              <TouchableOpacity 
                style={styles.setButton}
                onPress={handleInputSubmit}
              >
                <Text style={styles.setButtonText}>Set</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  
  // Compact version for product cards
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  compactButton: {
    backgroundColor: '#3498db',
    borderRadius: 6,
    padding: 6,
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Full version for cart screen
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  quantityButton: {
    padding: 8,
  },
  quantityDisplayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  quantityDisplay: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 40,
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 4,
    marginHorizontal: 4,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  
  // Input styles
  inputContainer: {
    paddingHorizontal: 4,
  },
  quantityInput: {
    backgroundColor: 'white',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 40,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#3498db',
  },
  
  // Manual input section
  manualInputSection: {
    alignItems: 'center',
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  manualInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manualInput: {
    backgroundColor: 'white',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 60,
    textAlign: 'center',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  setButton: {
    backgroundColor: '#3498db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  setButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Remove button
  removeButton: {
    padding: 4,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  
  // Disabled state
  disabledButton: {
    backgroundColor: '#95a5a6',
    opacity: 0.7,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: 'center',
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#95a5a6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalConfirmText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default QuantitySelector;