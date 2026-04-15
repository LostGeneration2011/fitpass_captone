import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';
import './global.css';
import WelcomeScreen from './app/welcome';
import LoginScreen from './app/login';
import RegisterScreen from './app/register';
import ForgotPasswordScreen from './app/forgot-password';
import ResetPasswordScreen from './app/reset-password';
import ManualVerificationScreen from './app/manual-verification';
import StudentStack from './app/student/student-stack';
import TeacherTabNavigator from './app/teacher/_layout';
import { WebSocketProvider } from './lib/WebSocketProvider';
import { ThemeProvider } from './lib/theme';
import { registerFcmTokenWithBackend, subscribeFcmTokenRefresh } from './lib/pushNotifications';

// Import global CSS for web
if (Platform.OS === 'web') {
  require('./global.css');
  require('./web-styles.css');
}

const Stack = createStackNavigator();
const isWeb = Platform.OS === 'web';

// NO LINKING NEEDED - Using ngrok web flow
export default function App() {
  useEffect(() => {
    registerFcmTokenWithBackend();
    const unsubscribe = subscribeFcmTokenRefresh();
    return () => unsubscribe();
  }, []);

  return (
    <ThemeProvider>
      <WebSocketProvider>
        <NavigationContainer>
          <Stack.Navigator 
            id="root-stack"
            initialRouteName="Welcome"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="ManualVerification" component={ManualVerificationScreen} />
            <Stack.Screen name="Student" component={StudentStack} />
            <Stack.Screen name="Teacher" component={TeacherTabNavigator} />
          </Stack.Navigator>
          <Toast />
        </NavigationContainer>
      </WebSocketProvider>
    </ThemeProvider>
  );
}