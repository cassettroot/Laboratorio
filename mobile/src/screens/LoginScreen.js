import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { DEFAULT_API_BASE } from '../api/client';
import GlassBackground from '../components/GlassBackground';
import GlassCard from '../components/GlassCard';

export default function LoginScreen({ navigation }) {
  const { login, loginAsStudent, serverUrl, updateServerUrl } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Configuración de servidor
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempUrl, setTempUrl] = useState(serverUrl || DEFAULT_API_BASE);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Atención', 'Por favor ingrese usuario y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(username.trim(), password.trim());
      if (!res.success) {
        Alert.alert('Error de Autenticación', res.message);
      }
    } catch (err) {
      Alert.alert('Error de Conexión', 'No se pudo conectar con el servidor. Verifique la dirección IP configurada.');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentAccess = () => {
    loginAsStudent();
  };

  const handleSaveUrl = async () => {
    if (!tempUrl.trim()) {
      Alert.alert('Atención', 'Ingrese una URL válida.');
      return;
    }
    await updateServerUrl(tempUrl.trim());
    setShowConfigModal(false);
    Alert.alert('Servidor Actualizado', `Servidor configurado en:\n${tempUrl.trim()}`);
  };

  return (
    <GlassBackground>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: theme.accentBg, borderColor: theme.glassBorderGlow }]}>
              <Text style={[styles.badgeText, { color: theme.brand }]}>TecNM • Campus Milpa Alta II</Text>
            </View>
            <Text style={[styles.title, { color: theme.text }]}>LabKeep Mobile</Text>
            <Text style={[styles.subtitle, { color: theme.subtext }]}>Gestión e Inventario de Laboratorios</Text>
          </View>

          <GlassCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Iniciar Sesión</Text>

            <Text style={[styles.label, { color: theme.text }]}>Usuario</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.glassInput, color: theme.text, borderColor: theme.glassBorder }]}
              placeholder="Ej. admin_lab_2026"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholderTextColor={theme.subtext}
            />

            <Text style={[styles.label, { color: theme.text }]}>Contraseña</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.glassInput, color: theme.text, borderColor: theme.glassBorder }]}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={theme.subtext}
            />

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: theme.brand }, loading && styles.buttonDisabled]} 
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Ingresar como Personal</Text>
              )}
            </TouchableOpacity>

            {/* Botón de Acceso Directo para Estudiantes */}
            <TouchableOpacity 
              style={[styles.studentButton, { backgroundColor: theme.glassPill, borderColor: theme.glassBorder }]} 
              onPress={handleStudentAccess}
              activeOpacity={0.8}
            >
              <Text style={[styles.studentButtonText, { color: theme.text }]}>🎓 Modo Estudiantes / Consultas</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.configLink} 
              onPress={() => setShowConfigModal(true)}
            >
              <Text style={[styles.configLinkText, { color: theme.subtext }]}>
                ⚙ Servidor actual: <Text style={{ fontWeight: 'bold', color: theme.brand }}>{serverUrl || DEFAULT_API_BASE}</Text>
              </Text>
            </TouchableOpacity>
          </GlassCard>
        </ScrollView>

        {/* Modal para Cambiar Dirección IP / Servidor */}
        <Modal
          visible={showConfigModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowConfigModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Configurar Servidor Backend</Text>
              <Text style={[styles.modalDesc, { color: theme.subtext }]}>
                Si estás probando en tu celular mediante Wi-Fi local, ingresa la dirección IP de tu computadora (Ej. http://192.168.1.50:5000):
              </Text>

              <TextInput
                style={[styles.input, { backgroundColor: theme.glassInput, color: theme.text, borderColor: theme.glassBorder }]}
                value={tempUrl}
                onChangeText={setTempUrl}
                placeholder="http://192.168.1.XX:5000"
                autoCapitalize="none"
                placeholderTextColor={theme.subtext}
              />

              <TouchableOpacity 
                style={[styles.qrConnectBtn, { backgroundColor: theme.brand }]}
                onPress={() => {
                  setShowConfigModal(false);
                  if (navigation) {
                    navigation.navigate('QRScanner');
                  }
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
                  📷 Escanear QR para Vincular App
                </Text>
              </TouchableOpacity>

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, { backgroundColor: 'rgba(100, 116, 139, 0.25)' }]}
                  onPress={() => setShowConfigModal(false)}
                >
                  <Text style={{ color: theme.text, fontWeight: '700' }}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modalButton, { backgroundColor: theme.brand }]}
                  onPress={handleSaveUrl}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '800' }}>Guardar IP</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  card: {
    borderRadius: 24,
    padding: 24,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 18,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 14,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  studentButton: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
  },
  studentButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  configLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  configLinkText: {
    fontSize: 11,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  qrConnectBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginVertical: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  }
});
