import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import API_BASE from '../constants/api';

const { width } = Dimensions.get('window');

const BulkUploadReviewMinimal = ({ navigation }) => {
  const [uploadData, setUploadData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [errors, setErrors] = useState([]);
  const { toast, showSuccess, showError, showWarning, showInfo, hideToast } = useToast();

  useEffect(() => {
    loadUploadData();
  }, []);

  const loadUploadData = async () => {
    try {
      console.log('Loading upload data from AsyncStorage...');
      const data = await AsyncStorage.getItem('bulkUploadData');
      if (data) {
        const parsedData = JSON.parse(data);
        setUploadData(parsedData);
        setTotalProducts(parsedData.parsedData.length);
        setTotalBatches(Math.ceil(parsedData.parsedData.length / 10));
        
        console.log('Upload data loaded:', {
          fileName: parsedData.fileName,
          totalProducts: parsedData.parsedData.length,
          mappings: parsedData.columnMappings.length
        });
      } else {
        showError('No upload data found');
        handleGoBack();
      }
    } catch (error) {
      console.error('Error loading upload data:', error);
      showError('Failed to load upload data');
      handleGoBack();
    }
  };

  const handleGoBack = () => {
    try {
      if (navigation && typeof navigation.goBack === 'function') {
        navigation.goBack();
      } else if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate('BulkUpload');
      } else {
        console.error('No valid navigation method found');
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const processUpload = async () => {
    if (!uploadData) return;

    setIsProcessing(true);
    setProcessedCount(0);
    setCurrentBatch(0);
    setErrors([]);

    try {
      // Get current seller from AsyncStorage
      const sellerData = await AsyncStorage.getItem('currentSeller');
      if (!sellerData) {
        showError('Please log in as a seller to import products');
        handleGoBack();
        return;
      }

      const seller = JSON.parse(sellerData);
      console.log('Current seller for bulk upload:', seller);

      const { parsedData, columnMappings } = uploadData;
      
      showInfo('Starting product import...');
      
      // Transform data according to mappings
      const transformedProducts = parsedData.map((row, index) => {
        const product = {};
        
        columnMappings.forEach(mapping => {
          if (mapping.productField && mapping.fileColumn) {
            product[mapping.productField] = row[mapping.fileColumn] || '';
          }
        });

        // Add default values with actual seller ID
        product.status = 'active';
        product.sellerId = seller.id; // Use actual seller ID from authentication
        
        return product;
      });

      console.log('Transformed products sample:', transformedProducts.slice(0, 2));

      // Process products in batches of 10
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < transformedProducts.length; i += batchSize) {
        batches.push(transformedProducts.slice(i, i + batchSize));
      }
      
      let successCount = 0;
      let failureCount = 0;
      const allErrors = [];
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        setCurrentBatch(i + 1);
        
        showInfo(`Processing batch ${i + 1} of ${batches.length}...`);
        
        try {
          const response = await fetch(`${API_BASE}/products/bulk-upload/process`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              products: batch,
              batchNumber: i + 1,
              totalBatches: batches.length,
              sellerId: seller.id // Include seller ID for authentication
            }),
          });

          if (!response.ok) {
            throw new Error(`Batch ${i + 1} failed: ${response.status}`);
          }

          const result = await response.json();
          successCount += result.results.success;
          failureCount += result.results.failed;
          
          if (result.results.errors && result.results.errors.length > 0) {
            allErrors.push(...result.results.errors);
          }
          
          setProcessedCount(successCount);
          
          console.log(`Batch ${i + 1}/${batches.length} completed:`, result.results);
          
        } catch (error) {
          console.error(`Error processing batch ${i + 1}:`, error);
          failureCount += batch.length;
          allErrors.push({
            batch: i + 1,
            error: error.message
          });
          showWarning(`Batch ${i + 1} failed: ${error.message}`);
        }
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setErrors(allErrors);

      // Clean up stored data
      await AsyncStorage.removeItem('bulkUploadData');
      
      // Show final results
      if (successCount > 0) {
        showSuccess(`Successfully imported ${successCount} products!`);
      }
      
      if (failureCount > 0) {
        showWarning(`${failureCount} products failed to import`);
      }
      
      // Don't auto-navigate - let user see results and navigate manually
      console.log('Import completed:', { successCount, failureCount, errors: allErrors.length });

    } catch (error) {
      console.error('Error processing upload:', error);
      showError('Failed to process upload: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getMappingSummary = () => {
    if (!uploadData) return [];
    
    return uploadData.columnMappings
      .filter(m => m.productField)
      .map(m => ({
        fileColumn: m.fileColumn,
        productField: m.productField,
        sampleValue: uploadData.parsedData[0]?.[m.fileColumn] || ''
      }));
  };

  const getSampleProducts = () => {
    if (!uploadData) return [];
    return uploadData.parsedData.slice(0, 3); // Show first 3 products
  };

  if (!uploadData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading upload data...</Text>
      </View>
    );
  }

  const mappingSummary = getMappingSummary();
  const sampleProducts = getSampleProducts();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          disabled={isProcessing}
        >
          <Ionicons name="arrow-back" size={24} color={isProcessing ? "#ccc" : "#333"} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review & Import</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* File Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={20} color="#3498db" />
            <Text style={styles.sectionTitle}>File Summary</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.fileName}>{uploadData.fileName}</Text>
            <Text style={styles.fileStats}>
              📊 {totalProducts} products found • {mappingSummary.length} fields mapped
            </Text>
            <Text style={styles.fileStats}>
              🔄 Will process in {totalBatches} batches of 10 products each
            </Text>
          </View>
        </View>

        {/* Field Mapping Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="git-compare" size={20} color="#27ae60" />
            <Text style={styles.sectionTitle}>Field Mapping ({mappingSummary.length} fields)</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.mappingContainer}>
              {mappingSummary.map((mapping, index) => (
                <View key={index} style={styles.mappingCard}>
                  <Text style={styles.fileColumnText}>{mapping.fileColumn}</Text>
                  <Ionicons name="arrow-down" size={16} color="#666" style={styles.arrowIcon} />
                  <Text style={styles.productFieldText}>{mapping.productField}</Text>
                  <Text style={styles.sampleText} numberOfLines={2}>
                    Sample: {String(mapping.sampleValue).substring(0, 30)}
                    {String(mapping.sampleValue).length > 30 && "..."}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Sample Data Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="eye-outline" size={20} color="#9b59b6" />
            <Text style={styles.sectionTitle}>Sample Data Preview</Text>
          </View>
          {sampleProducts.map((product, index) => (
            <View key={index} style={styles.sampleCard}>
              <Text style={styles.sampleTitle}>Product {index + 1}</Text>
              {mappingSummary.slice(0, 5).map((mapping, mapIndex) => (
                <View key={mapIndex} style={styles.sampleRow}>
                  <Text style={styles.sampleLabel}>{mapping.productField}:</Text>
                  <Text style={styles.sampleValue}>
                    {product[mapping.fileColumn] || 'N/A'}
                  </Text>
                </View>
              ))}
              {mappingSummary.length > 5 && (
                <Text style={styles.moreFields}>
                  ... and {mappingSummary.length - 5} more fields
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Processing Status */}
        {isProcessing && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ActivityIndicator size={20} color="#f39c12" />
              <Text style={styles.sectionTitle}>Processing Import</Text>
            </View>
            <View style={styles.progressCard}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressText}>
                  Batch {currentBatch} of {totalBatches}
                </Text>
                <Text style={styles.progressSubtext}>
                  {processedCount} of {totalProducts} products imported
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${(processedCount / totalProducts) * 100}%` }
                  ]} 
                />
              </View>
            </View>
          </View>
        )}

        {/* Processing Complete */}
        {!isProcessing && processedCount > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
              <Text style={styles.sectionTitle}>Import Complete</Text>
            </View>
            <View style={styles.completionCard}>
              <Text style={styles.completionText}>
                ✅ {processedCount} products imported successfully
              </Text>
              {errors.length > 0 && (
                <Text style={styles.completionError}>
                  ⚠️ {errors.length} products failed to import
                </Text>
              )}
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => {
                  if (navigation && typeof navigation.navigate === 'function') {
                    navigation.navigate('SellerDashboard');
                  } else {
                    handleGoBack();
                  }
                }}
              >
                <Text style={styles.doneButtonText}>Done - Go to Dashboard</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Errors (if any) */}
        {errors.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning" size={20} color="#e74c3c" />
              <Text style={styles.sectionTitle}>Import Errors ({errors.length})</Text>
            </View>
            {errors.slice(0, 5).map((error, index) => (
              <View key={index} style={styles.errorCard}>
                <Text style={styles.errorText}>
                  {error.product || `Batch ${error.batch}`}: {error.error}
                </Text>
              </View>
            ))}
            {errors.length > 5 && (
              <Text style={styles.moreErrors}>
                ... and {errors.length - 5} more errors
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.cancelButton, isProcessing && styles.buttonDisabled]}
          onPress={handleGoBack}
          disabled={isProcessing}
        >
          <Text style={styles.cancelButtonText}>
            {isProcessing ? 'Processing...' : 'Cancel'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.processButton, isProcessing && styles.buttonDisabled]}
          onPress={processUpload}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size={16} color="white" />
          ) : (
            <Ionicons name="cloud-upload" size={18} color="white" />
          )}
          <Text style={styles.processButtonText}>
            {isProcessing ? `Processing... (${processedCount}/${totalProducts})` : `Import ${totalProducts} Products`}
          </Text>
        </TouchableOpacity>
      </View>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  fileStats: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  mappingContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  mappingCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  fileColumnText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  arrowIcon: {
    marginVertical: 5,
  },
  productFieldText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  sampleText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sampleCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  sampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  sampleRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  sampleLabel: {
    fontSize: 12,
    color: '#666',
    width: 100,
    fontWeight: '500',
  },
  sampleValue: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  moreFields: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 5,
  },
  progressCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  progressInfo: {
    marginBottom: 10,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  progressSubtext: {
    fontSize: 14,
    color: '#666',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e1e8ed',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#27ae60',
    borderRadius: 4,
  },
  completionCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  completionText: {
    fontSize: 16,
    color: '#27ae60',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  completionError: {
    fontSize: 14,
    color: '#f39c12',
    marginBottom: 15,
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: '#fdf2f2',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#e74c3c',
  },
  errorText: {
    fontSize: 12,
    color: '#e74c3c',
  },
  moreErrors: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
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
  processButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    backgroundColor: '#27ae60',
    borderRadius: 8,
    gap: 8,
  },
  processButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
  },
});

export default BulkUploadReviewMinimal;
