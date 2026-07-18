import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  Share,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

import {useAuthStore} from '../../store/authStore';
import {useFeature} from '../../hooks/useFeature';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {RootStackParamList} from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PaymentQRScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {gym} = useAuthStore();
  const insets = useSafeAreaInsets();
  const {hasAccess} = useFeature('qr_attendance');
  const [amount, setAmount] = useState('');

  React.useEffect(() => {
    if (!hasAccess) {
      navigation.replace('FeatureLocked', {
        featureName: 'Payment QR',
        featureIcon: 'qrcode',
        requiredPlan: 'professional',
        description: 'QR-based payment collection requires the Professional plan.',
      });
    }
  }, [hasAccess, navigation]);

  if (!hasAccess) return null;

  const handleShare = async () => {
    if (!gym?.payment_qr) return;
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? {message: `Payment QR for ${gym.gym_name}`, url: gym.payment_qr}
          : {message: `${gym.gym_name} Payment QR\n${gym.payment_qr}`},
        {dialogTitle: `Share ${gym.gym_name} Payment QR`},
      );
    } catch (_) {}
  };

  const handleCopyUpi = () => {
    const upiId = gym?.email || gym?.gym_name || '';
    Toast.show({type: 'success', text1: 'Copied!', text2: upiId});
  };

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment QR</Text>
        {gym?.payment_qr ? (
          <TouchableOpacity onPress={handleShare} hitSlop={8}>
            <MaterialCommunityIcons name="share-variant-outline" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={{width: 22}} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingBottom: 40 + insets.bottom}]}
        showsVerticalScrollIndicator={false}>

        {gym?.payment_qr ? (
          <>
            {/* Amount input */}
            <Text style={styles.amountLabel}>Enter Amount (Optional)</Text>
            <View style={styles.amountCard}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="numeric"
              />
            </View>

            {/* QR card with lime border */}
            <View style={styles.qrCardOuter}>
              <View style={styles.qrCard}>
                <Image
                  source={{uri: gym.payment_qr}}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Gym name + UPI ID */}
            <Text style={styles.gymName}>{gym.gym_name}</Text>
            <TouchableOpacity style={styles.upiRow} onPress={handleCopyUpi} activeOpacity={0.7}>
              <Text style={styles.upiText}>{gym.email}</Text>
              <MaterialCommunityIcons name="content-copy" size={14} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {/* Action buttons */}
            <TouchableOpacity style={styles.outlineBtn} onPress={handleShare} activeOpacity={0.8}>
              <MaterialCommunityIcons name="share-variant-outline" size={18} color={COLORS.textPrimary} />
              <Text style={styles.outlineBtnText}>Share QR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.outlineBtn, {marginTop: SPACING.sm}]}
              onPress={() => Toast.show({type: 'info', text1: 'Download feature coming soon'})}
              activeOpacity={0.8}>
              <MaterialCommunityIcons name="download-outline" size={18} color={COLORS.textPrimary} />
              <Text style={styles.outlineBtnText}>Download QR</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Empty state */
          <View style={styles.emptyBody}>
            <View style={styles.emptyIconWrap}>
              <MaterialCommunityIcons name="qrcode" size={56} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Payment QR Added</Text>
            <Text style={styles.emptySubtitle}>
              Add your UPI QR code so students can quickly scan and pay.
            </Text>
            <TouchableOpacity
              style={styles.addQrBtn}
              onPress={() => navigation.navigate('GymSettings')}>
              <MaterialCommunityIcons name="plus" size={18} color="#0B0F0E" />
              <Text style={styles.addQrBtnText}>Add Payment QR</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const QR_SIZE = 220;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },

  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    alignItems: 'center',
  },

  // Amount
  amountLabel: {
    alignSelf: 'flex-start',
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  amountCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    padding: 0,
  },

  // QR card with lime border glow
  qrCardOuter: {
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 3,
    marginBottom: SPACING.lg,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  qrCard: {
    backgroundColor: '#0d1210',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: QR_SIZE,
    height: QR_SIZE,
  },

  // Gym name + UPI
  gymName: {
    fontSize: 20,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  upiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.xl,
  },
  upiText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },

  // Action buttons
  outlineBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 14,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: '#2e3533',
    backgroundColor: COLORS.surface,
  },
  outlineBtnText: {
    fontSize: 15,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
  },

  // Empty state
  emptyBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
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
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
  },
  addQrBtnText: {
    color: '#0B0F0E',
    fontWeight: FONT_WEIGHT.bold,
    fontSize: 15,
  },
});

export default PaymentQRScreen;
