import React, {useState} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import {BORDER_RADIUS, COLORS, SPACING} from '../../constants';

interface Props {
  visible: boolean;
  value: string; // YYYY-MM-DD
  onConfirm: (date: string) => void;
  onCancel: () => void;
  isDark?: boolean;
}

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const DatePickerModal: React.FC<Props> = ({
  visible,
  value,
  onConfirm,
  onCancel,
  isDark = false,
}) => {
  const initial = dayjs(value || dayjs().format('YYYY-MM-DD'));
  const [viewDate, setViewDate] = useState(initial.startOf('month'));
  const [selected, setSelected] = useState(initial);

  const daysInMonth = viewDate.daysInMonth();
  const startDayOfWeek = viewDate.startOf('month').day();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const bg = isDark ? COLORS.surfaceDark : COLORS.surface;
  const overlay = 'rgba(0,0,0,0.55)';
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const subColor = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;

  const handleConfirm = () => {
    onConfirm(selected.format('YYYY-MM-DD'));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.overlay, {backgroundColor: overlay}]}>
        <View style={[styles.card, {backgroundColor: bg}]}>
          {/* Month navigation */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setViewDate(viewDate.subtract(1, 'month'))}
              style={styles.navBtn}>
              <MaterialCommunityIcons name="chevron-left" size={26} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.monthYear, {color: textColor}]}>
              {viewDate.format('MMMM YYYY')}
            </Text>
            <TouchableOpacity
              onPress={() => setViewDate(viewDate.add(1, 'month'))}
              style={styles.navBtn}>
              <MaterialCommunityIcons name="chevron-right" size={26} color={textColor} />
            </TouchableOpacity>
          </View>

          {/* Day-of-week labels */}
          <View style={styles.weekRow}>
            {DAYS_OF_WEEK.map(d => (
              <Text key={d} style={[styles.weekLabel, {color: subColor}]}>
                {d}
              </Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.grid}>
            {cells.map((day, idx) => {
              if (!day) {
                return <View key={`e-${idx}`} style={styles.cell} />;
              }
              const cellDate = viewDate.date(day);
              const isSelected = cellDate.isSame(selected, 'day');
              const isToday = cellDate.isSame(dayjs(), 'day');
              return (
                <TouchableOpacity
                  key={`d-${idx}`}
                  style={[
                    styles.cell,
                    isSelected && {backgroundColor: COLORS.primary},
                    !isSelected && isToday && styles.todayCell,
                  ]}
                  onPress={() => setSelected(cellDate)}>
                  <Text
                    style={[
                      styles.cellText,
                      {color: isSelected ? '#fff' : textColor},
                      isToday && !isSelected && {color: COLORS.primary},
                    ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={onCancel} style={styles.actionBtn}>
              <Text style={[styles.actionText, {color: subColor}]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} style={styles.actionBtn}>
              <Text style={[styles.actionText, {color: COLORS.primary}]}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 320,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  navBtn: {
    padding: 4,
  },
  monthYear: {
    fontSize: 16,
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekLabel: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  cellText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  actionBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export default DatePickerModal;
