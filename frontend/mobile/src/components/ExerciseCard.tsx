import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import Animated, { LinearTransition, FadeIn, FadeOut, useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { DarkColors, LightColors, ThemeColors } from '../theme';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

type ExerciseCardProps = {
  exercise: {
    id: string;
    name: string;
    sets: number;
    reps: string;
    muscle: string;
    thumbnailUrl?: string;
  };
  isDark: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
  onDuplicate?: () => void;
  onEdit?: () => void;
  isFirst: boolean;
  isLast: boolean;
  drag?: () => void;
  isActive?: boolean;
};

// Simple Icon component for ExerciseCard
function Icon({ name, size = 20, color = '#fff' }: { name: 'arrow-up' | 'arrow-down' | 'close' | 'play' | 'drag' | 'copy' | 'edit'; size?: number; color?: string }) {
  const paths = {
    'arrow-up': "M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z",
    'arrow-down': "M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z",
    'close': "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    'play': "M8 5v14l11-7z",
    'drag': "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
    'copy': "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z",
    'edit': "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={paths[name]} />
    </Svg>
  );
}

export default function ExerciseCard({ exercise, isDark, onMoveUp, onMoveDown, onRemove, onDuplicate, onEdit, isFirst, isLast, drag, isActive }: ExerciseCardProps) {
  const C = isDark ? DarkColors : LightColors;
  const styles = getStyles(C);

  const activeScale = useSharedValue(1);
  
  useEffect(() => {
    if (isActive) {
      if (Platform.OS !== 'web') Haptics.selectionAsync();
      activeScale.value = withSpring(1.05, { damping: 15, stiffness: 200 });
    } else {
      activeScale.value = withSpring(1, { damping: 15, stiffness: 200 });
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: activeScale.value }],
      zIndex: isActive ? 100 : 1,
      ...Platform.select({
        web: { boxShadow: isActive ? '0px 15px 20px rgba(0,0,0,0.4)' : 'none' } as any,
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: isActive ? 15 : 0 },
          shadowOpacity: isActive ? 0.4 : 0,
          shadowRadius: isActive ? 20 : 0,
        }
      }),
      elevation: isActive ? 15 : 0,
    };
  });

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
    >
      <BlurView intensity={30} tint={C.blurTint} style={styles.blurContainer}>
        {/* Left Side: Mock Video Thumbnail */}
        <View style={styles.thumbnailContainer}>
          <Image 
            source={{ uri: exercise.thumbnailUrl || 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=100&q=80' }} 
            style={styles.thumbnail} 
          />
          <View style={styles.playButtonOverlay}>
            <Icon name="play" size={14} color="#fff" />
          </View>
        </View>

        {/* Center: Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.name}>{exercise.name}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statChipText}>{exercise.sets} Sets</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statChipText}>{exercise.reps}</Text>
            </View>
            <View style={[styles.statChip, { backgroundColor: C.primary + '22', borderColor: C.primary + '55' }]}>
              <Text style={[styles.statChipText, { color: C.primary }]}>{exercise.muscle}</Text>
            </View>
          </View>
        </View>

        {/* Right Side: Reorder & Remove Controls */}
        <View style={styles.controlsContainer}>
          {drag ? (
            <TouchableOpacity onPressIn={drag} style={styles.iconButton}>
              <Icon name="drag" size={20} color={C.onSurfaceVariant} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={onEdit} style={styles.iconButton}>
            <Icon name="edit" size={16} color={C.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDuplicate} style={styles.iconButton}>
            <Icon name="copy" size={16} color={C.onSurfaceVariant} />
          </TouchableOpacity>
          <View style={{ width: 1, height: 20, backgroundColor: C.outlineVariant, marginHorizontal: 4 }} />
          <TouchableOpacity onPress={onRemove} style={[styles.iconButton, styles.removeButton]}>
            <Icon name="close" size={16} color={C.error} />
          </TouchableOpacity>
        </View>
      </BlurView>
    </Animated.View>
  );
}

const getStyles = (C: ThemeColors) => StyleSheet.create({
  container: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  blurContainer: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: C.glassInset,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: C.onSurface,
    marginBottom: 6,
    fontFamily: 'Inter_600SemiBold', 
  },
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  statChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: C.glassInset,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  statChipText: {
    fontSize: 11,
    color: C.onSurfaceVariant,
    fontFamily: 'Inter_500Medium',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  reorderButtons: {
    backgroundColor: C.glassInset,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    overflow: 'hidden',
  },
  iconButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonDisabled: {
    opacity: 0.4,
  },
  removeButton: {
    backgroundColor: C.error + '1A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.error + '4D',
  }
});
