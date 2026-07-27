import React, { useState, useEffect } from 'react';
import { Dimensions, StyleSheet, View, Text, StatusBar, Image } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay, 
  Easing, 
  runOnJS 
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';

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
    // Hide native splash screen immediately when React Native splash overlay mounts
    SplashScreen.hideAsync().catch(() => {});

    // Fast, responsive animation sequence (~1.1 seconds total)
    logoScale.value = withTiming(1.0, {
      duration: 450,
      easing: Easing.out(Easing.back(1.4)),
    });
    logoOpacity.value = withTiming(1, {
      duration: 350,
    });

    textTranslateY.value = withDelay(150, withTiming(0, {
      duration: 400,
      easing: Easing.out(Easing.quad),
    }));
    textOpacity.value = withDelay(150, withTiming(1, {
      duration: 400,
    }));

    taglineOpacity.value = withDelay(350, withTiming(1, {
      duration: 350,
    }));

    // Fade out and close splash screen after 900ms delay
    bgOpacity.value = withDelay(850, withTiming(0, {
      duration: 300,
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
    <Animated.View style={[styles.overlayContainer, bgAnimatedStyle]} pointerEvents="none">
      <View style={styles.contentWrap}>
        {/* Animated logo image container */}
        <Animated.View style={[logoAnimatedStyle, styles.logoCircle]}>
          <Image source={require('../../assets/images/logoimg22.png')} style={styles.logoImage} resizeMode="contain" />
        </Animated.View>

        {/* Animated Brand Text */}
        <Animated.View style={textAnimatedStyle}>
          <Text style={styles.brandText}>Ganimi Kava</Text>
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
  logoImage: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  logoCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 2,
  },
  subBrandText: {
    color: '#FCD34D', // Amber/gold highlight for Marathi branding
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 12,
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
