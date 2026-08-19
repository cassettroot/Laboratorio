import React, { useContext, useEffect, useRef, memo } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

// ══════════════════════════════════════════════════════════════
// 1. ORBES DE NEBULOSA OPTIMIZADOS (100% NATIVE DRIVER Y BAJO CONSUMO)
// ══════════════════════════════════════════════════════════════
const MultiColorMorphingOrb = memo(function MultiColorMorphingOrb({ size = 300, top, bottom, left, right, duration = 12000, delay = 0, isDark = true }) {
  const layerCyan = useRef(new Animated.Value(1)).current;
  const layerPurple = useRef(new Animated.Value(0)).current;
  const layerPink = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // 1. Transición suave de colores
    const colorCycle = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(layerCyan, { toValue: 0, duration: duration * 0.33, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(layerPurple, { toValue: 1, duration: duration * 0.33, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(layerPurple, { toValue: 0, duration: duration * 0.33, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(layerPink, { toValue: 1, duration: duration * 0.33, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(layerPink, { toValue: 0, duration: duration * 0.33, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(layerCyan, { toValue: 1, duration: duration * 0.33, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    );

    // 2. Respiración suave
    const pulseCycle = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.15,
          duration: duration * 0.5,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 0.95,
          duration: duration * 0.5,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    colorCycle.start();
    pulseCycle.start();

    return () => {
      colorCycle.stop();
      pulseCycle.stop();
    };
  }, []);

  const colorCyan = isDark ? 'rgba(6, 182, 212, 0.22)' : 'rgba(6, 182, 212, 0.12)';
  const colorPurple = isDark ? 'rgba(139, 92, 246, 0.20)' : 'rgba(139, 92, 246, 0.10)';
  const colorPink = isDark ? 'rgba(236, 72, 153, 0.18)' : 'rgba(236, 72, 153, 0.08)';

  return (
    <Animated.View
      style={[
        styles.orbContainer,
        {
          width: size,
          height: size,
          top,
          bottom,
          left,
          right,
          transform: [{ scale: pulseScale }],
        },
      ]}
    >
      <Animated.View style={[styles.orbLayer, { backgroundColor: colorCyan, opacity: layerCyan }]} />
      <Animated.View style={[styles.orbLayer, { backgroundColor: colorPurple, opacity: layerPurple }]} />
      <Animated.View style={[styles.orbLayer, { backgroundColor: colorPink, opacity: layerPink }]} />
    </Animated.View>
  );
});

// ══════════════════════════════════════════════════════════════
// 2. ESTRELLAS TITILANTES OPTIMIZADAS (14 PUNTOS CON NATIVE DRIVER)
// ══════════════════════════════════════════════════════════════
const OPTIMIZED_STARS = [
  { id: 1, x: 28, y: 70, size: 2.5, glow: true, duration: 3200, delay: 0 },
  { id: 2, x: 120, y: 140, size: 1.8, glow: false, duration: 2800, delay: 400 },
  { id: 3, x: 280, y: 90, size: 3.0, glow: true, duration: 3600, delay: 800 },
  { id: 4, x: width - 45, y: 180, size: 2.0, glow: false, duration: 3000, delay: 200 },
  { id: 5, x: 60, y: 290, size: 1.8, glow: false, duration: 3400, delay: 600 },
  { id: 6, x: 210, y: 260, size: 2.6, glow: true, duration: 4000, delay: 1000 },
  { id: 7, x: width - 70, y: 340, size: 2.2, glow: false, duration: 3100, delay: 300 },
  { id: 8, x: 40, y: 460, size: 2.8, glow: true, duration: 3800, delay: 700 },
  { id: 9, x: 180, y: 420, size: 1.8, glow: false, duration: 2900, delay: 1200 },
  { id: 10, x: width - 50, y: 520, size: 2.5, glow: false, duration: 3500, delay: 500 },
  { id: 11, x: 90, y: 610, size: 2.0, glow: true, duration: 3300, delay: 900 },
  { id: 12, x: 250, y: 580, size: 2.8, glow: false, duration: 3700, delay: 100 },
  { id: 13, x: width - 90, y: 670, size: 2.2, glow: true, duration: 3400, delay: 800 },
  { id: 14, x: 140, y: 730, size: 1.8, glow: false, duration: 3000, delay: 400 },
];

const TwinkleStar = memo(function TwinkleStar({ data, isDark }) {
  const opacityAnim = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    const twinkle = Animated.loop(
      Animated.sequence([
        Animated.delay(data.delay),
        Animated.timing(opacityAnim, {
          toValue: 0.85,
          duration: data.duration * 0.5,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.15,
          duration: data.duration * 0.5,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    twinkle.start();
    return () => twinkle.stop();
  }, []);

  const starColor = isDark ? '#ffffff' : '#0f172a';
  const shadowColor = isDark ? '#22d3ee' : '#64748b';

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: data.x,
          top: data.y,
          width: data.size,
          height: data.size,
          borderRadius: data.size / 2,
          backgroundColor: starColor,
          opacity: opacityAnim,
          shadowColor: shadowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: data.glow ? 0.9 : 0.3,
          shadowRadius: data.glow ? 4 : 1,
          elevation: data.glow ? 2 : 1,
        },
      ]}
    />
  );
});

// ══════════════════════════════════════════════════════════════
// 3. ESTRELLA FUGAZ NATIVA LIGERA
// ══════════════════════════════════════════════════════════════
const ShootingStar = memo(function ShootingStar({ initialDelay = 2000, startX = width * 0.9, startY = 80, isDark = true }) {
  const transX = useRef(new Animated.Value(0)).current;
  const transY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;

    const shoot = () => {
      if (!isMounted) return;
      transX.setValue(0);
      transY.setValue(0);
      opacity.setValue(0);

      Animated.sequence([
        Animated.delay(initialDelay + Math.random() * 6000),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(transX, {
            toValue: -width * 0.75,
            duration: 900,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(transY, {
            toValue: width * 0.55,
            duration: 900,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isMounted) shoot();
      });
    };

    shoot();

    return () => {
      isMounted = false;
    };
  }, []);

  const gradientColors = isDark
    ? ['#ffffff', '#22d3ee', 'rgba(6, 182, 212, 0.3)', 'transparent']
    : ['#0f172a', '#0284c7', 'rgba(2, 132, 199, 0.25)', 'transparent'];

  const headColor = isDark ? '#ffffff' : '#0f172a';

  return (
    <Animated.View
      style={[
        styles.shootingStarContainer,
        {
          left: startX,
          top: startY,
          opacity: opacity,
          transform: [
            { translateX: transX },
            { translateY: transY },
            { rotate: '-35deg' },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 1, y: 0.5 }}
        end={{ x: 0, y: 0.5 }}
        style={styles.shootingStarTail}
      />
      <View style={[styles.shootingStarHead, { backgroundColor: headColor, shadowColor: isDark ? '#22d3ee' : '#0284c7' }]} />
    </Animated.View>
  );
});

// ══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL GLASSBACKGROUND
// ══════════════════════════════════════════════════════════════
function GlassBackground({ children, style }) {
  const { theme } = useContext(ThemeContext);
  const isDark = theme.isDark !== false;

  const bgGradientColors = isDark
    ? ['#000000', '#02050e', '#010309', '#000000']
    : ['#ffffff', '#f8fafc', '#f1f5f9', '#ffffff'];

  const milkyWayColors = isDark
    ? ['transparent', 'rgba(139, 92, 246, 0.08)', 'rgba(6, 182, 212, 0.10)', 'rgba(236, 72, 153, 0.07)', 'transparent']
    : ['transparent', 'rgba(139, 92, 246, 0.05)', 'rgba(6, 182, 212, 0.07)', 'rgba(236, 72, 153, 0.04)', 'transparent'];

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#ffffff' }]}>
      {/* 1. Fondo Degradado Base */}
      <LinearGradient
        colors={bgGradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* 2. Vía Láctea */}
      <View style={styles.milkyWayBandContainer} pointerEvents="none">
        <LinearGradient
          colors={milkyWayColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.milkyWayGradient}
        />
      </View>

      {/* 3. Dos Orbes de Nebulosa Optimizados */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <MultiColorMorphingOrb size={320} top={-40} left={-50} duration={14000} delay={0} isDark={isDark} />
        <MultiColorMorphingOrb size={300} bottom={100} right={-50} duration={15000} delay={4000} isDark={isDark} />
      </View>

      {/* 4. Estrellas Titilantes Optimizadas (14 nodos con Native Driver) */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {OPTIMIZED_STARS.map((star) => (
          <TwinkleStar key={`opt-star-${star.id}`} data={star} isDark={isDark} />
        ))}
      </View>

      {/* 5. Una Estrella Fugaz Suave */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <ShootingStar initialDelay={2500} startX={width * 0.92} startY={100} isDark={isDark} />
      </View>

      {/* Contenido Principal */}
      <View style={[styles.content, style]}>
        {children}
      </View>
    </View>
  );
}

export default memo(GlassBackground);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  milkyWayBandContainer: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ rotate: '-25deg' }, { scale: 1.4 }],
    opacity: 0.9,
  },
  milkyWayGradient: {
    width: '100%',
    height: '100%',
  },
  orbContainer: {
    position: 'absolute',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  orbLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 9999,
  },
  star: {
    position: 'absolute',
  },
  shootingStarContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    width: 140,
    height: 12,
  },
  shootingStarHead: {
    width: 4,
    height: 4,
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  shootingStarTail: {
    width: 110,
    height: 2,
    borderRadius: 1,
  },
  content: {
    flex: 1,
  },
});
