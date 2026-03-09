import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import Colors from '../src/constants/colors';
import { router } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        router.replace('/(tabs)');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={styles.logoWrapper}>
              <Text style={styles.logoD}>D</Text>
              <View style={styles.logoDotsRow}>
                <View style={[styles.logoDot, { backgroundColor: Colors.orange }]} />
                <View style={[styles.logoDot, { backgroundColor: Colors.orange }]} />
              </View>
            </View>
          </View>

          {/* Welcome Text */}
          <Text style={styles.welcomeText}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          {/* Login Form */}
          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={22}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Message */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.textPrimary} />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Demo Info */}
          <View style={styles.demoContainer}>
            <Text style={styles.demoText}>Demo: rider@delivio.fi / password</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoWrapper: {
    alignItems: 'center',
  },
  logoD: {
    fontSize: 72,
    fontWeight: 'bold',
    color: Colors.orange,
  },
  logoDotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: -12,
  },
  logoDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  formContainer: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  eyeButton: {
    padding: 16,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  signInButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  demoContainer: {
    alignItems: 'center',
  },
  demoText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
