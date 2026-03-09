import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
  Switch,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../src/context/AuthContext';
import riderService from '../../src/services/riderService';
import Colors from '../../src/constants/colors';
import { Task, WorkStatus, Location as LocationType } from '../../src/types';
import Config from '../../src/constants/config';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DashboardScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);
  
  const [isOnline, setIsOnline] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [nearbyOrdersCount, setNearbyOrdersCount] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayDeliveries, setTodayDeliveries] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<LocationType | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'loading' | 'active' | 'error' | 'denied'>('loading');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isRequestingOrder, setIsRequestingOrder] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const snapPoints = ['12%', '45%', '85%'];

  useEffect(() => {
    loadInitialData();
    requestLocationPermission();
  }, []);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const startLocationTracking = async () => {
      if (isOnline) {
        try {
          locationSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: Config.GPS_UPDATE_INTERVAL,
              distanceInterval: 10,
            },
            (location) => {
              const { latitude, longitude, accuracy, heading } = location.coords;
              setCurrentLocation({ latitude, longitude, accuracy: accuracy ?? undefined, heading: heading ?? undefined });
              setGpsAccuracy(accuracy);
              setGpsStatus('active');
              riderService.updateLocation(latitude, longitude).catch(console.error);
            }
          );
        } catch (error) {
          console.error('Location tracking error:', error);
          setGpsStatus('error');
        }
      }
    };

    startLocationTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [isOnline]);

  const requestLocationPermission = async () => {
    try {
      setGpsStatus('loading');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsStatus('denied');
        Alert.alert(
          'Location Permission Required',
          'Please enable location access to use the rider app.',
          [{ text: 'OK' }]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude, accuracy } = location.coords;
      setCurrentLocation({ latitude, longitude, accuracy: accuracy ?? undefined });
      setGpsAccuracy(accuracy);
      setGpsStatus('active');
    } catch (error) {
      console.error('Error getting location:', error);
      setGpsStatus('error');
    }
  };

  const loadInitialData = async () => {
    try {
      setIsLoadingStatus(true);
      const [workStatus, tasks, earnings, pendingOrders] = await Promise.all([
        riderService.getWorkStatus(),
        riderService.getTasks(),
        riderService.getEarnings(),
        riderService.getPendingOrders(),
      ]);

      setIsOnline(workStatus.is_online);
      setActiveTask(tasks.length > 0 ? tasks[0] : null);
      setTodayEarnings(earnings.today);
      setTodayDeliveries(earnings.total_deliveries);
      setNearbyOrdersCount(pendingOrders.nearby_count);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleToggleOnline = async () => {
    try {
      setIsToggling(true);
      if (isOnline) {
        await riderService.goOffline();
        setIsOnline(false);
      } else {
        if (gpsStatus !== 'active') {
          Alert.alert('GPS Required', 'Please enable GPS to go online.');
          return;
        }
        await riderService.goOnline();
        setIsOnline(true);
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      Alert.alert('Error', 'Failed to change status. Please try again.');
    } finally {
      setIsToggling(false);
    }
  };

  const handleRequestOrder = async () => {
    try {
      setIsRequestingOrder(true);
      const result = await riderService.requestOrder();
      if (result.order) {
        setActiveTask(result.order as Task);
        Alert.alert('Order Assigned!', `New order from ${result.order.restaurant_name}`);
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || 'No orders available right now';
      Alert.alert('Info', message);
    } finally {
      setIsRequestingOrder(false);
    }
  };

  const handleAcceptOrder = async () => {
    if (!activeTask) return;
    try {
      setIsUpdatingStatus(true);
      await riderService.acceptOrder(activeTask.id);
      setActiveTask({ ...activeTask, status: 'accepted' });
      Alert.alert('Order Accepted', 'Navigate to the restaurant for pickup.');
    } catch (error) {
      Alert.alert('Error', 'Failed to accept order.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeclineOrder = async () => {
    if (!activeTask) return;
    try {
      setIsUpdatingStatus(true);
      const result = await riderService.declineOrder(activeTask.id);
      setActiveTask(null);
      if (result.is_suspended) {
        Alert.alert('Account Suspended', 'You have declined too many orders. You are suspended for 45 minutes.');
        setIsOnline(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to decline order.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePickedUp = async () => {
    if (!activeTask || !currentLocation) return;
    try {
      setIsUpdatingStatus(true);
      await riderService.updateTaskStatus(
        activeTask.id,
        'picked_up',
        currentLocation.latitude,
        currentLocation.longitude
      );
      setActiveTask({ ...activeTask, status: 'picked_up' });
      Alert.alert('Picked Up', 'Now navigate to the customer for delivery.');
    } catch (error) {
      Alert.alert('Error', 'Failed to update status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelivered = async () => {
    if (!activeTask || !currentLocation) return;
    try {
      setIsUpdatingStatus(true);
      await riderService.updateTaskStatus(
        activeTask.id,
        'delivered',
        currentLocation.latitude,
        currentLocation.longitude
      );
      setActiveTask(null);
      setTodayEarnings(todayEarnings + activeTask.rider_price);
      setTodayDeliveries(todayDeliveries + 1);
      Alert.alert('Delivered!', `You earned \u20ac${activeTask.rider_price.toFixed(2)}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const openNavigation = (lat: number, lng: number, label: string) => {
    const url = Platform.select({
      ios: `maps://app?daddr=${lat},${lng}&q=${encodeURIComponent(label)}`,
      android: `google.navigation:q=${lat},${lng}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    });
    Linking.openURL(url as string);
  };

  const getGpsStatusColor = () => {
    switch (gpsStatus) {
      case 'active': return Colors.success;
      case 'loading': return Colors.warning;
      case 'error':
      case 'denied': return Colors.error;
      default: return Colors.textMuted;
    }
  };

  const getGpsQualityText = () => {
    if (gpsAccuracy === null) return 'Loading...';
    if (gpsAccuracy <= 10) return 'Excellent';
    if (gpsAccuracy <= 30) return 'Good';
    if (gpsAccuracy <= 100) return 'Fair';
    return 'Poor';
  };

  if (isLoadingStatus) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map Placeholder */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={48} color={Colors.textMuted} />
          <Text style={styles.mapPlaceholderText}>Map View</Text>
          {currentLocation && (
            <Text style={styles.locationText}>
              {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
            </Text>
          )}
          {/* Blue dot marker */}
          <View style={styles.riderMarker}>
            <View style={styles.riderMarkerInner} />
          </View>
        </View>
      </View>

      {/* Header Overlay */}
      <SafeAreaView style={styles.headerOverlay} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.menuButton}>
              <Ionicons name="menu" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          
          {/* GPS Status Badge - matching web design */}
          <View style={[styles.gpsBadge, { backgroundColor: getGpsStatusColor() }]}>
            <View style={styles.gpsStatusDot} />
            <Text style={styles.gpsText}>
              GPS: \u00b1{gpsAccuracy?.toFixed(0) || '0'}m ({getGpsQualityText()})
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Floating Buttons */}
      <View style={styles.floatingButtons}>
        <TouchableOpacity style={styles.floatingButtonOrange}>
          <Ionicons name="power" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.floatingButtonCyan} onPress={requestLocationPermission}>
          <Ionicons name="locate" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Navigate Button (when has active task) */}
      {activeTask && (
        <TouchableOpacity
          style={styles.navigateButton}
          onPress={() => {
            const lat = activeTask.status === 'picked_up' 
              ? activeTask.customer_latitude 
              : activeTask.restaurant_latitude;
            const lng = activeTask.status === 'picked_up'
              ? activeTask.customer_longitude
              : activeTask.restaurant_longitude;
            const label = activeTask.status === 'picked_up'
              ? activeTask.customer_address
              : activeTask.restaurant_name;
            openNavigation(lat, lng, label);
          }}
        >
          <Ionicons name="navigate" size={20} color={Colors.textPrimary} />
          <Text style={styles.navigateButtonText}>Navigate</Text>
        </TouchableOpacity>
      )}

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetIndicator}
      >
        <BottomSheetScrollView style={styles.bottomSheetContent}>
          {/* Collapse indicator */}
          <View style={styles.collapseIndicator}>
            <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
            <Text style={styles.collapseText}>Drag down or tap to collapse</Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
          </View>

          {/* Online/Offline Toggle - matching web design */}
          <TouchableOpacity 
            style={[styles.toggleContainer, isOnline && styles.toggleContainerOnline]}
            onPress={handleToggleOnline}
            disabled={isToggling}
          >
            <View style={styles.toggleIconContainer}>
              <Ionicons name="power" size={24} color={isOnline ? Colors.success : Colors.textMuted} />
            </View>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleLabel}>{isOnline ? 'Online' : 'Offline'}</Text>
              <Text style={styles.toggleSubtext}>
                {isOnline ? 'Receiving orders' : 'Tap to go online'}
              </Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              disabled={isToggling}
              trackColor={{ false: Colors.textMuted, true: Colors.primary }}
              thumbColor={Colors.textPrimary}
            />
          </TouchableOpacity>

          {/* Offline State Message */}
          {!isOnline && !activeTask && (
            <View style={styles.offlineMessage}>
              <View style={styles.offlineIconContainer}>
                <Ionicons name="power" size={48} color={Colors.primary} />
              </View>
              <Text style={styles.offlineTitle}>You're offline</Text>
              <Text style={styles.offlineSubtext}>Go online to start receiving orders</Text>
            </View>
          )}

          {/* Online State - Stats and Order Request */}
          {isOnline && !activeTask && (
            <View style={styles.onlineContent}>
              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>\u20ac{todayEarnings.toFixed(2)}</Text>
                  <Text style={styles.statLabel}>Today</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{todayDeliveries}</Text>
                  <Text style={styles.statLabel}>Deliveries</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{nearbyOrdersCount}</Text>
                  <Text style={styles.statLabel}>Nearby</Text>
                </View>
              </View>

              {/* Request Order Button */}
              <TouchableOpacity
                style={styles.requestOrderButton}
                onPress={handleRequestOrder}
                disabled={isRequestingOrder}
              >
                {isRequestingOrder ? (
                  <ActivityIndicator color={Colors.textPrimary} />
                ) : (
                  <>
                    <Ionicons name="flash" size={24} color={Colors.textPrimary} />
                    <Text style={styles.requestOrderText}>Request Order</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Active Task Card */}
          {activeTask && (
            <View style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <View style={[styles.taskStatusBadge, 
                  activeTask.status === 'assigned' && styles.statusAssigned,
                  activeTask.status === 'accepted' && styles.statusAccepted,
                  activeTask.status === 'picked_up' && styles.statusPickedUp,
                ]}>
                  <Text style={styles.taskStatusText}>
                    {activeTask.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Pickup Info */}
              <View style={styles.taskLocation}>
                <View style={styles.locationMarkerOrange}>
                  <Ionicons name="restaurant" size={20} color={Colors.orange} />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>PICKUP FROM</Text>
                  <Text style={styles.locationName}>{activeTask.restaurant_name}</Text>
                  <Text style={styles.locationAddress}>{activeTask.restaurant_address}</Text>
                </View>
              </View>

              <View style={styles.taskArrow}>
                <Ionicons name="arrow-down" size={20} color={Colors.textMuted} />
              </View>

              {/* Delivery Info */}
              <View style={styles.taskLocation}>
                <View style={styles.locationMarkerGreen}>
                  <Ionicons name="location" size={20} color={Colors.success} />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>DELIVER TO</Text>
                  <Text style={styles.locationName}>{activeTask.customer_name}</Text>
                  <Text style={styles.locationAddress}>{activeTask.customer_address}</Text>
                  {activeTask.delivery_notes && (
                    <Text style={styles.deliveryNotes}>{activeTask.delivery_notes}</Text>
                  )}
                </View>
              </View>

              {/* Order Details */}
              <View style={styles.orderDetails}>
                <Text style={styles.orderDetailText}>
                  {activeTask.items.length} items \u2022 \u20ac{activeTask.total.toFixed(2)}
                </Text>
                <Text style={styles.earningsText}>
                  You earn: \u20ac{activeTask.rider_price.toFixed(2)}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                {activeTask.status === 'assigned' && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.declineButton]}
                      onPress={handleDeclineOrder}
                      disabled={isUpdatingStatus}
                    >
                      {isUpdatingStatus ? (
                        <ActivityIndicator color={Colors.textPrimary} />
                      ) : (
                        <Text style={styles.actionButtonText}>DECLINE</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={handleAcceptOrder}
                      disabled={isUpdatingStatus}
                    >
                      {isUpdatingStatus ? (
                        <ActivityIndicator color={Colors.textPrimary} />
                      ) : (
                        <Text style={styles.actionButtonText}>ACCEPT</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
                {activeTask.status === 'accepted' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton]}
                    onPress={handlePickedUp}
                    disabled={isUpdatingStatus}
                  >
                    {isUpdatingStatus ? (
                      <ActivityIndicator color={Colors.textPrimary} />
                    ) : (
                      <Text style={styles.actionButtonText}>PICKED UP</Text>
                    )}
                  </TouchableOpacity>
                )}
                {activeTask.status === 'picked_up' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.successButton]}
                    onPress={handleDelivered}
                    disabled={isUpdatingStatus}
                  >
                    {isUpdatingStatus ? (
                      <ActivityIndicator color={Colors.textPrimary} />
                    ) : (
                      <Text style={styles.actionButtonText}>DELIVERED</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
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
  loadingText: {
    marginTop: 16,
    color: Colors.textSecondary,
    fontSize: 16,
  },
  mapContainer: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#E8F4F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    marginTop: 12,
    color: Colors.textMuted,
    fontSize: 18,
    fontWeight: '600',
  },
  locationText: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  riderMarker: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  riderMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 8,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  gpsStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 6,
  },
  gpsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  floatingButtons: {
    position: 'absolute',
    right: 16,
    bottom: '50%',
    gap: 12,
  },
  floatingButtonOrange: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingButtonCyan: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  navigateButton: {
    position: 'absolute',
    left: 16,
    bottom: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: Colors.primary,
  },
  navigateButtonText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomSheetBackground: {
    backgroundColor: Colors.backgroundCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  bottomSheetIndicator: {
    backgroundColor: Colors.primary,
    width: 48,
    height: 4,
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  collapseIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  collapseText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleContainerOnline: {
    borderColor: Colors.primary,
  },
  toggleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  toggleSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  offlineMessage: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  offlineIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  offlineTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  offlineSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  onlineContent: {
    paddingBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    marginHorizontal: 8,
  },
  requestOrderButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  requestOrderText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  taskCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  taskHeader: {
    marginBottom: 16,
  },
  taskStatusBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusAssigned: {
    backgroundColor: Colors.warning + '20',
  },
  statusAccepted: {
    backgroundColor: Colors.primary + '20',
  },
  statusPickedUp: {
    backgroundColor: Colors.success + '20',
  },
  taskStatusText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  taskLocation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationMarkerOrange: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.orange + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationMarkerGreen: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  locationAddress: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  deliveryNotes: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  taskArrow: {
    alignItems: 'center',
    marginVertical: 8,
    marginLeft: 10,
  },
  orderDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDetailText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  earningsText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.success,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: Colors.success,
  },
  declineButton: {
    backgroundColor: Colors.error,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  successButton: {
    backgroundColor: Colors.success,
  },
  actionButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
