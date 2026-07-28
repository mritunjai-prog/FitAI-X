import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  Dimensions, 
  TouchableWithoutFeedback, 
  Keyboard,
  ScrollView,
  Image
} from 'react-native';
import Animated, { 
  FadeInUp, 
  FadeInDown, 
  Layout, 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withRepeat, 
  withTiming, 
  Easing, 
  interpolateColor,
  withSequence
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

import { F } from '../theme';
import MeshGradientBackground from '../components/MeshGradientBackground';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_W } = Dimensions.get('window');

type AuthMode = 'login' | 'register';

// ─── SVG Icons for Socials ──────────────────────────────────────────────────
const GoogleIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path fill="#EA4335" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <Path fill="#4285F4" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
    <Path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.22 0 10.06 0 12s.47 3.78 1.29 5.38l3.98-3.09z" />
    <Path fill="#34A853" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
  </Svg>
);

const AppleIcon = ({ color = "#FFF" }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill={color}>
    <Path d="M17.05 11.46c-.02-2.38 1.94-3.53 2.03-3.59-1.11-1.62-2.83-1.84-3.45-1.87-1.48-.15-2.88.88-3.64.88-.75 0-1.92-.85-3.16-.83-1.6.02-3.08.93-3.9 2.37-1.68 2.92-.43 7.23 1.2 9.59.8 1.16 1.74 2.45 2.99 2.41 1.21-.05 1.68-.78 3.14-.78 1.45 0 1.89.78 3.16.76 1.3-.02 2.11-1.17 2.9-2.33.91-1.33 1.29-2.62 1.3-2.69-.03-.01-2.55-.98-2.57-3.92zM14.94 3.34c.67-.81 1.12-1.93.99-3.05-1.01.04-2.18.67-2.86 1.48-.6.72-1.12 1.87-.97 2.97 1.11.09 2.17-.6 2.84-1.4z" />
  </Svg>
);

// ─── Brand Logo ─────────────────────────────────────────────────────────────
function BrandLogo({ isDark, C, styles }: any) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(1.05, { duration: 3000 }), withTiming(0.95, { duration: 3000 })), -1, true);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={[styles.heroContainer, { width: 220, height: 220, backgroundColor: 'transparent' }]}>
      <Animated.View style={[animStyle, { width: 200, height: 200, borderRadius: 100, overflow: 'hidden', borderWidth: 2, borderColor: '#F5C400', backgroundColor: isDark ? '#000' : '#FFF', justifyContent: 'center', alignItems: 'center' }]}>
        <Image 
          source={isDark ? require('../../assets/fiAIXlogo.png.png') : require('../../assets/logoforlightmode.png')} 
          style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
        />
      </Animated.View>
    </View>
  );
}

