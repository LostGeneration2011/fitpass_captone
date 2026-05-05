import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import TeacherContactScreen from './contact';
import TeacherChatThreadScreen from './chat-thread';

const Stack = createStackNavigator();

export default function TeacherContactStack() {
  return (
    <Stack.Navigator id="teacher-contact-stack" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ContactList" component={TeacherContactScreen} />
      <Stack.Screen name="ChatThread" component={TeacherChatThreadScreen} />
    </Stack.Navigator>
  );
}
