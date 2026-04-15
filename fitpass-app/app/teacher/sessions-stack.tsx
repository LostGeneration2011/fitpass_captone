import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import TeacherSessions from './sessions';
import SessionDetail from './sessions/[id]';
import TeacherAttendanceScreen from './attendance-view';

const Stack = createStackNavigator();

export default function TeacherSessionsStack() {
  return (
    <Stack.Navigator
      id="TeacherSessionsStack"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="SessionsList" component={TeacherSessions} />
      <Stack.Screen name="SessionDetail" component={SessionDetail} />
      <Stack.Screen name="AttendanceView" component={TeacherAttendanceScreen} />
    </Stack.Navigator>
  );
}
