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
import { DEFAULT_API_BASE } from '../api/client';

export default function LoginScreen() {
  const { login, loginAsStudent, serverUrl, updateServerUrl } = useContext(AuthContext);
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
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.badgeText}>TecNM - Instituto Tecnológico de Milpa Alta II</Text>
          <Text style={styles.title}>LabKeep Mobile</Text>
          <Text style={styles.subtitle}>Gestión e Inventario de Laboratorios</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Iniciar Sesión</Text>

          <Text style={styles.label}>Usuario</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. admin_lab_2026"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#94a3b8"
          />

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Ingresar como Personal</Text>
            )}
          </TouchableOpacity>

          {/* Botón de Acceso Directo para Estudiantes */}
          <TouchableOpacity 
            style={styles.studentButton} 
            onPress={loginAsStudent}
          >
            <Text style={styles.studentButtonText}>🎓 Modo Estudiantes / Consultar Sustancias</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.configLink} 
            onPress={() => setShowConfigModal(true)}
          >
            <Text style={styles.configLinkText}>
              ⚙ Servidor actual: <Text style={{fontWeight: 'bold'}}>{serverUrl || DEFAULT_API_BASE}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal para Cambiar Dirección IP / Servidor */}
      <Modal
        visible={showConfigModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfigModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configurar Servidor Backend</Text>
            <Text style={styles.modalDesc}>
              Si estás probando en tu celular mediante Wi-Fi local, ingresa la dirección IP de tu computadora (Ej. http://192.168.1.50:5000):
            </Text>

            <TextInput
              style={styles.input}
              value={tempUrl}
              onChangeText={setTempUrl}
              placeholder="http://192.168.1.XX:5000"
              autoCapitalize="none"
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowConfigModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveUrl}
              >
                <Text style={styles.saveButtonText}>Guardar IP</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  badgeText: {
    color: '#0284c7',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center'
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#ffffff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  studentButton: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  studentButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  configLink: {
    marginTop: 18,
    alignItems: 'center',
  },
  configLinkText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 16,
    lineHeight: 18,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancelButton: {
    backgroundColor: '#334155',
  },
  cancelButtonText: {
    color: '#cbd5e1',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#0284c7',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
