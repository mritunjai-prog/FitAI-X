import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar as RNStatusBar, KeyboardAvoidingView } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown, FadeOutDown, Layout, useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withDelay, interpolateColor } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { DarkColors, F } from '../theme';
import MeshGradientBackground from '../components/MeshGradientBackground';

const C = DarkColors;

type MessageType = 'user' | 'ai' | 'action';

interface Message {
  id: string;
  type: MessageType;
  text?: string;
  actionPayload?: any;
}

function TypingIndicator() {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const anim = () => withRepeat(withSequence(withTiming(-4, {duration: 300}), withTiming(0, {duration: 300})), -1, true);
    dot1.value = anim();
    dot2.value = withDelay(150, anim());
    dot3.value = withDelay(300, anim());
  }, []);

  return (
    <Animated.View entering={FadeInDown.springify()} exiting={FadeOutDown.springify()} layout={Layout.springify()} style={[styles.msgWrapper, styles.msgWrapperAI]}>
      <View style={styles.avatar}>
        <Icon name="auto-awesome" size={16} color={C.onPrimary} />
      </View>
      <BlurView intensity={60} tint="dark" style={[styles.bubble, styles.bubbleAI, { flexDirection: 'row', alignItems: 'center', gap: 5, height: 42, paddingHorizontal: 16 }]}>
        <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary }, useAnimatedStyle(() => ({ transform: [{translateY: dot1.value}] }))]} />
        <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary }, useAnimatedStyle(() => ({ transform: [{translateY: dot2.value}] }))]} />
        <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary }, useAnimatedStyle(() => ({ transform: [{translateY: dot3.value}] }))]} />
      </BlurView>
    </Animated.View>
  );
}

export default function CoachScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', type: 'ai', text: 'Hey! I noticed you logged knee pain after your last session. How are you feeling today?' },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  const borderProgress = useSharedValue(0);
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

  const micStyle = useAnimatedStyle(() => ({ transform: [{ scale: micScale.value }], opacity: micScale.value }));
  const sendStyle = useAnimatedStyle(() => ({ transform: [{ scale: sendScale.value }], opacity: sendScale.value, position: 'absolute' }));

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMsg: Message = { id: Date.now().toString(), type: 'user', text: inputText };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      if (newMsg.text?.toLowerCase().includes('knee')) {
        setMessages(prev => [
          ...prev, 
          { id: Date.now().toString() + 'a', type: 'ai', text: 'Got it. I strongly advise skipping heavy squats today. I have generated a modified lower body workout that focuses on glutes and hamstrings without loading the knee joint.' },
          { id: Date.now().toString() + 'b', type: 'action', actionPayload: { type: 'WORKOUT_MODIFIED' } }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { id: Date.now().toString() + 'a', type: 'ai', text: 'Understood. I will keep that in mind for your upcoming sessions. Ready to crush today\'s workout?' }
        ]);
      }
    }, 1800);
  };

  const renderMessage = (msg: Message) => {
    if (msg.type === 'action' && msg.actionPayload?.type === 'WORKOUT_MODIFIED') {
      return (
        <Animated.View key={msg.id} entering={FadeInUp.springify()} layout={Layout.springify()} style={styles.actionContainer}>
          <View style={styles.actionHeader}>
            <Icon name="build" size={16} color={C.primary} />
            <Text style={styles.actionTitle}>Workout Adjusted</Text>
          </View>
          <Text style={styles.actionDesc}>Removed: Barbell Back Squat</Text>
          <Text style={styles.actionDesc}>Added: Romanian Deadlift</Text>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>Review Changes</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    const isUser = msg.type === 'user';
    return (
      <Animated.View 
        key={msg.id} 
        entering={isUser ? FadeInDown.springify() : FadeInUp.springify()} 
        layout={Layout.springify()}
        style={[styles.msgWrapper, isUser ? styles.msgWrapperUser : styles.msgWrapperAI]}
      >
        {!isUser && (
          <View style={styles.avatar}>
            <Icon name="auto-awesome" size={16} color={C.onPrimary} />
          </View>
        )}

        {isUser ? (
          <LinearGradient colors={[C.primary, C.primaryDim]} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.bubble, styles.bubbleUser]}>
            <Text style={[styles.msgText, styles.msgTextUser]}>{msg.text}</Text>
          </LinearGradient>
        ) : (
          <BlurView intensity={60} tint="dark" style={[styles.bubble, styles.bubbleAI]}>
            <Text style={[styles.msgText, styles.msgTextAI]}>{msg.text}</Text>
          </BlurView>
        )}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <MeshGradientBackground isDark={true} bgColors={['#0F172A', '#1E1B4B', '#312E81']} />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Icon name="auto-awesome" size={24} color={C.primary} />
            <Text style={styles.headerTitle}>Rachel</Text>
          </View>
          <Text style={styles.headerSub}>AI Fitness Coach</Text>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView 
            ref={scrollViewRef}
            style={styles.chatList} 
            contentContainerStyle={styles.chatListContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map(renderMessage)}
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
              <TouchableOpacity style={styles.iconBtn} onPress={handleSend} disabled={!inputText.trim() && !isTyping}>
                <Animated.View style={micStyle}>
                  <Icon name="mic" size={24} color={C.onSurfaceVariant} />
                </Animated.View>
                <Animated.View style={sendStyle}>
                  <View style={{ backgroundColor: C.primary, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="arrow-upward" size={18} color={C.onPrimary} />
                  </View>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 10 : 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
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
  bubbleAI: { borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.outlineVariant },
  
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
  actionBtn: { marginTop: 12, backgroundColor: C.primary, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { fontSize: 13, fontFamily: F.header, color: C.onPrimary },

  inputArea: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80, 
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: C.glassInset,
    borderRadius: 24,
    paddingLeft: 20,
    paddingRight: 8,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
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
