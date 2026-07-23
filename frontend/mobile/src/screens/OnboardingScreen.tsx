import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, TextInput, Platform, Pressable } from 'react-native';
import Animated, { FadeIn, FadeInRight, FadeOutLeft, SlideInRight, SlideOutLeft, Layout, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing, withDelay, withSpring, interpolate } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DarkColors, F } from '../theme';
import MeshGradientBackground from '../components/MeshGradientBackground';

const { width: SCREEN_W } = Dimensions.get('window');
const C = DarkColors;

type Step = 1 | 2 | 3 | 4 | 5;

const GOALS = [
  { id: 'lose_weight', label: 'Lose Weight', icon: 'local-fire-department' },
  { id: 'build_muscle', label: 'Build Muscle', icon: 'fitness-center' },
  { id: 'athletic', label: 'Athletic Performance', icon: 'directions-run' }
];

const EQUIPMENT = [
  { id: 'bodyweight', label: 'Bodyweight Only', icon: 'accessibility' },
  { id: 'dumbbells', label: 'Dumbbells', icon: 'fitness-center' },
  { id: 'gym', label: 'Full Gym Access', icon: 'domain' }
];

const DIETS = [
  { id: 'standard', label: 'Standard', icon: 'restaurant' },
  { id: 'vegan', label: 'Vegan / Plant-Based', icon: 'eco' },
  { id: 'keto', label: 'Keto', icon: 'set-meal' }
];

