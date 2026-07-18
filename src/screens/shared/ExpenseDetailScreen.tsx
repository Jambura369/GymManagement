import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';

import {useAuthStore} from '../../store/authStore';
import {useExpenseStore} from '../../store/expenseStore';
import {EXPENSE_CATEGORY_COLORS, EXPENSE_CATEGORY_ICONS} from '../../constants';
import {COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING} from '../../theme';
import {RootStackParamList, Expense} from '../../types';
import {supabase} from '../../supabase/client';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ImageViewerModal from '../../components/common/ImageViewerModal';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ExpenseDetail'>;

const ExpenseDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {user} = useAuthStore();
  const {deleteExpense} = useExpenseStore();
  const insets = useSafeAreaInsets();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);

  const canEdit = user?.role === 'Admin' || user?.role === 'Manager';

  useEffect(() => {
    loadExpense();
  }, [route.params.expenseId]);

  const loadExpense = async () => {
    setLoading(true);
    const {data} = await supabase
      .from('expenses')
      .select('*, creator:users!expenses_created_by_fkey(id, name)')
      .eq('id', route.params.expenseId)
      .single();
    if (data) setExpense(data as Expense);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!expense) return;
    setDeleting(true);
    const success = await deleteExpense(expense.id);
    setDeleting(false);
    setDeleteDialog(false);
    if (success) {
      Toast.show({type: 'success', text1: 'Expense deleted'});
      navigation.goBack();
    } else {
      Toast.show({type: 'error', text1: 'Failed to delete'});
    }
  };

  if (loading || !expense) {
    return (
      <View style={[styles.container, {paddingTop: insets.top}]}>
        <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expense Detail</Text>
          <View style={{width: 24}} />
        </View>
      </View>
    );
  }

  const catColor = EXPENSE_CATEGORY_COLORS[expense.category] || COLORS.textSecondary;
  const catIcon = EXPENSE_CATEGORY_ICONS[expense.category] || 'cash';
  const hasReceipt = !!expense.receipt_image && !imgError;

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expense Detail</Text>
        <TouchableOpacity hitSlop={8}>
          <MaterialCommunityIcons name="dots-vertical" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingBottom: 100 + insets.bottom}]}
        showsVerticalScrollIndicator={false}>

        {/* Hero: receipt image or category colored card */}
        {hasReceipt ? (
          <TouchableOpacity
            style={styles.heroImageWrap}
            activeOpacity={0.9}
            onPress={() => setViewerVisible(true)}>
            <Image
              source={{uri: expense.receipt_image!}}
              style={styles.heroImage}
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
            {/* VERIFIED badge */}
            <View style={styles.verifiedBadge}>
              <MaterialCommunityIcons name="check-circle" size={12} color="#0B0F0E" />
              <Text style={styles.verifiedText}>VERIFIED</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.heroCard, {backgroundColor: catColor + '18'}]}>
            <View style={[styles.heroIconWrap, {backgroundColor: catColor + '30'}]}>
              <MaterialCommunityIcons name={catIcon} size={36} color={catColor} />
            </View>
          </View>
        )}

        {/* Category chip + amount + date */}
        <View style={styles.amountSection}>
          <View style={[styles.categoryChip, {backgroundColor: catColor + '20', borderColor: catColor + '40'}]}>
            <Text style={[styles.categoryChipText, {color: catColor}]}>{expense.category}</Text>
          </View>
          <Text style={styles.amount}>
            ₹{Number(expense.amount).toLocaleString('en-IN')}
          </Text>
          <Text style={styles.dateText}>
            {dayjs(expense.expense_date).format('MMMM DD, YYYY')} • {dayjs(expense.created_at).format('hh:mm A')}
          </Text>
        </View>

        {/* Notes */}
        {(expense.description || expense.title) && (
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <MaterialCommunityIcons name="text-box-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.cardLabel}>Notes</Text>
            </View>
            <Text style={styles.noteText}>{expense.description || expense.title}</Text>
          </View>
        )}

        {/* Info cols — Vendor | Payment side by side */}
        <View style={[styles.card, styles.infoColsCard]}>
          <View style={styles.infoCol}>
            <Text style={styles.infoColLabel}>Vendor</Text>
            <Text style={styles.infoColValue} numberOfLines={2}>{expense.title}</Text>
          </View>
          <View style={styles.infoColDivider} />
          <View style={styles.infoCol}>
            <Text style={styles.infoColLabel}>Added by</Text>
            <Text style={styles.infoColValue} numberOfLines={2}>
              {(expense.creator as any)?.name || 'Unknown'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom bar */}
      {canEdit && (
        <View style={[styles.bottomBar, {paddingBottom: insets.bottom + SPACING.sm}]}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('EditExpense', {expenseId: expense.id})}
            activeOpacity={0.85}>
            <MaterialCommunityIcons name="pencil" size={18} color={COLORS.primary} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => setDeleteDialog(true)}
            activeOpacity={0.85}>
            <MaterialCommunityIcons name="delete" size={18} color="#FFF" />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      <ConfirmDialog
        visible={deleteDialog}
        title="Delete Expense"
        message={`Delete "${expense.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog(false)}
        confirmColor={COLORS.error}
        loading={deleting}
      />

      <ImageViewerModal
        visible={viewerVisible}
        uri={expense.receipt_image}
        onClose={() => setViewerVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  scroll: {paddingBottom: 20},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  headerTitle: {fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary},

  // Hero
  heroImageWrap: {
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  heroImage: {width: '100%', height: 200},
  verifiedBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  verifiedText: {fontSize: 10, fontWeight: FONT_WEIGHT.bold, color: '#0B0F0E', letterSpacing: 0.5},

  heroCard: {
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Amount section
  amountSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  categoryChipText: {fontSize: 12, fontWeight: FONT_WEIGHT.semiBold},
  amount: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  dateText: {fontSize: FONT_SIZE.sm, color: COLORS.textSecondary},

  // Cards
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardLabelRow: {flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.sm},
  cardLabel: {fontSize: 12, fontWeight: FONT_WEIGHT.bold, color: COLORS.textSecondary, letterSpacing: 0.5},
  noteText: {fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, lineHeight: 22},

  infoColsCard: {flexDirection: 'row', alignItems: 'stretch'},
  infoCol: {flex: 1},
  infoColDivider: {width: StyleSheet.hairlineWidth, backgroundColor: '#2a2f2d', marginVertical: 2},
  infoColLabel: {fontSize: 11, color: COLORS.textSecondary, marginBottom: 4},
  infoColValue: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary},

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2f2d',
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: 14,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  editBtnText: {fontSize: 15, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary},
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: 14,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.error,
  },
  deleteBtnText: {fontSize: 15, fontWeight: FONT_WEIGHT.bold, color: '#FFF'},
});

export default ExpenseDetailScreen;
