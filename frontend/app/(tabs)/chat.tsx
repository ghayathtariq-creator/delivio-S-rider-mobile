import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import riderService from '../../src/services/riderService';
import Colors from '../../src/constants/colors';
import { ChatMessage, Task } from '../../src/types';
import { format, isToday, isYesterday } from 'date-fns';

export default function ChatScreen() {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    loadActiveTask();
  }, []);

  useEffect(() => {
    if (activeTask) {
      loadMessages();
      // Poll for new messages every 5 seconds
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTask?.id]);

  const loadActiveTask = async () => {
    try {
      const tasks = await riderService.getTasks();
      if (tasks.length > 0) {
        setActiveTask(tasks[0]);
      }
    } catch (error) {
      console.error('Error loading task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!activeTask) return;
    try {
      const data = await riderService.getMessages(activeTask.id);
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeTask || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      await riderService.sendMessage(activeTask.id, messageText);
      await loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText); // Restore message if failed
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageDate = (dateString: string): string => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    }
    return format(date, 'dd MMM HH:mm');
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isRider = item.sender_type === 'rider';

    return (
      <View
        style={[
          styles.messageBubble,
          isRider ? styles.riderMessage : styles.customerMessage,
        ]}
      >
        <Text style={styles.messageText}>{item.message}</Text>
        <Text style={styles.messageTime}>{formatMessageDate(item.created_at)}</Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!activeTask) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No active order</Text>
          <Text style={styles.emptyText}>
            Chat will be available when you have an active delivery
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Chat with Customer</Text>
          <Text style={styles.headerSubtitle}>
            Order #{activeTask.id.slice(-6).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              listRef.current?.scrollToEnd({ animated: true });
            }
          }}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>No messages yet. Start the conversation!</Text>
            </View>
          }
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textMuted}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={Colors.textPrimary} />
            ) : (
              <Ionicons name="send" size={20} color={Colors.textPrimary} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  riderMessage: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  customerMessage: {
    backgroundColor: Colors.backgroundCard,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  messageTime: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.backgroundCard,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyChatText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
