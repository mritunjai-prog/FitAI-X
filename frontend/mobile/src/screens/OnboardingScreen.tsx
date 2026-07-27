import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, TextInput, Platform, Pressable, ScrollView, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInRight, FadeOutLeft, SlideInRight, SlideOutLeft, Layout, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing, withDelay, withSpring, interpolate } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkColors, F } from '../theme';
import MeshGradientBackground from '../components/MeshGradientBackground';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { submitOnboardingProfile } from '../services/api/onboarding';

const { width: SCREEN_W } = Dimensions.get('window');

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const GOALS = [
  { id: 'weight_loss', label: 'Weight Loss', icon: 'monitor-weight' },
  { id: 'fat_loss', label: 'Fat Loss', icon: 'local-fire-department' },
  { id: 'muscle_gain', label: 'Muscle Gain', icon: 'fitness-center' },
  { id: 'strength', label: 'Strength', icon: 'sports-martial-arts' },
  { id: 'endurance', label: 'Endurance', icon: 'directions-run' },
  { id: 'general_fitness', label: 'General Fitness', icon: 'favorite' },
  { id: 'flexibility', label: 'Improve Flexibility', icon: 'accessibility' },
  { id: 'custom', label: 'Custom Goal', icon: 'edit' }
];

const EXPERIENCE = [
  { id: 'beginner', label: 'Beginner', icon: 'child-care' },
  { id: 'intermediate', label: 'Intermediate', icon: 'fitness-center' },
  { id: 'advanced', label: 'Advanced', icon: 'whatshot' }
];

const EQUIPMENT = [
  { id: 'none', label: 'None', icon: 'accessibility-new' },
  { id: 'yoga_mat', label: 'Yoga Mat', icon: 'airline-seat-flat' },
  { id: 'dumbbells', label: 'Dumbbells', icon: 'fitness-center' },
  { id: 'resistance_bands', label: 'Resistance Bands', icon: 'linear-scale' },
  { id: 'barbell', label: 'Barbell', icon: 'horizontal-rule' },
  { id: 'bench', label: 'Bench', icon: 'event-seat' },
  { id: 'kettlebell', label: 'Kettlebell', icon: 'sports-baseball' },
  { id: 'pullup_bar', label: 'Pull-up Bar', icon: 'power-input' },
  { id: 'gym_machines', label: 'Gym Machines', icon: 'precision-manufacturing' },
  { id: 'full_gym', label: 'Full Gym', icon: 'domain' },
  { id: 'other', label: 'Other', icon: 'more-horiz' }
];

const DIETS = [
  { id: 'vegetarian', label: 'Vegetarian', icon: 'eco' },
  { id: 'vegan', label: 'Vegan', icon: 'spa' },
  { id: 'eggetarian', label: 'Eggetarian', icon: 'egg' },
  { id: 'non_vegetarian', label: 'Non-Vegetarian', icon: 'kebab-dining' },
  { id: 'keto', label: 'Keto', icon: 'set-meal' },
  { id: 'high_protein', label: 'High Protein', icon: 'fitness-center' },
  { id: 'low_carb', label: 'Low Carb', icon: 'grass' },
  { id: 'other', label: 'Other', icon: 'more-horiz' }
];

