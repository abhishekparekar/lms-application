import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  useColorScheme 
} from 'react-native';
import { Colors } from '@/constants/theme';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'support';
  timestamp: string;
}

export const ChatSupportScreen: React.FC = () => {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! Welcome to LMS & Job Portal Support. How can we help you today?',
      sender: 'support',
      timestamp: '10:00 AM',
    }
  ]);
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: `u-${Date.now()}`,
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Simulate auto-support response
    setTimeout(() => {
      const supportReply: Message = {
        id: `s-${Date.now()}`,
        text: "Thank you for reaching out. A support executive has been notified and will join this thread shortly. For immediate course questions, you can check our Resources tab.",
        sender: 'support',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, supportReply]);
    }, 1500);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isUser = item.sender === 'user';
          return (
            <View style={[styles.row, isUser ? styles.userRow : styles.supportRow]}>
              <View style={[styles.bubble, isUser ? styles.userBubble : styles.supportBubble]}>
                <Text style={[styles.msgText, isUser ? styles.userText : styles.supportText]}>
                  {item.text}
                </Text>
                <Text style={[styles.timeText, isUser ? styles.userTime : styles.supportTime]}>
                  {item.timestamp}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <View style={[styles.inputBar, { borderTopColor: colors.backgroundSelected }]}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask us anything..."
          placeholderTextColor="#9CA3AF"
          value={inputText}
          onChangeText={setInputText}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    width: '100%',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  supportRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    borderRadius: 12,
    padding: 12,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: '#4F46E5',
  },
  supportBubble: {
    backgroundColor: '#F3F4F6',
  },
  msgText: {
    fontSize: 14,
    lineHeight: 18,
  },
  userText: {
    color: '#ffffff',
  },
  supportText: {
    color: '#1F2937',
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  supportTime: {
    color: '#9CA3AF',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    gap: 12,
    backgroundColor: '#ffffff',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    height: 40,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
  },
  sendBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    height: 40,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
