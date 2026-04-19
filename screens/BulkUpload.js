import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  FlatList,
  Platform,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import { downloadFile, showFileLocationAlert } from '../utils/downloadUtils';
import API_BASE from '../constants/api';

const { width, height } = Dimensions.get('window');

// Product fields configuration for column mapping
const PRODUCT_FIELDS = [
  { key: "title", label: "Product Name", required: true, aliases: ["product name"] },
  { key: "sku", label: "SKU", required: true, aliases: ["sku"] },
  { key: "description", label: "Short Description", required: true, aliases: ["short description"] },
  { key: "detailedDescription", label: "Detailed Description", required: false, aliases: ["detailed description"] },
  { key: "regularPrice", label: "Regular Price", required: true, aliases: ["regular price"] },
  { key: "salePrice", label: "Sale Price", required: true, aliases: ["sale price"] },
  { key: "stock", label: "Stock", required: true, aliases: ["stock"] },
  { key: "category", label: "Category", required: true, aliases: ["category"] },
  { key: "subCategory", label: "Sub Category", required: false, aliases: ["sub category"] },
  { key: "brand", label: "Brand", required: false, aliases: ["brand"] },
  { key: "colors", label: "Colors", required: false, aliases: ["colors"] },
  { key: "sizes", label: "Sizes", required: false, aliases: ["sizes"] },
  { key: "tags", label: "Tags", required: false, aliases: ["tags"] },
  { key: "warranty", label: "Warranty", required: false, aliases: ["warranty"] },
  { key: "images", label: "Image URLs", required: false, aliases: ["image urls"] },
  { key: "videoUrl", label: "Video URL", required: false, aliases: ["video url"] },
  { key: "cashOnDelivery", label: "Cash on Delivery", required: false, aliases: ["cash on delivery"] },
  { key: "currency", label: "Currency", required: false, aliases: ["currency"] },
];

