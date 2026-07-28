import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar as RNStatusBar, KeyboardAvoidingView, Alert } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown, FadeOutDown, Layout, useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withDelay, interpolateColor } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { fetchCoachMessages, sendMessage } from '../services/api/coach';
import { transcribeAudio } from '../services/api/transcribe';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import { DarkColors, F } from '../theme';
import MeshGradientBackground from '../components/MeshGradientBackground';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { socket, joinUserRoom } from '../services/socket/socketClient';
import Markdown from 'react-native-markdown-display';

type MessageType = 'user' | 'ai' | 'action';

interface Message {
  id: string;
  type: MessageType;
  text?: string;
  actionPayload?: any;
}

function TypingIndicator() {
  const { C, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(C), [C]);
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const anim = () =>
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 300 }),
          withTiming(0, { duration: 300 }),
        ),
        -1,
        true,
      );
    dot1.value = anim();
    dot2.value = withDelay(150, anim());
    dot3.value = withDelay(300, anim());
  }, []);

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      exiting={FadeOutDown.springify()}
      layout={Layout.springify()}
      style={[styles.msgWrapper, styles.msgWrapperAI]}
    >
      <View style={styles.avatar}>
        <Icon name="auto-awesome" size={16} color={C.onPrimary} />
      </View>
      <BlurView intensity={60} tint={isDark ? "dark" : "light"} style={[styles.bubble, styles.bubbleAI, { flexDirection: 'row', alignItems: 'center', gap: 5, height: 42, paddingHorizontal: 16 }]}>
        <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary }, useAnimatedStyle(() => ({ transform: [{translateY: dot1.value}] }))]} />
        <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary }, useAnimatedStyle(() => ({ transform: [{translateY: dot2.value}] }))]} />
        <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary }, useAnimatedStyle(() => ({ transform: [{translateY: dot3.value}] }))]} />
      </BlurView>
    </Animated.View>
  );
}

