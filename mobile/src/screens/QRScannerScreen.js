import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Vibration,
  Platform,
  StatusBar,
  Animated,
  Easing,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../api/services';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const SCAN_TARGET_SIZE = Math.min(width * 0.72, 280);

export default function QRScannerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
  const bottomInset = Math.max(insets.bottom, 20);

  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraKey, setCameraKey] = useState(1);
  const [torch, setTorch] = useState(false);
  const [facing, setFacing] = useState('back');
  
  // Feedback toast para reinicio de cámara
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const { updateServerUrl } = useContext(AuthContext) || {};
  const { theme } = useContext(ThemeContext);
  const isDark = theme.isDark !== false;

  // Modal para ingreso manual de código
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Animación del rayo láser escaneador
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isFocused || scanned || loading) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [isFocused, scanned, loading, scanAnim]);

  useEffect(() => {
    if (!permission || permission.status === 'undetermined') {
      requestPermission();
    }
  }, [permission]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2200);
  };

  const [cameraActive, setCameraActive] = useState(true);

  // Función explícita para reiniciar la cámara y el estado de escaneo sin congelar el hardware nativo
  const restartCamera = useCallback((showFeedback = true) => {
    setScanned(false);
    setLoading(false);
    
    // Pausar brevemente la vista de cámara (120ms) para que el OS libere el dispositivo de cámara
    setCameraActive(false);
    setTimeout(() => {
      setCameraKey(prev => prev + 1);
      setCameraActive(true);
    }, 120);

    try {
      Vibration.vibrate(40);
    } catch (e) {}
    if (showFeedback) {
      triggerToast('Cámara reiniciada y activa ⚡');
    }
  }, []);

  // Reiniciar estado y cámara automáticamente cada vez que esta pantalla recupera el foco
  // (por ejemplo, después de regresar de la pantalla de detalles del material o sustancia)
  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setLoading(false);
      setCameraActive(true);
    }, [])
  );

  const toggleTorch = () => {
    setTorch(prev => !prev);
    try {
      Vibration.vibrate(30);
    } catch (e) {}
  };

  const toggleFacing = () => {
    setFacing(prev => (prev === 'back' ? 'front' : 'back'));
    try {
      Vibration.vibrate(30);
    } catch (e) {}
    triggerToast(facing === 'back' ? 'Cámara frontal activada' : 'Cámara trasera activada');
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || loading || !isFocused) return;
    setScanned(true);
    setLoading(true);

    try {
      Vibration.vibrate(80);
    } catch (e) {}

    try {
      const rawText = String(data || '').trim();
      if (!rawText) {
        setLoading(false);
        setScanned(false);
        return;
      }

      // 0. Detección especial: Código QR de Vinculación con Servidor Backend
      let isPairingQr = false;
      let pairingUrl = null;

      try {
        const parsed = JSON.parse(rawText);
        if (parsed && (parsed.type === 'server_pairing' || parsed.url || parsed.server_url)) {
          isPairingQr = true;
          pairingUrl = parsed.url || parsed.server_url;
        }
      } catch (e) {
        if (rawText.startsWith('http://') || rawText.startsWith('https://')) {
          if (rawText.includes(':5000') || rawText.includes('/api/')) {
            isPairingQr = true;
            pairingUrl = rawText.split('/api')[0];
          }
        }
      }

      if (isPairingQr && pairingUrl) {
        setLoading(false);
        if (typeof updateServerUrl === 'function') {
          await updateServerUrl(pairingUrl);
        }
        Alert.alert(
          '¡Servidor Vinculado con Éxito! 📲⚡',
          `La aplicación se conectó exitosamente al servidor:\n\n${pairingUrl}\n\nLos datos del laboratorio han sido sincronizados.`,
          [{
            text: 'Aceptar',
            onPress: () => {
              restartCamera(false);
              navigation.navigate('Main', { screen: 'Inicio' });
            }
          }]
        );
        return;
      }

      // 1. Intentar primero con la API de escaneo unificada
      try {
        const res = await apiService.scanQR(rawText);
        const targetItem = res?.data || res?.item;

        if (res && res.status === 'success' && targetItem) {
          setLoading(false);
          // Navegamos directamente a Detail; useFocusEffect se encargará de resetear al volver
          navigation.navigate('Detail', { 
            type: res.type || 'substance', 
            id: targetItem.id,
            item: targetItem 
          });
          return;
        }
      } catch (apiErr) {
        console.warn("API scanQR falló, realizando búsqueda de respaldo:", apiErr.message);
      }

      // 2. Extraer ID numérico si existe un patrón como LAB-SUB-15 o sustancias/15 o números
      const match = rawText.match(/LAB-[A-Z]+-(\d+)/i) || rawText.match(/(?:substances|chemical_materials|didactic_materials|equipos)\/(\d+)/i) || rawText.match(/^(\d+)$/);

      if (match && match[1]) {
        const itemId = match[1];
        try {
          const subRes = await apiService.getSubstanceById(itemId);
          if (subRes && subRes.status === 'success' && subRes.data) {
            setLoading(false);
            navigation.navigate('Detail', { 
              type: 'substance', 
              id: subRes.data.id,
              item: subRes.data 
            });
            return;
          }
        } catch (e) {
          console.warn("Búsqueda directa por ID no encontrada:", e);
        }
      }

      // 3. Búsqueda local en sustancias
      try {
        const allRes = await apiService.getSubstances();
        if (allRes && allRes.status === 'success' && allRes.data) {
          const found = allRes.data.find(s => {
            if (!s) return false;
            if (rawText.includes(`LAB-SUB-${s.id}`) || rawText.includes(`substances/${s.id}`)) return true;
            if (s.cas_number && s.cas_number.length >= 3 && rawText.includes(s.cas_number)) return true;
            if (s.name && s.name.length >= 3 && rawText.toLowerCase().includes(s.name.toLowerCase())) return true;
            return false;
          });

          if (found) {
            setLoading(false);
            navigation.navigate('Detail', { 
              type: 'substance', 
              id: found.id,
              item: found 
            });
            return;
          }
        }
      } catch (e) {
        console.warn("Búsqueda local falló:", e);
      }

      // 4. Si no se encontró ningún compuesto coincidente
      setLoading(false);
      Alert.alert(
        'Código no encontrado',
        `Código procesado: "${rawText}"\n\nNo se encontró un registro coincidente en el inventario activo.`,
        [
          { 
            text: 'Buscar Manual', 
            onPress: () => { 
              setManualCode(rawText); 
              setManualModalVisible(true); 
              setScanned(false); 
            } 
          },
          { 
            text: 'Reintentar', 
            onPress: () => restartCamera(false), 
            style: 'cancel' 
          }
        ]
      );

    } catch (error) {
      console.warn("Error en escáner QR:", error);
      setLoading(false);
      Alert.alert(
        'Error de Escaneo',
        `No se pudo procesar el código.`,
        [{ text: 'Reintentar', onPress: () => restartCamera(false) }]
      );
    }
  };

  const submitManualCode = () => {
    if (!manualCode.trim()) return;
    const codeToSearch = manualCode.trim();
    setManualModalVisible(false);
    setManualCode('');
    handleBarCodeScanned({ type: 'manual', data: codeToSearch });
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#22d3ee" />
        <Text style={styles.text}>Solicitando permisos de cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionCard}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>📷</Text>
          <Text style={styles.permissionTitle}>Permiso de Cámara Requerido</Text>
          <Text style={styles.permissionSub}>
            Para escanear los códigos QR de los reactivos, materiales y equipos de laboratorio, permite el acceso a la cámara.
          </Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryBtnText}>Conceder Permisos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setManualModalVisible(true)}>
            <Text style={styles.secondaryBtnText}>⌨️ Ingresar Código Manual</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backBtnModal} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnModalText}>Regresar al Inicio</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const laserTranslate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_TARGET_SIZE - 6],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Vista de Cámara: se renderiza solo si la pantalla está enfocada y el estado está activo */}
      {isFocused && cameraActive ? (
        <CameraView
          key={`camera-${cameraKey}`}
          facing={facing}
          enableTorch={torch}
          onBarcodeScanned={scanned || loading ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "code128", "datamatrix", "ean13"],
          }}
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#22d3ee" />
        </View>
      )}

      {/* Capa de interfaz y controles */}
      <View style={[styles.overlay, StyleSheet.absoluteFillObject]}>
        
        {/* Barra superior con botón volver y controles rápidos */}
        <View style={[styles.headerBar, { paddingTop: topInset + 8 }]}>
          <TouchableOpacity
            style={styles.circleActionBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Escáner QR</Text>
            <Text style={styles.headerSub}>Inventario de Laboratorio</Text>
          </View>

          <View style={styles.headerActions}>
            {/* Botón de Linterna */}
            <TouchableOpacity
              style={[styles.circleActionBtn, torch && styles.circleActionBtnActive]}
              onPress={toggleTorch}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={torch ? "flash" : "flash-outline"} 
                size={20} 
                color={torch ? "#facc15" : "#ffffff"} 
              />
            </TouchableOpacity>

            {/* Botón de Girar Cámara */}
            <TouchableOpacity
              style={styles.circleActionBtn}
              onPress={toggleFacing}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-reverse-outline" size={20} color="#ffffff" />
            </TouchableOpacity>

            {/* Botón de Reiniciar Cámara */}
            <TouchableOpacity
              style={[styles.circleActionBtn, styles.restartBtnHeader]}
              onPress={() => restartCamera(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="reload" size={19} color="#22d3ee" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Toast Flotante de Confirmación */}
        {showToast ? (
          <View style={styles.toastContainer}>
            <Ionicons name="checkmark-circle" size={18} color="#22d3ee" />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        ) : null}

        {/* Área Central: Marco de Escaneo con Guías y Láser */}
        <View style={styles.scanCenterContainer}>
          <View style={[styles.scanTarget, { width: SCAN_TARGET_SIZE, height: SCAN_TARGET_SIZE }]}>
            {/* Esquinas decorativas de alta precisión */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Línea láser animada */}
            {!scanned && !loading && (
              <Animated.View
                style={[
                  styles.scanLaser,
                  {
                    transform: [{ translateY: laserTranslate }],
                  },
                ]}
              />
            )}
          </View>

          {/* Indicador de Estado */}
          <View style={styles.statusPill}>
            <View style={[
              styles.statusDot, 
              { backgroundColor: loading ? '#f59e0b' : (scanned ? '#22c55e' : '#22d3ee') }
            ]} />
            <Text style={styles.scanText}>
              {loading 
                ? 'Buscando en catálogo...' 
                : (scanned 
                    ? 'Código detectado' 
                    : 'Apunta la cámara al código QR')}
            </Text>
          </View>
        </View>

        {/* Barra de Acciones Inferior */}
        <View style={[styles.bottomControls, { paddingBottom: bottomInset }]}>
          
          {/* Botón destacado de Reiniciar Cámara */}
          <TouchableOpacity
            style={styles.restartMainBtn}
            onPress={() => restartCamera(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#22d3ee" style={{ marginRight: 8 }} />
            <Text style={styles.restartMainBtnText}>Reiniciar Cámara</Text>
          </TouchableOpacity>

          {/* Botón de Búsqueda Manual */}
          <TouchableOpacity
            style={styles.manualSearchBtn}
            onPress={() => setManualModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="keypad-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.manualSearchBtnText}>Búsqueda Manual</Text>
          </TouchableOpacity>

          {/* Banner de Cargando */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.loadingText}>Buscando en inventario...</Text>
            </View>
          ) : null}

          {/* Botón de Escanear de Nuevo cuando ya fue escaneado */}
          {scanned && !loading ? (
            <TouchableOpacity
              style={styles.rescanFloatBtn}
              onPress={() => restartCamera(false)}
              activeOpacity={0.85}
            >
              <Ionicons name="scan-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.rescanBtnText}>Escanear otro código QR</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Modal para ingresar código manual */}
      <Modal visible={manualModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg || '#0f172a', borderColor: theme.cardBorder || 'rgba(34, 211, 238, 0.3)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="keypad" size={24} color="#22d3ee" style={{ marginRight: 10 }} />
              <Text style={[styles.modalTitle, { color: theme.text || '#ffffff' }]}>Búsqueda Manual de Código</Text>
            </View>

            <Text style={[styles.modalSub, { color: theme.subtext || '#94a3b8' }]}>
              Ingresa el código QR, identificador, número CAS o nombre del reactivo o material:
            </Text>
            
            <TextInput
              style={[
                styles.modalInput,
                { 
                  backgroundColor: isDark ? 'rgba(3, 7, 18, 0.85)' : 'rgba(241, 245, 249, 0.95)', 
                  color: theme.text || '#ffffff', 
                  borderColor: isDark ? 'rgba(34, 211, 238, 0.4)' : 'rgba(6, 182, 212, 0.5)' 
                }
              ]}
              placeholder="Ej. LAB-SUB-1, 7647-01-0, Acetona..."
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="none"
              autoFocus
              onSubmitEditing={submitManualCode}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: 'rgba(100, 116, 139, 0.25)', borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.2)' }]}
                onPress={() => setManualModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: theme.text || '#ffffff' }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#0891b2' }]}
                onPress={submitManualCode}
              >
                <Text style={[styles.modalBtnText, { color: '#ffffff' }]}>Buscar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 15,
    marginTop: 14,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  circleActionBtnActive: {
    backgroundColor: 'rgba(250, 204, 21, 0.25)',
    borderColor: '#facc15',
  },
  restartBtnHeader: {
    borderColor: 'rgba(34, 211, 238, 0.4)',
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
  },
  toastContainer: {
    position: 'absolute',
    top: 100,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#22d3ee',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 99,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  scanCenterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTarget: {
    borderRadius: 20,
    position: 'relative',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#22d3ee',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 14,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 14,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 14,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 14,
  },
  scanLaser: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 3,
    backgroundColor: '#22d3ee',
    borderRadius: 2,
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scanText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomControls: {
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
  },
  restartMainBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(34, 211, 238, 0.5)',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  restartMainBtnText: {
    color: '#22d3ee',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  manualSearchBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  manualSearchBtnText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  },
  loadingBox: {
    position: 'absolute',
    bottom: 85,
    backgroundColor: '#0284c7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  loadingText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  rescanFloatBtn: {
    position: 'absolute',
    bottom: 85,
    backgroundColor: '#0891b2',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  rescanBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  permissionCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    marginHorizontal: 24,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
  },
  permissionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  permissionSub: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#0891b2',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryBtn: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryBtnText: {
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: 14,
  },
  backBtnModal: {
    paddingVertical: 8,
  },
  backBtnModalText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  modalInput: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    borderWidth: 1.2,
    marginBottom: 4,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontWeight: '800',
    fontSize: 14,
  },
});
