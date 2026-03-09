import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import riderService from '../../src/services/riderService';
import Colors from '../../src/constants/colors';
import { RiderProfile } from '../../src/types';
import { format } from 'date-fns';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const data = await riderService.getProfile();
      setProfile(data);
      setEditName(data.name);
      setEditPhone(data.phone || '');
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    try {
      setIsSaving(true);
      await riderService.updateProfile({
        name: editName.trim(),
        phone: editPhone.trim(),
      });
      setProfile((prev) => prev ? { ...prev, name: editName.trim(), phone: editPhone.trim() } : null);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return Colors.success;
      case 'pending': return Colors.warning;
      case 'suspended': return Colors.error;
      default: return Colors.textMuted;
    }
  };

  const getVehicleIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'bicycle': return 'bicycle';
      case 'motorcycle': return 'bicycle';
      case 'car': return 'car';
      default: return 'bicycle';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
          <Ionicons
            name={isEditing ? 'close' : 'create-outline'}
            size={24}
            color={Colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color={Colors.orange} />
            </View>
          </View>
          
          {isEditing ? (
            <TextInput
              style={styles.nameInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={Colors.textMuted}
            />
          ) : (
            <Text style={styles.profileName}>{profile?.name}</Text>
          )}
          
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color={Colors.warning} />
            <Text style={styles.ratingText}>{profile?.rating?.toFixed(1) || '0.0'}</Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(profile?.status || '') + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(profile?.status || '') }]}>
              {profile?.status?.toUpperCase() || 'UNKNOWN'}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.total_deliveries || 0}</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {profile?.created_at ? format(new Date(profile.created_at), 'MMM yyyy') : '-'}
            </Text>
            <Text style={styles.statLabel}>Member since</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>98%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={20} color={Colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile?.email}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="call" size={20} color={Colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              {isEditing ? (
                <TextInput
                  style={styles.infoInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Your phone"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.infoValue}>{profile?.phone || 'Not set'}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Work Info */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Work Information</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name={getVehicleIcon(profile?.vehicle_type || '')} size={20} color={Colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Vehicle Type</Text>
              <Text style={styles.infoValue}>
                {profile?.vehicle_type ? profile.vehicle_type.charAt(0).toUpperCase() + profile.vehicle_type.slice(1) : 'Not set'}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color={Colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Work Region</Text>
              <Text style={styles.infoValue}>{profile?.work_region || 'Not set'}</Text>
            </View>
          </View>
        </View>

        {/* Save Button (when editing) */}
        {isEditing && (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={Colors.textPrimary} />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>DeliviO-S Rider v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scrollContent: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.orange + '20',
    borderWidth: 3,
    borderColor: Colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  nameInput: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingBottom: 4,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  infoSection: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  infoInput: {
    fontSize: 16,
    color: Colors.textPrimary,
    marginTop: 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingBottom: 4,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 20,
  },
  logoutText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 20,
  },
});
