import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import TeacherProfile from './profile';
import TeacherReports from './reports';
import TeacherEarnings from './earnings';
import TeacherAttendance from './attendance-view';

const Stack = createStackNavigator();

export default function TeacherProfileStack() {
  return (
    <Stack.Navigator
      id="TeacherProfileStack"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="ProfileMain" 
        component={TeacherProfile} 
      />
      <Stack.Screen 
        name="Reports" 
        component={TeacherReports} 
      />
      <Stack.Screen 
        name="Earnings" 
        component={TeacherEarnings} 
      />
      <Stack.Screen 
        name="AttendanceView" 
        component={TeacherAttendance} 
      />
    </Stack.Navigator>
  );
}