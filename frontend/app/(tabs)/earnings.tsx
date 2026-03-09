import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import riderService from '../../src/services/riderService';
import Colors from '../../src/constants/colors';
import { Earnings, Task } from '../../src/types';
import { format, isToday, isYesterday, differenceInHours } from 'date-fns';

type Period = 'today' | 'this_week' | 'this_month';

export default function EarningsScreen() {
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
    try {
      setIsLoading(true);
      const data = await riderService.getEarnings();
      setEarnings(data);
    } catch (error) {
      console.error('Error loading earnings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadEarnings();
    setIsRefreshing(false);
  };

  const getEarningsForPeriod = (): number => {
    if (!earnings) return 0;
    switch (selectedPeriod) {
      case 'today': return earnings.today;
      case 'this_week': return earnings.this_week;
      case 'this_month': return earnings.this_month;
      default: return 0;
    }
  };

  const shouldShowAddress = (task: Task, index: number): boolean => {
    const hoursAgo = differenceInHours(new Date(), new Date(task.created_at));
    return index < 2 || hoursAgo <= 4;
  };

  const groupTasksByDate = (tasks: Task[]): { [key: string]: Task[] } => {
    const groups: { [key: string]: Task[] } = {};
    tasks.forEach((task) => {
      const date = new Date(task.created_at);
      let dateKey: string;
      if (isToday(date)) {
        dateKey = 'Today';
      } else if (isYesterday(date)) {
        dateKey = 'Yesterday';
      } else {
        dateKey = format(date, 'dd MMM yyyy');
      }
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(task);
    });
    return groups;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const periodEarnings = getEarningsForPeriod();
  const groupedTasks = earnings ? groupTasksByDate(earnings.tasks) : {};

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="wallet" size={24} color={Colors.primary} />
        </View>
        <Text style={styles.headerTitle}>Total earnings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Payout Card */}
        <View style={styles.payoutCard}>
          <Text style={styles.payoutLabel}>NEXT PAYOUT AFTER 31 MAR</Text>
          <Text style={styles.payoutAmount}>\u20ac{periodEarnings.toFixed(2)}</Text>
          <Text style={styles.payoutNote}>
            These unpaid earnings are estimated and may change for the final payout
          </Text>
        </View>

        {/* Summary Section */}
        <View style={styles.summarySection}>
          <View style={styles.summaryHeader}>
            <Ionicons name="trending-up" size={20} color={Colors.primary} />
            <Text style={styles.summaryTitle}>Summary</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Deliveries</Text>
            <View style={styles.summaryValueContainer}>
              <Text style={styles.summaryValue}>\u20ac{periodEarnings.toFixed(2)}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
            </View>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Number of orders</Text>
            <Text style={styles.summaryValuePlain}>{earnings?.total_deliveries || 0}</Text>
          </View>
          
          <View style={[styles.summaryRow, styles.summaryRowLast]}>
            <View style={styles.summaryLabelWithIcon}>
              <Ionicons name="navigate" size={16} color={Colors.primary} />
              <Text style={styles.summaryLabel}>Total km</Text>
            </View>
            <Text style={styles.summaryValueCyan}>0.00 km</Text>
          </View>
        </View>

        {/* Daily Details */}
        <View style={styles.dailySection}>
          <Text style={styles.dailyTitle}>Daily details</Text>
          
          {Object.keys(groupedTasks).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No deliveries yet</Text>
            </View>
          ) : (
            Object.entries(groupedTasks).map(([date, tasks]) => (
              <View key={date} style={styles.dateGroup}>
                <Text style={styles.dateHeader}>{date}</Text>
                {tasks.map((task, index) => (
                  <View key={task.id} style={styles.historyItem}>
                    <View style={styles.historyTime}>
                      <Text style={styles.historyTimeText}>
                        {format(new Date(task.created_at), 'HH:mm')}
                      </Text>
                    </View>
                    <View style={styles.historyDetails}>
                      {shouldShowAddress(task, index) ? (
                        <Text style={styles.historyRoute} numberOfLines={1}>
                          {task.restaurant_name} \u2192 {task.customer_address.split(',')[0]}
                        </Text>
                      ) : (
                        <Text style={styles.historyRoutePrivate}>Delivery completed</Text>
                      )}
                    </View>
                    <Text style={styles.historyAmount}>\u20ac{task.rider_price.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerIcon: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scrollContent: {
    padding: 16,
  },
  payoutCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  payoutLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  payoutAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.primary,
    marginVertical: 8,
  },
  payoutNote: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  summarySection: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginLeft: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  summaryRowLast: {
    marginBottom: 0,
  },
  summaryLabel: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  summaryLabelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  summaryValuePlain: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  summaryValueCyan: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  dailySection: {
    marginBottom: 20,
  },
  dailyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  historyTime: {
    width: 50,
  },
  historyTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  historyDetails: {
    flex: 1,
    marginLeft: 12,
  },
  historyRoute: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  historyRoutePrivate: {
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
});
