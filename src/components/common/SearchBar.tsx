import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Searchbar} from 'react-native-paper';
import {BORDER_RADIUS, COLORS, SPACING} from '../../constants';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  isDark?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  onClear,
  isDark = false,
}) => {
  return (
    <View style={styles.container}>
      <Searchbar
        placeholder={placeholder}
        onChangeText={onChangeText}
        value={value}
        onClearIconPress={() => {
          onChangeText('');
          onClear?.();
        }}
        style={[
          styles.searchbar,
          {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface},
        ]}
        inputStyle={{color: isDark ? COLORS.textDark : COLORS.text}}
        placeholderTextColor={COLORS.placeholder}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  searchbar: {
    borderRadius: BORDER_RADIUS.lg,
    elevation: 1,
  },
});

export default SearchBar;
