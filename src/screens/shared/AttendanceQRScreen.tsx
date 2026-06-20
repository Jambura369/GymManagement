import React, {useEffect, useState, useCallback} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Share,
  Platform,
  RefreshControl,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import QRCode from 'react-native-qrcode-svg';

import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {useFeature} from '../../hooks/useFeature';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';
import {RootStackParamList} from '../../types';
import {getTodayAttendance, AttendanceRecord} from '../../services/attendanceService';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CHECKIN_BASE = 'https://jpvtrcjfpsctwlhdzvtr.supabase.co/functions/v1/gym-checkin';

const AttendanceQRScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {gym} = useAuthStore();
  const {isDark} = useThemeStore();
  const insets = useSafeAreaInsets();
  const {hasAccess} = useFeature('qr_attendance');

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const checkinUrl = gym ? `${CHECKIN_BASE}?gym=${gym.id}` : '';

  // Gate: redirect to upgrade if no Pro access
  useEffect(() => {
    if (!hasAccess) {
      navigation.replace('FeatureLocked', {
        featureName: 'QR Attendance',
        featureIcon: 'qrcode-scan',
        requiredPlan: 'professional',
        description: 'QR-based attendance requires the Professional plan.',
      });
    }
  }, [hasAccess, navigation]);

  const loadAttendance = useCallback(async () => {
    if (!gym) return;
    setLoading(true);
    const res = await getTodayAttendance(gym.id);
    if (res.data) setRecords(res.data);
    setLoading(false);
  }, [gym]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAttendance();
    setRefreshing(false);
  };

  const handleShare = async () => {
    if (!checkinUrl) return;
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? {message: `Check in at ${gym?.gym_name}`, url: checkinUrl}
          : {message: `Check in at ${gym?.gym_name}\n${checkinUrl}`},
      );
    } catch (_) {}
  };

  if (!hasAccess) return null;

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : '#FFFFFF';
  const subColor = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;
  const borderColor = isDark ? COLORS.borderDark : COLORS.border;

  return (
    <View style={[styles.root, {backgroundColor: bgColor}]}>
      {/* Header */}
      <LinearGradient
        colors={['#7C3AED', '#5B21B6']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[styles.header, {paddingTop: insets.top + SPACING.sm}]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>QR Attendance</Text>
          <Text style={styles.headerSub}>{gym?.gym_name}</Text>
        </View>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <MaterialCommunityIcons name="share-variant" size={22} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingBottom: insets.bottom + SPACING.xxl}]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}>

        {/* QR Card */}
        <View style={[styles.qrCard, {backgroundColor: cardBg}]}>
          <View style={styles.qrLabel}>
            <MaterialCommunityIcons name="qrcode-scan" size={16} color={COLORS.primary} />
            <Text style={[styles.qrLabelText, {color: COLORS.primary}]}>Students scan to check in</Text>
          </View>

          <View style={styles.qrWrap}>
            {/* Corner decorations */}
            <View style={[styles.corner, styles.cornerTL, {borderColor: COLORS.primary}]} />
            <View style={[styles.corner, styles.cornerTR, {borderColor: COLORS.primary}]} />
            <View style={[styles.corner, styles.cornerBL, {borderColor: COLORS.primary}]} />
            <View style={[styles.corner, styles.cornerBR, {borderColor: COLORS.primary}]} />

            {checkinUrl ? (
              <QRCode
                value={checkinUrl}
                size={220}
                color={isDark ? '#FFFFFF' : '#1A1A2E'}
                backgroundColor={isDark ? COLORS.cardDark : '#FFFFFF'}
                logoSize={36}
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <MaterialCommunityIcons name="qrcode" size={80} color={subColor} />
              </View>
            )}
          </View>

          <Text style={[styles.gymNameText, {color: textColor}]}>{gym?.gym_name}</Text>
          <Text style={[styles.qrHint, {color: subColor}]}>
            Open phone camera → scan → enter phone number
          </Text>
        </View>

        {/* How it works */}
        <View style={[styles.howCard, {backgroundColor: cardBg, borderColor}]}>
          <Text style={[styles.howTitle, {color: textColor}]}>How it works</Text>
          {[
            {icon: 'cellphone', text: 'Student opens their phone camera'},
            {icon: 'qrcode-scan', text: 'Scans this QR code'},
            {icon: 'form-textbox', text: 'Enters their registered phone number'},
            {icon: 'check-circle', text: 'Attendance is marked automatically'},
          ].map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepIcon, {backgroundColor: COLORS.primary + '15'}]}>
                <MaterialCommunityIcons name={step.icon} size={16} color={COLORS.primary} />
              </View>
              <Text style={[styles.stepText, {color: subColor}]}>{step.text}</Text>
            </View>
          ))}
        </View>

        {/* Today's Attendance */}
        <View style={styles.todaySection}>
          <View style={styles.todayHeader}>
            <Text style={[styles.todayTitle, {color: textColor}]}>
              Today's Check-ins
            </Text>
            <View style={[styles.countBadge, {backgroundColor: COLORS.primary + '15'}]}>
              <Text style={[styles.countText, {color: COLORS.primary}]}>{records.length}</Text>
            </View>
          </View>

          {loading && records.length === 0 ? (
            <View style={[styles.emptyCard, {backgroundColor: cardBg}]}>
              <Text style={[styles.emptyText, {color: subColor}]}>Loading...</Text>
            </View>
          ) : records.length === 0 ? (
            <View style={[styles.emptyCard, {backgroundColor: cardBg}]}>
              <MaterialCommunityIcons name="account-clock-outline" size={36} color={subColor} />
              <Text style={[styles.emptyText, {color: subColor}]}>No check-ins yet today</Text>
            </View>
          ) : (
            records.map(rec => (
              <View key={rec.id} style={[styles.recordCard, {backgroundColor: cardBg, borderColor}]}>
                <View style={[styles.avatarCircle, {backgroundColor: COLORS.primary + '20'}]}>
                  <Text style={[styles.avatarText, {color: COLORS.primary}]}>
                    {(rec.student?.name ?? '?').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.recordInfo}>
                  <Text style={[styles.recordName, {color: textColor}]} numberOfLines={1}>
                    {rec.student?.name ?? 'Unknown'}
                  </Text>
                  <Text style={[styles.recordPhone, {color: subColor}]}>
                    {rec.student?.phone ?? ''}
                  </Text>
                </View>
                <View style={styles.recordTime}>
                  <MaterialCommunityIcons name="clock-outline" size={13} color={subColor} />
                  <Text style={[styles.recordTimeText, {color: subColor}]}>
                    {new Date(rec.checked_in_at).toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'})}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const CORNER_SIZE = 22;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  root: {flex: 1},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: {flex: 1, alignItems: 'center'},
  headerTitle: {color: '#FFF', fontSize: 18, fontWeight: '700'},
  headerSub: {color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 1},
  shareBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  scroll: {padding: SPACING.md, gap: SPACING.md},

  qrCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  qrLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: SPACING.md,
  },
  qrLabelText: {fontSize: 13, fontWeight: '700'},
  qrWrap: {
    padding: SPACING.md,
    position: 'relative',
  },
  corner: {position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE},
  cornerTL: {top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderRadius: 2},
  cornerTR: {top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderRadius: 2},
  cornerBL: {bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderRadius: 2},
  cornerBR: {bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderRadius: 2},
  qrPlaceholder: {
    width: 220, height: 220,
    alignItems: 'center', justifyContent: 'center',
  },
  gymNameText: {fontSize: 16, fontWeight: '700', marginTop: SPACING.md},
  qrHint: {fontSize: 12, marginTop: 4, textAlign: 'center'},

  howCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  howTitle: {fontSize: 14, fontWeight: '700', marginBottom: 4},
  stepRow: {flexDirection: 'row', alignItems: 'center', gap: SPACING.sm},
  stepIcon: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  stepText: {fontSize: 13, flex: 1},

  todaySection: {gap: SPACING.sm},
  todayHeader: {flexDirection: 'row', alignItems: 'center', gap: SPACING.sm},
  todayTitle: {fontSize: 16, fontWeight: '700', flex: 1},
  countBadge: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
  },
  countText: {fontSize: 13, fontWeight: '800'},

  emptyCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center', gap: SPACING.sm,
  },
  emptyText: {fontSize: 14},

  recordCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm + 2,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {fontSize: 14, fontWeight: '700'},
  recordInfo: {flex: 1},
  recordName: {fontSize: 14, fontWeight: '600'},
  recordPhone: {fontSize: 12, marginTop: 2},
  recordTime: {flexDirection: 'row', alignItems: 'center', gap: 3},
  recordTimeText: {fontSize: 12},
});

export default AttendanceQRScreen;
