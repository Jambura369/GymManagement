import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  StatusBar,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';

import {useAuthStore} from '../../store/authStore';
import {useDashboardStore} from '../../store/dashboardStore';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {RootStackParamList, User, TrainerSalary} from '../../types';
import {fetchUsers} from '../../services/userService';
import {paySalary, fetchSalaries} from '../../services/salaryService';
import AvatarWithFallback from '../../components/common/AvatarWithFallback';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type PaymentMethod = 'Cash' | 'Bank Transfer' | 'UPI';
type PaymentStatus = 'Pending' | 'Paid';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const CURRENT_YEAR = dayjs().year();
const YEARS = Array.from({length: 10}, (_, i) => CURRENT_YEAR - 4 + i);
const PAYMENT_METHODS: PaymentMethod[] = ['Bank Transfer', 'Cash', 'UPI'];

const AddSalaryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user, gym} = useAuthStore();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [trainers, setTrainers] = useState<User[]>([]);
  const [recentSalaries, setRecentSalaries] = useState<TrainerSalary[]>([]);

  const [selectedTrainer, setSelectedTrainer] = useState<User | null>(null);
  const [amount, setAmount] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month()); // 0-indexed
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');

  const [trainerModal, setTrainerModal] = useState(false);
  const [monthModal, setMonthModal] = useState(false);
  const [yearModal, setYearModal] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!gym) return;
    const [trainerRes, salaryRes] = await Promise.all([
      fetchUsers(gym.id, 'Trainer'),
      fetchSalaries(gym.id),
    ]);
    if (trainerRes.data) setTrainers(trainerRes.data);
    if (salaryRes.data) setRecentSalaries(salaryRes.data);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selectedTrainer) e.trainer = 'Select a trainer';
    if (!amount || Number(amount) <= 0) e.amount = 'Enter a valid amount';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const getPaymentDate = () => {
    return `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
  };

  const doSubmit = async () => {
    if (!gym || !user || !selectedTrainer) return;
    setLoading(true);
    const result = await paySalary(gym.id, user.id, {
      trainer_id: selectedTrainer.id,
      salary_amount: Number(amount),
      payment_date: getPaymentDate(),
      payment_type: paymentMethod,
      notes: '',
    });
    setLoading(false);
    if (result.data) {
      useDashboardStore.getState().refresh(gym.id);
      Toast.show({
        type: 'success',
        text1: 'Salary Paid!',
        text2: `₹${Number(amount).toLocaleString('en-IN')} paid successfully`,
      });
      navigation.goBack();
    } else {
      Toast.show({type: 'error', text1: 'Failed', text2: result.error || 'Something went wrong'});
    }
  };

  const onSubmit = async () => {
    if (!validate()) return;
    // Warn if already paid this month
    const monthStart = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
    const monthEnd = dayjs(monthStart).endOf('month').format('YYYY-MM-DD');
    const alreadyPaid = recentSalaries.some(
      s =>
        s.trainer_id === selectedTrainer?.id &&
        s.payment_date >= monthStart &&
        s.payment_date <= monthEnd,
    );
    if (alreadyPaid) {
      Alert.alert(
        'Possible Duplicate',
        'This trainer has already been paid for this month. Pay again?',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Pay Anyway', onPress: doSubmit},
        ],
      );
      return;
    }
    await doSubmit();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, {paddingTop: insets.top}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Salary Record</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingBottom: 100 + insets.bottom}]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* SELECT TRAINER */}
        <Text style={styles.sectionLabel}>SELECT TRAINER</Text>
        <TouchableOpacity
          style={[styles.trainerCard, errors.trainer ? styles.fieldError : null]}
          onPress={() => setTrainerModal(true)}
          activeOpacity={0.8}>
          {selectedTrainer ? (
            <>
              <AvatarWithFallback
                uri={selectedTrainer.avatar}
                name={selectedTrainer.name}
                size={44}
              />
              <View style={styles.trainerInfo}>
                <Text style={styles.trainerName}>{selectedTrainer.name}</Text>
                <Text style={styles.trainerRole}>{selectedTrainer.role}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.trainerAvatarPlaceholder}>
                <MaterialCommunityIcons name="account-outline" size={22} color={COLORS.textSecondary} />
              </View>
              <Text style={styles.trainerPlaceholder}>Select Trainer</Text>
            </>
          )}
          <MaterialCommunityIcons name="chevron-down" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
        {errors.trainer ? <Text style={styles.errorText}>{errors.trainer}</Text> : null}

        {/* SALARY AMOUNT */}
        <Text style={[styles.sectionLabel, {marginTop: SPACING.md}]}>SALARY AMOUNT</Text>
        <View style={[styles.amountCard, errors.amount ? styles.fieldError : null]}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={v => setAmount(v.replace(/[^0-9.]/g, ''))}
            placeholder="0.00"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="numeric"
          />
        </View>
        {errors.amount ? <Text style={styles.errorText}>{errors.amount}</Text> : null}

        {/* MONTH + YEAR */}
        <View style={styles.monthYearRow}>
          <View style={styles.monthYearCol}>
            <Text style={styles.sectionLabel}>MONTH</Text>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => setMonthModal(true)}
              activeOpacity={0.8}>
              <Text style={styles.pickerBtnText}>{MONTHS[selectedMonth]}</Text>
              <MaterialCommunityIcons name="calendar-outline" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.monthYearCol}>
            <Text style={styles.sectionLabel}>YEAR</Text>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => setYearModal(true)}
              activeOpacity={0.8}>
              <Text style={styles.pickerBtnText}>{selectedYear}</Text>
              <MaterialCommunityIcons name="unfold-more-horizontal" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* PAYMENT STATUS */}
        <Text style={[styles.sectionLabel, {marginTop: SPACING.md}]}>PAYMENT STATUS</Text>
        <View style={styles.toggleRow}>
          {(['Pending', 'Paid'] as PaymentStatus[]).map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.toggleBtn,
                paymentStatus === status && styles.toggleBtnActive,
              ]}
              onPress={() => setPaymentStatus(status)}
              activeOpacity={0.8}>
              <MaterialCommunityIcons
                name={status === 'Paid' ? 'check-circle' : 'clock-outline'}
                size={16}
                color={paymentStatus === status ? '#0B0F0E' : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.toggleBtnText,
                  paymentStatus === status && styles.toggleBtnTextActive,
                ]}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* PAYMENT METHOD */}
        <Text style={[styles.sectionLabel, {marginTop: SPACING.md}]}>PAYMENT METHOD</Text>
        <View style={styles.methodRow}>
          {PAYMENT_METHODS.map(method => (
            <TouchableOpacity
              key={method}
              style={[
                styles.methodChip,
                paymentMethod === method && styles.methodChipActive,
              ]}
              onPress={() => setPaymentMethod(method)}
              activeOpacity={0.8}>
              <Text
                style={[
                  styles.methodChipText,
                  paymentMethod === method && styles.methodChipTextActive,
                ]}>
                {method}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Save button */}
      <View style={[styles.saveBar, {paddingBottom: insets.bottom + SPACING.sm}]}>
        <TouchableOpacity
          style={[styles.saveBtn, loading && {opacity: 0.6}]}
          onPress={onSubmit}
          disabled={loading}
          activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save Record'}</Text>
          <MaterialCommunityIcons name="content-save-outline" size={18} color="#0B0F0E" />
        </TouchableOpacity>
      </View>

      {/* Trainer picker modal */}
      <Modal
        visible={trainerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setTrainerModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTrainerModal(false)}>
          <View style={[styles.modalSheet, {paddingBottom: insets.bottom + SPACING.md}]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Trainer</Text>
            <FlatList
              data={trainers}
              keyExtractor={item => item.id}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.trainerOption,
                    selectedTrainer?.id === item.id && styles.trainerOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedTrainer(item);
                    setTrainerModal(false);
                  }}
                  activeOpacity={0.8}>
                  <AvatarWithFallback uri={item.avatar} name={item.name} size={40} />
                  <View style={styles.trainerOptionInfo}>
                    <Text style={styles.trainerOptionName}>{item.name}</Text>
                    <Text style={styles.trainerOptionRole}>{item.role}</Text>
                  </View>
                  {selectedTrainer?.id === item.id && (
                    <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Month picker modal */}
      <Modal
        visible={monthModal}
        transparent
        animationType="slide"
        onRequestClose={() => setMonthModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMonthModal(false)}>
          <View style={[styles.modalSheet, {paddingBottom: insets.bottom + SPACING.md}]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Month</Text>
            <FlatList
              data={MONTHS}
              keyExtractor={item => item}
              renderItem={({item, index}) => (
                <TouchableOpacity
                  style={[
                    styles.pickerOption,
                    selectedMonth === index && styles.pickerOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedMonth(index);
                    setMonthModal(false);
                  }}
                  activeOpacity={0.8}>
                  <Text
                    style={[
                      styles.pickerOptionText,
                      selectedMonth === index && styles.pickerOptionTextActive,
                    ]}>
                    {item}
                  </Text>
                  {selectedMonth === index && (
                    <MaterialCommunityIcons name="check" size={18} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Year picker modal */}
      <Modal
        visible={yearModal}
        transparent
        animationType="slide"
        onRequestClose={() => setYearModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setYearModal(false)}>
          <View style={[styles.modalSheet, {paddingBottom: insets.bottom + SPACING.md}]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Year</Text>
            <FlatList
              data={YEARS}
              keyExtractor={item => String(item)}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.pickerOption,
                    selectedYear === item && styles.pickerOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedYear(item);
                    setYearModal(false);
                  }}
                  activeOpacity={0.8}>
                  <Text
                    style={[
                      styles.pickerOptionText,
                      selectedYear === item && styles.pickerOptionTextActive,
                    ]}>
                    {item}
                  </Text>
                  {selectedYear === item && (
                    <MaterialCommunityIcons name="check" size={18} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

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

  scroll: {paddingHorizontal: SPACING.md, paddingTop: SPACING.sm},

  sectionLabel: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },

  // Trainer card
  trainerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  trainerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e2420',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainerInfo: {flex: 1},
  trainerName: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  trainerRole: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.primary,
    marginTop: 2,
  },
  trainerPlaceholder: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },

  fieldError: {borderColor: COLORS.error},
  errorText: {fontSize: 12, color: COLORS.error, marginBottom: SPACING.sm},

  // Amount card
  amountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    paddingVertical: 20,
    gap: SPACING.sm,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: FONT_WEIGHT.black,
    color: COLORS.primary,
    padding: 0,
  },

  // Month/Year
  monthYearRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  monthYearCol: {flex: 1},
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 16,
  },
  pickerBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
  },

  // Payment status toggle
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    padding: 4,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primary,
  },
  toggleBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textSecondary,
  },
  toggleBtnTextActive: {color: '#0B0F0E'},

  // Payment method
  methodRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  methodChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: '#2e3533',
    backgroundColor: COLORS.surface,
  },
  methodChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  methodChipText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
  },
  methodChipTextActive: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semiBold,
  },

  // Save bar
  saveBar: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2f2d',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingVertical: 16,
  },
  saveBtnText: {fontSize: 16, fontWeight: FONT_WEIGHT.bold, color: '#0B0F0E'},

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    maxHeight: '60%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3a403d',
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },

  trainerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2f2d',
  },
  trainerOptionActive: {},
  trainerOptionInfo: {flex: 1},
  trainerOptionName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
  },
  trainerOptionRole: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2f2d',
  },
  pickerOptionActive: {},
  pickerOptionText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
  },
  pickerOptionTextActive: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semiBold,
  },
});

export default AddSalaryScreen;
