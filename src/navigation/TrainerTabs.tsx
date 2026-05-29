import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useThemeStore} from '../store/themeStore';
import {COLORS} from '../constants';

import TrainerDashboardScreen from '../screens/trainer/TrainerDashboardScreen';
import StudentListScreen from '../screens/shared/StudentListScreen';
import MoreScreen from '../screens/shared/MoreScreen';

const Tab = createBottomTabNavigator();

const TrainerTabs: React.FC = () => {
  const {isDark} = useThemeStore();

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarIcon: ({color, size}) => {
          let iconName = 'home';
          if (route.name === 'Dashboard') iconName = 'view-dashboard';
          else if (route.name === 'Students') iconName = 'account-group';
          else if (route.name === 'More') iconName = 'dots-grid';
          return (
            <MaterialCommunityIcons name={iconName} size={size} color={color} />
          );
        },
        tabBarActiveTintColor: COLORS.trainerColor,
        tabBarInactiveTintColor: isDark ? COLORS.textSecondaryDark : COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface,
          borderTopColor: isDark ? COLORS.borderDark : COLORS.border,
          elevation: 8,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {fontSize: 11, fontWeight: '600'},
      })}>
      <Tab.Screen name="Dashboard" component={TrainerDashboardScreen} />
      <Tab.Screen name="Students" component={StudentListScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
};

export default TrainerTabs;
