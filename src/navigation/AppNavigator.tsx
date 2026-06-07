import React, {useEffect} from 'react';
import {Platform} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {PERMISSIONS, request} from 'react-native-permissions';
import {useAuthStore} from '../store/authStore';
import {useThemeStore} from '../store/themeStore';
import {requestFCMPermission} from '../services/notificationService';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterGymScreen from '../screens/auth/RegisterGymScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import SplashScreen from '../screens/auth/SplashScreen';

// Main Tabs
import AdminTabs from './AdminTabs';
import ManagerTabs from './ManagerTabs';
import TrainerTabs from './TrainerTabs';

// Shared Screens
import StudentDetailScreen from '../screens/shared/StudentDetailScreen';
import AddStudentScreen from '../screens/shared/AddStudentScreen';
import EditStudentScreen from '../screens/shared/EditStudentScreen';
import RenewStudentScreen from '../screens/shared/RenewStudentScreen';
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
import ExpenseDetailScreen from '../screens/shared/ExpenseDetailScreen';
import EditExpenseScreen from '../screens/shared/EditExpenseScreen';
import AddSalaryScreen from '../screens/shared/AddSalaryScreen';
import EditSalaryScreen from '../screens/shared/EditSalaryScreen';
import ExpiryListScreen from '../screens/shared/ExpiryListScreen';
import PaymentQRScreen from '../screens/shared/PaymentQRScreen';

import {RootStackParamList} from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const {isAuthenticated, isLoading, checkSession, user} = useAuthStore();
  const {isDark} = useThemeStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const requestPermissions = async () => {
      // Camera permission (Android 6+ / iOS)
      const cameraPerm =
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.CAMERA
          : PERMISSIONS.ANDROID.CAMERA;
      await request(cameraPerm);

      // Android 13+ needs POST_NOTIFICATIONS at runtime
      if (Platform.OS === 'android') {
        await request(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
      }

      // Firebase Cloud Messaging permission (mainly iOS)
      await requestFCMPermission();
    };
    requestPermissions();
  }, [isAuthenticated]);

  // Show branded splash screen while checking persisted session
  if (isLoading) {
    return <SplashScreen />;
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
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : (
          // App Stack
          <>
            {getMainTabs()}
            <Stack.Screen name="StudentDetail" component={StudentDetailScreen} />
            <Stack.Screen name="AddStudent" component={AddStudentScreen} />
            <Stack.Screen name="EditStudent" component={EditStudentScreen} />
            <Stack.Screen name="RenewStudent" component={RenewStudentScreen} />
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
            <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} />
            <Stack.Screen name="EditExpense" component={EditExpenseScreen} />
            <Stack.Screen name="AddSalary" component={AddSalaryScreen} />
            <Stack.Screen name="EditSalary" component={EditSalaryScreen} />
            <Stack.Screen name="ExpiryList" component={ExpiryListScreen} />
            <Stack.Screen name="PaymentQR" component={PaymentQRScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
