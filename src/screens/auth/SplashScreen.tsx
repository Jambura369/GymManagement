import React, {useEffect, useRef} from 'react';
import {StyleSheet, View, Text, Animated} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {COLORS, APP_NAME} from '../../constants';
import GymProLogo from '../../components/common/GymProLogo';

const SplashScreen: React.FC = () => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.75)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {toValue: 1, duration: 700, useNativeDriver: true}),
        Animated.spring(scale, {toValue: 1, tension: 55, friction: 8, useNativeDriver: true}),
      ]),
      Animated.parallel([
        Animated.timing(taglineOpacity, {toValue: 1, duration: 400, useNativeDriver: true}),
        Animated.timing(taglineY, {toValue: 0, duration: 400, useNativeDriver: true}),
      ]),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd]}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={styles.container}>
      {/* Decorative background circles */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <Animated.View style={[styles.content, {opacity, transform: [{scale}]}]}>
        <View style={styles.logoGlow}>
          <GymProLogo size={100} />
        </View>
        <Text style={styles.name}>{APP_NAME}</Text>
        <Animated.View
          style={{
            opacity: taglineOpacity,
            transform: [{translateY: taglineY}],
            alignItems: 'center',
          }}>
          <Text style={styles.tagline}>Power Your Gym</Text>
          <View style={styles.divider} />
          <Text style={styles.sub}>Gym Management Platform</Text>
        </Animated.View>
      </Animated.View>

      <Text style={styles.version}>v1.0.0</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorCircle1: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -80,
    left: -80,
  },
  decorCircle2: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -60,
    right: -60,
  },
  content: {alignItems: 'center'},
  logoGlow: {
    shadowColor: 'rgba(245,158,11,0.6)',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 1,
    shadowRadius: 24,
    marginBottom: 24,
  },
  name: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.goldLight,
    letterSpacing: 1.5,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
    marginVertical: 8,
  },
  sub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.5,
  },
  version: {
    position: 'absolute',
    bottom: 32,
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
  },
});

export default SplashScreen;
