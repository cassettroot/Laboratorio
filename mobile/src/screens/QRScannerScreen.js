import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import { CameraView, useCameraPermissions, Camera } from 'expo-camera';
import { apiService } from '../api/services';

export default function QRScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modal para ingreso manual de código
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    if (!permission || permission.status === 'undetermined') {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {
      const rawText = String(data || '').trim();
      if (!rawText) {
        setLoading(false);
        setScanned(false);
        return;
      }

      // 1. Extraer ID numérico o código
      const match = rawText.match(/LAB-[A-Z]+-(\d+)/i) || rawText.match(/(?:substances|chemical_materials|didactic_materials|equipos)\/(\d+)/i) || rawText.match(/^(\d+)$/);

      if (match && match[1]) {
        const itemId = match[1];
        try {
          const subRes = await apiService.getSubstanceById(itemId);
          if (subRes.status === 'success' && subRes.data) {
            setLoading(false);
            setScanned(false);
            navigation.navigate('Detail', { 
              type: 'substance', 
              id: subRes.data.id,
              item: subRes.data 
            });
            return;
          }
        } catch (e) {
          console.warn("Búsqueda directa por ID no encontrada, intentando API de escaneo:", e);
        }
      }

      // 2. Intentar escaneo por el API general
      const res = await apiService.scanQR(rawText);
      const targetItem = res.data || res.item;

      if (res.status === 'success' && targetItem) {
        setLoading(false);
        setScanned(false);
        navigation.navigate('Detail', { 
          type: res.type || 'substance', 
          id: targetItem.id,
          item: targetItem 
        });
        return;
      }

      // 3. Fallback de búsqueda local en todo el inventario de sustancias
      const allRes = await apiService.getSubstances();
      if (allRes.status === 'success' && allRes.data) {
        const found = allRes.data.find(s => {
          if (!s) return false;
          if (rawText.includes(`LAB-SUB-${s.id}`) || rawText.includes(`substances/${s.id}`)) return true;
          if (s.cas_number && s.cas_number.length >= 3 && rawText.includes(s.cas_number)) return true;
          if (s.name && s.name.length >= 3 && rawText.toLowerCase().includes(s.name.toLowerCase())) return true;
          return false;
        });

        if (found) {
          setLoading(false);
          setScanned(false);
          navigation.navigate('Detail', { 
            type: 'substance', 
            id: found.id,
            item: found 
          });
          return;
        }
      }

      // 4. Si no se encontró ningún compuesto coincidente
      Alert.alert(
        'Código no encontrado',
        `Código procesado: "${rawText}"\n\nNo se encontró un registro coincidente en el inventario activo.`,
        [{ text: 'Reintentar', onPress: () => setScanned(false) }]
      );

    } catch (error) {
      console.warn("Error en escáner QR:", error);
      Alert.alert(
        'Error de Escaneo',
        `No se pudo procesar el código.`,
        [{ text: 'Aceptar', onPress: () => setScanned(false) }]
      );
    } finally {
      setLoading(false);
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
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.text}>Solicitando permisos de cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Se requieren permisos de cámara para escanear QR.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Conceder Permisos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#334155', marginTop: 10 }]} onPress={() => setManualModalVisible(true)}>
          <Text style={styles.btnText}>⌨️ Ingresar Código Manualmente</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#475569', marginTop: 10 }]} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Regresar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "code128", "datamatrix", "ean13"],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanTarget} />
          <Text style={styles.scanText}>Apunta la cámara al código QR impreso</Text>

          <TouchableOpacity style={styles.manualBtnTop} onPress={() => setManualModalVisible(true)}>
            <Text style={styles.manualBtnTopText}>⌨️ Buscar por Código Manual</Text>
          </TouchableOpacity>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={styles.loadingText}>Buscando en inventario...</Text>
            </View>
          ) : null}

          {scanned && !loading ? (
            <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
              <Text style={styles.rescanBtnText}>Presiona para escanear otro QR</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </CameraView>

      {/* Modal para ingresar código manual */}
      <Modal visible={manualModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⌨️ Búsqueda Manual de Código</Text>
            <Text style={styles.modalSub}>Ingresa el código QR o ID del reactivo/material (ej. LAB-SUB-1, CAS, o Nombre):</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Ej. LAB-SUB-1, 7647-01-0, Ácido Clorhídrico"
              placeholderTextColor="#94a3b8"
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="none"
              autoFocus
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#334155' }]} onPress={() => setManualModalVisible(false)}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#0284c7' }]} onPress={submitManualCode}>
                <Text style={styles.modalBtnText}>Buscar</Text>
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
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 12,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  scanTarget: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#38bdf8',
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  scanText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  loadingBox: {
    position: 'absolute',
    bottom: 80,
    backgroundColor: '#0284c7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  rescanBtn: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: '#0369a1',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },
  rescanBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  btn: {
    marginTop: 20,
    backgroundColor: '#0284c7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  manualBtnTop: {
    marginTop: 14,
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  manualBtnTopText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 12,
    color: '#cbd5e1',
    marginBottom: 14,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
});
