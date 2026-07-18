import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Avatar, Card} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuthStore} from '../../store/authStore';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {RootStackParamList, Student} from '../../types';
import {fetchStudents} from '../../services/studentService';
import {
  AttendanceRecord,
  checkInStudent,
  checkOutStudent,
  getTodayAttendance,
  getTodayRecord,
} from '../../services/attendanceService';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const AttendanceScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user, gym} = useAuthStore();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<'check_in' | 'today'>('check_in');
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingToday, setLoadingToday] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);


  const loadStudents = useCallback(async () => {
    if (!gym) return;
    setLoadingStudents(true);
    const filters: any = {verification_status: 'Approved'};
    if (user?.role === 'Trainer') filters.trainer_id = user.id;
    const res = await fetchStudents(gym.id, filters, 1, 100);
    if (res.data) setStudents(res.data.data);
    setLoadingStudents(false);
  }, [gym, user]);

  const loadTodayAttendance = useCallback(async () => {
    if (!gym) return;
    setLoadingToday(true);
    const res = await getTodayAttendance(gym.id);
    if (res.data) setTodayRecords(res.data);
    setLoadingToday(false);
  }, [gym]);

  useEffect(() => {
    loadStudents();
    loadTodayAttendance();
  }, [loadStudents, loadTodayAttendance]);

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search),
  );

  const checkedInIds = new Set(todayRecords.map(r => r.student_id));

  const handleCheckIn = async (student: Student) => {
    if (!gym || !user) return;

    // Gate: block expired members
    if (!student.is_active) {
      Alert.alert(
        'Membership Expired',
        `${student.name}'s membership has expired. Please renew before checking in.`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Renew Now',
            onPress: () => navigation.navigate('RenewStudent', {studentId: student.id}),
          },
        ],
      );
      return;
    }

    // Gate: check expiry date
    if (student.membership_expiry) {
      const diffDays = dayjs(student.membership_expiry)
        .startOf('day')
        .diff(dayjs().startOf('day'), 'day');
      if (diffDays < 0) {
        Alert.alert(
          'Membership Expired',
          `${student.name}'s membership expired on ${dayjs(student.membership_expiry).format('DD MMM YYYY')}. Please renew first.`,
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Renew Now',
              onPress: () => navigation.navigate('RenewStudent', {studentId: student.id}),
            },
          ],
        );
        return;
      }
    }

    setProcessingId(student.id);
    const res = await checkInStudent(student.id, gym.id, user.id);
    if (res.error) {
      if (res.error === 'Already checked in today') {
        Alert.alert('Already Checked In', `${student.name} is already checked in today.`);
      } else {
        Alert.alert('Error', res.error);
      }
    } else {
      await loadTodayAttendance();
    }
    setProcessingId(null);
  };

  const handleCheckOut = async (record: AttendanceRecord) => {
    setProcessingId(record.student_id);
    const res = await checkOutStudent(record.id);
    if (res.error) {
      Alert.alert('Error', res.error);
    } else {
      setTodayRecords(prev =>
        prev.map(r => (r.id === record.id ? {...r, checked_out_at: res.data!.checked_out_at} : r)),
      );
    }
    setProcessingId(null);
  };

  const renderStudentItem = ({item}: {item: Student}) => {
    const isCheckedIn = checkedInIds.has(item.id);
    const todayRecord = todayRecords.find(r => r.student_id === item.id);
    const isExpired = !item.is_active || (item.membership_expiry
      ? dayjs(item.membership_expiry).startOf('day').diff(dayjs().startOf('day'), 'day') < 0
      : false);
    const isProcessing = processingId === item.id;

    return (
      <Card style={[styles.card, {backgroundColor: COLORS.surface}]}>
        <Card.Content style={styles.cardContent}>
          <Avatar.Text
            size={42}
            label={item.name.slice(0, 2).toUpperCase()}
            style={{
              backgroundColor: isExpired
                ? COLORS.error + '25'
                : isCheckedIn
                ? COLORS.success + '25'
                : COLORS.primary + '25',
            }}
            labelStyle={{
              color: isExpired ? COLORS.error : isCheckedIn ? COLORS.success : COLORS.primary,
              fontSize: 14,
              fontWeight: '700',
            }}
          />
          <View style={styles.info}>
            <Text style={[styles.name, {color: COLORS.textPrimary}]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.phone, {color: COLORS.textSecondary}]}>{item.phone}</Text>
            {isExpired ? (
              <View style={styles.statusRow}>
                <MaterialCommunityIcons name="alert-circle" size={12} color={COLORS.error} />
                <Text style={[styles.statusText, {color: COLORS.error}]}>Membership Expired</Text>
              </View>
            ) : isCheckedIn ? (
              <View style={styles.statusRow}>
                <MaterialCommunityIcons name="check-circle" size={12} color={COLORS.success} />
                <Text style={[styles.statusText, {color: COLORS.success}]}>
                  In at {dayjs(todayRecord?.checked_in_at).format('h:mm A')}
                  {todayRecord?.checked_out_at
                    ? ` · Out ${dayjs(todayRecord.checked_out_at).format('h:mm A')}`
                    : ''}
                </Text>
              </View>
            ) : null}
          </View>
          {isProcessing ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
          ) : isExpired ? (
            <TouchableOpacity
              style={[styles.actionChip, {backgroundColor: COLORS.error + '15'}]}
              onPress={() => handleCheckIn(item)}>
              <MaterialCommunityIcons name="alert" size={13} color={COLORS.error} />
              <Text style={[styles.actionText, {color: COLORS.error}]}>Expired</Text>
            </TouchableOpacity>
          ) : isCheckedIn && todayRecord && !todayRecord.checked_out_at ? (
            <TouchableOpacity
              style={[styles.actionChip, {backgroundColor: COLORS.warning + '20'}]}
              onPress={() => handleCheckOut(todayRecord)}>
              <MaterialCommunityIcons name="logout" size={13} color={COLORS.warning} />
              <Text style={[styles.actionText, {color: COLORS.warning}]}>Check Out</Text>
            </TouchableOpacity>
          ) : isCheckedIn && todayRecord?.checked_out_at ? (
            <View style={[styles.actionChip, {backgroundColor: COLORS.success + '15'}]}>
              <MaterialCommunityIcons name="check-all" size={13} color={COLORS.success} />
              <Text style={[styles.actionText, {color: COLORS.success}]}>Done</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.actionChip, {backgroundColor: COLORS.primary}]}
              onPress={() => handleCheckIn(item)}>
              <MaterialCommunityIcons name="login" size={13} color="#0B0F0E" />
              <Text style={[styles.actionText, {color: '#0B0F0E'}]}>Check In</Text>
            </TouchableOpacity>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderTodayItem = ({item}: {item: AttendanceRecord}) => {
    const student = item.student;
    if (!student) return null;
    return (
      <Card style={[styles.card, {backgroundColor: COLORS.surface}]}>
        <Card.Content style={styles.cardContent}>
          <Avatar.Text
            size={42}
            label={student.name.slice(0, 2).toUpperCase()}
            style={{backgroundColor: COLORS.success + '25'}}
            labelStyle={{color: COLORS.success, fontSize: 14, fontWeight: '700'}}
          />
          <View style={styles.info}>
            <Text style={[styles.name, {color: COLORS.textPrimary}]} numberOfLines={1}>
              {student.name}
            </Text>
            <Text style={[styles.phone, {color: COLORS.textSecondary}]}>{student.phone}</Text>
            <View style={styles.statusRow}>
              <MaterialCommunityIcons name="clock-outline" size={12} color={COLORS.textSecondary} />
              <Text style={[styles.statusText, {color: COLORS.textSecondary}]}>
                In {dayjs(item.checked_in_at).format('h:mm A')}
                {item.checked_out_at
                  ? ` · Out ${dayjs(item.checked_out_at).format('h:mm A')}`
                  : ' · Still in gym'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('AttendanceHistory', {studentId: student.id, studentName: student.name})}>
            <MaterialCommunityIcons name="history" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: COLORS.background}]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {paddingTop: insets.top + SPACING.sm, backgroundColor: COLORS.surface},
        ]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, {color: COLORS.textPrimary}]}>Attendance</Text>
          <Text style={[styles.subtitle, {color: COLORS.textSecondary}]}>
            {dayjs().format('ddd, DD MMM YYYY')}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.qrBtn, {backgroundColor: COLORS.primary + '15'}]}
            onPress={() => navigation.navigate('AttendanceQR')}>
            <MaterialCommunityIcons name="qrcode-scan" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <View style={[styles.countBadge, {backgroundColor: COLORS.success + '20'}]}>
            <MaterialCommunityIcons name="account-check" size={14} color={COLORS.success} />
            <Text style={[styles.countText, {color: COLORS.success}]}>{todayRecords.length}</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, {backgroundColor: COLORS.surface}]}>
        <TouchableOpacity
          style={[styles.tab, tab === 'check_in' && {borderBottomColor: COLORS.primary, borderBottomWidth: 2}]}
          onPress={() => setTab('check_in')}>
          <Text style={[styles.tabText, {color: tab === 'check_in' ? COLORS.primary : COLORS.textSecondary}]}>
            Mark Attendance
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'today' && {borderBottomColor: COLORS.primary, borderBottomWidth: 2}]}
          onPress={() => setTab('today')}>
          <Text style={[styles.tabText, {color: tab === 'today' ? COLORS.primary : COLORS.textSecondary}]}>
            Today's List ({todayRecords.length})
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'check_in' ? (
        <>
          {/* Search */}
          <View style={[styles.searchRow, {backgroundColor: COLORS.background}]}>
            <View style={[styles.searchInput, {backgroundColor: COLORS.surfaceElevated}]}>
              <MaterialCommunityIcons name="magnify" size={18} color={COLORS.textSecondary} />
              <TextInput
                style={[styles.searchText, {color: COLORS.textPrimary}]}
                placeholder="Search by name or phone..."
                placeholderTextColor={COLORS.textSecondary}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {loadingStudents ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredStudents}
              keyExtractor={s => s.id}
              renderItem={renderStudentItem}
              contentContainerStyle={[styles.listContent, {paddingBottom: insets.bottom + SPACING.xl}]}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.center}>
                  <MaterialCommunityIcons name="account-search" size={56} color={COLORS.textSecondary} />
                  <Text style={[styles.emptyText, {color: COLORS.textSecondary}]}>No students found</Text>
                </View>
              }
            />
          )}
        </>
      ) : (
        <>
          {loadingToday ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : todayRecords.length === 0 ? (
            <View style={styles.center}>
              <MaterialCommunityIcons name="calendar-blank" size={56} color={COLORS.textSecondary} />
              <Text style={[styles.emptyTitle, {color: COLORS.textPrimary}]}>No check-ins yet</Text>
              <Text style={[styles.emptyText, {color: COLORS.textSecondary}]}>
                No members have checked in today
              </Text>
            </View>
          ) : (
            <FlatList
              data={todayRecords}
              keyExtractor={r => r.id}
              renderItem={renderTodayItem}
              contentContainerStyle={[styles.listContent, {paddingBottom: insets.bottom + SPACING.xl}]}
              showsVerticalScrollIndicator={false}
              onRefresh={loadTodayAttendance}
              refreshing={loadingToday}
            />
          )}
        </>
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
  backBtn: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
  headerTitle: {flex: 1},
  title: {fontSize: 18, fontWeight: '700'},
  subtitle: {fontSize: 12, marginTop: 1},
  headerRight: {flexDirection: 'row', alignItems: 'center', gap: SPACING.xs},
  qrBtn: {width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center'},
  countBadge: {flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12},
  countText: {fontSize: 13, fontWeight: '700'},
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  tab: {flex: 1, alignItems: 'center', paddingVertical: SPACING.sm + 2},
  tabText: {fontSize: 13, fontWeight: '600'},
  searchRow: {paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm},
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  searchText: {flex: 1, fontSize: 14, padding: 0},
  listContent: {paddingHorizontal: SPACING.md, paddingTop: SPACING.xs},
  card: {marginBottom: SPACING.sm, borderRadius: RADIUS.md, elevation: 1},
  cardContent: {flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs},
  info: {flex: 1, minWidth: 0},
  name: {fontSize: 14, fontWeight: '700'},
  phone: {fontSize: 12, marginTop: 1},
  statusRow: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3},
  statusText: {fontSize: 11, fontWeight: '500'},
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  actionText: {fontSize: 12, fontWeight: '700'},
  loader: {width: 60},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl},
  emptyTitle: {fontSize: 16, fontWeight: '700', marginTop: SPACING.md},
  emptyText: {fontSize: 13, marginTop: SPACING.xs, textAlign: 'center'},
});

export default AttendanceScreen;
