import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

interface SpinnerProps {
  fullScreen?: boolean;
  message?: string;
  color?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  fullScreen = false,
  message,
  color = '#4F46E5',
}) => {
  if (fullScreen) {
    return (
      <View style={styles.fullScreenContainer}>
        <ActivityIndicator size="large" color={color} />
        {message ? <Text style={styles.messageText}>{message}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color={color} />
      {message ? <Text style={[styles.messageText, styles.inlineText]}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  container: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  messageText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#4B5563',
  },
  inlineText: {
    marginTop: 0,
    marginLeft: 8,
    fontSize: 14,
  },
});
