import React, { useState, useEffect } from 'react';
import { Dimensions, StyleSheet, View, Text, StatusBar } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay, 
  Easing, 
  runOnJS 
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);

  // Shared values for animations
  const bgOpacity = useSharedValue(1);
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(25);
  const textOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    // Start animation sequence
    logoScale.value = withTiming(1.0, {
      duration: 1000,
      easing: Easing.out(Easing.back(1.5)),
    });
    logoOpacity.value = withTiming(1, {
      duration: 800,
    });

    textTranslateY.value = withDelay(400, withTiming(0, {
      duration: 800,
      easing: Easing.out(Easing.quad),
    }));
    textOpacity.value = withDelay(400, withTiming(1, {
      duration: 800,
    }));

    taglineOpacity.value = withDelay(900, withTiming(1, {
      duration: 600,
    }));

    // Fade out and close splash after 2.3 seconds
    bgOpacity.value = withDelay(2300, withTiming(0, {
      duration: 600,
      easing: Easing.inOut(Easing.quad),
    }, (finished) => {
      if (finished) {
        runOnJS(setVisible)(false);
      }
    }));
  }, []);

  const bgAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: textTranslateY.value }],
    opacity: textOpacity.value,
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlayContainer, bgAnimatedStyle]}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      <View style={styles.contentWrap}>
        {/* Animated briefcase logo container */}
        <Animated.View style={[styles.logoCircle, logoAnimatedStyle]}>
          <Ionicons name="briefcase" size={54} color="#4F46E5" />
        </Animated.View>

        {/* Animated Brand Text */}
        <Animated.View style={textAnimatedStyle}>
          <Text style={styles.brandText}>JobSkill</Text>
        </Animated.View>

        {/* Animated tagline */}
        <Animated.View style={[taglineAnimatedStyle, styles.taglineWrap]}>
          <Text style={styles.taglineText}>Learn • Grow • Succeed</Text>
          <View style={styles.indicatorContainer}>
            <View style={styles.loadingDot} />
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// Keep AnimatedIcon for backwards compatibility
export function AnimatedIcon() {
  return null;
}

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#4F46E5', // Premium Brand Indigo
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
  contentWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 8,
  },
  taglineWrap: {
    alignItems: 'center',
    marginTop: 4,
  },
  taglineText: {
    color: '#E0E7FF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1.8,
  },
  indicatorContainer: {
    marginTop: 30,
    width: 44,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingDot: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
});
