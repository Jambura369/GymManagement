import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {BORDER_RADIUS, COLORS, SPACING} from '../../constants';

interface Option {
  label: string;
  value: string;
}

interface SelectPickerProps {
  label: string;
  value: string;
  options: Option[];
  onSelect: (value: string) => void;
  error?: string;
  placeholder?: string;
  isDark?: boolean;
}

const SelectPicker: React.FC<SelectPickerProps> = ({
  label,
  value,
  options,
  onSelect,
  error,
  placeholder = 'Select...',
  isDark = false,
}) => {
  const [visible, setVisible] = useState(false);
  const selected = options.find(o => o.value === value);
  const bgColor = isDark ? COLORS.surfaceDark : COLORS.surface;
  const textColor = isDark ? COLORS.textDark : COLORS.text;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, {color: isDark ? COLORS.textSecondaryDark : COLORS.textSecondary}]}>
        {label}
      </Text>
      <TouchableOpacity
        style={[
          styles.selector,
          {
            borderColor: error ? COLORS.error : isDark ? COLORS.borderDark : COLORS.border,
            backgroundColor: bgColor,
          },
        ]}
        onPress={() => setVisible(true)}>
        <Text style={[styles.selectorText, {color: selected ? textColor : COLORS.placeholder}]}>
          {selected ? selected.label : placeholder}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={20}
          color={COLORS.placeholder}
        />
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}>
          <View style={[styles.sheet, {backgroundColor: bgColor}]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, {color: textColor}]}>{label}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={item => item.value}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.value === value && styles.optionSelected,
                  ]}
                  onPress={() => {
                    onSelect(item.value);
                    setVisible(false);
                  }}>
                  <Text
                    style={[
                      styles.optionText,
                      {color: textColor},
                      item.value === value && {color: COLORS.primary, fontWeight: '600'},
                    ]}>
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color={COLORS.primary}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {marginBottom: SPACING.sm},
  label: {fontSize: 12, marginBottom: 4, marginLeft: 4},
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  selectorText: {fontSize: 15},
  error: {color: COLORS.error, fontSize: 12, marginTop: 2, marginLeft: 4},
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '70%',
    paddingBottom: SPACING.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sheetTitle: {fontSize: 16, fontWeight: '700'},
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  optionSelected: {backgroundColor: COLORS.primary + '10'},
  optionText: {fontSize: 15},
});

export default SelectPicker;
