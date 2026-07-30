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
          source={require('../../assets/logoforlightmode.png')} 
          style={styles.image}
          resizeMode="cover"
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
    boxShadow: '0px 0px 20px rgba(245, 196, 0, 0.5)',
    elevation: 10
  },
  image: {
    width: '100%',
    height: '100%',
  }
});