export default function CoachScreen({ onNavigateToNotifications, onNavigateBack }: any) {
  const { C, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(C), [C]);
  
  const { user } = useAuth();
  
  const { data: initialMessages = [] } = useQuery({ 
    queryKey: ['coachMessages', user?.id], 
    queryFn: () => fetchCoachMessages(user?.id as string),
    enabled: !!user?.id
  });
  
  const [messages, setMessages] = useState<Message[]>([]);
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (user?.id) {
      joinUserRoom(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (initialMessages.length > 0 && messages.length === 0) {
      const mapped = initialMessages.map((m: any) => ({
        id: m.id,
        type: m.sender as MessageType,
        text: (m as any).text || ''
      }));
      setMessages(mapped);
    }
  }, [initialMessages]);

  useEffect(() => {
    const handleStreamStart = ({ messageId }: { messageId: string }) => {
      // Keep isTyping true, do not push empty bubble yet
    };

    const handleStreamChunk = ({ messageId, chunk }: { messageId: string; chunk: string }) => {
      setIsTyping(false);
      setMessages(prev => {
        const existing = prev.find(m => m.id === messageId);
        if (existing) {
          return prev.map(m => m.id === messageId ? { ...m, text: (m.text || '') + chunk } : m);
        } else {
          return [...prev, { id: messageId, type: 'ai', text: chunk }];
        }
      });
    };
    
    const handleStreamAction = ({ messageId, actionPayload }: { messageId: string; actionPayload: any }) => {
      setIsTyping(false);
      const uniqueActionId = `${messageId}-action-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      setMessages(prev => [...prev, { id: uniqueActionId, type: 'action', actionPayload }]);
      
      // Invalidate frontend queries based on the backend action
      if (actionPayload?.type === 'CALENDAR_UPDATED') {
        queryClient.invalidateQueries({ queryKey: ['calendar'] });
      } else if (actionPayload?.type === 'WORKOUT_CREATED') {
        queryClient.invalidateQueries({ queryKey: ['currentWorkout'] });
      } else if (actionPayload?.type === 'DIET_UPDATED') {
        queryClient.invalidateQueries({ queryKey: ['userMeals'] });
      }
    };

    const handleStreamEnd = () => {};

    const handleStreamError = ({ fallbackMessage, originalMessageId }: any) => {
      setIsTyping(false);
      setMessages(prev => {
        // Remove any abandoned empty bubbles
        const filtered = prev.filter(m => !(m.type === 'ai' && !m.text));
        return [...filtered, { id: fallbackMessage.id, type: 'ai', text: fallbackMessage.content }];
      });
    };

    socket.on('ai_stream_start', handleStreamStart);
    socket.on('ai_stream_chunk', handleStreamChunk);
    socket.on('ai_stream_action', handleStreamAction);
    socket.on('ai_stream_end', handleStreamEnd);
    socket.on('ai_stream_error', handleStreamError);

    return () => {
      socket.off('ai_stream_start', handleStreamStart);
      socket.off('ai_stream_chunk', handleStreamChunk);
      socket.off('ai_stream_action', handleStreamAction);
      socket.off('ai_stream_end', handleStreamEnd);
      socket.off('ai_stream_error', handleStreamError);
    };
  }, []);

  const scrollViewRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const webRecognitionRef = useRef<any>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isTyping]);

  const borderProgress = useSharedValue(0);
  const [isFocused, setIsFocused] = useState(false);
  useEffect(() => {
    borderProgress.value = withTiming(isFocused ? 1 : 0, { duration: 250 });
  }, [isFocused]);

  const inputStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      borderProgress.value,
      [0, 1],
      [C.outlineVariant, C.primary]
    );
    return { borderColor };
  });

  const micScale = useSharedValue(1);
  const sendScale = useSharedValue(0);

  useEffect(() => {
    if (inputText.trim().length > 0) {
      micScale.value = withTiming(0, { duration: 200 });
      sendScale.value = withTiming(1, { duration: 200 });
    } else {
      micScale.value = withTiming(1, { duration: 200 });
      sendScale.value = withTiming(0, { duration: 200 });
    }
  }, [inputText]);

  const micPulse = useSharedValue(1);
  useEffect(() => {
    if (isRecording) {
      micPulse.value = withRepeat(withTiming(1.3, { duration: 500 }), -1, true);
    } else {
      micPulse.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording]);

  const micStyle = useAnimatedStyle(() => ({ transform: [{ scale: micScale.value }, { scale: micPulse.value }], opacity: micScale.value }));
  const sendStyle = useAnimatedStyle(() => ({ transform: [{ scale: sendScale.value }], opacity: sendScale.value, position: 'absolute' }));

  const requestAudioPermission = async () => {
    if (Platform.OS === 'web') return true;
    try {
      const { status } = await requestRecordingPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Required", "Please grant microphone access to use voice commands.");
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  };

  const startWebRecording = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        if (Platform.OS === 'web') window.alert("Speech recognition not supported.");
        else Alert.alert("Error", "Speech recognition not supported.");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setInputText(prev => prev ? prev + ' ' + text : text);
      };
      recognition.onend = () => setIsRecording(false);
      recognition.start();
      webRecognitionRef.current = recognition;
    } catch (e) { console.error(e); }
  };

  const stopWebRecording = () => {
    if (webRecognitionRef.current) webRecognitionRef.current.stop();
    setIsRecording(false);
  };

  const startNativeRecording = async () => {
    const hasPerm = await requestAudioPermission();
    if (!hasPerm) return;
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert("Error", 'Could not start recording.');
    }
  };

  const stopNativeRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    setIsProcessingVoice(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        const text = await transcribeAudio(uri);
        if (text) setInputText(prev => prev ? prev + ' ' + text : text);
      }
    } catch (err: any) {
      Alert.alert("Error", 'Voice processing failed');
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const handleMicPress = () => {
    if (isRecording) Platform.OS === 'web' ? stopWebRecording() : stopNativeRecording();
    else Platform.OS === 'web' ? startWebRecording() : startNativeRecording();
  };

  const handleSend = async () => {
    if (!inputText.trim() || !user?.id) return;
    const userText = inputText;
    
    setMessages(prev => [...prev, { id: Date.now().toString(), type: 'user', text: userText }]);
    setInputText('');
    setIsTyping(true); // Triggers the visual TypingIndicator
    
    try { 
      await sendMessage(userText, user.id); 
    } catch (err) { 
      setIsTyping(false); 
      setMessages(prev => [...prev, { id: Date.now().toString(), type: 'ai', text: "Network error. Please try again." }]);
    }
  };

  const markdownStyles = {
    body: { color: C.onSurface, fontSize: 15, fontFamily: F.body, lineHeight: 22 },
    heading1: { color: C.onSurface, fontFamily: F.header, marginTop: 10, marginBottom: 5 },
    heading2: { color: C.onSurface, fontFamily: F.header, marginTop: 8, marginBottom: 4 },
    strong: { fontFamily: F.bodyBold, color: C.primary },
    em: { fontStyle: 'italic' as const },
    list_item: { marginBottom: 4 },
    bullet_list: { marginBottom: 12 },
  };

  const renderActionCard = (msg: Message) => {
    if (!msg.actionPayload) return null;
    const p = msg.actionPayload;

    return (
      <Animated.View entering={FadeInUp.springify()} style={[styles.msgWrapper, styles.msgWrapperAI]}>
        <View style={[styles.avatar, { backgroundColor: C.primary }]}>
          <Icon name="auto-awesome" size={16} color={C.onPrimary} />
        </View>
        <View style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <Icon name={p.type.includes('WORKOUT') ? 'fitness-center' : 'event'} size={16} color={C.primary} />
            <Text style={styles.actionTitle}>System Updated</Text>
          </View>
          <Text style={styles.actionText}>{p.summary}</Text>
        </View>
      </Animated.View>
    );
  };

  const renderMessage = (msg: Message) => {
    if (msg.type === 'action') return renderActionCard(msg);
    const isUser = msg.type === 'user';
    
    // Safety check to avoid React crashes on empty strings or objects
    const safeMarkdownText = typeof msg.text === 'string' ? msg.text : "";
    if (!isUser && safeMarkdownText === "") return null;

    return (
      <Animated.View key={msg.id} entering={isUser ? FadeInDown.springify() : FadeInUp.springify()} layout={Layout.springify()} style={[styles.msgWrapper, isUser ? styles.msgWrapperUser : styles.msgWrapperAI]}>
        {!isUser && <View style={styles.avatar}><Icon name="auto-awesome" size={16} color={C.onPrimary} /></View>}
        {isUser ? (
          <LinearGradient colors={[C.primary, C.primaryDim]} style={[styles.bubble, styles.bubbleUser]}>
            <Text style={[styles.msgText, styles.msgTextUser]}>{safeMarkdownText}</Text>
          </LinearGradient>
        ) : (
          <BlurView intensity={60} tint={isDark ? "dark" : "light"} style={[styles.bubble, styles.bubbleAI]}>
            <Markdown style={markdownStyles}>{safeMarkdownText}</Markdown>
          </BlurView>
        )}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <MeshGradientBackground isDark={isDark} bgColors={isDark ? ["#0F172A", "#1E1B4B", "#312E81"] : ["#F8FAFC", "#F1F5F9", "#E2E8F0"]} />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {onNavigateBack && (
              <TouchableOpacity onPress={onNavigateBack} style={{ marginRight: 12 }}>
                <Icon name="chevron-left" size={24} color={C.onSurface} />
              </TouchableOpacity>
            )}
            <View>
              <View style={styles.headerTitleRow}>
                <Icon name="auto-awesome" size={24} color={C.primary} />
                <Text style={styles.headerTitle}>Rachel</Text>
              </View>
              <Text style={styles.headerSub}>AI Fitness Coach</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onNavigateToNotifications?.(); }} style={{ padding: 8, backgroundColor: C.glassInset, borderRadius: 20 }}>
            <Icon name="notifications" size={20} color={C.onSurface} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}>
          <ScrollView 
            ref={scrollViewRef}
            style={styles.chatList} 
            contentContainerStyle={styles.chatListContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg: Message, index: number) => {
              const safeText = typeof msg.text === 'string' 
                ? msg.text 
                : JSON.stringify(msg.text || '');

              const safeMsg = { ...msg, text: safeText };

              return (
                <View key={msg.id || `msg-${index}`}>
                  {renderMessage(safeMsg)}
                </View>
              );
            })}
            {isTyping && <TypingIndicator />}
            <View style={{ height: 100 }} />
          </ScrollView>

          <View style={styles.inputArea}>
            <Animated.View style={[styles.inputWrapper, inputStyle]}>
              <TextInput 
                style={styles.input}
                placeholder="Ask Rachel to adjust your workout..."
                placeholderTextColor={C.onSurfaceVariant}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSend}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                multiline={false}
              />
              <View style={styles.iconBtnWrapper}>
                <Animated.View style={[micStyle, { position: 'absolute', right: 0 }]}>
                  <TouchableOpacity 
                    onPress={handleMicPress} 
                    disabled={isProcessingVoice}
                    style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon name="mic" size={24} color={isRecording ? C.error : C.onSurfaceVariant} />
                  </TouchableOpacity>
                </Animated.View>
                <Animated.View style={[sendStyle, { position: 'absolute', right: 0 }]}>
                  <TouchableOpacity 
                    onPress={handleSend} 
                    disabled={!inputText.trim() && !isTyping}
                    style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <View style={{ backgroundColor: C.primary, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="arrow-upward" size={18} color={C.onPrimary} />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 10 : 10,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 24, fontFamily: F.header, color: C.onSurface, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, fontFamily: F.body, color: C.primary, marginTop: 2, marginLeft: 32 },

  chatList: { flex: 1 },
  chatListContent: { padding: 20, gap: 16 },

  msgWrapper: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8 },
  msgWrapperUser: { justifyContent: 'flex-end' },
  msgWrapperAI: { justifyContent: 'flex-start' },

  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  
  bubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, overflow: 'hidden' },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleAI: { borderBottomLeftRadius: 4 },
  
  msgText: { fontSize: 15, fontFamily: F.body, lineHeight: 22 },
  msgTextUser: { color: C.onPrimary },
  msgTextAI: { color: C.onSurface },

  actionContainer: {
    marginLeft: 36,
    marginVertical: 8,
    backgroundColor: 'rgba(245, 196, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 196, 0, 0.3)',
    borderRadius: 16,
    padding: 16,
    maxWidth: '85%'
  },
  actionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  actionTitle: { fontSize: 14, fontFamily: F.header, color: C.primary },
  actionDesc: { fontSize: 13, fontFamily: F.body, color: C.onSurface, marginBottom: 4 },
  actionDivider: { height: 1, backgroundColor: 'rgba(245, 196, 0, 0.2)', marginVertical: 10 },
  actionHint: { fontSize: 12, fontFamily: F.body, color: C.primary, opacity: 0.8 },
  actionBtn: { marginTop: 12, backgroundColor: C.primary, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { fontSize: 13, fontFamily: F.header, color: C.onPrimary },

  inputArea: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 100 : 90, // gap for absolute bottom nav
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: C.glassInset,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingRight: 45,
    minHeight: 48,
    maxHeight: 120,
    borderWidth: 0, // removed internal border as requested
  },
  iconBtnWrapper: {
    position: 'absolute',
    right: 8,
    bottom: 4,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: F.body,
    color: C.onSurface,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