// ─── Reusable Animated Pressable Card ─────────────────────────────────────────
function OptionCard({ item, isSelected, onPress }: { item: any, isSelected: boolean, onPress: () => void }) {
  const { C, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(C), [C]);
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
        <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <Icon name={item.icon as any} size={24} color={isSelected ? C.primary : C.onSurface} />
        <Text style={[styles.optionLabel, isSelected && { color: C.primary }]}>{item.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── AI Scanning Animation ────────────────────────────────────────────────────
function AIScanner() {
  const { C } = useTheme();
  const styles = React.useMemo(() => getStyles(C), [C]);
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
  const { isDark, C, bgColors, toggleTheme } = useTheme();
  const { user } = useAuth();
  const styles = React.useMemo(() => getStyles(C), [C]);

  const [isLoaded, setIsLoaded] = useState(false);
  const [step, setStep] = useState<Step>(1);

  // Form State
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  
  const [goals, setGoals] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [diet, setDiet] = useState<string[]>([]);
  
  const [pastInjuries, setPastInjuries] = useState('');
  const [currentInjuries, setCurrentInjuries] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [allergies, setAllergies] = useState('');
  const [physicalLimitations, setPhysicalLimitations] = useState('');
  const [medications, setMedications] = useState('');

  const [activeInput, setActiveInput] = useState<string | null>(null);

  // Load draft from AsyncStorage
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draftStr = await AsyncStorage.getItem('@onboarding_draft');
        if (draftStr) {
          const draft = JSON.parse(draftStr);
          if (draft.step && draft.step < 7) setStep(draft.step);
          if (draft.gender) setGender(draft.gender);
          if (draft.age) setAge(draft.age);
          if (draft.weight) setWeight(draft.weight);
          if (draft.height) setHeight(draft.height);
          if (draft.goals) setGoals(draft.goals);
          if (draft.experience) setExperience(draft.experience);
          if (draft.equipment) setEquipment(draft.equipment);
          if (draft.diet) setDiet(draft.diet);
          if (draft.pastInjuries) setPastInjuries(draft.pastInjuries);
          if (draft.currentInjuries) setCurrentInjuries(draft.currentInjuries);
          if (draft.medicalConditions) setMedicalConditions(draft.medicalConditions);
          if (draft.allergies) setAllergies(draft.allergies);
          if (draft.physicalLimitations) setPhysicalLimitations(draft.physicalLimitations);
          if (draft.medications) setMedications(draft.medications);
        }
      } catch (e) {
        console.error('Failed to load draft:', e);
      } finally {
        if (user?.name) setName(user.name);
        setIsLoaded(true);
      }
    };
    loadDraft();
  }, [user]);

  // Save draft
  useEffect(() => {
    if (!isLoaded || step === 7) return;
    const saveDraft = async () => {
      const draft = {
        step, gender, age, weight, height, goals, experience, equipment, diet,
        pastInjuries, currentInjuries, medicalConditions, allergies, physicalLimitations, medications
      };
      await AsyncStorage.setItem('@onboarding_draft', JSON.stringify(draft));
    };
    saveDraft();
  }, [step, gender, age, weight, height, goals, experience, equipment, diet, pastInjuries, currentInjuries, medicalConditions, allergies, physicalLimitations, medications, isLoaded]);

  const toggleSelection = (item: string, list: string[], setList: (v: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step < 7) setStep((s) => (s + 1) as Step);
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  useEffect(() => {
    let mounted = true;
    if (step === 7) {
      const processOnboarding = async () => {
        try {
          if (user?.id) {
            await submitOnboardingProfile({
              userId: user.id,
              age,
              weight,
              height,
              gender,
              experience,
              goal: goals.join(','),
              equipment: equipment.join(','),
              diet: diet.join(','),
              pastInjuries,
              currentInjuries,
              medicalConditions,
              allergies,
              physicalLimitations,
              medications
            });
            await AsyncStorage.removeItem('@onboarding_draft'); // Clear draft on success
          }
        } catch (e) {
          console.error('Failed to submit onboarding profile:', e);
        } finally {
          if (mounted) {
            setTimeout(() => {
              onComplete();
            }, 2500);
          }
        }
      };
      
      processOnboarding();
    }
    return () => { mounted = false; };
  }, [step]);

  if (!isLoaded) return <View style={styles.container} />;

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <Animated.ScrollView key="step1" keyboardShouldPersistTaps="handled" style={styles.stepContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Animated.Text entering={FadeInRight.delay(100).springify()} style={styles.title}>Personal Information</Animated.Text>
            <Animated.Text entering={FadeInRight.delay(200).springify()} style={styles.subtitle}>Let's get your baseline for accurate calculations.</Animated.Text>
            
            <Animated.View entering={FadeInRight.delay(300).springify()} style={styles.metricsContainerVertical}>
              
              <View style={styles.inputGroup}>
                <Text style={styles.metricLabel}>Full Name</Text>
                <TextInput style={[styles.textInput, { opacity: 0.7 }]} value={name} editable={false} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.metricLabel}>Gender</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {['Male', 'Female', 'Other'].map(g => (
                    <TouchableOpacity key={g} style={[styles.pillBtn, gender === g && styles.pillBtnActive]} onPress={() => setGender(g)}>
                      <Text style={[styles.pillBtnText, gender === g && { color: C.primary }]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.metricRow}>
                <View style={styles.metricBlock}>
                  <Text style={styles.metricLabel}>Age</Text>
                  <View style={[styles.metricInputWrapper, activeInput === 'age' && styles.metricInputActive]}>
                    <TextInput style={styles.metricInput} value={age} onChangeText={setAge} keyboardType="numeric" onFocus={() => setActiveInput('age')} onBlur={() => setActiveInput(null)} maxLength={3} />
                    <Text style={styles.metricUnit}>yrs</Text>
                  </View>
                </View>
                
                <View style={styles.metricBlock}>
                  <Text style={styles.metricLabel}>Weight</Text>
                  <View style={[styles.metricInputWrapper, activeInput === 'weight' && styles.metricInputActive]}>
                    <TextInput style={styles.metricInput} value={weight} onChangeText={setWeight} keyboardType="numeric" onFocus={() => setActiveInput('weight')} onBlur={() => setActiveInput(null)} maxLength={3} />
                    <Text style={styles.metricUnit}>kg</Text>
                  </View>
                </View>

                <View style={styles.metricBlock}>
                  <Text style={styles.metricLabel}>Height</Text>
                  <View style={[styles.metricInputWrapper, activeInput === 'height' && styles.metricInputActive]}>
                    <TextInput style={styles.metricInput} value={height} onChangeText={setHeight} keyboardType="numeric" onFocus={() => setActiveInput('height')} onBlur={() => setActiveInput(null)} maxLength={3} />
                    <Text style={styles.metricUnit}>cm</Text>
                  </View>
                </View>
              </View>

            </Animated.View>
          </Animated.ScrollView>
        );

      case 2:
        return (
          <Animated.ScrollView key="step2" keyboardShouldPersistTaps="handled" style={styles.stepContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Animated.Text entering={FadeInRight.delay(100).springify()} style={styles.title}>Fitness Goals</Animated.Text>
            <Animated.Text entering={FadeInRight.delay(200).springify()} style={styles.subtitle}>Select all that apply. FitAI will optimize your plans.</Animated.Text>
            
            <Animated.View entering={FadeInRight.delay(300).springify()} style={styles.optionsGrid}>
              {GOALS.map(g => (
                <View key={g.id} style={{ width: '48%' }}>
                  <OptionCard item={g} isSelected={goals.includes(g.id)} onPress={() => toggleSelection(g.id, goals, setGoals)} />
                </View>
              ))}
            </Animated.View>
          </Animated.ScrollView>
        );

      case 3:
        return (
          <Animated.ScrollView key="step3" keyboardShouldPersistTaps="handled" style={styles.stepContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Animated.Text entering={FadeInRight.delay(100).springify()} style={styles.title}>Fitness Experience</Animated.Text>
            <Animated.Text entering={FadeInRight.delay(200).springify()} style={styles.subtitle}>How comfortable are you with working out?</Animated.Text>
            
            <Animated.View entering={FadeInRight.delay(300).springify()} style={styles.optionsList}>
              {EXPERIENCE.map(e => (
                <OptionCard key={e.id} item={e} isSelected={experience === e.id} onPress={() => setExperience(e.id)} />
              ))}
            </Animated.View>
          </Animated.ScrollView>
        );

      case 4:
        return (
          <Animated.ScrollView key="step4" keyboardShouldPersistTaps="handled" style={styles.stepContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Animated.Text entering={FadeInRight.delay(100).springify()} style={styles.title}>Available Equipment</Animated.Text>
            <Animated.Text entering={FadeInRight.delay(200).springify()} style={styles.subtitle}>Select what you have access to.</Animated.Text>
            
            <Animated.View entering={FadeInRight.delay(300).springify()} style={styles.optionsGrid}>
              {EQUIPMENT.map(e => (
                <View key={e.id} style={{ width: '48%' }}>
                  <OptionCard item={e} isSelected={equipment.includes(e.id)} onPress={() => toggleSelection(e.id, equipment, setEquipment)} />
                </View>
              ))}
            </Animated.View>
          </Animated.ScrollView>
        );

      case 5:
        return (
          <Animated.ScrollView key="step5" keyboardShouldPersistTaps="handled" style={styles.stepContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Animated.Text entering={FadeInRight.delay(100).springify()} style={styles.title}>Nutrition Preferences</Animated.Text>
            <Animated.Text entering={FadeInRight.delay(200).springify()} style={styles.subtitle}>Used for auto-syncing your meal plans.</Animated.Text>
            
            <Animated.View entering={FadeInRight.delay(300).springify()} style={styles.optionsGrid}>
              {DIETS.map(d => (
                <View key={d.id} style={{ width: '48%' }}>
                  <OptionCard item={d} isSelected={diet.includes(d.id)} onPress={() => toggleSelection(d.id, diet, setDiet)} />
                </View>
              ))}
            </Animated.View>
          </Animated.ScrollView>
        );

      case 6:
        return (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <Animated.ScrollView key="step6" keyboardShouldPersistTaps="handled" style={styles.stepContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <Animated.Text entering={FadeInRight.delay(100).springify()} style={styles.title}>Health Information</Animated.Text>
              <Animated.Text entering={FadeInRight.delay(200).springify()} style={styles.subtitle}>Optional but highly recommended for the Injury Predictor.</Animated.Text>
              
              <Animated.View entering={FadeInRight.delay(300).springify()} style={styles.metricsContainerVertical}>
                <View style={styles.inputGroup}>
                  <Text style={styles.metricLabel}>Past Injuries (Optional)</Text>
                  <TextInput style={styles.textInput} placeholder="e.g. Torn ACL, Dislocated shoulder" placeholderTextColor={C.outline} value={pastInjuries} onChangeText={setPastInjuries} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.metricLabel}>Current Injuries (Optional)</Text>
                  <TextInput style={styles.textInput} placeholder="e.g. Lower back pain" placeholderTextColor={C.outline} value={currentInjuries} onChangeText={setCurrentInjuries} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.metricLabel}>Medical Conditions (Optional)</Text>
                  <TextInput style={styles.textInput} placeholder="e.g. Asthma, Hypertension" placeholderTextColor={C.outline} value={medicalConditions} onChangeText={setMedicalConditions} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.metricLabel}>Allergies (Optional)</Text>
                  <TextInput style={styles.textInput} placeholder="e.g. Peanuts, Dairy" placeholderTextColor={C.outline} value={allergies} onChangeText={setAllergies} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.metricLabel}>Physical Limitations (Optional)</Text>
                  <TextInput style={styles.textInput} placeholder="e.g. Cannot jump" placeholderTextColor={C.outline} value={physicalLimitations} onChangeText={setPhysicalLimitations} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.metricLabel}>Medications (Optional)</Text>
                  <TextInput style={styles.textInput} placeholder="e.g. Inhaler" placeholderTextColor={C.outline} value={medications} onChangeText={setMedications} />
                </View>
              </Animated.View>
            </Animated.ScrollView>
          </KeyboardAvoidingView>
        );

      case 7:
        return (
          <Animated.View key="step7" entering={FadeIn.duration(800)} style={[styles.stepContainer, { justifyContent: 'center', alignItems: 'center' }]}>
            <AIScanner />
            <Text style={[styles.title, { textAlign: 'center', marginTop: 40, fontSize: 28 }]}>Rachel is analyzing...</Text>
            <Text style={[styles.subtitle, { textAlign: 'center' }]}>Generating your personalized neural model based on your deep profile.</Text>
          </Animated.View>
        );
    }
  };

  const isNextDisabled = () => {
    if (step === 1) return !gender || !age || !weight || !height;
    if (step === 2) return goals.length === 0;
    if (step === 3) return !experience;
    if (step === 4) return equipment.length === 0;
    if (step === 5) return diet.length === 0;
    return false; // Step 6 is optional
  };

  return (
    <View style={styles.container}>
      <MeshGradientBackground isDark={isDark} bgColors={bgColors} />
      <SafeAreaView style={{ flex: 1 }}>
        
        {step < 7 && (
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={[styles.progressBar, { flex: 1 }]}>
                <Animated.View layout={Layout.springify().damping(18)} style={[styles.progressFill, { width: `${(step / 6) * 100}%` }]} />
              </View>
              <TouchableOpacity onPress={toggleTheme} style={styles.themeToggleBtn}>
                <Icon name={isDark ? "light-mode" : "dark-mode"} size={20} color={C.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <Text style={styles.stepText}>Step {step} of 6</Text>
          </View>
        )}

        <View style={styles.content}>
          {renderStep()}
        </View>

        {step < 7 && (
          <Animated.View entering={FadeIn.delay(300)} style={styles.footerRow}>
            {step > 1 ? (
              <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                <Icon name="arrow-back" size={24} color={C.onSurface} />
              </TouchableOpacity>
            ) : <View style={styles.backBtnPlaceholder} />}
            
            <TouchableOpacity style={[styles.nextBtn, isNextDisabled() && styles.nextBtnDisabled]} disabled={isNextDisabled()} onPress={handleNext}>
              <Text style={styles.nextBtnText}>{step === 6 ? 'Analyze Profile' : 'Continue'}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

      </SafeAreaView>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 24, paddingTop: 40 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  progressBar: { height: 6, backgroundColor: 'rgba(150,150,150,0.2)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.primary, borderRadius: 3 },
  themeToggleBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.glassInset, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.outlineVariant },
  stepText: { color: C.onSurfaceVariant, fontFamily: F.header, fontSize: 11, marginTop: 12, textTransform: 'uppercase', letterSpacing: 1.2 },
  
  content: { flex: 1 },
  stepContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 },
  
  title: { color: C.onSurface, fontFamily: F.header, fontSize: 32, letterSpacing: -1, marginBottom: 8 },
  subtitle: { color: C.onSurfaceVariant, fontFamily: F.body, fontSize: 15, marginBottom: 30, lineHeight: 22 },
  
  optionsList: { gap: 14 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between' },
  optionCard: {
    height: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    overflow: 'hidden',
    backgroundColor: C.glassInset,
  },
  optionCardActive: {
    borderColor: C.primary,
    backgroundColor: 'rgba(245, 196, 0, 0.12)'
  },
  optionLabel: { color: C.onSurface, fontFamily: F.bodyBold, fontSize: 14, flex: 1 },

  metricsContainerVertical: { gap: 24, marginTop: 10 },
  metricRow: { flexDirection: 'row', gap: 20, justifyContent: 'space-between' },
  metricBlock: { flex: 1 },
  metricLabel: { color: C.onSurfaceVariant, fontFamily: F.header, fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  metricInputWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    borderBottomWidth: 2,
    borderColor: C.outlineVariant,
    paddingBottom: 4
  },
  metricInputActive: {
    borderColor: C.primary,
  },
  metricInput: {
    color: C.onSurface,
    fontFamily: F.num,
    fontSize: 48,
    padding: 0,
    marginRight: 4,
    minWidth: 60,
    outlineStyle: 'none' as any,
  },
  metricUnit: {
    color: C.primary,
    fontFamily: F.bodyBold,
    fontSize: 16,
  },
  
  inputGroup: { gap: 8 },
  textInput: {
    backgroundColor: C.glassInset,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: C.onSurface,
    fontFamily: F.bodyMed,
    fontSize: 15
  },
  
  pillBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: C.glassInset, borderWidth: 1, borderColor: C.outlineVariant },
  pillBtnActive: { borderColor: C.primary, backgroundColor: 'rgba(245, 196, 0, 0.12)' },
  pillBtnText: { color: C.onSurfaceVariant, fontFamily: F.bodyBold, fontSize: 14 },

  footerRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 16, marginTop: 'auto', marginBottom: Platform.OS === 'ios' ? 20 : 40, paddingTop: 10 },
  backBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.glassInset, borderWidth: 1, borderColor: C.outlineVariant, alignItems: 'center', justifyContent: 'center' },
  backBtnPlaceholder: { width: 56, height: 56 },
  nextBtn: {
    flex: 1,
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
    backgroundColor: 'rgba(150,150,150,0.15)',
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
