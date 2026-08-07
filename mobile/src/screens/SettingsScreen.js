import React, { useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

export default function SettingsScreen() {
  const { theme, themeName, changeTheme, themesList } = useContext(ThemeContext);
  const { user, role, logout } = useContext(AuthContext);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* ENCABEZADO DE CONFIGURACIÓN */}
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: theme.brand + '20' }]}>
            <Text style={{ fontSize: 24 }}>⚙️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>Configuración y Ajustes</Text>
            <Text style={[styles.subtext, { color: theme.subtext }]}>Personaliza los temas visuales y preferencias de tu cuenta</Text>
          </View>
        </View>
      </View>

      {/* SECCIÓN 1: SELECCIÓN DE TEMAS VISUALES */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>🎨 Temas de la Aplicación Móvil</Text>
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
        <Text style={[styles.subtext, { color: theme.subtext, marginBottom: 12 }]}>
          Elige una paleta de colores para sincronizar la barra superior, la navegación inferior y todas las tarjetas:
        </Text>

        <View style={styles.themesGrid}>
          {themesList.map((t) => {
            const isSelected = t.id === themeName;
            return (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.themePill,
                  {
                    backgroundColor: t.cardBg,
                    borderColor: isSelected ? '#10b981' : t.cardBorder,
                    borderWidth: isSelected ? 2 : 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 14,
                    gap: 10,
                    borderRadius: 16,
                    width: '48%'
                  }
                ]}
                onPress={() => changeTheme(t.id)}
              >
                <View style={[styles.colorDot, { backgroundColor: t.id === 'light' ? '#f8fafc' : '#0f172a', borderColor: '#10b981', borderWidth: 2 }]} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontWeight: '900', fontSize: 13 }}>
                    {t.name}
                  </Text>
                  <Text style={{ color: t.subtext, fontSize: 10 }}>
                    {t.id === 'light' ? 'Lienzo blanco' : 'Grafito noche'}
                  </Text>
                </View>
                {isSelected && (
                  <Text style={{ color: '#10b981', fontWeight: '900', fontSize: 14 }}>✓</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* SECCIÓN 2: INFORMACIÓN DE CUENTA Y ROL */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>👤 Información de Usuario</Text>
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder, gap: 10 }]}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.subtext }]}>Usuario Actual:</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>{user || 'Estudiante (Modo Lectura)'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.subtext }]}>Rol Asignado:</Text>
          <Text style={[styles.infoValue, { color: theme.brand }]}>
            {role === 'admin' ? '👑 Administrador' : (role === 'responsable' ? '🔑 Responsable' : '🎓 Estudiante')}
          </Text>
        </View>

        {user ? (
          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: '#ef4444' }]}
            onPress={logout}
          >
            <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 13, textAlign: 'center' }}>
              🚪 Cerrar Sesión
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtext: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 4,
  },
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themePill: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  logoutBtn: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
});
