import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Linking,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import CustomToast from '../components/CustomToast';
import { useTheme } from '../context/ThemeContext';

const HelpSupport = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [selectedComplaintType, setSelectedComplaintType] = useState(null);

  const whatsappNumber = '+256761819885';

  const handleWhatsAppContact = () => {
    const url = `whatsapp://send?phone=${whatsappNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert(
            'WhatsApp Not Available',
            'Please install WhatsApp or contact us at ' + whatsappNumber,
            [{ text: 'OK' }]
          );
        }
      })
      .catch((err) => {
        console.error('Error opening WhatsApp:', err);
        Alert.alert('Error', 'Could not open WhatsApp. Please try again.');
      });
  };

  const handleCall = () => {
    const url = `tel:${whatsappNumber}`;
    Linking.openURL(url).catch((err) => {
      console.error('Error making call:', err);
      Alert.alert('Error', 'Could not make call. Please try again.');
    });
  };



  const complaintTypes = [
    {
      id: 1,
      title: 'Order Issues',
      icon: 'receipt-outline',
      color: '#e74c3c',
      subtypes: [
        'Order not received',
        'Wrong item delivered',
        'Damaged product',
        'Missing items',
        'Late delivery',
        'Order cancellation issue',
      ]
    },
    {
      id: 2,
      title: 'Payment Problems',
      icon: 'card-outline',
      color: '#f39c12',
      subtypes: [
        'Payment failed',
        'Double charged',
        'Refund not received',
        'Payment method not working',
        'Transaction error',
        'Invoice issue',
      ]
    },
    {
      id: 3,
      title: 'Product Quality',
      icon: 'cube-outline',
      color: '#9b59b6',
      subtypes: [
        'Defective product',
        'Poor quality',
        'Not as described',
        'Expired product',
        'Counterfeit concern',
        'Size/fit issue',
      ]
    },
    {
      id: 4,
      title: 'Account Issues',
      icon: 'person-outline',
      color: '#3498db',
      subtypes: [
        'Cannot login',
        'Password reset issue',
        'Account suspended',
        'Profile update problem',
        'Email verification issue',
        'Account security concern',
      ]
    },
    {
      id: 5,
      title: 'App Technical Issues',
      icon: 'bug-outline',
      color: '#e67e22',
      subtypes: [
        'App crashing',
        'Slow performance',
        'Features not working',
        'Cannot upload images',
        'Search not working',
        'Cart issues',
      ]
    },
    {
      id: 6,
      title: 'Seller Issues',
      icon: 'storefront-outline',
      color: '#16a085',
      subtypes: [
        'Seller not responding',
        'Fake seller',
        'Seller misconduct',
        'Product listing issue',
        'Seller rating dispute',
        'Communication problem',
      ]
    },
    {
      id: 7,
      title: 'Delivery Issues',
      icon: 'car-outline',
      color: '#27ae60',
      subtypes: [
        'Delivery delayed',
        'Wrong address',
        'Delivery person issue',
        'Package lost',
        'Delivery fee dispute',
        'Tracking not working',
      ]
    },
    {
      id: 8,
      title: 'Return & Refund',
      icon: 'return-up-back-outline',
      color: '#c0392b',
      subtypes: [
        'Return request rejected',
        'Refund delayed',
        'Return pickup issue',
        'Refund amount incorrect',
        'Return policy unclear',
        'Exchange not available',
      ]
    },
    {
      id: 9,
      title: 'Privacy & Security',
      icon: 'shield-checkmark-outline',
      color: '#8e44ad',
      subtypes: [
        'Data privacy concern',
        'Unauthorized access',
        'Suspicious activity',
        'Account hacked',
        'Personal info leaked',
        'Security vulnerability',
      ]
    },
    {
      id: 10,
      title: 'Other Issues',
      icon: 'ellipsis-horizontal-circle-outline',
      color: '#34495e',
      subtypes: [
        'General inquiry',
        'Feature request',
        'Feedback',
        'Partnership inquiry',
        'Media inquiry',
        'Other',
      ]
    },
  ];

  const faqs = [
    {
      id: 1,
      question: 'How do I track my order?',
      answer: 'Go to "My Orders" in your profile, select the order you want to track, and you\'ll see real-time tracking information including delivery status and estimated arrival time.'
    },
    {
      id: 2,
      question: 'What is your return policy?',
      answer: 'We offer a 7-day return policy for most items. Products must be unused, in original packaging, and with all tags attached. Refunds are processed within 5-7 business days after we receive the returned item.'
    },
    {
      id: 3,
      question: 'How long does delivery take?',
      answer: 'Standard delivery takes 2-5 business days within Uganda. Express delivery is available for 1-2 days. Delivery times may vary based on your location and product availability.'
    },
    {
      id: 4,
      question: 'What payment methods do you accept?',
      answer: 'We accept Mobile Money (MTN, Airtel), Visa/Mastercard, and Cash on Delivery. All payments are secure and encrypted.'
    },
    {
      id: 5,
      question: 'How do I cancel an order?',
      answer: 'You can cancel an order within 1 hour of placing it. Go to "My Orders", select the order, and tap "Cancel Order". If the order has already been processed, please contact support.'
    },
    {
      id: 6,
      question: 'Is my personal information secure?',
      answer: 'Yes, we use industry-standard encryption to protect your data. We never share your personal information with third parties without your consent.'
    },
    {
      id: 7,
      question: 'How do I become a seller?',
      answer: 'Download our app, tap on "Become a Seller", fill out the registration form with your business details, and our team will verify your account within 24-48 hours.'
    },
    {
      id: 8,
      question: 'What if I receive a damaged product?',
      answer: 'Contact us immediately with photos of the damaged item. We\'ll arrange a free return pickup and provide a full refund or replacement within 3-5 business days.'
    },
  ];

  const helpCategories = [
    {
      id: 1,
      title: 'Getting Started',
      icon: 'rocket-outline',
      color: '#3498db',
      description: 'Learn how to use the app',
    },
    {
      id: 2,
      title: 'Orders & Tracking',
      icon: 'location-outline',
      color: '#27ae60',
      description: 'Track and manage orders',
    },
    {
      id: 3,
      title: 'Payments',
      icon: 'wallet-outline',
      color: '#f39c12',
      description: 'Payment methods & issues',
    },
    {
      id: 4,
      title: 'Returns & Refunds',
      icon: 'refresh-outline',
      color: '#e74c3c',
      description: 'Return policy & refunds',
    },
  ];



  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={isDark ? theme.headerBg : theme.gradientStart} />
      
      {/* Header */}
      <LinearGradient
        colors={[theme.gradientStart, theme.gradientEnd]}
        style={styles.header}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>Help & Support</Text>
            
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Contact Support Card */}
        <View style={[styles.contactCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.contactTitle, { color: theme.text }]}>Need Immediate Help?</Text>
          <Text style={[styles.contactSubtitle, { color: theme.textSecondary }]}>Our support team is here for you</Text>
          
          <View style={styles.contactButtons}>
            <TouchableOpacity 
              style={[styles.contactButton, { backgroundColor: theme.whatsapp }]}
              onPress={handleWhatsAppContact}
            >
              <Ionicons name="logo-whatsapp" size={24} color="white" />
              <Text style={styles.contactButtonText}>WhatsApp</Text>
              <Text style={styles.contactNumber}>{whatsappNumber}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.contactButton, { backgroundColor: theme.call }]}
              onPress={handleCall}
            >
              <Ionicons name="call" size={24} color="white" />
              <Text style={styles.contactButtonText}>Call Us</Text>
              <Text style={styles.contactNumber}>Direct Support</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Help Categories */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Browse Help Topics</Text>
          <View style={styles.categoriesGrid}>
            {helpCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryCard, { backgroundColor: theme.card }]}
                onPress={() => {
                  Toast.show({
                    type: 'info',
                    text1: category.title,
                    text2: category.description,
                    position: 'top',
                    visibilityTime: 2000,
                  });
                }}
              >
                <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                  <Ionicons name={category.icon} size={28} color={category.color} />
                </View>
                <Text style={[styles.categoryTitle, { color: theme.text }]}>{category.title}</Text>
                <Text style={[styles.categoryDescription, { color: theme.textSecondary }]}>{category.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Report an Issue */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Report an Issue</Text>
          <View style={[styles.complaintSection, { backgroundColor: theme.card }]}>
            <Text style={[styles.complaintLabel, { color: theme.text }]}>Select Issue Type:</Text>
            <View style={styles.complaintTypes}>
              {complaintTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.complaintTypeCard,
                    { backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
                    selectedComplaintType?.id === type.id && { 
                      borderColor: theme.primary, 
                      backgroundColor: theme.primarySoft 
                    }
                  ]}
                  onPress={() => setSelectedComplaintType(type)}
                >
                  <View style={[styles.complaintIcon, { backgroundColor: type.color + '20' }]}>
                    <Ionicons name={type.icon} size={24} color={type.color} />
                  </View>
                  <Text style={[styles.complaintTypeTitle, { color: theme.text }]}>{type.title}</Text>
                  {selectedComplaintType?.id === type.id && (
                    <Ionicons name="checkmark-circle" size={20} color={type.color} style={styles.checkIcon} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {selectedComplaintType && (
              <View style={[styles.subtypesSection, { backgroundColor: theme.surfaceSecondary }]}>
                <Text style={[styles.subtypesLabel, { color: theme.text }]}>Common issues in {selectedComplaintType.title}:</Text>
                <View style={styles.subtypesList}>
                  {selectedComplaintType.subtypes.map((subtype, index) => (
                    <View key={index} style={styles.subtypeItem}>
                      <Ionicons name="chevron-forward" size={16} color={theme.icon} />
                      <Text style={[styles.subtypeText, { color: theme.textSecondary }]}>{subtype}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* FAQs */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Frequently Asked Questions</Text>
          <View style={[styles.faqContainer, { backgroundColor: theme.card }]}>
            {faqs.map((faq) => (
              <View key={faq.id} style={[styles.faqItem, { borderBottomColor: theme.divider }]}>
                <TouchableOpacity
                  style={styles.faqQuestion}
                  onPress={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                >
                  <Text style={[styles.faqQuestionText, { color: theme.text }]}>{faq.question}</Text>
                  <Ionicons 
                    name={expandedFAQ === faq.id ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={theme.primary} 
                  />
                </TouchableOpacity>
                {expandedFAQ === faq.id && (
                  <View style={styles.faqAnswer}>
                    <Text style={[styles.faqAnswerText, { color: theme.textSecondary }]}>{faq.answer}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Support Hours */}
        <View style={styles.section}>
          <View style={[styles.hoursCard, { backgroundColor: theme.card }]}>
            <Ionicons name="time-outline" size={32} color={theme.primary} />
            <Text style={[styles.hoursTitle, { color: theme.text }]}>Support Hours</Text>
            <Text style={[styles.hoursText, { color: theme.textSecondary }]}>Monday - Friday: 8:00 AM - 8:00 PM</Text>
            <Text style={[styles.hoursText, { color: theme.textSecondary }]}>Saturday: 9:00 AM - 6:00 PM</Text>
            <Text style={[styles.hoursText, { color: theme.textSecondary }]}>Sunday: 10:00 AM - 4:00 PM</Text>
            <Text style={[styles.hoursNote, { color: theme.primary }]}>We respond to all inquiries within 24 hours</Text>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Toast Component */}
      <Toast 
        config={{
          success: (props) => <CustomToast {...props} type="success" />,
          error: (props) => <CustomToast {...props} type="error" />,
          info: (props) => <CustomToast {...props} type="info" />,
          warning: (props) => <CustomToast {...props} type="warning" />,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 20,
  },
  safeArea: {
    paddingTop: Platform.OS === 'ios' ? 0 : 25,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  scrollContainer: {
    flex: 1,
  },
  contactCard: {
    marginHorizontal: 20,
    marginTop: -10,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  contactTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 5,
  },
  contactSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  contactButtons: {
    gap: 12,
  },
  contactButton: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
    borderRadius: 15,
    gap: 6,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  contactNumber: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 15,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    borderRadius: 15,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 12,
    textAlign: 'center',
  },
  complaintSection: {
    borderRadius: 15,
    padding: 20,
  },
  complaintLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  complaintTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  complaintTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    width: '48%',
    borderWidth: 2,
  },
  complaintIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  complaintTypeTitle: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  checkIcon: {
    marginLeft: 5,
  },
  subtypesSection: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  subtypesLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  subtypesList: {
    gap: 8,
  },
  subtypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subtypeText: {
    fontSize: 13,
  },

  faqContainer: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  faqItem: {
    borderBottomWidth: 1,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestionText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  faqAnswerText: {
    fontSize: 14,
    lineHeight: 20,
  },
  hoursCard: {
    borderRadius: 15,
    padding: 24,
    alignItems: 'center',
  },
  hoursTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 16,
  },
  hoursText: {
    fontSize: 14,
    marginBottom: 6,
  },
  hoursNote: {
    fontSize: 12,
    marginTop: 12,
    fontStyle: 'italic',
  },
  bottomSpacing: {
    height: 30,
  },
});

export default HelpSupport;
