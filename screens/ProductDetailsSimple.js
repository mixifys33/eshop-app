import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CartWishlistService from '../services/cartWishlistService';
import QuantitySelector from '../components/QuantitySelector';

const { width } = Dimensions.get('window');

const ProductDetails = ({ navigation, route }) => {
  // Debug logging
  console.log('=== Pro
