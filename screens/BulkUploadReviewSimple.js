import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BulkUploadReviewSimple = ({ navigation }) => {
  const [uploadData, setUploadData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('BulkUploadReviewSimple: Component mounted');
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('BulkUploadReviewSimple: Loading data...');
      const data = await AsyncStorage.getItem('bulkUploadData');
      console.log('BulkUploadReviewSimple: Data loaded:', data ? 'Found' : 'Not found');
      
      if (data) {
        const parsed = JSON.parse(data);
        setUploadData(parsed);
        console.log('BulkUploadReviewSimple: Data parsed successfully');
      } else {
        setError('No data found');
      }
    } catch (err) {
      console.error('BulkUploadReviewSimple: Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  console.log('BulkUploadReviewSimple: Rendering...', { isLoading, error, hasData: !!uploadData });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            console.log('BulkUploadReviewSimple: Back button pressed');
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review & Import (Simple)</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.text}>Loading...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>Error: {error}</Text>
            <TouchableOpacity style={styles.button} onPress={loadData}>
              <Text style={styles.buttonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : uploadData ? (
          <View style={styles.center}>
            <Text style={styles.successText}>✅ Data Loaded Successfully!</Text>
            <Text style={styles.text}>File: {uploadData.fileName}</Text>
            <Text style={styles.text}>Products: {uploadData.parsedData?.length || 0}</Text>
            <Text style={styles.text}>Mappings: {uploadData.columnMappings?.length || 0}</Text>
            
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => {
                console.log('BulkUploadReviewSimple: Process button pressed');
                alert('Processing would happen here');
              }}
            >
              <Text style={styles.buttonText}>Process Upload</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.center}>
            <Text style={styles.text}>No data available</Text>
          </View>
        )}
      </View>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 16,
    color: '#333',
    marginVertical: 5,
    textAlign: 'center',
  },
  successText: {
    fontSize: 18,
    color: '#27ae60',
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#3498db',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BulkUploadReviewSimple;
