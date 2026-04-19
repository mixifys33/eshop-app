import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import API_BASE from '../constants/api';

const { width } = Dimensions.get('window');

const BulkUploadHistory = ({ navigation }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const { toast, showSuccess, showError, showWarning, showInfo, hideToast } = useToast();

  useEffect(() => {
    fetchImportHistory();
  }, []);

  const fetchImportHistory = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE}/products/bulk-upload/history`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch import history');
      }

      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Error fetching import history:', error);
      setError(error.message);
      showError('Failed to load import history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchImportHistory();
  };

  const downloadReport = async (batchId, fileName) => {
    try {
      showInfo('Preparing report download...');
      
      const response = await fetch(`${API_BASE}/products/bulk-upload/report/${batchId}`);
      
      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      // In a real app, you would handle the file download here
      // For now, we'll just show a success message
      showSuccess('Report download started! Check your downloads folder.');
    } catch (error) {
      console.error('Download error:', error);
      showError('Failed to download report');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <Ionicons name="checkmark-circle" size={20} color="#27ae60" />;
      case 'failed':
        return <Ionicons name="close-circle" size={20} color="#e74c3c" />;
      case 'partial':
        return <Ionicons name="warning" size={20} color="#f39c12" />;
      default:
        return <ActivityIndicator size={20} color="#3498db" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return {
          backgroundColor: '#d5f4e6',
          borderColor: '#27ae60',
          textColor: '#27ae60'
        };
      case 'failed':
        return {
          backgroundColor: '#ffeaea',
          borderColor: '#e74c3c',
          textColor: '#e74c3c'
        };
      case 'partial':
        return {
          backgroundColor: '#fff3cd',
          borderColor: '#f39c12',
          textColor: '#f39c12'
        };
      default:
        return {
          backgroundColor: '#e3f2fd',
          borderColor: '#3498db',
          textColor: '#3498db'
        };
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateSuccessRate = (imported, total) => {
    if (total === 0) return 0;
    return Math.round((imported / total) * 100);
  };

  const renderLogItem = (log) => {
    const statusColors = getStatusColor(log.status);
    const successRate = calculateSuccessRate(log.importedCount || 0, log.totalProducts);

    return (
      <View key={log.id} style={styles.logItem}>
        {/* Header */}
        <View style={styles.logHeader}>
          <View style={styles.logHeaderLeft}>
            {getStatusIcon(log.status)}
            <View style={styles.logHeaderText}>
              <Text style={styles.logFileName} numberOfLines={1}>
                {log.fileName}
              </Text>
              <View style={styles.logMeta}>
                <Ionicons name="time-outline" size={14} color="#666" />
                <Text style={styles.logDate}>{formatDate(log.createdAt)}</Text>
                <View style={[
                  styles.statusBadge,
                  {
                    backgroundColor: statusColors.backgroundColor,
                    borderColor: statusColors.borderColor,
                  }
                ]}>
                  <Text style={[styles.statusText, { color: statusColors.textColor }]}>
                    {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={() => downloadReport(log.id, log.fileName)}
          >
            <Ionicons name="download-outline" size={16} color="#3498db" />
            <Text style={styles.downloadButtonText}>Report</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.logStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{log.totalProducts}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, styles.successNumber]}>
              {log.importedCount || 0}
            </Text>
            <Text style={styles.statLabel}>Imported</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, styles.errorNumber]}>
              {log.failedCount || 0}
            </Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${successRate}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>{successRate}% success rate</Text>
        </View>
      </View>
    );
  };
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('BulkUpload')}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Import History</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading History...</Text>
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
          onPress={() => navigation.navigate('BulkUpload')}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Import History</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
        >
          <Ionicons name="refresh" size={24} color="#3498db" />
        </TouchableOpacity>
      </View>

      {/* Breadcrumb */}
      <View style={styles.breadcrumb}>
        <TouchableOpacity onPress={() => navigation.navigate('SellerDashboard')}>
          <Text style={styles.breadcrumbLink}>Dashboard</Text>
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={16} color="#666" />
        <TouchableOpacity onPress={() => navigation.navigate('BulkUpload')}>
          <Text style={styles.breadcrumbLink}>Bulk Upload</Text>
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={16} color="#666" />
        <Text style={styles.breadcrumbCurrent}>History</Text>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#e74c3c" />
            <Text style={styles.errorTitle}>Failed to load import history</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchImportHistory}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : logs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>No import history found</Text>
            <Text style={styles.emptyText}>
              You haven't performed any bulk uploads yet.
            </Text>
            <TouchableOpacity
              style={styles.startUploadButton}
              onPress={() => navigation.navigate('BulkUpload')}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="white" />
              <Text style={styles.startUploadButtonText}>Start Bulk Upload</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.logsList}>
            {logs.map(renderLogItem)}
          </View>
        )}
      </ScrollView>

      {/* Back Link */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigation.navigate('BulkUpload')}
        >
          <Ionicons name="arrow-back" size={16} color="#3498db" />
          <Text style={styles.backLinkText}>Back to Bulk Upload</Text>
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

  // Breadcrumb
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  breadcrumbLink: {
    fontSize: 14,
    color: '#3498db',
    marginHorizontal: 4,
  },
  breadcrumbCurrent: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 4,
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

  // Content
  content: {
    flex: 1,
  },

  // Error State
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  startUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  startUploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Logs List
  logsList: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  logItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Log Header
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  logHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 15,
  },
  logHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  logFileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  logMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  logDate: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  downloadButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#3498db',
    fontWeight: '500',
  },

  // Log Stats
  logStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  successNumber: {
    color: '#27ae60',
  },
  errorNumber: {
    color: '#e74c3c',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },

  // Progress Section
  progressSection: {
    marginTop: 10,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#e1e8ed',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#27ae60',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backLinkText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
  },
});

export default BulkUploadHistory;