// ─── Animated Custom Input ──────────────────────────────────────────────────
function AuthInput({ icon, placeholder, value, onChangeText, isPassword = false, autoCapitalize = 'none', C, styles }: any) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  
  const focusAnim = useSharedValue(0);

  useEffect(() => {
    focusAnim.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
  }, [isFocused]);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focusAnim.value, [0, 1], [C.outlineVariant, C.primary]) as string,
    backgroundColor: interpolateColor(focusAnim.value, [0, 1], [C.surface, 'rgba(245, 196, 0, 0.05)']) as string,
  }));

  return (
    <Animated.View style={[styles.inputWrapper, borderStyle]}>
      <Icon name={icon} size={20} color={isFocused ? C.primary : C.onSurfaceVariant} style={{ marginRight: 12 }} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={C.onSurfaceVariant}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={isPassword && !showPass}
        onFocus={() => { Haptics.selectionAsync(); setIsFocused(true); }}
        onBlur={() => setIsFocused(false)}
        keyboardAppearance={C.bg === '#050505' ? 'dark' : 'light'}
        autoCapitalize={autoCapitalize}
      />
      {isPassword && (
        <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ padding: 4 }}>
          <Icon name={showPass ? "visibility" : "visibility-off"} size={20} color={C.onSurfaceVariant} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function AuthScreen({ onAuthSuccess }: { onAuthSuccess?: () => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const { login, signup, isLoading } = useAuth();
  const { C, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(C, isDark), [C, isDark]);
  
  // Tab Slider Animation
  const tabPos = useSharedValue(0);

  useEffect(() => {
    tabPos.value = withSpring(mode === 'login' ? 0 : 1, { damping: 16, stiffness: 120 });
    setLocalError(null);
  }, [mode]);

  const tabStyle = useAnimatedStyle(() => ({
    left: `${tabPos.value * 50}%` as any,
  }));

  const handleAuth = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLocalError(null);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(name, email, password);
      }
      onAuthSuccess?.();
    } catch (err: any) {
      setLocalError(err.response?.data?.error || 'Authentication failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const isWeb = Platform.OS === 'web';

  const content = (
    <View style={styles.container}>
      <MeshGradientBackground isDark={isDark} bgColors={isDark ? ['#050505', '#11100C', '#0A151A'] : ['#FAFAFA', '#F0F0F0', '#E5E5E5']} />
      
      {/* Theme Toggle Button */}
      <TouchableOpacity 
        style={{ position: 'absolute', top: 50, right: 24, zIndex: 10, padding: 8, backgroundColor: C.glassInset, borderRadius: 20 }}
        onPress={() => { Haptics.selectionAsync(); toggleTheme(); }}
      >
        <Icon name={isDark ? "light-mode" : "dark-mode"} size={20} color={C.onSurface} />
      </TouchableOpacity>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          {/* Logo and Titles */}
          <Animated.View entering={FadeInUp.delay(200)} style={styles.headerArea}>
            <BrandLogo isDark={isDark} C={C} styles={styles} />
            <Text style={styles.appTitle}>FitAI<Text style={{ color: C.primary }}> X</Text></Text>
            <Text style={styles.appSubtitle}>Train Smarter. Live Stronger.</Text>
          </Animated.View>

          {/* Glass Auth Card */}
          <Animated.View entering={FadeInUp.delay(200).springify().damping(15)} style={[styles.cardShadow, { borderRadius: 28 }]}>
            <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={styles.card}>
              
              {/* Segmented Control */}
              <View style={styles.tabContainer}>
                <View style={[StyleSheet.absoluteFill, { padding: 4 }]}>
                  <Animated.View style={[styles.activeTabIndicator, { position: 'relative', width: '50%', height: '100%', top: 0, left: 0 }, tabStyle]} />
                </View>
                <TouchableOpacity style={styles.tabBtn} onPress={() => { Haptics.selectionAsync(); setMode('login'); }}>
                  <Text style={[styles.tabText, mode === 'login' && { color: C.onSurface, fontFamily: F.bodyBold }]}>Login</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabBtn} onPress={() => { Haptics.selectionAsync(); setMode('register'); }}>
                  <Text style={[styles.tabText, mode === 'register' && { color: C.onSurface, fontFamily: F.bodyBold }]}>Register</Text>
                </TouchableOpacity>
              </View>

              {localError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{localError}</Text>
                </View>
              )}

              {/* Form Fields */}
              <Animated.View layout={Layout.springify().damping(16).stiffness(120)} style={styles.formArea}>
                
                {mode === 'register' && (
                  <Animated.View entering={FadeInUp.springify()} exiting={FadeInDown.duration(200)}>
                    <AuthInput icon="person" placeholder="Full Name" value={name} onChangeText={setName} autoCapitalize="words" C={C} styles={styles} />
                  </Animated.View>
                )}
                
                <AuthInput icon="mail" placeholder="Email Address" value={email} onChangeText={setEmail} autoCapitalize="none" C={C} styles={styles} />
                <AuthInput icon="lock" placeholder="Password" value={password} onChangeText={setPassword} isPassword C={C} styles={styles} />

                {mode === 'login' && (
                  <Animated.View entering={FadeInUp} style={{ alignItems: 'flex-end', marginTop: -4 }}>
                    <TouchableOpacity>
                      <Text style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}

                {/* Primary Action Button */}
                <TouchableOpacity activeOpacity={0.8} onPress={handleAuth} style={{ marginTop: 24 }}>
                  <LinearGradient colors={[C.primary, C.primaryDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>
                      {mode === 'login' ? 'Sign In' : 'Sign Up'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* Social Logins */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialRow}>
                <TouchableOpacity style={styles.socialBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                  <AppleIcon color={C.onSurface} />
                  <Text style={styles.socialText}>Apple</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                  <GoogleIcon />
                  <Text style={styles.socialText}>Google</Text>
                </TouchableOpacity>
              </View>

            </BlurView>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );

  if (isWeb) {
    return content;
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      {content}
    </TouchableWithoutFeedback>
  );
}

const getStyles = (C: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  
  // Hero
  headerArea: { alignItems: 'center', marginBottom: 40, marginTop: 40 },
  heroContainer: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroGlow: { position: 'absolute', width: 96, height: 96, borderRadius: 48, opacity: 0.6 },
  heroInner: { width: 72, height: 72, borderRadius: 36, backgroundColor: `${C.surfaceHigh}99`, borderWidth: 1, borderColor: C.outlineVariant, alignItems: 'center', justifyContent: 'center', boxShadow: `0px 0px 20px ${C.primary}80` },
  appTitle: { fontFamily: F.header, fontSize: 32, color: C.onSurface, letterSpacing: -1 },
  appSubtitle: { fontFamily: F.bodyMed, fontSize: 14, color: C.primary, marginTop: 4, letterSpacing: 0.5, textTransform: 'uppercase' },

  // Card & Tabs
  cardShadow: { width: '100%', maxWidth: 480, alignSelf: 'center', boxShadow: isDark ? '0px 20px 40px rgba(0,0,0,0.5)' : '0px 20px 40px rgba(0,0,0,0.1)', elevation: 10 },
  card: { borderRadius: 28, padding: 24, borderWidth: 1, borderColor: C.outlineVariant, backgroundColor: isDark ? 'rgba(22, 22, 22, 0.4)' : '#FFFFFF', overflow: 'hidden' },
  tabContainer: { flexDirection: 'row', backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)', borderRadius: 16, padding: 4, marginBottom: 24, position: 'relative' },
  activeTabIndicator: { position: 'absolute', top: 4, bottom: 4, left: 4, backgroundColor: C.glassInset, borderRadius: 12, borderWidth: 1, borderColor: C.outlineVariant },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  tabText: { fontFamily: F.bodyMed, fontSize: 14, color: C.onSurfaceVariant },

  // Form
  formArea: { gap: 16 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1 },
  input: { flex: 1, fontFamily: F.bodyMed, fontSize: 15, color: C.onSurface, outlineStyle: 'none' as any },
  forgotText: { fontFamily: F.bodyMed, fontSize: 12, color: C.primary, opacity: 0.8 },
  errorBox: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  errorText: { color: C.error, fontFamily: F.bodyMed, fontSize: 13, textAlign: 'center' },

  // Action Button
  actionBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', boxShadow: `0px 8px 16px ${C.primary}66` },
  actionBtnText: { fontFamily: F.header, fontSize: 16, color: C.onPrimary, letterSpacing: 0.5 },

  // Socials
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.outlineVariant },
  dividerText: { fontFamily: F.header, fontSize: 10, color: C.onSurfaceVariant, letterSpacing: 1 },
  socialRow: { flexDirection: 'row', gap: 12 },
  socialBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.outlineVariant, gap: 10 },
  socialText: { fontFamily: F.bodyBold, fontSize: 14, color: C.onSurface }
});
