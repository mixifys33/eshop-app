import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import CustomToast from "../components/CustomToast";
import API_BASE from "../constants/api";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get("window");

const Login = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = "Email is required";
      Toast.show({
        type: "error",
        text1: "Email Required",
        text2: "Please enter your email address",
        position: "top",
        visibilityTime: 3000,
      });
    } else if (!validateEmail(email)) {
      newErrors.email = "Invalid email address";
      Toast.show({
        type: "error",
        text1: "Invalid Email",
        text2: "Please enter a valid email address",
        position: "top",
        visibilityTime: 3000,
      });
    }

    if (!password) {
      newErrors.password = "Password is required";
      Toast.show({
        type: "error",
        text1: "Password Required",
        text2: "Please enter your password",
        position: "top",
        visibilityTime: 3000,
      });
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      Toast.show({
        type: "error",
        text1: "Password Too Short",
        text2: "Password must be at least 6 characters long",
        position: "top",
        visibilityTime: 3000,
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    // Show loading toast
    Toast.show({
      type: "info",
      text1: "Signing In...",
      text2: "Please wait while we verify your credentials",
      position: "top",
      visibilityTime: 2000,
    });

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store user data
        await AsyncStorage.setItem("userToken", data.token);
        await AsyncStorage.setItem("userData", JSON.stringify(data.user));
        // currentUser is read by Checkout, PaymentScreen, UserOrders
        await AsyncStorage.setItem("currentUser", JSON.stringify(data.user));

        // ── Link push token to this user now that they're logged in ──
        try {
          const {
            linkPushTokenToUser,
          } = require("../services/pushNotificationService");
          await linkPushTokenToUser(data.user._id || data.user.id);
        } catch (pushErr) {
          console.warn(
            "[Login] Push token link failed (non-fatal):",
            pushErr.message,
          );
        }

        if (rememberMe) {
          Toast.show({
            type: "info",
            text1: "Credentials Saved",
            text2: "Your login details have been remembered",
            position: "top",
            visibilityTime: 2000,
          });
        }

        // Success toast
        Toast.show({
          type: "success",
          text1: "Welcome Back!",
          text2: data.message || "Login successful! Redirecting...",
          position: "top",
          visibilityTime: 2000,
        });

        // Navigate after a short delay to show the success message
        setTimeout(() => {
          console.log("Login: Navigating to home screen");
          navigation.navigate("home");
        }, 1500);
      } else {
        // Error toast based on response
        if (data.message && data.message.includes("Invalid credentials")) {
          Toast.show({
            type: "error",
            text1: "Invalid Credentials",
            text2: "Please check your email and password",
            position: "top",
            visibilityTime: 4000,
          });
        } else if (data.message && data.message.includes("not verified")) {
          Toast.show({
            type: "warning",
            text1: "Account Not Verified",
            text2: "Please check your email and verify your account",
            position: "top",
            visibilityTime: 4000,
          });
        } else {
          Toast.show({
            type: "error",
            text1: "Login Failed",
            text2: data.message || data.error || "Something went wrong",
            position: "top",
            visibilityTime: 4000,
          });
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      Toast.show({
        type: "error",
        text1: "Connection Error",
        text2: "Please check your internet connection and try again",
        position: "top",
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    Toast.show({
      type: "info",
      text1: "Coming Soon!",
      text2: "Google login will be available in the next update",
      position: "top",
      visibilityTime: 3000,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent"
        translucent={true}
      />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Background Gradient */}
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          style={styles.backgroundGradient}
        />

        {/* Header Section */}
        <View style={[styles.headerSection, { paddingTop: insets.top + 20 }]}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={["#FF6B6B", "#4ECDC4"]}
              style={styles.logoGradient}
            >
              <MaterialIcons name="shopping-bag" size={32} color="white" />
            </LinearGradient>
            <Text style={styles.brandName}>EasyShop</Text>
          </View>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.subtitleText}>Sign in to continue shopping</Text>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContainer, {
            paddingBottom: insets.bottom + 20,
            flexGrow: 1,
          }]}
          showsVerticalScrollIndicator={false}
          bounces={true}
          scrollEventThrottle={16}
          removeClippedSubviews={Platform.OS === 'android'}
        >
          {/* Main Form Card */}
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Sign In</Text>
              <Text style={styles.formSubtitle}>
                Don't have an account?{" "}
                <Text
                  style={styles.linkText}
                  onPress={() => navigation.navigate("Signup")}
                >
                  Sign Up
                </Text>
              </Text>
            </View>

            {/* Social Login */}
            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleGoogleLogin}
            >
              <View style={styles.socialIconContainer}>
                <Ionicons name="logo-google" size={20} color="#4285F4" />
              </View>
              <Text style={styles.socialButtonText}>Continue with Google</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.email && styles.inputError,
                ]}
              >
                <MaterialIcons
                  name="email"
                  size={20}
                  color="#9CA3AF"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    // Clear error when user starts typing
                    if (errors.email) {
                      setErrors((prev) => ({ ...prev, email: null }));
                    }
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.password && styles.inputError,
                ]}
              >
                <MaterialIcons
                  name="lock"
                  size={20}
                  color="#9CA3AF"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    // Clear error when user starts typing
                    if (errors.password) {
                      setErrors((prev) => ({ ...prev, password: null }));
                    }
                  }}
                  secureTextEntry={!passwordVisible}
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setPasswordVisible(!passwordVisible)}
                >
                  <Ionicons
                    name={passwordVisible ? "eye" : "eye-off"}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            {/* Options Row */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxChecked,
                  ]}
                >
                  {rememberMe && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </View>
                <Text style={styles.checkboxText}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate("UserForgotPassword")}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient
                colors={["#667eea", "#764ba2"]}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Sign In</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color="white"
                      style={styles.buttonIcon}
                    />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.formFooter}>
              {/* Continue as Guest */}
              <TouchableOpacity
                style={styles.guestButton}
                onPress={() => {
                  Toast.show({
                    type: "info",
                    text1: "Welcome Guest!",
                    text2: "You can browse products without an account",
                    position: "top",
                    visibilityTime: 2000,
                  });
                  setTimeout(() => {
                    navigation.navigate("home");
                  }, 1000);
                }}
              >
                <Ionicons name="person-outline" size={16} color="#667eea" />
                <Text style={styles.guestButtonText}>Continue as Guest</Text>
              </TouchableOpacity>

              <Text style={styles.footerText}>
                By signing in, you agree to our{" "}
                <Text style={styles.linkText}>Terms of Service</Text> and{" "}
                <Text style={styles.linkText}>Privacy Policy</Text>
              </Text>

              {/* Special Guest */}
              <TouchableOpacity
                style={styles.specialGuestButton}
                onPress={() => navigation.navigate("SpecialGuest")}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={16}
                  color="#115061"
                />
                <Text style={styles.specialGuestText}>
                  Continue with special guest credentials
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
    backgroundColor: "#f8fafc",
  },
  keyboardContainer: {
    flex: 1,
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
  },
  headerSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  brandName: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    letterSpacing: 0.5,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "600",
    color: "white",
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  formCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 32,
    marginTop: -20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 40,
  },
  formHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
  linkText: {
    color: "#667eea",
    fontWeight: "600",
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  socialIconContainer: {
    width: 24,
    alignItems: "center",
  },
  socialButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    marginLeft: 16,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: "500",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#1f2937",
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 6,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#667eea",
    borderColor: "#667eea",
  },
  checkboxText: {
    fontSize: 14,
    color: "#6b7280",
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#667eea",
    fontWeight: "600",
  },
  loginButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  formFooter: {
    alignItems: "center",
  },
  guestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f4ff",
    borderWidth: 1,
    borderColor: "#667eea",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    width: "100%",
  },
  guestButtonText: {
    color: "#667eea",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  footerText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 18,
  },
  specialGuestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: "#115061",
    borderRadius: 12,
    width: "100%",
  },
  specialGuestText: {
    color: "#115061",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default Login;
