import React, {useEffect, useCallback, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Linking,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Card, Avatar} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';
import {RootStackParamList, Student} from '../../types';
import {getExpiryAlerts, updateStudent} from '../../services/studentService';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteT = RouteProp<RootStackParamList, 'ExpiryList'>;

const formatExpiry = (expiryDate: string) => {
  const today = dayjs().startOf('day');
  const expiry = dayjs(expiryDate).startOf('day');
  const diffDays = expiry.diff(today, 'day');

  if (diffDays === 0) return {label: 'Expires today!', isExpired: false};
  if (diffDays > 0) {
    if (diffDays < 30) return {label: `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`, isExpired: false};
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;
    return {
      label: days > 0 ? `Expires in ${months}m ${days}d` : `Expires in ${months} month${months > 1 ? 's' : ''}`,
      isExpired: false,
    };
  }
  const absDays = Math.abs(diffDays);
  if (absDays < 30) return {label: `Expired ${absDays} day${absDays === 1 ? '' : 's'} ago`, isExpired: true};
  const months = Math.floor(absDays / 30);
  const days = absDays % 30;
  return {
    label: days > 0 ? `Expired ${months}m ${days}d ago` : `Expired ${months} month${months > 1 ? 's' : ''} ago`,
    isExpired: true,
  };
};

const getExpiryColor = (expiryDate: string) => {
  const diffDays = dayjs(expiryDate).startOf('day').diff(dayjs().startOf('day'), 'day');
  if (diffDays < 0) return COLORS.error;
  if (diffDays <= 3) return COLORS.warning;
  return COLORS.info;
};

const ExpiryListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const {gym, user} = useAuthStore();
  const {isDark} = useThemeStore();
  const insets = useSafeAreaInsets();

  const trainerId = route.params?.trainerId;
  const expiryFilter = route.params?.expiryFilter;

  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;

  const load = useCallback(async () => {
    if (!gym) return;
    setLoading(true);
    const result = await getExpiryAlerts(gym.id, trainerId);
    if (result.data) setAllStudents(result.data);
    setLoading(false);
  }, [gym, trainerId]);

  const students = React.useMemo(() => {
    if (!expiryFilter) return allStudents;
    return allStudents.filter(s => {
      if (!s.membership_expiry) return false;
      const diffDays = dayjs(s.membership_expiry).startOf('day').diff(dayjs().startOf('day'), 'day');
      if (expiryFilter === 'expired') return diffDays < 0;
      if (expiryFilter === 'expiring_3') return diffDays >= 0 && diffDays <= 3;
      if (expiryFilter === 'expiring_7') return diffDays >= 4 && diffDays <= 7;
      return true;
    });
  }, [allStudents, expiryFilter]);

  const headerTitle = expiryFilter === 'expired'
    ? 'Expired Memberships'
    : expiryFilter === 'expiring_3'
    ? 'Expiring in 3 Days'
    : expiryFilter === 'expiring_7'
    ? 'Expiring in 4-7 Days'
    : 'Membership Alerts';

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleActive = async (student: Student) => {
    if (user?.role === 'Trainer') {
      Alert.alert('Permission Denied', 'Only Admin or Manager can activate or deactivate students.');
      return;
    }
    const newState = !student.is_active;
    Alert.alert(
      newState ? 'Activate Student' : 'Deactivate Student',
      `${newState ? 'Activate' : 'Deactivate'} ${student.name}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Confirm',
          style: newState ? 'default' : 'destructive',
          onPress: async () => {
            setToggling(student.id);
            const res = await updateStudent(student.id, {is_active: newState}, gym?.id);
            if (res.error) {
              Alert.alert('Error', res.error);
            } else {
              setAllStudents(prev =>
                prev.map((s: Student) => (s.id === student.id ? {...s, is_active: newState} : s)),
              );
            }
            setToggling(null);
          },
        },
      ],
    );
  };

  const renderItem = ({item}: {item: Student}) => {
    if (!item.membership_expiry) return null;
    const {label, isExpired} = formatExpiry(item.membership_expiry);
    const color = getExpiryColor(item.membership_expiry);
    const initials = item.name.slice(0, 2).toUpperCase();

    return (
      <Card
        style={[styles.card, {backgroundColor: cardBg}]}
        onPress={() => navigation.navigate('StudentDetail', {studentId: item.id})}>
        <Card.Content style={styles.cardContent}>
          <Avatar.Text
            size={44}
            label={initials}
            style={{backgroundColor: color + '25'}}
            labelStyle={{color, fontSize: 15, fontWeight: '700'}}
          />
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, {color: textColor}]} numberOfLines={1}>
                {item.name}
              </Text>
              {!item.is_active && (
                <View style={[styles.inactiveBadge, {backgroundColor: COLORS.error + '20'}]}>
                  <Text style={[styles.inactiveBadgeText, {color: COLORS.error}]}>Inactive</Text>
                </View>
              )}
            </View>
            <Text style={[styles.phone, {color: COLORS.textSecondary}]}>{item.phone}</Text>
            <View style={styles.expiryRow}>
              <MaterialCommunityIcons
                name={isExpired ? 'calendar-remove' : 'calendar-clock'}
                size={13}
                color={color}
              />
              <Text style={[styles.expiryLabel, {color}]}>{label}</Text>
            </View>
            {item.package && (
              <Text style={[styles.packageName, {color: COLORS.textSecondary}]} numberOfLines={1}>
                {item.package.name}
              </Text>
            )}
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, {backgroundColor: COLORS.success + '20'}]}
              onPress={() => Linking.openURL(`tel:${item.phone}`)}>
              <MaterialCommunityIcons name="phone" size={17} color={COLORS.success} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, {backgroundColor: COLORS.primary + '20'}]}
              onPress={() => navigation.navigate('RenewStudent', {studentId: item.id})}>
              <MaterialCommunityIcons name="refresh" size={17} color={COLORS.primary} />
            </TouchableOpacity>
            {user?.role !== 'Trainer' && (
              toggling === item.id ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={styles.toggleLoader} />
              ) : (
                <Switch
                  value={item.is_active}
                  onValueChange={() => handleToggleActive(item)}
                  trackColor={{false: COLORS.error + '50', true: COLORS.success + '50'}}
                  thumbColor={item.is_active ? COLORS.success : COLORS.error}
                  style={styles.switch}
                />
              )
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const expiredCount = students.filter(
    s => s.membership_expiry && dayjs(s.membership_expiry).startOf('day').diff(dayjs().startOf('day'), 'day') < 0,
  ).length;
  const expiringCount = students.length - expiredCount;

  return (
    <View style={[styles.container, {backgroundColor: bgColor}]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {paddingTop: insets.top + SPACING.sm, backgroundColor: isDark ? COLORS.cardDark : COLORS.card},
        ]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, {color: textColor}]}>{headerTitle}</Text>
          {!loading && (
            <Text style={[styles.subtitle, {color: COLORS.textSecondary}]}>
              {expiryFilter === 'expired'
                ? `${students.length} student${students.length !== 1 ? 's' : ''}`
                : expiryFilter === 'expiring_3' || expiryFilter === 'expiring_7'
                ? `${students.length} expiring`
                : `${expiredCount} expired · ${expiringCount} expiring soon`}
            </Text>
          )}
        </View>
      </View>

      {/* Summary chips */}
      {!loading && students.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryChip, {backgroundColor: COLORS.error + '18'}]}>
            <MaterialCommunityIcons name="calendar-remove" size={14} color={COLORS.error} />
            <Text style={[styles.summaryText, {color: COLORS.error}]}>{expiredCount} Expired</Text>
          </View>
          <View style={[styles.summaryChip, {backgroundColor: COLORS.info + '18'}]}>
            <MaterialCommunityIcons name="calendar-clock" size={14} color={COLORS.info} />
            <Text style={[styles.summaryText, {color: COLORS.info}]}>{expiringCount} Expiring Soon</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.loadingText, {color: COLORS.textSecondary}]}>Loading...</Text>
        </View>
      ) : students.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="check-circle-outline" size={64} color={COLORS.success} />
          <Text style={[styles.emptyTitle, {color: textColor}]}>All memberships active</Text>
          <Text style={[styles.emptySubtitle, {color: COLORS.textSecondary}]}>
            No expired or expiring memberships in the next 7 days
          </Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, {paddingBottom: SPACING.xl + insets.bottom}]}
          showsVerticalScrollIndicator={false}
          onRefresh={load}
          refreshing={loading}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
    elevation: 2,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {flex: 1},
  title: {fontSize: 18, fontWeight: '700'},
  subtitle: {fontSize: 12, marginTop: 1},
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.lg,
  },
  summaryText: {fontSize: 12, fontWeight: '600'},
  listContent: {paddingHorizontal: SPACING.md, paddingTop: SPACING.xs},
  card: {
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    elevation: 2,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  info: {flex: 1, minWidth: 0},
  nameRow: {flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flexWrap: 'wrap'},
  name: {fontSize: 14, fontWeight: '700', flexShrink: 1},
  inactiveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  inactiveBadgeText: {fontSize: 10, fontWeight: '700'},
  phone: {fontSize: 12, marginTop: 2},
  expiryRow: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3},
  expiryLabel: {fontSize: 12, fontWeight: '600'},
  packageName: {fontSize: 11, marginTop: 2},
  actions: {alignItems: 'center', gap: SPACING.xs},
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switch: {transform: [{scaleX: 0.8}, {scaleY: 0.8}]},
  toggleLoader: {width: 34, height: 34},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl},
  loadingText: {marginTop: SPACING.sm, fontSize: 14},
  emptyTitle: {fontSize: 18, fontWeight: '700', marginTop: SPACING.md},
  emptySubtitle: {fontSize: 13, textAlign: 'center', marginTop: SPACING.sm, lineHeight: 20},
});

export default ExpiryListScreen;