const BulkUpload = ({ navigation }) => {
  const [step, setStep] = useState('upload'); // 'upload', 'mapping', 'processing'
  const [file, setFile] = useState(null);
  const [fileHeaders, setFileHeaders] = useState([]);
  const [columnMappings, setColumnMappings] = useState([]);
  const [parsedData, setParsedData] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mappingModalVisible, setMappingModalVisible] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast, showSuccess, showError, showWarning, showInfo, hideToast } = useToast();
  // Auto-map columns based on exact template headers
  const autoMapColumns = useCallback((headers) => {
    const mappings = [];
    
    console.log('=== AUTO MAPPING DEBUG ===');
    console.log('Headers received:', headers);
    console.log('Expected template headers:', PRODUCT_FIELDS.map(f => f.label));
    
    headers.forEach((header) => {
      const headerTrimmed = header.trim(); // Only trim, don't change case
      console.log(`Processing header: "${header}" -> trimmed: "${headerTrimmed}"`);
      
      let matched = false;
      for (const field of PRODUCT_FIELDS) {
        // Check exact label match (case-sensitive)
        if (field.label === headerTrimmed) {
          console.log(`  ✓ EXACT MATCH: "${field.label}" -> ${field.key}`);
          mappings.push({
            fileColumn: header,
            productField: field.key,
          });
          matched = true;
          break;
        }
        
        // Check case-insensitive as fallback
        if (field.label.toLowerCase() === headerTrimmed.toLowerCase()) {
          console.log(`  ✓ Case-insensitive match: "${field.label}" -> ${field.key}`);
          mappings.push({
            fileColumn: header,
            productField: field.key,
          });
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        console.log(`  ✗ NO MATCH for: "${header}"`);
        console.log(`    Expected one of:`, PRODUCT_FIELDS.map(f => f.label));
      }
    });

    // Add unmapped headers with empty product field
    headers.forEach((header) => {
      if (!mappings.find((m) => m.fileColumn === header)) {
        console.log(`Adding unmapped header: "${header}"`);
        mappings.push({
          fileColumn: header,
          productField: "",
        });
      }
    });

    console.log('Final mappings:', mappings);
    console.log('Mapped required fields:', mappings.filter(m => {
      const field = PRODUCT_FIELDS.find(f => f.key === m.productField);
      return field && field.required;
    }).map(m => m.fileColumn));
    console.log('=========================');
    
    return mappings;
  }, []);

  // Handle file selection
  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
               'application/vnd.ms-excel', 
               'text/csv'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const selectedFile = result.assets[0];
      
      if (selectedFile.size > 50 * 1024 * 1024) {
        showError('File too large. Maximum size is 50MB.');
        return;
      }

      setFile(selectedFile);
      setIsUploading(true);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        
        if (Platform.OS === 'web') {
          // For web, we need to create a File object from the selected file
          const response = await fetch(selectedFile.uri);
          const blob = await response.blob();
          const file = new File([blob], selectedFile.name, { type: selectedFile.mimeType });
          formData.append('file', file);
        } else {
          // For React Native, use the file object structure
          formData.append('file', {
            uri: selectedFile.uri,
            type: selectedFile.mimeType,
            name: selectedFile.name,
          });
        }

        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + 10;
          });
        }, 200);

        console.log('Uploading file:', {
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.mimeType,
          platform: Platform.OS
        });

        console.log('FormData created, sending request...');

        const response = await fetch(`${API_BASE}/products/bulk-upload/parse`, {
          method: 'POST',
          body: formData,
          // Don't set Content-Type header - let the browser/RN set it with boundary
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        console.log('Upload response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Upload failed:', response.status, errorText);
          throw new Error(`Upload failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const { headers, data: parsedRows, totalRows } = data;

        setFileHeaders(headers);
        setParsedData(parsedRows);

        // Auto-map columns
        const autoMappings = autoMapColumns(headers);
        setColumnMappings(autoMappings);

        showSuccess(`File parsed successfully! Found ${totalRows} products.`);
        setStep('mapping');
      } catch (error) {
        console.error('Parse error:', error);
        showError('Failed to parse file. Please check the format and try again.');
        setFile(null);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    } catch (error) {
      console.error('File selection error:', error);
      showError('Failed to select file');
    }
  };
  // Update column mapping
  const updateMapping = (fileColumn, productField) => {
    setColumnMappings((prev) =>
      prev.map((m) =>
        m.fileColumn === fileColumn ? { ...m, productField } : m
      )
    );
  };

  // Download template
  const downloadTemplate = async (type) => {
    try {
      setIsDownloading(true);
      showInfo('Preparing template download...');
      
      // Create a file name with timestamp to avoid conflicts
      const timestamp = new Date().getTime();
      const fileName = `product_${type}_template_${timestamp}.xlsx`;
      
      showInfo('Downloading template file...');
      
      const result = await downloadFile(
        `${API_BASE}/products/bulk-upload/template/${type}`,
        fileName
      );
      
      if (result.success) {
        showSuccess(result.message);
        
        // Show file location alert for mobile platforms
        if (result.platform === 'native' && result.fileInfo) {
          showFileLocationAlert(fileName, result.fileInfo.size);
        }
      } else {
        showError(result.error);
      }
      
    } catch (error) {
      console.error('Template download error:', error);
      showError('An unexpected error occurred during download.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Proceed to review
  const proceedToReview = async () => {
    // Get base required fields
    let requiredFields = PRODUCT_FIELDS.filter((f) => f.required);
    const mappedFields = columnMappings.filter((m) => m.productField).map((m) => m.productField);
    
    // Smart validation: If we have salePrice but no regularPrice, that's OK
    const hasSalePrice = mappedFields.includes('salePrice');
    const hasRegularPrice = mappedFields.includes('regularPrice');
    
    // If we have salePrice but no regularPrice, remove regularPrice from required fields
    if (hasSalePrice && !hasRegularPrice) {
      requiredFields = requiredFields.filter(f => f.key !== 'regularPrice');
      console.log('Smart validation: salePrice found, regularPrice not required');
    }
    
    const missingRequired = requiredFields.filter((f) => !mappedFields.includes(f.key));

    // Debug logging
    console.log('=== VALIDATION DEBUG ===');
    console.log('Required fields:', requiredFields.map(f => ({ key: f.key, label: f.label })));
    console.log('Column mappings:', columnMappings);
    console.log('Mapped fields:', mappedFields);
    console.log('Has sale price:', hasSalePrice);
    console.log('Has regular price:', hasRegularPrice);
    console.log('Missing required:', missingRequired.map(f => ({ key: f.key, label: f.label })));
    console.log('========================');

    if (missingRequired.length > 0) {
      showError(`Missing required mappings: ${missingRequired.map((f) => f.label).join(", ")}`);
      return;
    }

    // Additional validation: Check if mapped fields have actual data
    const dataValidationErrors = [];
    const sampleRow = parsedData[0] || {};
    
    columnMappings.forEach(mapping => {
      if (mapping.productField) {
        const requiredField = requiredFields.find(f => f.key === mapping.productField);
        if (requiredField) {
          const sampleValue = sampleRow[mapping.fileColumn];
          if (!sampleValue || sampleValue.toString().trim() === '') {
            dataValidationErrors.push(`${requiredField.label} (column: ${mapping.fileColumn}) has empty values`);
          }
        }
      }
    });

    if (dataValidationErrors.length > 0) {
      console.log('Data validation errors:', dataValidationErrors);
      showError(`Data validation failed: ${dataValidationErrors.join(", ")}`);
      return;
    }

    // Store data for processing
    try {
      await AsyncStorage.setItem('bulkUploadData', JSON.stringify({
        parsedData,
        columnMappings,
        fileName: file?.name,
      }));

      // Show success message and navigate to review
      showSuccess('Validation passed! Proceeding to review...');
      console.log('Stored data:', { 
        parsedData: parsedData.slice(0, 2), 
        columnMappings, 
        fileName: file?.name,
        mappedFields,
        requiredFieldsUsed: requiredFields.map(f => f.key)
      });
      
      // Navigate to review screen (using minimal version for debugging)
      navigation.navigate('BulkUploadReviewMinimal');
    } catch (error) {
      showError('Failed to save upload data');
    }
  };

  // Render progress steps
  const renderProgressSteps = () => {
    const steps = ["Upload File", "Map Columns", "Review & Import"];
    
    return (
      <View style={styles.progressContainer}>
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = (step === "upload" && stepNumber === 1) ||
                          (step === "mapping" && stepNumber === 2) ||
                          (step === "processing" && stepNumber === 3);
          const isCompleted = (step === "mapping" && stepNumber === 1) ||
                             (step === "processing" && stepNumber <= 2);

          return (
            <React.Fragment key={label}>
              <View style={styles.stepContainer}>
                <View style={[
                  styles.stepCircle,
                  isCompleted ? styles.stepCompleted : 
                  isActive ? styles.stepActive : styles.stepInactive
                ]}>
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={16} color="white" />
                  ) : (
                    <Text style={[
                      styles.stepNumber,
                      isActive ? styles.stepNumberActive : styles.stepNumberInactive
                    ]}>
                      {stepNumber}
                    </Text>
                  )}
                </View>
                <Text style={[
                  styles.stepLabel,
                  isActive ? styles.stepLabelActive : styles.stepLabelInactive
                ]}>
                  {label}
                </Text>
              </View>
              {index < steps.length - 1 && (
                <View style={[
                  styles.stepConnector,
                  isCompleted ? styles.stepConnectorCompleted : styles.stepConnectorInactive
                ]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  };
  // Render upload step
  const renderUploadStep = () => (
    <ScrollView style={styles.stepContent}>
      {/* Template Downloads */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text-outline" size={20} color="#3498db" />
          <Text style={styles.sectionTitle}>Download Templates</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Start with a template to ensure your data is formatted correctly.
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.templateButton, isDownloading && styles.templateButtonDisabled]}
            onPress={() => downloadTemplate('blank')}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator size={16} color="#3498db" />
            ) : (
              <Ionicons name="download-outline" size={18} color="#3498db" />
            )}
            <Text style={styles.templateButtonText}>
              {isDownloading ? 'Downloading...' : 'Blank Template'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.templateButton, isDownloading && styles.templateButtonDisabled]}
            onPress={() => downloadTemplate('existing')}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator size={16} color="#3498db" />
            ) : (
              <Ionicons name="download-outline" size={18} color="#3498db" />
            )}
            <Text style={styles.templateButtonText}>
              {isDownloading ? 'Downloading...' : 'My Products Template'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* File Upload Area */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.uploadArea}
          onPress={handleFileSelect}
          disabled={isUploading}
        >
          {isUploading ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color="#3498db" />
              <Text style={styles.uploadingText}>Processing file...</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>{uploadProgress}% uploaded</Text>
            </View>
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={64} color="#666" />
              <Text style={styles.uploadTitle}>Tap to select your file</Text>
              <Text style={styles.uploadDescription}>
                Supports .xlsx, .xls, .csv • Max 50MB
              </Text>
              <View style={styles.uploadButton}>
                <Ionicons name="folder-open-outline" size={18} color="white" />
                <Text style={styles.uploadButtonText}>Select File</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Upload Guidelines */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="information-circle-outline" size={20} color="#f39c12" />
          <Text style={styles.sectionTitle}>Upload Guidelines</Text>
        </View>
        <View style={styles.guidelinesGrid}>
          <View style={styles.guidelineItem}>
            <Text style={styles.guidelineTitle}>Required Fields:</Text>
            <Text style={styles.guidelineText}>• Product Name / Title</Text>
            <Text style={styles.guidelineText}>• SKU (must be unique)</Text>
            <Text style={styles.guidelineText}>• Regular Price & Sale Price</Text>
            <Text style={styles.guidelineText}>• Stock quantity</Text>
            <Text style={styles.guidelineText}>• Category</Text>
          </View>
          <View style={styles.guidelineItem}>
            <Text style={styles.guidelineTitle}>Image Requirements:</Text>
            <Text style={styles.guidelineText}>• Minimum 3 images per product</Text>
            <Text style={styles.guidelineText}>• Maximum 8 images per product</Text>
            <Text style={styles.guidelineText}>• Use comma-separated URLs</Text>
            <Text style={styles.guidelineText}>• Or upload images after import</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
  // Render mapping step
  const renderMappingStep = () => (
    <ScrollView style={styles.stepContent}>
      {/* File Info */}
      <View style={styles.fileInfoCard}>
        <View style={styles.fileInfoContent}>
          <Ionicons name="document" size={24} color="#27ae60" />
          <View style={styles.fileInfoText}>
            <Text style={styles.fileName}>{file?.name}</Text>
            <Text style={styles.fileDetails}>{parsedData.length} products found</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            setStep('upload');
            setFile(null);
            setParsedData([]);
            setColumnMappings([]);
          }}
          style={styles.removeFileButton}
        >
          <Ionicons name="close" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* AI Enhancement Notice */}
      <View style={styles.aiNotice}>
        <Ionicons name="sparkles" size={24} color="#9b59b6" />
        <View style={styles.aiNoticeText}>
          <Text style={styles.aiNoticeTitle}>AI-Powered Enhancement</Text>
          <Text style={styles.aiNoticeDescription}>
            After mapping, our AI will automatically enhance your data: fix descriptions, 
            generate SEO tags, normalize units, and suggest improvements.
          </Text>
        </View>
      </View>

      {/* Header Validation */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="list-outline" size={20} color="#3498db" />
          <Text style={styles.sectionTitle}>Header Validation</Text>
        </View>
        
        <Text style={styles.sectionDescription}>
          Checking if your file headers match the expected template format.
        </Text>
        
        <View style={styles.headerComparison}>
          <View style={styles.headerColumn}>
            <Text style={styles.headerColumnTitle}>Your File Headers:</Text>
            {fileHeaders.map((header, index) => (
              <Text key={index} style={styles.headerItem}>{header}</Text>
            ))}
          </View>
          
          <View style={styles.headerColumn}>
            <Text style={styles.headerColumnTitle}>Expected Template Headers:</Text>
            {PRODUCT_FIELDS.map((field, index) => (
              <Text key={index} style={[
                styles.headerItem,
                fileHeaders.includes(field.label) ? styles.headerMatched : styles.headerMissing
              ]}>
                {field.label} {field.required && '*'}
              </Text>
            ))}
          </View>
        </View>
      </View>

      {/* Validation Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#27ae60" />
          <Text style={styles.sectionTitle}>Validation Summary</Text>
        </View>
        
        <View style={styles.validationSummary}>
          {PRODUCT_FIELDS.filter(f => f.required).map(field => {
            const mapping = columnMappings.find(m => m.productField === field.key);
            const isMapped = !!mapping;
            const hasData = isMapped && parsedData[0] && parsedData[0][mapping.fileColumn] && 
                           parsedData[0][mapping.fileColumn].toString().trim() !== '';
            
            return (
              <View key={field.key} style={styles.validationItem}>
                <View style={styles.validationIcon}>
                  {isMapped && hasData ? (
                    <Ionicons name="checkmark-circle" size={16} color="#27ae60" />
                  ) : isMapped && !hasData ? (
                    <Ionicons name="warning" size={16} color="#f39c12" />
                  ) : (
                    <Ionicons name="close-circle" size={16} color="#e74c3c" />
                  )}
                </View>
                <Text style={[
                  styles.validationText,
                  isMapped && hasData ? styles.validationSuccess :
                  isMapped && !hasData ? styles.validationWarning :
                  styles.validationError
                ]}>
                  {field.label}: {isMapped ? (hasData ? 'Ready' : 'No Data') : 'Not Mapped'}
                </Text>
                {isMapped && (
                  <Text style={styles.validationColumn}>({mapping.fileColumn})</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Column Mapping */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Map Your Columns</Text>
        </View>
        <Text style={styles.sectionDescription}>
          We've auto-detected some mappings. Please verify and complete the mapping.
        </Text>
        
        <View style={styles.mappingList}>
          {columnMappings.map((mapping, index) => {
            const field = PRODUCT_FIELDS.find((f) => f.key === mapping.productField);
            const sampleValue = parsedData[0]?.[mapping.fileColumn] || "";
            const isRequired = field?.required;
            const isMapped = !!mapping.productField;
            const hasData = sampleValue && sampleValue.toString().trim() !== '';

            return (
              <TouchableOpacity
                key={mapping.fileColumn}
                style={[
                  styles.mappingItem,
                  isRequired && !isMapped && styles.mappingItemError,
                  isRequired && isMapped && !hasData && styles.mappingItemWarning
                ]}
                onPress={() => {
                  setSelectedMapping(mapping);
                  setMappingModalVisible(true);
                }}
              >
                <View style={styles.mappingHeader}>
                  <Text style={styles.mappingFileColumn}>{mapping.fileColumn}</Text>
                  <View style={styles.mappingStatus}>
                    {isMapped && hasData ? (
                      <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
                    ) : isMapped && !hasData ? (
                      <Ionicons name="warning" size={20} color="#f39c12" />
                    ) : !isMapped && isRequired ? (
                      <Ionicons name="alert-circle" size={20} color="#e74c3c" />
                    ) : (
                      <Ionicons name="remove-circle" size={20} color="#666" />
                    )}
                  </View>
                </View>
                
                <View style={styles.mappingTargetContainer}>
                  <Text style={styles.mappingTarget}>
                    {mapping.productField ? 
                      PRODUCT_FIELDS.find(f => f.key === mapping.productField)?.label || mapping.productField :
                      "-- Skip this column --"
                    }
                  </Text>
                  {isRequired && (
                    <View style={styles.requiredBadge}>
                      <Text style={styles.requiredBadgeText}>Required</Text>
                    </View>
                  )}
                </View>
                
                <Text style={styles.mappingSample} numberOfLines={1}>
                  Sample: {String(sampleValue).substring(0, 50)}
                  {String(sampleValue).length > 50 && "..."}
                </Text>
                
                {/* Debug info */}
                <Text style={styles.debugInfo}>
                  Mapped: {isMapped ? 'Yes' : 'No'} | Has Data: {hasData ? 'Yes' : 'No'} | Required: {isRequired ? 'Yes' : 'No'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setStep('upload');
            setFile(null);
          }}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.debugButton}
          onPress={() => {
            console.log('=== DEBUG DATA ===');
            console.log('File headers:', fileHeaders);
            console.log('Parsed data (first 3 rows):', parsedData.slice(0, 3));
            console.log('Column mappings:', columnMappings);
            console.log('Required fields:', PRODUCT_FIELDS.filter(f => f.required));
            Alert.alert('Debug Info', 'Check console for detailed data. Look for "=== DEBUG DATA ===" in the browser console.');
          }}
        >
          <Text style={styles.debugButtonText}>Debug</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.continueButton}
          onPress={proceedToReview}
        >
          <Text style={styles.continueButtonText}>Continue to Review</Text>
          <Ionicons name="arrow-forward" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
  // Render mapping modal
  const renderMappingModal = () => (
    <Modal
      visible={mappingModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setMappingModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Map Column: {selectedMapping?.fileColumn}
            </Text>
            <TouchableOpacity
              onPress={() => setMappingModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <TouchableOpacity
              style={[
                styles.mappingOption,
                !selectedMapping?.productField && styles.mappingOptionSelected
              ]}
              onPress={() => {
                updateMapping(selectedMapping.fileColumn, "");
                setMappingModalVisible(false);
              }}
            >
              <Text style={styles.mappingOptionText}>-- Skip this column --</Text>
            </TouchableOpacity>
            
            {/* Debug info */}
            <View style={styles.debugSection}>
              <Text style={styles.debugTitle}>Available Fields ({PRODUCT_FIELDS.length}):</Text>
            </View>
            
            {PRODUCT_FIELDS.map((field) => (
              <TouchableOpacity
                key={field.key}
                style={[
                  styles.mappingOption,
                  selectedMapping?.productField === field.key && styles.mappingOptionSelected
                ]}
                onPress={() => {
                  console.log(`Mapping "${selectedMapping.fileColumn}" to "${field.label}" (${field.key})`);
                  updateMapping(selectedMapping.fileColumn, field.key);
                  setMappingModalVisible(false);
                }}
              >
                <View style={styles.mappingOptionContent}>
                  <Text style={styles.mappingOptionText}>
                    {field.label} {field.required && "*"}
                  </Text>
                  <Text style={styles.mappingOptionKey}>({field.key})</Text>
                  {field.required && (
                    <View style={styles.requiredBadge}>
                      <Text style={styles.requiredBadgeText}>Required</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

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
        <Text style={styles.headerTitle}>Bulk Product Upload</Text>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => navigation.navigate('BulkUploadHistory')}
        >
          <Ionicons name="time-outline" size={24} color="#3498db" />
        </TouchableOpacity>
      </View>

      {/* Progress Steps */}
      {renderProgressSteps()}

      {/* Step Content */}
      {step === 'upload' && renderUploadStep()}
      {step === 'mapping' && renderMappingStep()}

      {/* Mapping Modal */}
      {renderMappingModal()}

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
  historyButton: {
    padding: 8,
  },
  
  // Progress Steps
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  stepContainer: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepCompleted: {
    backgroundColor: '#27ae60',
  },
  stepActive: {
    backgroundColor: '#3498db',
  },
  stepInactive: {
    backgroundColor: '#95a5a6',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  stepNumberActive: {
    color: 'white',
  },
  stepNumberInactive: {
    color: 'white',
  },
  stepLabel: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 80,
  },
  stepLabelActive: {
    color: '#333',
    fontWeight: '600',
  },
  stepLabelInactive: {
    color: '#666',
  },
  stepConnector: {
    width: 40,
    height: 2,
    marginHorizontal: 10,
    marginBottom: 20,
  },
  stepConnectorCompleted: {
    backgroundColor: '#27ae60',
  },
  stepConnectorInactive: {
    backgroundColor: '#95a5a6',
  },

  // Step Content
  stepContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },

  // Template Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  templateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    gap: 8,
  },
  templateButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3498db',
  },
  templateButtonDisabled: {
    opacity: 0.6,
  },

  // Upload Area
  uploadArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    borderWidth: 2,
    borderColor: '#e1e8ed',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#fafbfc',
  },
  uploadingContainer: {
    alignItems: 'center',
  },
  uploadingText: {
    fontSize: 16,
    color: '#333',
    marginTop: 15,
    marginBottom: 20,
  },
  progressBar: {
    width: 200,
    height: 4,
    backgroundColor: '#e1e8ed',
    borderRadius: 2,
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3498db',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
  },
  uploadDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Guidelines
  guidelinesGrid: {
    gap: 15,
  },
  guidelineItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  guidelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  guidelineText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    lineHeight: 16,
  },

  // File Info Card
  fileInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    marginBottom: 15,
  },
  fileInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileInfoText: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  fileDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  removeFileButton: {
    padding: 8,
  },

  // AI Notice
  aiNotice: {
    flexDirection: 'row',
    backgroundColor: '#f3e5f5',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1bee7',
    marginBottom: 15,
  },
  aiNoticeText: {
    marginLeft: 12,
    flex: 1,
  },
  aiNoticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  aiNoticeDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },

  // Validation Summary
  validationSummary: {
    gap: 8,
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  validationIcon: {
    marginRight: 8,
    width: 20,
  },
  validationText: {
    fontSize: 14,
    flex: 1,
  },
  validationSuccess: {
    color: '#27ae60',
  },
  validationWarning: {
    color: '#f39c12',
  },
  validationError: {
    color: '#e74c3c',
  },
  validationColumn: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },

  // Header Comparison
  headerComparison: {
    flexDirection: 'row',
    gap: 15,
  },
  headerColumn: {
    flex: 1,
  },
  headerColumnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  headerItem: {
    fontSize: 12,
    paddingVertical: 2,
    color: '#666',
  },
  headerMatched: {
    color: '#27ae60',
    fontWeight: '500',
  },
  headerMissing: {
    color: '#e74c3c',
  },

  // Mapping
  mappingList: {
    gap: 10,
  },
  mappingItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  mappingItemError: {
    borderColor: '#e74c3c',
    backgroundColor: '#fdf2f2',
  },
  mappingItemWarning: {
    borderColor: '#f39c12',
    backgroundColor: '#fef9e7',
  },
  mappingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mappingFileColumn: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  mappingStatus: {
    marginLeft: 10,
  },
  mappingTargetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  mappingTarget: {
    fontSize: 14,
    color: '#3498db',
    flex: 1,
  },
  mappingSample: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  debugInfo: {
    fontSize: 10,
    color: '#999',
    fontFamily: 'monospace',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 20,
    gap: 10,
  },
  backButton: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: '#95a5a6',
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  debugButton: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: '#9b59b6',
    borderRadius: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    backgroundColor: '#3498db',
    borderRadius: 8,
    gap: 8,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Modal
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
    maxHeight: 400,
  },
  mappingOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mappingOptionSelected: {
    backgroundColor: '#e3f2fd',
  },
  mappingOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mappingOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  requiredBadge: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  requiredBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default BulkUpload;
