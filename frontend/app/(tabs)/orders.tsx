import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import riderService from '../../src/services/riderService';
import Colors from '../../src/constants/colors';
import { Order } from '../../src/types';
import { formatDistanceToNow } from 'date-fns';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nearbyCount, setNearbyCount] = useState(0);
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const result = await riderService.getPendingOrders();
      setOrders(result.orders);
      setNearbyCount(result.nearby_count);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadOrders();
    setIsRefreshing(false);
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      setAcceptingOrderId(orderId);
      await riderService.acceptOrder(orderId);
      Alert.alert('Order Accepted!', 'Navigate to the restaurant for pickup.');
      loadOrders();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to accept order';
      Alert.alert('Error', message);
    } finally {
      setAcceptingOrderId(null);
    }
  };

  const renderOrderCard = ({ item }: { item: Order }) => {
    const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true });

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.restaurantInfo}>
            <View style={styles.restaurantIcon}>
              <Ionicons name="restaurant" size={20} color={Colors.orange} />
            </View>
            <View style={styles.restaurantDetails}>
              <Text style={styles.restaurantName}>{item.restaurant_name}</Text>
              <Text style={styles.restaurantAddress} numberOfLines={1}>
                {item.restaurant_address}
              </Text>
            </View>
          </View>
          <Text style={styles.timeAgo}>{timeAgo}</Text>
        </View>

        <View style={styles.deliveryInfo}>
          <Ionicons name="location" size={16} color={Colors.success} />
          <Text style={styles.deliveryAddress} numberOfLines={1}>
            {item.customer_address}
          </Text>
        </View>

        <View style={styles.orderFooter}>
          <View style={styles.orderStats}>
            <View style={styles.statBadge}>
              <Ionicons name="cube" size={14} color={Colors.textSecondary} />
              <Text style={styles.statText}>{item.items.length} items</Text>
            </View>
            <View style={styles.statBadge}>
              <Ionicons name="cash" size={14} color={Colors.success} />
              <Text style={[styles.statText, styles.earningsText]}>
                €{item.rider_price.toFixed(2)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAcceptOrder(item.id)}
            disabled={acceptingOrderId === item.id}
          >
            {acceptingOrderId === item.id ? (
              <ActivityIndicator color={Colors.textPrimary} size="small" />
            ) : (
              <Text style={styles.acceptButtonText}>ACCEPT</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={64} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>No orders available</Text>
      <Text style={styles.emptyText}>Pull down to refresh or check back soon</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Orders</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{nearbyCount} nearby</Text>
        </View>
      </View>

      {/* Orders List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  countBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  countText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  orderCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  restaurantInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  restaurantIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.orange + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  restaurantAddress: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  timeAgo: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginBottom: 12,
  },
  deliveryAddress: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  earningsText: {
    color: Colors.success,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
});
