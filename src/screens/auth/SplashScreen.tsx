import React, {useEffect, useRef} from 'react';
import {StyleSheet, View, Text, Animated, StatusBar} from 'react-native';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING} from '../../theme';
import GymblixWordmark from '../../components/common/GymblixWordmark';

const DOT_COUNT = 3;

const SplashScreen: React.FC = () => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  // 0→1→0 loop driving the breathing halo behind the logo (design: animate-logo).
  const glowPulse = useRef(new Animated.Value(0)).current;
  // 0→1→0 loop per dot, staggered — drives a vertical bounce (design: dot-bounce).
  const dots = useRef(Array.from({length: DOT_COUNT}, () => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {toValue: 1, duration: 700, useNativeDriver: true}),
      Animated.spring(scale, {toValue: 1, tension: 55, friction: 8, useNativeDriver: true}),
    ]).start();

    // Continuous glow pulse behind the wordmark.
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {toValue: 1, duration: 1500, useNativeDriver: true}),
        Animated.timing(glowPulse, {toValue: 0, duration: 1500, useNativeDriver: true}),
      ]),
    );
    glowLoop.start();

    // Staggered bouncing dots.
    const bounceLoop = Animated.loop(
      Animated.stagger(
        160,
        dots.map(dot =>
          Animated.sequence([
            Animated.timing(dot, {toValue: 1, duration: 350, useNativeDriver: true}),
            Animated.timing(dot, {toValue: 0, duration: 350, useNativeDriver: true}),
          ]),
        ),
      ),
    );
    bounceLoop.start();

    return () => {
      glowLoop.stop();
      bounceLoop.stop();
    };
  }, [opacity, scale, glowPulse, dots]);

  const glowOpacity = glowPulse.interpolate({inputRange: [0, 1], outputRange: [0.04, 0.12]});
  const glowScale = glowPulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.18]});

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      <Animated.View
        style={[styles.glow, {opacity: glowOpacity, transform: [{scale: glowScale}]}]}
      />

      <Animated.View style={[styles.logoGlow, {opacity, transform: [{scale}]}]}>
        <GymblixWordmark width={200} />
      </Animated.View>

      {/* Loader dots */}
      <View style={styles.loaderRow}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                opacity: dot.interpolate({inputRange: [0, 1], outputRange: [0.3, 1]}),
                transform: [
                  {translateY: dot.interpolate({inputRange: [0, 1], outputRange: [0, -8]})},
                ],
              },
            ]}
          />
        ))}
      </View>

      <Text style={styles.caption}>PERFORMANCE OPTIMIZED</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  glow: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: COLORS.primary,
  },
  logoGlow: {
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  loaderRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 32,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.secondary,
  },
  caption: {
    position: 'absolute',
    bottom: SPACING.xxl,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
    letterSpacing: 2,
  },
});

export default SplashScreen;
