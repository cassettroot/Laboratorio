import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { apiService } from '../api/services';

export default function QRScannerScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {
      // 1. Extraer ID directamente de patrones estáticos: LAB-SUB-12, LAB-SUBSTANCES-12, substances/12 o 12
      const rawText = String(data || '').trim();
      const match = rawText.match(/LAB-SUB(?:STANCES)?-(\d+)/i) || rawText.match(/substances?\/(\d+)/i) || rawText.match(/^(\d+)$/);

      if (match && match[1]) {
        const subId = match[1];
        try {
          const subRes = await apiService.getSubstanceById(subId);
          if (subRes.status === 'success' && subRes.data) {
            setLoading(false);
            setScanned(false);
            navigation.navigate('Detail', { 
              type: 'substance', 
              item: subRes.data 
            });
            return;
          }
        } catch (e) {
          console.warn("Error buscando por ID directo:", e);
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
          item: targetItem 
        });
        return;
      }

      // 3. Fallback de búsqueda local en todo el inventario
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
            item: found 
          });
          return;
        }
      }

      // 4. Si no se encontró ningún compuesto coincidente
      Alert.alert(
        'Código QR no encontrado',
        `Código escaneado: "${rawText}"\n\nNo existe un registro coincidente en el inventario.`,
        [{ text: 'Reintentar Escaneo', onPress: () => setScanned(false) }]
      );

    } catch (error) {
      console.warn("Error general en escáner QR:", error);
      Alert.alert(
        'Error de Escaneo',
        `No se pudo verificar el código escaneado.`,
        [{ text: 'Aceptar', onPress: () => setScanned(false) }]
      );
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.text}>Solicitando permisos de cámara...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No se otorgaron permisos de cámara.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Regresar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanTarget} />
          <Text style={styles.scanText}>Apunta la cámara al código QR impreso</Text>

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
});
