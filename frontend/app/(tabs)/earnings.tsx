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
    // Privacy feature: Show full details only for last 2 orders or within 4 hours
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
        <Text style={styles.headerTitle}>My Earnings</Text>
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
        {/* Period Tabs */}
        <View style={styles.periodTabs}>
          {(['today', 'this_week', 'this_month'] as Period[]).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodTab,
                selectedPeriod === period && styles.periodTabActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodTabText,
                  selectedPeriod === period && styles.periodTabTextActive,
                ]}
              >
                {period === 'today' ? 'Today' : period === 'this_week' ? 'This Week' : 'This Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Earnings</Text>
          <Text style={styles.summaryAmount}>€{periodEarnings.toFixed(2)}</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Ionicons name="bicycle" size={20} color={Colors.primary} />
              <Text style={styles.summaryStatValue}>{earnings?.total_deliveries || 0}</Text>
              <Text style={styles.summaryStatLabel}>Deliveries</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStat}>
              <Ionicons name="cash" size={20} color={Colors.success} />
              <Text style={styles.summaryStatValue}>
                €{earnings?.total_deliveries ? (periodEarnings / earnings.total_deliveries).toFixed(2) : '0.00'}
              </Text>
              <Text style={styles.summaryStatLabel}>Avg per delivery</Text>
            </View>
          </View>
        </View>

        {/* Breakdown Card */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Earnings Breakdown</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Base earnings</Text>
            <Text style={styles.breakdownValue}>€{(periodEarnings * 0.75).toFixed(2)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Distance bonus</Text>
            <Text style={styles.breakdownValue}>€{(periodEarnings * 0.15).toFixed(2)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Tips</Text>
            <Text style={styles.breakdownValue}>€{(periodEarnings * 0.10).toFixed(2)}</Text>
          </View>
          <View style={[styles.breakdownRow, styles.breakdownTotal]}>
            <Text style={styles.breakdownTotalLabel}>Net earnings</Text>
            <Text style={styles.breakdownTotalValue}>€{periodEarnings.toFixed(2)}</Text>
          </View>
        </View>

        {/* Delivery History */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Delivery History</Text>
          {Object.entries(groupedTasks).map(([date, tasks]) => (
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
                        {task.restaurant_name} → {task.customer_address.split(',')[0]}
                      </Text>
                    ) : (
                      <Text style={styles.historyRoutePrivate}>Delivery completed</Text>
                    )}
                  </View>
                  <Text style={styles.historyAmount}>€{task.rider_price.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          ))}
          {Object.keys(groupedTasks).length === 0 && (
            <View style={styles.emptyHistory}>
              <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyHistoryText}>No deliveries yet</Text>
            </View>
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
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodTabActive: {
    backgroundColor: Colors.primary,
  },
  periodTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  periodTabTextActive: {
    color: Colors.textPrimary,
  },
  summaryCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  summaryAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginVertical: 8,
  },
  summaryStats: {
    flexDirection: 'row',
    marginTop: 16,
    width: '100%',
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  summaryStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  summaryStatDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  breakdownCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  breakdownValue: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  breakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 8,
    paddingTop: 16,
  },
  breakdownTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  breakdownTotalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.success,
  },
  historySection: {
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
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
    color: Colors.success,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 12,
  },
});
