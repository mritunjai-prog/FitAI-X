import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  interpolate
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const { C, isDark } = useTheme();
  
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Zoom In / Zoom Out animation sequence
    scale.value = withSequence(
      withTiming(1.15, { duration: 900, easing: Easing.out(Easing.cubic) }),
      withTiming(0.95, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      withTiming(1.05, { duration: 700, easing: Easing.inOut(Easing.ease) })
    );
    opacity.value = withTiming(1, { duration: 800 });

    const timeout = setTimeout(() => {
      // Final zoom in and fade out
      opacity.value = withTiming(0, { duration: 400 });
      scale.value = withTiming(1.5, { duration: 400 });
      setTimeout(onComplete, 450);
    }, 2800);

    return () => clearTimeout(timeout);
  }, []);

  const animStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { scale: scale.value }
      ]
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <Animated.View style={[styles.logoContainer, { backgroundColor: isDark ? '#000' : '#FFF' }, animStyle]}>
        <Image 
          source={isDark ? require('../../assets/fiAIXlogo.png.png') : require('../../assets/logoforlightmode.png')} 
          style={styles.image}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#F5C400',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5C400',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  }
});
