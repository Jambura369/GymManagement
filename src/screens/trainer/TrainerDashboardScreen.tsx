import React, {useEffect, useCallback} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Card, Avatar} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';
import {RootStackParamList} from '../../types';
import {fetchStudents, fetchVerificationRequests} from '../../services/studentService';
import StatCard from '../../components/common/StatCard';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TrainerDashboardScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user, gym} = useAuthStore();
  const {isDark} = useThemeStore();
  const insets = useSafeAreaInsets();
  const [myStudents, setMyStudents] = React.useState(0);
  const [pendingVerify, setPendingVerify] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;

  const load = useCallback(async () => {
    if (!gym || !user) return;
    const [studentsRes, verifyRes] = await Promise.all([
      fetchStudents(gym.id, {trainer_id: user.id}, 1, 1),
      fetchVerificationRequests(gym.id, 'Pending'),
    ]);
    if (studentsRes.data) setMyStudents(studentsRes.data.total);
    if (verifyRes.data) {
      const mine = verifyRes.data.filter(v => v.trainer_id === user.id);
      setPendingVerify(mine.length);
    }
  }, [gym, user]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: bgColor}]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[COLORS.trainerColor]}
        />
      }
      showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, {backgroundColor: COLORS.trainerColor, paddingTop: insets.top + SPACING.md}]}>
        <View>
          <Text style={styles.greeting}>Trainer Dashboard</Text>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.gymName}>{gym?.gym_name}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          style={styles.notifBtn}>
          <MaterialCommunityIcons name="bell-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <StatCard
          title="My Students"
          value={myStudents}
          icon="account-group"
          color={COLORS.primary}
          isDark={isDark}
          onPress={() => navigation.navigate('Students' as any)}
        />
        <StatCard
          title="Pending Verify"
          value={pendingVerify}
          icon="account-clock"
          color={COLORS.warning}
          isDark={isDark}
          onPress={() => navigation.navigate('VerificationList')}
        />
      </View>

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, {color: textColor}]}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        {[
          {icon: 'account-plus', label: 'Add Student', route: 'AddStudent', color: COLORS.primary},
          {icon: 'account-group', label: 'My Students', route: 'Students', color: COLORS.trainerColor},
          {icon: 'account-clock', label: 'Verifications', route: 'VerificationList', color: COLORS.warning},
          {icon: 'bell-outline', label: 'Notifications', route: 'Notifications', color: COLORS.info},
        ].map(item => (
          <TouchableOpacity
            key={item.route}
            style={[styles.quickAction, {backgroundColor: cardBg}]}
            onPress={() => navigation.navigate(item.route as any)}>
            <View style={[styles.qaIcon, {backgroundColor: item.color + '20'}]}>
              <MaterialCommunityIcons name={item.icon} size={28} color={item.color} />
            </View>
            <Text style={[styles.qaLabel, {color: textColor}]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {paddingBottom: SPACING.xl},
  header: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {color: 'rgba(255,255,255,0.8)', fontSize: 13},
  userName: {color: '#FFF', fontSize: 20, fontWeight: '700'},
  gymName: {color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2},
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {flexDirection: 'row', paddingHorizontal: SPACING.sm, marginTop: SPACING.sm},
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  quickAction: {
    width: '44%',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    elevation: 2,
  },
  qaIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  qaLabel: {fontSize: 13, fontWeight: '600', textAlign: 'center'},
});

export default TrainerDashboardScreen;
