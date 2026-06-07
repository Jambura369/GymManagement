import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Card} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';

import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {useExpenseStore} from '../../store/expenseStore';
import {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  EXPENSE_CATEGORY_COLORS,
  EXPENSE_CATEGORY_ICONS,
} from '../../constants';
import {RootStackParamList, Expense} from '../../types';
import {supabase} from '../../supabase/client';
import AppHeader from '../../components/common/AppHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ImageViewerModal from '../../components/common/ImageViewerModal';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ExpenseDetail'>;

const ExpenseDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {user} = useAuthStore();
  const {isDark} = useThemeStore();
  const {deleteExpense} = useExpenseStore();
  const insets = useSafeAreaInsets();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;
  const subColor = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;

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
      <View style={[styles.container, {backgroundColor: bgColor}]}>
        <AppHeader title="Expense Detail" onBack={() => navigation.goBack()} isDark={isDark} />
      </View>
    );
  }

  const catColor = EXPENSE_CATEGORY_COLORS[expense.category] || COLORS.textSecondary;
  const catIcon = EXPENSE_CATEGORY_ICONS[expense.category] || 'cash';

  const InfoRow = ({icon, label, value}: {icon: string; label: string; value: string}) => (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon} size={18} color={COLORS.primary} />
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, {color: subColor}]}>{label}</Text>
        <Text style={[styles.infoValue, {color: textColor}]}>{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, {backgroundColor: bgColor}]}>
      <AppHeader
        title="Expense Detail"
        onBack={() => navigation.goBack()}
        isDark={isDark}
        rightComponent={
          canEdit ? (
            <TouchableOpacity onPress={() => setDeleteDialog(true)}>
              <MaterialCommunityIcons name="delete-outline" size={22} color={COLORS.error} />
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView
        contentContainerStyle={[styles.content, {paddingBottom: 100 + insets.bottom}]}
        showsVerticalScrollIndicator={false}>

        {/* Header card with category + amount */}
        <View style={[styles.amountCard, {backgroundColor: catColor}]}>
          <View style={styles.amountIcon}>
            <MaterialCommunityIcons name={catIcon} size={32} color="#FFF" />
          </View>
          <Text style={styles.amountValue}>
            ₹{Number(expense.amount).toLocaleString('en-IN')}
          </Text>
          <Text style={styles.amountCategory}>{expense.category}</Text>
          <Text style={styles.amountDate}>
            {dayjs(expense.expense_date).format('DD MMM YYYY')}
          </Text>
        </View>

        {/* Details */}
        <Card style={[styles.card, {backgroundColor: cardBg}]}>
          <Card.Content>
            <InfoRow icon="tag-outline" label="Title" value={expense.title} />
            {expense.description ? (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="text" size={18} color={COLORS.primary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, {color: subColor}]}>Description</Text>
                  <Text style={[styles.infoValue, {color: textColor}]}>{expense.description}</Text>
                </View>
              </View>
            ) : null}
            {expense.creator && (
              <InfoRow icon="account-outline" label="Added by" value={(expense.creator as any).name} />
            )}
          </Card.Content>
        </Card>

        {/* Receipt Image */}
        {expense.receipt_image ? (
          <Card style={[styles.card, {backgroundColor: cardBg}]}>
            <Card.Title title="Receipt" />
            <Card.Content>
              {imgError ? (
                <View style={styles.imgErrorBox}>
                  <MaterialCommunityIcons name="image-broken-variant" size={32} color={COLORS.placeholder} />
                  <Text style={[styles.imgErrorText, {color: subColor}]}>Image unavailable</Text>
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setViewerVisible(true)}>
                  <Image
                    source={{uri: expense.receipt_image!}}
                    style={styles.receiptImage}
                    resizeMode="cover"
                    onError={() => setImgError(true)}
                  />
                  <View style={styles.viewHint}>
                    <MaterialCommunityIcons name="magnify-plus-outline" size={14} color="#FFF" />
                    <Text style={styles.viewHintText}>Tap to view full size</Text>
                  </View>
                </TouchableOpacity>
              )}
            </Card.Content>
          </Card>
        ) : null}
      </ScrollView>

      {/* Edit button — sticky at bottom */}
      {canEdit && (
        <View style={[styles.editBar, {paddingBottom: insets.bottom + SPACING.sm}]}>
          <TouchableOpacity
            style={styles.editBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('EditExpense', {expenseId: expense.id})}>
            <MaterialCommunityIcons name="pencil" size={18} color="#FFF" />
            <Text style={styles.editBtnText}>Edit Expense</Text>
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
  container: {flex: 1},
  content: {padding: SPACING.md},
  amountCard: {
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  amountIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  amountValue: {color: '#FFF', fontSize: 32, fontWeight: '900'},
  amountCategory: {color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600'},
  amountDate: {color: 'rgba(255,255,255,0.7)', fontSize: 12},
  card: {borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.md, elevation: 2},
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  infoContent: {flex: 1},
  infoLabel: {fontSize: 11},
  infoValue: {fontSize: 14, fontWeight: '600', marginTop: 2},
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: BORDER_RADIUS.md,
  },
  viewHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.xs,
    alignSelf: 'flex-end',
  },
  viewHintText: {fontSize: 11, color: COLORS.placeholder},
  imgErrorBox: {
    height: 120,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  imgErrorText: {fontSize: 12},
  editBar: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  editBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  editBtnText: {color: '#FFF', fontSize: 15, fontWeight: '700'},
});

export default ExpenseDetailScreen;
