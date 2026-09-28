import React from 'react';
import { StyleSheet, View, Text, Image, ActivityIndicator } from 'react-native';
import Animated, { Keyframe, Easing } from 'react-native-reanimated';
import classes from './animated-icon.module.css';

const DURATION = 300;

interface AnimatedSplashOverlayProps {
  autoFade?: boolean;
}

export function AnimatedSplashOverlay({ autoFade = false }: AnimatedSplashOverlayProps) {
  return (
    <View style={webStyles.overlayContainer}>
      <View style={webStyles.contentWrap}>
        <View style={webStyles.logoCircle}>
          <Image 
            source={require('../../assets/images/logoimg22.png')} 
            style={webStyles.logoImage} 
            resizeMode="contain" 
          />
        </View>

        <Text style={webStyles.brandText}>Ganimi Kava</Text>
        <Text style={webStyles.subBrandText}>गनिमी कावा</Text>

        <View style={webStyles.taglineWrap}>
          <Text style={webStyles.taglineText}>Learn • Grow • Succeed</Text>
          <ActivityIndicator size="small" color="#FFFFFF" style={{ marginTop: 24 }} />
        </View>
      </View>
    </View>
  );
}

const webStyles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#4F46E5',
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
    color: '#FCD34D',
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
});

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: 0 }],
  },
  60: {
    transform: [{ scale: 1.2 }],
    easing: Easing.elastic(1.2),
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(1.2),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    opacity: 0,
  },
  60: {
    transform: [{ scale: 1.2 }],
    opacity: 0,
    easing: Easing.elastic(1.2),
  },
  100: {
    transform: [{ scale: 1 }],
    opacity: 1,
    easing: Easing.elastic(1.2),
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: '-180deg' }, { scale: 0.8 }],
    opacity: 0,
  },
  [DURATION / 1000]: {
    transform: [{ rotateZ: '0deg' }, { scale: 1 }],
    opacity: 1,
    easing: Easing.elastic(0.7),
  },
  100: {
    transform: [{ rotateZ: '7200deg' }],
  },
});

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Animated.View style={styles.background} entering={keyframe.duration(DURATION)}>
        <div className={classes.expoLogoBackground} />
      </Animated.View>

      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <Image style={styles.image} source={require('../../assets/images/logoimg22.png')} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    zIndex: 1000,
    position: 'absolute',
    top: 128 / 2 + 138,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 201,
    height: 201,
    position: 'absolute',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
  },
  image: {
    position: 'absolute',
    width: 76,
    height: 71,
  },
  background: {
    width: 128,
    height: 128,
    position: 'absolute',
  },
});
