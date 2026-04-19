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

const BulkUploadReview = ({ navigation }) => {
  const [uploadData, setUploadData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Add error boundary
  const { toast, showSuccess, showError, showWarning, hideToast } = useToast();

  useEffect(() => {
    console.log('BulkUploadReview mounted');
    loadUploadData();
  }, []);

  const loadUploadData = async () => {
    try {
      console.log('Loading upload data from AsyncStorage...');
      setIsLoading(true);
      setError(null);
      
      const data = await AsyncStorage.getItem('bulkUploadData');
      console.log('Raw data from AsyncStorage:', data ? 'Data found' : 'No data');
      
      if (data) {
        const parsedData = JSON.parse(data);
        console.log('Parsed upload data:', {
          fileName: parsedData.fileName,
          totalProducts: parsedData.parsedData?.length || 0,
          mappings: parsedData.columnMappings?.length || 0
        });
        setUploadData(parsedData);
      } else {
        console.error('No upload data found in AsyncStorage');
        setError('No upload data found');
        showError('No upload data found');
        // Don't navigate back immediately, let user see the error
      }
    } catch (error) {
      console.error('Error loading upload data:', error);
      setError(`Failed to load upload data: ${error.message}`);
      showError('Failed to load upload data');
    } finally {
      setIsLoading(false);
    }
  };

  const processUpload = async () => {
    if (!uploadData) return;

    setIsProcessing(true);
    setProcessedCount(0);

    try {
      // Get current seller from AsyncStorage
      const sellerData = await AsyncStorage.getItem('currentSeller');
      if (!sellerData) {
        showError('Please log in as a seller to import products');
        navigation.goBack();
        return;
      }

      const seller = JSON.parse(sellerData);
      console.log('Current seller for bulk upload:', seller);

      const { parsedData, columnMappings } = uploadData;
      
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

      console.log('Transformed products:', transformedProducts.slice(0, 2));

      // Process products in batches
      const batchSize = 10;
      const totalBatches = Math.ceil(transformedProducts.length / batchSize);
      
      for (let i = 0; i < totalBatches; i++) {
        const batch = transformedProducts.slice(i * batchSize, (i + 1) * batchSize);
        
        try {
          const response = await fetch(`${API_BASE}/products/bulk-upload/process`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              products: batch,
              batchNumber: i + 1,
              totalBatches,
              sellerId: seller.id // Include seller ID for authentication
            }),
          });

          if (!response.ok) {
            throw new Error(`Batch ${i + 1} failed: ${response.status}`);
          }

          const result = await response.json();
          setProcessedCount(prev => prev + batch.length);
          
          console.log(`Batch ${i + 1}/${totalBatches} processed:`, result);
          
        } catch (error) {
          console.error(`Error processing batch ${i + 1}:`, error);
          showWarning(`Batch ${i + 1} failed: ${error.message}`);
        }
      }

      // Clean up stored data
      await AsyncStorage.removeItem('bulkUploadData');
      
      showSuccess(`Successfully processed ${processedCount} products!`);
      
      // Navigate back to dashboard after a delay
      setTimeout(() => {
        navigation.navigate('SellerDashboard');
      }, 2000);

    } catch (error) {
      console.error('Error processing upload:', error);
      showError('Failed to process upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const getMappingSummary = () => {
    if (!uploadData || !uploadData.columnMappings || !uploadData.parsedData) {
      console.log('getMappingSummary: Missing data', {
        hasUploadData: !!uploadData,
        hasColumnMappings: !!(uploadData?.columnMappings),
        hasParsedData: !!(uploadData?.parsedData)
      });
      return [];
    }
    
    try {
      return uploadData.columnMappings
        .filter(m => m.productField)
        .map(m => ({
          fileColumn: m.fileColumn,
          productField: m.productField,
          sampleValue: uploadData.parsedData[0]?.[m.fileColumn] || ''
        }));
    } catch (error) {
      console.error('Error in getMappingSummary:', error);
      return [];
    }
  };

  // Add error state rendering
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review & Import</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#e74c3c" />
          <Text style={styles.errorTitle}>Error Loading Data</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadUploadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backToUploadButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backToUploadButtonText}>Back to Upload</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review & Import</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading upload data...</Text>
        </View>
      </View>
    );
  }

  if (!uploadData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review & Import</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="document-text" size={48} color="#95a5a6" />
          <Text style={styles.errorTitle}>No Data Found</Text>
          <Text style={styles.errorMessage}>Please go back and upload a file first.</Text>
          <TouchableOpacity style={styles.backToUploadButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backToUploadButtonText}>Back to Upload</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const mappingSummary = getMappingSummary();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
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
              {uploadData.parsedData.length} products • {mappingSummary.length} fields mapped
            </Text>
          </View>
        </View>

        {/* Mapping Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="git-compare" size={20} color="#27ae60" />
            <Text style={styles.sectionTitle}>Field Mapping</Text>
          </View>
          {mappingSummary.map((mapping, index) => (
            <View key={index} style={styles.mappingRow}>
              <Text style={styles.fileColumnText}>{mapping.fileColumn}</Text>
              <Ionicons name="arrow-forward" size={16} color="#666" />
              <Text style={styles.productFieldText}>{mapping.productField}</Text>
              <Text style={styles.sampleText} numberOfLines={1}>
                {String(mapping.sampleValue).substring(0, 20)}
                {String(mapping.sampleValue).length > 20 && "..."}
              </Text>
            </View>
          ))}
        </View>

        {/* Processing Status */}
        {isProcessing && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="sync" size={20} color="#f39c12" />
              <Text style={styles.sectionTitle}>Processing</Text>
            </View>
            <View style={styles.progressCard}>
              <ActivityIndicator size="small" color="#3498db" />
              <Text style={styles.progressText}>
                Processing {processedCount} of {uploadData.parsedData.length} products...
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isProcessing}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.processButton, isProcessing && styles.processButtonDisabled]}
          onPress={processUpload}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size={16} color="white" />
          ) : (
            <Ionicons name="cloud-upload" size={18} color="white" />
          )}
          <Text style={styles.processButtonText}>
            {isProcessing ? 'Processing...' : 'Import Products'}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backToUploadButton: {
    backgroundColor: '#95a5a6',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backToUploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 5,
  },
  fileStats: {
    fontSize: 14,
    color: '#666',
  },
  mappingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 10,
  },
  fileColumnText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  productFieldText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
    flex: 1,
  },
  sampleText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    flex: 1,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    gap: 10,
  },
  progressText: {
    fontSize: 14,
    color: '#333',
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
  processButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  processButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BulkUploadReview;
