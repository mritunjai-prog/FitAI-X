import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Dimensions,
  Platform, StatusBar as RNStatusBar, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeInUp, FadeIn, FadeOut, SlideInDown, SlideOutDown, SlideOutUp,
  useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing, Layout
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { F } from '../theme';
import MeshGradientBackground from '../components/MeshGradientBackground';
import { useTheme } from '../context/ThemeContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSchedule, addManualWorkout, deleteCalendarEvent } from '../services/api/calendar';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Get current week's real dates anchored to Sunday
function getWeekDates() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return { date: d.getDate(), month: d.toLocaleString('default', { month: 'short' }), isToday: i === dayOfWeek };
  });
}

// ─── ScaleCard ───────────────────────────────────────────────────────────────
function ScaleCard({ children, style, onPress, onLongPress }: any) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
      onPress={onPress}
      onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onLongPress?.(); }}
    >
      <Animated.View style={[style, animStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

// ─── Intensity Badge ─────────────────────────────────────────────────────────
function IntensityBadge({ intensity, C }: { intensity?: string; C: any }) {
  const color = intensity === 'High' ? '#ef4444' : intensity === 'Moderate' ? '#f59e0b' : intensity === 'Rest' ? '#6b7280' : '#22c55e';
  return (
    <View style={{ backgroundColor: `${color}20`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
      <Text style={{ color, fontFamily: F.bodyBold, fontSize: 11 }}>{intensity || 'Light'}</Text>
    </View>
  );
}

// ─── Muscle Group Icon Helper ──────────────────────────────────────────────────
const getMuscleIcon = (group?: string) => {
  const g = (group || '').toLowerCase();
  if (g.includes('arm') || g.includes('bicep') || g.includes('tricep')) return 'arm-flex';
  if (g.includes('leg') || g.includes('squat') || g.includes('glute')) return 'human-handsdown';
  if (g.includes('chest') || g.includes('push')) return 'weight-lifter';
  if (g.includes('back') || g.includes('pull')) return 'kettlebell';
  if (g.includes('core') || g.includes('abs')) return 'human-handsdown';
  return 'dumbbell';
};

// ─── Exercise Detail Modal ────────────────────────────────────────────────────
function ExerciseDetailModal({ event, onClose, C }: { event: any; onClose: () => void; C: any }) {
  const exercises: any[] = useMemo(() => {
    if (!event?.exercises) return [];
    try { return JSON.parse(event.exercises); }
    catch { return []; }
  }, [event]);

  if (!event) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
        <Animated.View entering={SlideInDown.springify().damping(24).stiffness(80)} style={{ backgroundColor: C.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '90%', overflow: 'hidden' }}>
          
          {/* Header */}
          <View style={{ padding: 24, borderBottomWidth: 1, borderBottomColor: C.outlineVariant }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ color: C.onSurface, fontFamily: F.header, fontSize: 24, letterSpacing: -0.5, marginBottom: 8 }}>{event.title}</Text>
                {event.description && (
                  <Text style={{ color: C.onSurfaceVariant, fontFamily: F.body, fontSize: 14, lineHeight: 20 }}>{event.description}</Text>
                )}
                <View style={{ marginTop: 12 }}>
                  <IntensityBadge intensity={event.intensity} C={C} />
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.glassInset, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="x" size={18} color={C.onSurface} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
            {event.intensity === 'Rest' || exercises.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <MaterialCommunityIcons name="sleep" size={48} color={C.primary} style={{ marginBottom: 16 }} />
                <Text style={{ color: C.onSurface, fontFamily: F.header, fontSize: 18, marginBottom: 8 }}>Rest & Recovery Day</Text>
                <Text style={{ color: C.onSurfaceVariant, fontFamily: F.body, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                  {event.description || 'Take time to recover. Light stretching, foam rolling, or a gentle walk is all you need today.'}
                </Text>
              </View>
            ) : (
              <>
                <Text style={{ color: C.onSurfaceVariant, fontFamily: F.header, fontSize: 12, letterSpacing: 1.5, marginBottom: 16, textTransform: 'uppercase' }}>
                  {exercises.length} Exercises
                </Text>
                {exercises.map((ex: any, i: number) => {
                  const hasInstructions = !!ex.instructions || !!ex.notes;
                  const descText = ex.instructions || ex.notes;
                  
                  return (
                    <Animated.View key={i} entering={FadeInUp.delay(i * 120).springify().damping(22).stiffness(90)} style={{ marginBottom: 16, backgroundColor: C.glassInset, borderRadius: 24, borderWidth: 1, borderColor: C.outlineVariant, overflow: 'hidden' }}>
                      {/* Top Section: Visual & Title */}
                      <View style={{ flexDirection: 'row', padding: 16, borderBottomWidth: hasInstructions ? 1 : 0, borderBottomColor: C.outlineVariant }}>
                        <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: `${C.primary}15`, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                          <MaterialCommunityIcons name={getMuscleIcon(ex.muscleGroup)} size={28} color={C.primary} />
                        </View>
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                            <Text style={{ color: C.onSurface, fontFamily: F.header, fontSize: 16, flex: 1, marginRight: 8 }}>{ex.name}</Text>
                            {ex.muscleGroup && (
                              <View style={{ backgroundColor: `${C.outline}33`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                <Text style={{ color: C.onSurfaceVariant, fontFamily: F.header, fontSize: 10, textTransform: 'uppercase' }}>{ex.muscleGroup}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ color: C.primary, fontFamily: 'JetBrainsMono-Regular', fontSize: 13 }}>
                            {ex.sets} SETS × {ex.reps} REPS  •  {ex.weight}
                          </Text>
                        </View>
                      </View>

                      {/* Bottom Section: Instructions */}
                      {hasInstructions && (
                        <View style={{ padding: 16, backgroundColor: `${C.bg}66` }}>
                          <Text style={{ color: C.onSurfaceVariant, fontFamily: F.header, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>How to perform</Text>
                          <Text style={{ color: C.onSurface, fontFamily: F.body, fontSize: 13, lineHeight: 18 }}>{descText}</Text>
                        </View>
                      )}
                    </Animated.View>
                  );
                })}
              </>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Add Manual Workout Modal ─────────────────────────────────────────────────
function AddWorkoutModal({ dayIndex, dayName, onClose, onSave, C }: { dayIndex: number; dayName: string; onClose: () => void; onSave: (data: any) => void; C: any }) {
  const [title, setTitle] = useState('');
  const [intensity, setIntensity] = useState('Moderate');
  const [exercises, setExercises] = useState([{ name: '', sets: 3, reps: 10, weight: 'Bodyweight', notes: '' }]);

  const addExercise = () => setExercises(prev => [...prev, { name: '', sets: 3, reps: 10, weight: 'Bodyweight', notes: '' }]);
  const removeExercise = (i: number) => setExercises(prev => prev.filter((_, idx) => idx !== i));
  const updateExercise = (i: number, field: string, val: any) => {
    setExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, [field]: val } : ex));
  };

  const handleSave = () => {
    if (!title.trim()) { Alert.alert('Missing title', 'Please enter a workout title.'); return; }
    const validExercises = exercises.filter(ex => ex.name.trim());
    if (validExercises.length === 0) { Alert.alert('No exercises', 'Add at least one exercise.'); return; }
    onSave({ title: title.trim(), intensity, exercises: validExercises });
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
          <Animated.View entering={SlideInDown.springify().damping(18)} style={{ backgroundColor: C.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '95%' }}>
            
            {/* Header */}
            <View style={{ padding: 24, borderBottomWidth: 1, borderBottomColor: C.outlineVariant, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: C.onSurface, fontFamily: F.header, fontSize: 20, letterSpacing: -0.5 }}>Add Workout</Text>
                <Text style={{ color: C.onSurfaceVariant, fontFamily: F.body, fontSize: 13, marginTop: 2 }}>{dayName}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.glassInset, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="x" size={18} color={C.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Title */}
              <Text style={{ color: C.onSurface, fontFamily: F.header, fontSize: 13, marginBottom: 8, letterSpacing: 0.5 }}>WORKOUT TITLE</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Push Day — Chest & Shoulders"
                placeholderTextColor={C.outline}
                style={{ backgroundColor: C.glassInset, borderWidth: 1, borderColor: C.outlineVariant, borderRadius: 14, padding: 14, color: C.onSurface, fontFamily: F.body, fontSize: 15, marginBottom: 20 }}
              />

              {/* Intensity */}
              <Text style={{ color: C.onSurface, fontFamily: F.header, fontSize: 13, marginBottom: 12, letterSpacing: 0.5 }}>INTENSITY</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                {['Light', 'Moderate', 'High'].map(level => (
                  <Pressable key={level} onPress={() => setIntensity(level)} style={{ flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: intensity === level ? C.primary : C.glassInset, borderWidth: 1, borderColor: intensity === level ? C.primary : C.outlineVariant }}>
                    <Text style={{ color: intensity === level ? C.onPrimary : C.onSurface, fontFamily: F.header, fontSize: 13 }}>{level}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Exercises */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: C.onSurface, fontFamily: F.header, fontSize: 13, letterSpacing: 0.5 }}>EXERCISES</Text>
                <TouchableOpacity onPress={addExercise} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Feather name="plus" size={16} color={C.primary} />
                  <Text style={{ color: C.primary, fontFamily: F.header, fontSize: 13 }}>Add</Text>
                </TouchableOpacity>
              </View>

              {exercises.map((ex, i) => (
                <Animated.View key={i} entering={FadeInUp.springify()} layout={Layout.springify()} style={{ backgroundColor: C.glassInset, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.outlineVariant }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ color: C.onSurfaceVariant, fontFamily: F.header, fontSize: 12 }}>Exercise {i + 1}</Text>
                    {exercises.length > 1 && (
                      <TouchableOpacity onPress={() => removeExercise(i)}>
                        <Feather name="trash-2" size={15} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    value={ex.name}
                    onChangeText={v => updateExercise(i, 'name', v)}
                    placeholder="Exercise name (e.g. Bench Press)"
                    placeholderTextColor={C.outline}
                    style={{ backgroundColor: C.bg, borderRadius: 10, padding: 10, color: C.onSurface, fontFamily: F.body, fontSize: 14, marginBottom: 10, borderWidth: 1, borderColor: C.outlineVariant }}
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.onSurfaceVariant, fontFamily: F.body, fontSize: 11, marginBottom: 4 }}>Sets</Text>
                      <TextInput
                        value={String(ex.sets)}
                        onChangeText={v => updateExercise(i, 'sets', parseInt(v) || 1)}
                        keyboardType="number-pad"
                        style={{ backgroundColor: C.bg, borderRadius: 10, padding: 10, color: C.onSurface, fontFamily: F.header, fontSize: 14, textAlign: 'center', borderWidth: 1, borderColor: C.outlineVariant }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.onSurfaceVariant, fontFamily: F.body, fontSize: 11, marginBottom: 4 }}>Reps</Text>
                      <TextInput
                        value={String(ex.reps)}
                        onChangeText={v => updateExercise(i, 'reps', parseInt(v) || 1)}
                        keyboardType="number-pad"
                        style={{ backgroundColor: C.bg, borderRadius: 10, padding: 10, color: C.onSurface, fontFamily: F.header, fontSize: 14, textAlign: 'center', borderWidth: 1, borderColor: C.outlineVariant }}
                      />
                    </View>
                    <View style={{ flex: 2 }}>
                      <Text style={{ color: C.onSurfaceVariant, fontFamily: F.body, fontSize: 11, marginBottom: 4 }}>Weight</Text>
                      <TextInput
                        value={ex.weight}
                        onChangeText={v => updateExercise(i, 'weight', v)}
                        placeholder="e.g. 60kg"
                        placeholderTextColor={C.outline}
                        style={{ backgroundColor: C.bg, borderRadius: 10, padding: 10, color: C.onSurface, fontFamily: F.body, fontSize: 13, borderWidth: 1, borderColor: C.outlineVariant }}
                      />
                    </View>
                  </View>
                </Animated.View>
              ))}

              {/* Save */}
              <Pressable onPress={handleSave} style={{ backgroundColor: C.primary, borderRadius: 20, paddingVertical: 18, alignItems: 'center', marginTop: 8 }}>
                <Text style={{ color: C.onPrimary, fontFamily: F.header, fontSize: 16 }}>Save Workout</Text>
              </Pressable>
            </ScrollView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export interface CalendarScreenProps {
  onNavigateBack?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToCreateWorkout?: () => void;
}

export default function CalendarScreen({ onNavigateBack, onNavigateToNotifications, onNavigateToCreateWorkout }: CalendarScreenProps) {
  const { isDark, C, bgColors } = useTheme();
  const styles = useMemo(() => getStyles(C), [C]);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const weekDates = useMemo(() => getWeekDates(), []);
  const todayIndex = new Date().getDay();

  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [addModalDayIndex, setAddModalDayIndex] = useState<number | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendar', user?.id],
    queryFn: () => fetchSchedule(user?.id),
    enabled: !!user?.id
  });

  // Group events by day
  const scheduleByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    for (let i = 0; i < 7; i++) map[i] = [];
    events.forEach((evt: any) => {
      if (map[evt.dayIndex] !== undefined) map[evt.dayIndex].push(evt);
    });
    return map;
  }, [events]);

  // Add manual workout mutation
  const addMutation = useMutation({
    mutationFn: addManualWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', user?.id] });
      setAddModalDayIndex(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCalendarEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendar', user?.id] })
  });

  const handleAddSave = useCallback((data: any) => {
    if (!user?.id || addModalDayIndex === null) return;
    addMutation.mutate({
      userId: user.id,
      dayIndex: addModalDayIndex,
      ...data
    });
  }, [user?.id, addModalDayIndex]);

  const handleDeleteEvent = useCallback((id: string) => {
    Alert.alert('Remove Workout', 'Remove this workout from the calendar?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(id) }
    ]);
  }, []);

  const selectedDayEvents = scheduleByDay[selectedDayIndex] || [];

  return (
    <View style={styles.container}>
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View>
              <Text style={styles.title}>Smart Calendar</Text>
              <Text style={styles.subtitle}>AI-generated · Tap a day to explore</Text>
            </View>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

          {/* Week Header — real dates */}
          <View style={styles.calendarHeaderRow}>
            {DAYS_SHORT.map((day, i) => {
              const isActive = i === selectedDayIndex;
              const isToday = weekDates[i]?.isToday;
              const hasEvent = (scheduleByDay[i] || []).length > 0;
              return (
                <TouchableOpacity key={day} style={styles.dayCol} onPress={() => { setSelectedDayIndex(i); Haptics.selectionAsync(); }}>
                  <Text style={[styles.dayText, isActive && { color: C.primary }]}>{day}</Text>
                  <View style={[styles.dateWrapper, isActive && { backgroundColor: C.primary }, isToday && !isActive && { borderWidth: 2, borderColor: C.primary }]}>
                    <Text style={[styles.dateText, isActive && { color: C.onPrimary }]}>{weekDates[i]?.date}</Text>
                  </View>
                  {hasEvent && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isActive ? C.onPrimary : C.primary, marginTop: 2 }} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Day Content */}
          <View style={{ paddingHorizontal: 20 }}>
            <Animated.View key={selectedDayIndex} entering={FadeInUp.duration(250).springify()}>
              {/* Day Title */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ color: C.onSurface, fontFamily: F.header, fontSize: 22, letterSpacing: -0.5 }}>
                  {DAYS_FULL[selectedDayIndex]}
                  {weekDates[selectedDayIndex]?.isToday && (
                    <Text style={{ color: C.primary, fontFamily: F.body, fontSize: 14 }}> — Today</Text>
                  )}
                </Text>
                <TouchableOpacity
                  onPress={() => { onNavigateToCreateWorkout?.(); Haptics.selectionAsync(); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${C.primary}15`, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}
                >
                  <Feather name="plus" size={16} color={C.primary} />
                  <Text style={{ color: C.primary, fontFamily: F.header, fontSize: 13 }}>Add</Text>
                </TouchableOpacity>
              </View>

              {isLoading ? (
                <View style={[styles.emptySlot, { height: 120 }]}>
                  <MaterialCommunityIcons name="loading" size={28} color={C.outline} />
                  <Text style={[styles.emptyText, { marginTop: 8 }]}>Loading your plan...</Text>
                </View>
              ) : selectedDayEvents.length === 0 ? (
                <Pressable
                  onPress={() => { onNavigateToCreateWorkout?.(); Haptics.selectionAsync(); }}
                  style={[styles.emptySlot, { height: 120 }]}
                >
                  <Feather name="plus-circle" size={28} color={C.outline} />
                  <Text style={[styles.emptyText, { marginTop: 10 }]}>Rest Day</Text>
                  <Text style={{ color: C.outline, fontFamily: F.body, fontSize: 12, marginTop: 4 }}>Tap to add a workout</Text>
                </Pressable>
              ) : (
                selectedDayEvents.map((item: any, itemIndex: number) => {
                  const isRestDay = item.intensity === 'Rest';
                  return (
                    <Animated.View
                      key={item.id}
                      layout={Layout.springify().damping(16)}
                      entering={FadeInUp.delay(itemIndex * 80).springify()}
                      style={{ marginBottom: 14 }}
                    >
                      <ScaleCard
                        style={[styles.itemCard, isRestDay && { borderColor: `${C.outline}44` }]}
                        onPress={() => setSelectedEvent(item)}
                        onLongPress={() => handleDeleteEvent(item.id)}
                      >
                        <View style={[styles.iconBox, { backgroundColor: isRestDay ? `${C.outline}20` : `${C.primary}20` }]}>
                          <MaterialCommunityIcons
                            name={isRestDay ? 'sleep' : 'dumbbell'}
                            size={20}
                            color={isRestDay ? C.outline : C.primary}
                          />
                        </View>
                        <View style={{ marginLeft: 14, flex: 1 }}>
                          <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                          {item.description && (
                            <Text style={styles.itemSub} numberOfLines={1}>{item.description}</Text>
                          )}
                          {!isRestDay && item.exercises && (
                            <Text style={{ color: C.primary, fontFamily: 'JetBrainsMono-Regular', fontSize: 11, marginTop: 3 }}>
                              {(() => { try { return `${JSON.parse(item.exercises).length} exercises`; } catch { return ''; } })()}
                            </Text>
                          )}
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          <IntensityBadge intensity={item.intensity} C={C} />
                          <Feather name="chevron-right" size={14} color={C.outline} />
                        </View>
                      </ScaleCard>
                    </Animated.View>
                  );
                })
              )}
            </Animated.View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Exercise Detail Modal */}
      {selectedEvent && (
        <ExerciseDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} C={C} />
      )}

      {/* Add Manual Workout Modal */}
      {addModalDayIndex !== null && (
        <AddWorkoutModal
          dayIndex={addModalDayIndex}
          dayName={`${DAYS_FULL[addModalDayIndex]}, ${weekDates[addModalDayIndex]?.month} ${weekDates[addModalDayIndex]?.date}`}
          onClose={() => setAddModalDayIndex(null)}
          onSave={handleAddSave}
          C={C}
        />
      )}
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 24, marginBottom: 16,
    marginTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 16 : 16
  },
  title: { fontSize: 30, fontFamily: F.header, color: C.onSurface, letterSpacing: -1, marginBottom: 2 },
  subtitle: { fontSize: 13, fontFamily: F.body, color: C.onSurfaceVariant },

  calendarHeaderRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 16, marginBottom: 8 },
  dayCol: { flex: 1, alignItems: 'center', gap: 6 },
  dayText: { fontSize: 10, color: C.onSurfaceVariant, fontFamily: F.header, textTransform: 'uppercase', letterSpacing: 1 },
  dateWrapper: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dateText: { fontSize: 15, color: C.onSurface, fontFamily: F.num },

  emptySlot: { borderStyle: 'dashed', borderWidth: 1.5, borderColor: C.outlineVariant, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.glassInset },
  emptyText: { fontFamily: F.bodyBold, fontSize: 14, color: C.outline },

  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.glassInset, borderWidth: 1, borderColor: C.outlineVariant, borderRadius: 20, padding: 16 },
  iconBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { color: C.onSurface, fontSize: 15, fontFamily: F.bodyBold, letterSpacing: -0.2 },
  itemSub: { color: C.onSurfaceVariant, fontSize: 12, fontFamily: F.body, marginTop: 2, lineHeight: 16 },
});
