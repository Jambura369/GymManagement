import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Share,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';
import {RootStackParamList} from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PaymentQRScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {gym} = useAuthStore();
  const {isDark} = useThemeStore();
  const insets = useSafeAreaInsets();

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;

  const handleShare = async () => {
    if (!gym?.payment_qr) return;
    try {
      // Android Share.share only supports `message`; `url` is iOS-only.
      await Share.share(
        Platform.OS === 'ios'
          ? {message: `Payment QR for ${gym.gym_name}`, url: gym.payment_qr}
          : {message: `${gym.gym_name} Payment QR\n${gym.payment_qr}`},
        {dialogTitle: `Share ${gym.gym_name} Payment QR`},
      );
    } catch (_) {}
  };

  return (
    <View style={[styles.container, {backgroundColor: bgColor}]}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd]}
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
          <Text style={styles.headerTitle}>Payment QR</Text>
          <Text style={styles.headerSub}>{gym?.gym_name}</Text>
        </View>
        {gym?.payment_qr ? (
          <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
            <MaterialCommunityIcons name="share-variant" size={22} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <View style={{width: 40}} />
        )}
      </LinearGradient>

      {gym?.payment_qr ? (
        <View style={styles.body}>
          {/* Instruction */}
          <View style={styles.instructionRow}>
            <MaterialCommunityIcons name="cellphone" size={18} color={COLORS.primary} />
            <Text style={[styles.instructionText, {color: COLORS.textSecondary}]}>
              Ask the student to scan this QR to pay
            </Text>
          </View>

          {/* QR Card */}
          <View style={[styles.qrCard, {backgroundColor: cardBg}]}>
            {/* Gym name above QR */}
            <Text style={[styles.gymNameAbove, {color: textColor}]}>{gym.gym_name}</Text>

            {/* Corner decorations */}
            <View style={[styles.corner, styles.cornerTL, {borderColor: COLORS.primary}]} />
            <View style={[styles.corner, styles.cornerTR, {borderColor: COLORS.primary}]} />
            <View style={[styles.corner, styles.cornerBL, {borderColor: COLORS.primary}]} />
            <View style={[styles.corner, styles.cornerBR, {borderColor: COLORS.primary}]} />

            <Image
              source={{uri: gym.payment_qr}}
              style={styles.qrImage}
              resizeMode="contain"
            />

            {/* Scan label */}
            <View style={[styles.scanLabel, {backgroundColor: COLORS.primary}]}>
              <MaterialCommunityIcons name="qrcode-scan" size={14} color="#FFF" />
              <Text style={styles.scanText}>Scan to Pay</Text>
            </View>
          </View>

          {/* UPI note */}
          <View style={[styles.noteBox, {backgroundColor: COLORS.success + '15'}]}>
            <MaterialCommunityIcons name="shield-check" size={16} color={COLORS.success} />
            <Text style={[styles.noteText, {color: COLORS.success}]}>
              Accepts all UPI apps — PhonePe, GPay, Paytm & more
            </Text>
          </View>

          {/* Update QR link */}
          <TouchableOpacity
            style={styles.settingsLink}
            onPress={() => navigation.navigate('GymSettings')}>
            <MaterialCommunityIcons name="pencil-outline" size={14} color={COLORS.textSecondary} />
            <Text style={[styles.settingsLinkText, {color: COLORS.textSecondary}]}>
              Update QR in Gym Settings
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Empty state — no QR set yet */
        <View style={styles.emptyBody}>
          <View style={[styles.emptyIcon, {backgroundColor: COLORS.primary + '15'}]}>
            <MaterialCommunityIcons name="qrcode" size={56} color={COLORS.primary} />
          </View>
          <Text style={[styles.emptyTitle, {color: textColor}]}>No Payment QR Added</Text>
          <Text style={[styles.emptySubtitle, {color: COLORS.textSecondary}]}>
            Add your UPI QR code so students can quickly scan and pay.
          </Text>
          <TouchableOpacity
            style={[styles.addQrBtn, {backgroundColor: COLORS.primary}]}
            onPress={() => navigation.navigate('GymSettings')}>
            <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
            <Text style={styles.addQrText}>Add Payment QR</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const QR_SIZE = 260;
const CORNER = 20;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {flex: 1, alignItems: 'center'},
  headerTitle: {color: '#FFF', fontSize: 18, fontWeight: '700'},
  headerSub: {color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 1},
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* QR present */
  body: {alignItems: 'center', paddingTop: SPACING.lg, paddingHorizontal: SPACING.lg},
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  instructionText: {fontSize: 13},
  qrCard: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 12,
    position: 'relative',
  },
  gymNameAbove: {fontSize: 16, fontWeight: '700', marginBottom: SPACING.md},
  qrImage: {width: QR_SIZE, height: QR_SIZE},
  scanLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
  },
  scanText: {color: '#FFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.5},

  /* Corner markers */
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: COLORS.primary,
  },
  cornerTL: {top: 52, left: 16, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS},
  cornerTR: {top: 52, right: 16, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS},
  cornerBL: {bottom: 52, left: 16, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS},
  cornerBR: {bottom: 52, right: 16, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS},

  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  noteText: {fontSize: 12, fontWeight: '600', flex: 1},
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.lg,
  },
  settingsLinkText: {fontSize: 12},

  /* Empty state */
  emptyBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {fontSize: 20, fontWeight: '700', marginBottom: SPACING.sm},
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: SPACING.xl,
  },
  addQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm + 4,
    borderRadius: BORDER_RADIUS.lg,
  },
  addQrText: {color: '#FFF', fontWeight: '700', fontSize: 15},
});

export default PaymentQRScreen;
