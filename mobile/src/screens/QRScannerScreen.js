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
      const res = await apiService.scanQR(data);
      if (res.status === 'success' && res.item) {
        navigation.navigate('Detail', { 
          type: res.type || 'substance', 
          item: res.item 
        });
      } else {
        Alert.alert(
          'Código QR Reconocido',
          `Contenido: ${data}\n\n${res.message || 'No se encontró un registro directo con este código.'}`,
          [{ text: 'Escanear de Nuevo', onPress: () => setScanned(false) }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Código QR Escaneado',
        `Valor: ${data}`,
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
