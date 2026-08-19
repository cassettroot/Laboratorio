import React, { useContext, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  TextInput,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext, THEMES } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import GlassBackground from '../components/GlassBackground';
import GlassCard from '../components/GlassCard';

const { width } = Dimensions.get('window');

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const { theme, themeName, changeTheme } = useContext(ThemeContext);
  const { user, role, logout, serverUrl, updateServerUrl } = useContext(AuthContext);
  const isDark = theme.isDark !== false;

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempUrl, setTempUrl] = useState(serverUrl || '');

  const themesList = Object.values(THEMES);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir del sistema?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Cerrar Sesión', 
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        }
      ]
    );
  };

  const handleSaveUrl = async () => {
    if (!tempUrl.trim()) {
      Alert.alert('Atención', 'Ingrese una dirección de servidor válida.');
      return;
    }
    await updateServerUrl(tempUrl.trim());
    setShowConfigModal(false);
    Alert.alert('Servidor Sincronizado', `La URL se ha actualizado a:\n${tempUrl.trim()}`);
  };

  // Dynamic Theme Colors
  const textColor = isDark ? '#ffffff' : '#0f172a';
  const subtextColor = isDark ? '#94a3b8' : '#64748b';
  const cardBg = isDark ? 'rgba(10, 20, 38, 0.84)' : 'rgba(255, 255, 255, 0.90)';
  const cardBorder = isDark ? 'rgba(34, 211, 238, 0.28)' : 'rgba(6, 182, 212, 0.35)';
  const pillBg = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.92)';
  const pillBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.10)';

  return (
    <GlassBackground>
      {/* 1. BARRA SUPERIOR ELEGANTE Y COMPACTA */}
      <View style={[styles.topHeader, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerLogoBox}>
          <View style={[styles.headerFlaskBadge, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.85)', borderColor: cardBorder }]}>
            <Text style={styles.headerFlaskIcon}>⚗️</Text>
          </View>
          <View>
            <Text style={[styles.headerLogoTitle, { color: textColor }]}>ITMA II</Text>
            <Text style={[styles.headerLogoSubtitle, { color: subtextColor }]}>Laboratorio</Text>
          </View>
        </View>

        {/* Título de Pantalla al Costado (Sin emojis y con diseño integrado) */}
        <View style={[
          styles.screenTitleBadgePill, 
          { 
            backgroundColor: isDark ? 'rgba(6, 182, 212, 0.14)' : 'rgba(6, 182, 212, 0.10)', 
            borderColor: isDark ? 'rgba(34, 211, 238, 0.35)' : 'rgba(6, 182, 212, 0.35)' 
          }
        ]}>
          <Text style={[styles.screenTitleBadgeText, { color: isDark ? '#22d3ee' : '#0891b2' }]}>
            Configuración y Ajustes
          </Text>
        </View>
      </View>

      {/* 2. CONTENIDO PRINCIPAL */}
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: insets.bottom + 115, paddingTop: 6 }}
        showsVerticalScrollIndicator={false}
      >
        {/* SECCIÓN 1: SELECCIÓN DE TEMAS VISUALES */}
        <View style={styles.sectionHeaderBox}>
          <Text style={[styles.sectionHeading, { color: textColor }]}>🎨 Tema Visual de la App</Text>
          <Text style={[styles.sectionSubheading, { color: subtextColor }]}>
            Elige tu paleta favorita con soporte Glassmorphism continuo
          </Text>
        </View>

        <View style={[styles.glassSectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.themesGrid}>
            {themesList.map((t) => {
              const isSelected = t.id === themeName;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.themePill,
                    {
                      backgroundColor: isDark 
                        ? (isSelected ? 'rgba(6, 182, 212, 0.15)' : 'rgba(15, 23, 42, 0.75)')
                        : (isSelected ? 'rgba(6, 182, 212, 0.12)' : 'rgba(241, 245, 249, 0.85)'),
                      borderColor: isSelected ? (isDark ? '#22d3ee' : '#0891b2') : (isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(15, 23, 42, 0.08)'),
                      borderWidth: isSelected ? 1.5 : 1,
                    }
                  ]}
                  onPress={() => changeTheme(t.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.colorDot, { backgroundColor: t.isDark ? '#06b6d4' : '#0891b2' }]} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.themePillTitle, { color: textColor }]}>{t.name}</Text>
                    <Text style={[styles.themePillDesc, { color: subtextColor }]}>
                      {t.isDark ? 'Negro cósmico y partículas' : 'Lienzo blanco con estrellas'}
                    </Text>
                  </View>
                  {isSelected && (
                    <Text style={{ color: isDark ? '#22d3ee' : '#0891b2', fontSize: 16, fontWeight: '900' }}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SECCIÓN 2: INFORMACIÓN DE USUARIO Y CUENTA */}
        <View style={styles.sectionHeaderBox}>
          <Text style={[styles.sectionHeading, { color: textColor }]}>👤 Información de Cuenta</Text>
        </View>

        <View style={[styles.glassSectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: subtextColor }]}>Usuario Actual:</Text>
            <Text style={[styles.infoValue, { color: textColor }]}>{user || 'Carlos'}</Text>
          </View>

          <View style={[styles.cardDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]} />

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: subtextColor }]}>Rol Asignado:</Text>
            <View style={styles.roleBadgePill}>
              <Text style={styles.roleBadgeText}>
                {role === 'admin' ? '👑 Administrador' : (role === 'docente' ? '👨‍🏫 Docente' : '🎓 Estudiante')}
              </Text>
            </View>
          </View>

          <View style={[styles.cardDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]} />

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: subtextColor }]}>Servidor Backend:</Text>
            <TouchableOpacity onPress={() => setShowConfigModal(true)}>
              <Text style={[styles.infoValue, { color: isDark ? '#22d3ee' : '#0891b2', textDecorationLine: 'underline' }]} numberOfLines={1}>
                {serverUrl ? serverUrl.replace(/^https?:\/\//, '') : 'Configurar IP ✏️'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Botón de Cerrar Sesión Destacado en Rojo Neumórfico */}
          <TouchableOpacity 
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutBtnText}>🚪 Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL CONFIGURACIÓN SERVIDOR */}
      <Modal
        visible={showConfigModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfigModal(false)}
      >
        <TouchableOpacity style={styles.quickModalOverlay} activeOpacity={1} onPress={() => setShowConfigModal(false)}>
          <View style={[styles.quickModalCard, { backgroundColor: isDark ? '#071226' : '#ffffff', borderColor: cardBorder }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.quickModalTitle, { color: textColor }]}>🌐 Dirección del Servidor</Text>
            <Text style={[styles.quickModalSub, { color: subtextColor }]}>
              Ingresa la IP y puerto donde se ejecuta el backend Flask:
            </Text>

            <TextInput
              style={[styles.serverInput, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.8)', borderColor: cardBorder, color: textColor }]}
              value={tempUrl}
              onChangeText={setTempUrl}
              placeholder="http://192.168.1.94:5000"
              placeholderTextColor={subtextColor}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={[styles.quickModalCloseBtn, { flex: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)' }]} onPress={() => setShowConfigModal(false)}>
                <Text style={[styles.quickModalCloseText, { color: subtextColor }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.saveBtn, { flex: 2 }]} onPress={handleSaveUrl}>
                <LinearGradient colors={['#06b6d4', '#0284c7']} style={styles.saveGradient}>
                  <Text style={styles.saveBtnText}>Guardar URL ✅</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  headerLogoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerFlaskBadge: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  headerFlaskIcon: {
    fontSize: 22,
  },
  headerLogoTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerLogoSubtitle: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: -2,
  },
  screenTitleBadgePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  screenTitleBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  container: {
    flex: 1,
    paddingHorizontal: 14,
  },
  sectionHeaderBox: {
    marginBottom: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  sectionHeading: {
    fontSize: 16.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  sectionSubheading: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
  },
  glassSectionCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 8,
  },
  themesGrid: {
    gap: 10,
  },
  themePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  themePillTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  themePillDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  infoValue: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  roleBadgePill: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.40)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: '#fbbf24',
    fontSize: 11.5,
    fontWeight: '900',
  },
  cardDivider: {
    height: 1,
    marginVertical: 8,
  },
  logoutBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnText: {
    color: '#f87171',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  quickModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  quickModalCard: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1.2,
    padding: 20,
  },
  quickModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  quickModalSub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  serverInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  quickModalCloseBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickModalCloseText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
