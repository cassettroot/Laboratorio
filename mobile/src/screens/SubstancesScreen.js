import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
  Modal,
  Alert,
  ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { apiService } from '../api/services';
import apiClient, { DEFAULT_API_BASE, getImageUrl } from '../api/client';

export default function SubstancesScreen({ navigation }) {
  const { role, user, serverUrl } = useContext(AuthContext);
  const [substances, setSubstances] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estado del Modal de Registro Rápido (para Administradores y Responsables)
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Campos de Formulario Rápido Móvil
  const [formName, setFormName] = useState('');
  const [formCas, setFormCas] = useState('');
  const [formFormula, setFormFormula] = useState('');
  const [formState, setFormState] = useState('Líquido');
  const [formQuantity, setFormQuantity] = useState('1.0');
  const [formUnit, setFormUnit] = useState('g');
  const [formLocation, setFormLocation] = useState('');
  const [formPhotoUri, setFormPhotoUri] = useState(null);

  const fetchSubstances = async () => {
    try {
      const res = await apiService.getSubstances();
      if (res.status === 'success') {
        setSubstances(res.data || []);
        setFiltered(res.data || []);
      }
    } catch (err) {
      console.warn("Error cargando sustancias:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubstances();
  }, []);

  const getImageUri = (imagePath) => {
    return getImageUrl(imagePath, serverUrl);
  };

  // Función para capturar o elegir foto con corte cuadrado 1:1
  const pickPhotoSquare = async (fromCamera = false) => {
    try {
      const permRes = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permRes.granted) {
        Alert.alert('Permiso Requerido', 'Se necesitan permisos para acceder a la cámara o galería.');
        return;
      }

      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // CORTE CUADRADO 1:1 OBLIGATORIO
        quality: 0.8,
      };

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFormPhotoUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error al seleccionar foto', e.message);
    }
  };

  const handleQuickSubmit = async () => {
    if (!formName.trim()) {
      Alert.alert('Campo Obligatorio', 'Ingrese el nombre de la sustancia.');
      return;
    }

    setSubmitting(true);
    try {
      let serverImagePath = '';

      // Subir foto si seleccionó una
      if (formPhotoUri) {
        const filename = formPhotoUri.split('/').pop() || 'photo.jpg';
        const formData = new FormData();
        formData.append('photo', {
          uri: formPhotoUri,
          name: filename,
          type: 'image/jpeg'
        });

        const uploadRes = await apiService.uploadPhoto(formData);
        if (uploadRes.status === 'success') {
          serverImagePath = uploadRes.image_path;
        }
      }

      const payload = {
        name: formName.trim(),
        cas_number: formCas.trim(),
        chemical_formula: formFormula.trim(),
        physical_state: formState,
        quantity: parseFloat(formQuantity) || 1.0,
        unit: formUnit,
        location: formLocation.trim(),
        responsible: user || 'Móvil',
        image_path: serverImagePath
      };

      const res = await apiService.createSubstance(payload);
      if (res.status === 'success') {
        Alert.alert(
          '✅ Registro Rápido Exitoso',
          'La sustancia se ha agregado al inventario. Puedes complementar la ficha completa desde la computadora en la web.'
        );
        setAddModalVisible(false);
        // Limpiar formulario
        setFormName('');
        setFormCas('');
        setFormFormula('');
        setFormLocation('');
        setFormPhotoUri(null);
        fetchSubstances();
      } else {
        Alert.alert('Error al guardar', res.message || 'No se pudo crear el registro.');
      }
    } catch (err) {
      Alert.alert('Error', 'Ocurrió un error al enviar la sustancia: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearch = (text) => {
    setSearch(text);
    if (!text.trim()) {
      setFiltered(substances);
      return;
    }
    const q = text.toLowerCase();
    const result = substances.filter(item => 
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.cas_number && item.cas_number.toLowerCase().includes(q)) ||
      (item.chemical_formula && item.chemical_formula.toLowerCase().includes(q)) ||
      (item.responsible && item.responsible.toLowerCase().includes(q)) ||
      (item.location && item.location.toLowerCase().includes(q))
    );
    setFiltered(result);
  };

  const renderItem = ({ item }) => {
    const photoUri = getImageUri(item.image_path);

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('Detail', { type: 'substance', item })}
      >
        <View style={styles.cardMainRow}>
          <View style={styles.imageContainer}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.substanceImage} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderIcon}>🧪</Text>
              </View>
            )}
          </View>

          <View style={styles.cardDetails}>
            <View style={styles.cardHeader}>
              <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
            </View>

            {item.chemical_formula ? (
              <Text style={styles.formula}>Fórmula: {item.chemical_formula}</Text>
            ) : null}

            {item.cas_number ? (
              <Text style={styles.meta}>CAS: {item.cas_number}</Text>
            ) : null}

            <View style={styles.cardFooter}>
              <View style={styles.quantityBadge}>
                <Text style={styles.quantityText}>{item.quantity} {item.unit}</Text>
              </View>
              <Text style={styles.location} numberOfLines={1}>📍 {item.location || 'Sin ubicación'}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={[styles.searchBox, { flex: 1 }]}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, CAS, fórmula..."
            value={search}
            onChangeText={handleSearch}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSubstances(); }} tintColor="#0284c7" />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No se encontraron sustancias químicas.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBox: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imageContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  substanceImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 24,
  },
  cardDetails: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  quantityBadge: {
    backgroundColor: '#0369a1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  quantityText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  formula: {
    fontSize: 12,
    color: '#38bdf8',
    marginBottom: 2,
    fontWeight: '600',
  },
  meta: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
  },
  addBtnHeader: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnHeaderText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  closeBtn: {
    fontSize: 20,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  stateSelector: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  stateOption: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  stateOptionActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  stateOptionText: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  stateOptionTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  photoPickerRow: {
    marginTop: 6,
    marginBottom: 12,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  photoBtn: {
    flex: 1,
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  photoBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  photoBtnOutline: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  photoBtnOutlineText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  squarePreviewContainer: {
    position: 'relative',
    width: 100,
    height: 100, // 1:1 ASPECT RATIO PREVIEW
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#38bdf8',
  },
  squarePreview: {
    width: '100%',
    height: '100%',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtn: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
});
