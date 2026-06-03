import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useThemeStore} from '../store/themeStore';
import {COLORS} from '../constants';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import StudentListScreen from '../screens/shared/StudentListScreen';
import ExpenseListScreen from '../screens/shared/ExpenseListScreen';
import MoreScreen from '../screens/shared/MoreScreen';

const Tab = createBottomTabNavigator();

const AdminTabs: React.FC = () => {
  const {isDark} = useThemeStore();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarIcon: ({color, size}) => {
          let iconName = 'home';
          if (route.name === 'Dashboard') iconName = 'view-dashboard';
          else if (route.name === 'Students') iconName = 'account-group';
          else if (route.name === 'Expenses') iconName = 'cash-minus';
          else if (route.name === 'More') iconName = 'dots-grid';
          return (
            <MaterialCommunityIcons name={iconName} size={size} color={color} />
          );
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: isDark ? COLORS.textSecondaryDark : COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface,
          borderTopColor: isDark ? COLORS.borderDark : COLORS.border,
          borderTopWidth: 1,
          elevation: 8,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      })}>
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="Students" component={StudentListScreen} />
      <Tab.Screen name="Expenses" component={ExpenseListScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
};

export default AdminTabs;
