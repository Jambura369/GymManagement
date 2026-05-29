import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ActivityIndicator, View} from 'react-native';
import {useAuthStore} from '../store/authStore';
import {useThemeStore} from '../store/themeStore';
import {COLORS} from '../constants';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterGymScreen from '../screens/auth/RegisterGymScreen';

// Main Tabs
import AdminTabs from './AdminTabs';
import ManagerTabs from './ManagerTabs';
import TrainerTabs from './TrainerTabs';

// Shared Screens
import StudentDetailScreen from '../screens/shared/StudentDetailScreen';
import AddStudentScreen from '../screens/shared/AddStudentScreen';
import EditStudentScreen from '../screens/shared/EditStudentScreen';
import VerificationListScreen from '../screens/shared/VerificationListScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import GymSettingsScreen from '../screens/shared/GymSettingsScreen';
import PackageListScreen from '../screens/shared/PackageListScreen';
import AddPackageScreen from '../screens/shared/AddPackageScreen';
import EditPackageScreen from '../screens/shared/EditPackageScreen';
import ReportsScreen from '../screens/shared/ReportsScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import AddUserScreen from '../screens/admin/AddUserScreen';
import AddExpenseScreen from '../screens/shared/AddExpenseScreen';
import EditExpenseScreen from '../screens/shared/EditExpenseScreen';
import AddSalaryScreen from '../screens/shared/AddSalaryScreen';

import {RootStackParamList} from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const {isAuthenticated, isLoading, checkSession, user} = useAuthStore();
  const {isDark} = useThemeStore();

  useEffect(() => {
    checkSession();
  }, []);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? COLORS.backgroundDark : COLORS.background,
        }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const getMainTabs = () => {
    if (!user) return null;
    switch (user.role) {
      case 'Admin':
        return <Stack.Screen name="MainTabs" component={AdminTabs} />;
      case 'Manager':
        return <Stack.Screen name="MainTabs" component={ManagerTabs} />;
      case 'Trainer':
        return <Stack.Screen name="MainTabs" component={TrainerTabs} />;
      default:
        return <Stack.Screen name="MainTabs" component={AdminTabs} />;
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="RegisterGym" component={RegisterGymScreen} />
          </>
        ) : (
          // App Stack
          <>
            {getMainTabs()}
            <Stack.Screen name="StudentDetail" component={StudentDetailScreen} />
            <Stack.Screen name="AddStudent" component={AddStudentScreen} />
            <Stack.Screen name="EditStudent" component={EditStudentScreen} />
            <Stack.Screen name="VerificationList" component={VerificationListScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="GymSettings" component={GymSettingsScreen} />
            <Stack.Screen name="PackageList" component={PackageListScreen} />
            <Stack.Screen name="AddPackage" component={AddPackageScreen} />
            <Stack.Screen name="EditPackage" component={EditPackageScreen} />
            <Stack.Screen name="Reports" component={ReportsScreen} />
            <Stack.Screen name="UserManagement" component={UserManagementScreen} />
            <Stack.Screen name="AddUser" component={AddUserScreen} />
            <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
            <Stack.Screen name="EditExpense" component={EditExpenseScreen} />
            <Stack.Screen name="AddSalary" component={AddSalaryScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
