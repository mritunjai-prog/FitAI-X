import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Defs, Filter, FeDropShadow } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withSpring } from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type RingConfig = {
  progress: number; // 0 to 1
  color: string;
  radius: number;
  strokeWidth: number;
};

export default function ActivityRings({ rings, size }: { rings: RingConfig[], size: number }) {
  const center = size / 2;
  
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <Filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <FeDropShadow dx="0" dy="0" stdDeviation="6" floodColor="currentColor" floodOpacity="0.6" />
          </Filter>
        </Defs>
        <G transform={`rotate(-90 ${center} ${center})`}>
          {rings.map((ring, i) => {
            const circumference = 2 * Math.PI * ring.radius;
            return (
              <React.Fragment key={i}>
                <Circle
                  cx={center}
                  cy={center}
                  r={ring.radius}
                  stroke={ring.color + '25'}
                  strokeWidth={ring.strokeWidth}
                  fill="none"
                />
                <AnimatedRing ring={ring} center={center} circumference={circumference} />
              </React.Fragment>
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

function AnimatedRing({ ring, center, circumference }: { ring: RingConfig, center: number, circumference: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(ring.progress, { damping: 14, stiffness: 90, mass: 1 });
  }, [ring.progress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - progress.value * circumference;
    return { strokeDashoffset } as any;
  });

  return (
    <AnimatedCircle
      cx={center}
      cy={center}
      r={ring.radius}
      stroke={ring.color}
      strokeWidth={ring.strokeWidth}
      strokeLinecap="round"
      strokeDasharray={circumference}
      fill="none"
      color={ring.color} // pass to currentColor in FeDropShadow
      filter="url(#glow)"
      animatedProps={animatedProps}
    />
  );
}
