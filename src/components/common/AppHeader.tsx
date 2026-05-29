import React from 'react';
import {StyleSheet, View, Text, TouchableOpacity, StatusBar} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {COLORS, SPACING} from '../../constants';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightComponent?: React.ReactNode;
  isDark?: boolean;
  backgroundColor?: string;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightComponent,
  isDark = false,
  backgroundColor,
}) => {
  const insets = useSafeAreaInsets();
  const bg = backgroundColor || (isDark ? COLORS.surfaceDark : COLORS.surface);
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const iconColor = isDark ? COLORS.textDark : COLORS.text;

  return (
    <View
      style={[
        styles.header,
        {backgroundColor: bg, paddingTop: insets.top + SPACING.sm},
      ]}>
      <StatusBar
        backgroundColor={bg}
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={iconColor}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, {color: textColor}]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, {color: COLORS.textSecondary}]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.rightContainer}>
          {rightComponent || <View style={styles.placeholder} />}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  rightContainer: {
    width: 40,
    alignItems: 'flex-end',
  },
  placeholder: {
    width: 40,
  },
});

export default AppHeader;
