import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '../context/ThemeContext';

export default function GlassCard({ children, style, noBorder = false }) {
  const { theme } = useContext(ThemeContext);

  const cardStyle = [
    styles.card,
    {
      borderColor: noBorder ? 'transparent' : theme.glassCardBorder,
      shadowColor: theme.shadowColor,
      shadowOpacity: theme.shadowOpacity,
    },
    style
  ];

  // Subtle glass highlight gradient overlay (from slightly brighter at top to smooth translucent at bottom)
  const gradientColors = theme.isDark 
    ? ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)', 'rgba(0, 0, 0, 0.20)']
    : ['rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0.65)', 'rgba(240, 249, 255, 0.50)'];

  return (
    <View style={cardStyle}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.glassCardBg }]}
      />
      <View style={styles.innerContent}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1.2,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 4,
  },
  innerContent: {
    padding: 16,
  }
});
