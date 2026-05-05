import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import StudentContactScreen from './contact';
import StudentChatThreadScreen from './chat-thread';

const Stack = createStackNavigator();

export default function StudentContactStack() {
  return (
    <Stack.Navigator id="student-contact-stack" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ContactList" component={StudentContactScreen} />
      <Stack.Screen name="ChatThread" component={StudentChatThreadScreen} />
    </Stack.Navigator>
  );
}