// ─── Reusable Animated Pressable Card ─────────────────────────────────────────
function OptionCard({ item, isSelected, onPress }: { item: any, isSelected: boolean, onPress: () => void }) {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 12, stiffness: 200 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
    >
      <Animated.View style={[styles.optionCard, isSelected && styles.optionCardActive, animatedStyle]}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <Icon name={item.icon as any} size={28} color={isSelected ? C.primary : C.onSurface} />
        <Text style={[styles.optionLabel, isSelected && { color: C.primary }]}>{item.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── AI Scanning Animation ────────────────────────────────────────────────────
function AIScanner() {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.8, { duration: 1500, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.8], [0.8, 0]),
  }));

  return (
    <View style={styles.aiScannerContainer}>
      <Animated.View style={[styles.aiScannerRing, ringStyle]} pointerEvents="none" />
      <View style={styles.aiIconWrapper}>
        <Icon name="auto-awesome" size={42} color={C.onPrimary} />
      </View>
    </View>
  );
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState<Step>(1);
  const [goal, setGoal] = useState<string>('');
  const [age, setAge] = useState<string>('25');
  const [weight, setWeight] = useState<string>('75');
  const [equipment, setEquipment] = useState<string>('');
  const [diet, setDiet] = useState<string>('');

  const [activeInput, setActiveInput] = useState<'age' | 'weight' | null>(null);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step < 5) setStep((s) => (s + 1) as Step);
  };

  useEffect(() => {
    if (step === 5) {
      const timer = setTimeout(() => {
        onComplete();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <Animated.View key="step1" style={styles.stepContainer}>
            <Animated.Text entering={FadeInRight.delay(100).springify()} style={styles.title}>What is your primary goal?</Animated.Text>
            <Animated.Text entering={FadeInRight.delay(200).springify()} style={styles.subtitle}>FitAI will dynamically optimize your daily plans.</Animated.Text>
            
            <Animated.View entering={FadeInRight.delay(300).springify()} style={styles.optionsList}>
              {GOALS.map(g => (
                <OptionCard key={g.id} item={g} isSelected={goal === g.id} onPress={() => setGoal(g.id)} />
              ))}
            </Animated.View>

            <Animated.View entering={FadeIn.delay(500)} style={styles.footer}>
              <TouchableOpacity style={[styles.nextBtn, !goal && styles.nextBtnDisabled]} disabled={!goal} onPress={handleNext}>
                <Text style={styles.nextBtnText}>Continue</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        );

      case 2:
        return (
          <Animated.View key="step2" style={styles.stepContainer}>
            <Animated.Text entering={FadeInRight.delay(100).springify()} style={styles.title}>Let's get your baseline.</Animated.Text>
            <Animated.Text entering={FadeInRight.delay(200).springify()} style={styles.subtitle}>This helps Rachel calculate your macros and load.</Animated.Text>
            
            <Animated.View entering={FadeInRight.delay(300).springify()} style={styles.metricsContainer}>
              {/* Age Input */}
              <View style={styles.metricBlock}>
                <Text style={styles.metricLabel}>Age</Text>
                <View style={[styles.metricInputWrapper, activeInput === 'age' && styles.metricInputActive]}>
                  <TextInput 
                    style={styles.metricInput} 
                    value={age} 
                    onChangeText={setAge} 
                    keyboardType="numeric"
                    onFocus={() => setActiveInput('age')}
                    onBlur={() => setActiveInput(null)}
                    maxLength={3}
                  />
                  <Text style={styles.metricUnit}>yrs</Text>
                </View>
              </View>
              
              {/* Weight Input */}
              <View style={styles.metricBlock}>
                <Text style={styles.metricLabel}>Weight</Text>
                <View style={[styles.metricInputWrapper, activeInput === 'weight' && styles.metricInputActive]}>
                  <TextInput 
                    style={styles.metricInput} 
                    value={weight} 
                    onChangeText={setWeight} 
                    keyboardType="numeric"
                    onFocus={() => setActiveInput('weight')}
                    onBlur={() => setActiveInput(null)}
                    maxLength={3}
                  />
                  <Text style={styles.metricUnit}>kg</Text>
                </View>
              </View>
            </Animated.View>

            <View style={styles.footer}>
              <TouchableOpacity style={[styles.nextBtn, (!age || !weight) && styles.nextBtnDisabled]} disabled={!age || !weight} onPress={handleNext}>
                <Text style={styles.nextBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        );

      case 3:
        return (
          <Animated.View key="step3" style={styles.stepContainer}>
            <Animated.Text entering={FadeInRight.delay(100).springify()} style={styles.title}>What equipment do you have?</Animated.Text>
            <Animated.Text entering={FadeInRight.delay(200).springify()} style={styles.subtitle}>Workouts adapt to your environment.</Animated.Text>
            
            <Animated.View entering={FadeInRight.delay(300).springify()} style={styles.optionsList}>
              {EQUIPMENT.map(e => (
                <OptionCard key={e.id} item={e} isSelected={equipment === e.id} onPress={() => setEquipment(e.id)} />
              ))}
            </Animated.View>
            
            <View style={styles.footer}>
              <TouchableOpacity style={[styles.nextBtn, !equipment && styles.nextBtnDisabled]} disabled={!equipment} onPress={handleNext}>
                <Text style={styles.nextBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        );

      case 4:
        return (
          <Animated.View key="step4" style={styles.stepContainer}>
            <Animated.Text entering={FadeInRight.delay(100).springify()} style={styles.title}>Any dietary preferences?</Animated.Text>
            <Animated.Text entering={FadeInRight.delay(200).springify()} style={styles.subtitle}>Used for auto-syncing your nutrition plan.</Animated.Text>
            
            <Animated.View entering={FadeInRight.delay(300).springify()} style={styles.optionsList}>
              {DIETS.map(d => (
                <OptionCard key={d.id} item={d} isSelected={diet === d.id} onPress={() => setDiet(d.id)} />
              ))}
            </Animated.View>

            <View style={styles.footer}>
              <TouchableOpacity style={[styles.nextBtn, !diet && styles.nextBtnDisabled]} disabled={!diet} onPress={handleNext}>
                <Text style={styles.nextBtnText}>Analyze Profile</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        );

      case 5:
        return (
          <Animated.View key="step5" entering={FadeIn.duration(800)} style={[styles.stepContainer, { justifyContent: 'center', alignItems: 'center' }]}>
            <AIScanner />
            <Text style={[styles.title, { textAlign: 'center', marginTop: 40, fontSize: 28 }]}>Rachel is analyzing...</Text>
            <Text style={[styles.subtitle, { textAlign: 'center' }]}>Generating your personalized neural model based on your profile.</Text>
          </Animated.View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <MeshGradientBackground isDark={true} bgColors={['#0F172A', '#1E1B4B', '#312E81']} />
      <SafeAreaView style={{ flex: 1 }}>
        
        {step < 5 && (
          <View style={styles.header}>
            <View style={styles.progressBar}>
              <Animated.View layout={Layout.springify().damping(18)} style={[styles.progressFill, { width: `${(step / 4) * 100}%` }]} />
            </View>
            <Text style={styles.stepText}>Step {step} of 4</Text>
          </View>
        )}

        <View style={styles.content}>
          {renderStep()}
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 24, paddingTop: 40 },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.primary, borderRadius: 3 },
  stepText: { color: C.onSurfaceVariant, fontFamily: F.header, fontSize: 11, marginTop: 12, textTransform: 'uppercase', letterSpacing: 1.2 },
  
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  stepContainer: { flex: 1 },
  
  title: { color: C.onSurface, fontFamily: F.header, fontSize: 32, letterSpacing: -1, marginBottom: 8 },
  subtitle: { color: C.onSurfaceVariant, fontFamily: F.body, fontSize: 15, marginBottom: 40, lineHeight: 22 },
  
  optionsList: { gap: 14 },
  optionCard: {
    height: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  optionCardActive: {
    borderColor: C.primary,
    backgroundColor: 'rgba(245, 196, 0, 0.12)'
  },
  optionLabel: { color: C.onSurface, fontFamily: F.bodyBold, fontSize: 16 },

  metricsContainer: { flexDirection: 'row', gap: 24, justifyContent: 'center', marginTop: 20 },
  metricBlock: { flex: 1 },
  metricLabel: { color: C.onSurfaceVariant, fontFamily: F.header, fontSize: 12, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  metricInputWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    borderBottomWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 8
  },
  metricInputActive: {
    borderColor: C.primary,
  },
  metricInput: {
    color: C.onSurface,
    fontFamily: F.num,
    fontSize: 56,
    padding: 0,
    marginRight: 4,
  },
  metricUnit: {
    color: C.primary,
    fontFamily: F.bodyBold,
    fontSize: 18,
  },
  
  footer: { marginTop: 'auto', marginBottom: Platform.OS === 'ios' ? 20 : 40 },
  nextBtn: {
    backgroundColor: C.primary,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  nextBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    shadowOpacity: 0,
  },
  nextBtnText: { color: C.onPrimary, fontFamily: F.header, fontSize: 16 },

  // AI Scanner Styles
  aiScannerContainer: { alignItems: 'center', justifyContent: 'center', width: 120, height: 120 },
  aiIconWrapper: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, zIndex: 2
  },
  aiScannerRing: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    borderWidth: 2, borderColor: C.primary, backgroundColor: 'rgba(245, 196, 0, 0.2)', zIndex: 1
  }
});
