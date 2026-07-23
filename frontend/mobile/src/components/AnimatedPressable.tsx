import React from 'react';
import { TouchableOpacity, StyleProp, ViewStyle, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

type AnimatedPressableProps = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  scaleTo?: number;
};

export default function AnimatedPressable({ 
  children, 
  onPress, 
  style, 
  containerStyle,
  disabled = false,
  scaleTo = 0.96
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({ 
    transform: [{ scale: scale.value }] 
  }));

  const handlePressIn = () => {
    scale.value = withSpring(scaleTo, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onPress?.();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={containerStyle}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </TouchableOpacity>
  );
}
