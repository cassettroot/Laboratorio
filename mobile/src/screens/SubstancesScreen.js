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
import { normalizeText } from '../utils/textUtils';

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

  // Campos de Formulario Móvil Completo
  const [formName, setFormName] = useState('');
  const [formCas, setFormCas] = useState('');
  const [formFormula, setFormFormula] = useState('');
  const [formGroup, setFormGroup] = useState('');
  const [formContainerContent, setFormContainerContent] = useState('');
  const [formState, setFormState] = useState('Líquido');
  const [formQuantity, setFormQuantity] = useState('1.0');
  const [formUnit, setFormUnit] = useState('g');
  const [formStockUnits, setFormStockUnits] = useState('1');
  const [formLocation, setFormLocation] = useState('');
  const [formEntryDate, setFormEntryDate] = useState('');
  const [formExpiration, setFormExpiration] = useState('');
  const [formRisks, setFormRisks] = useState('');
  const [formExternalLinks, setFormExternalLinks] = useState('');
  const [formObservations, setFormObservations] = useState('');
  const [formPhotoUri, setFormPhotoUri] = useState(null);

  // Estado del Modal de Solicitud de Préstamo Móvil
  const [loanModalVisible, setLoanModalVisible] = useState(false);
  const [selectedSubstance, setSelectedSubstance] = useState(null);
  const [loanQuantity, setLoanQuantity] = useState('1.0');
  const [loanNotes, setLoanNotes] = useState('');
  const [loanUserType, setLoanUserType] = useState('Docente');
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [submittingLoan, setSubmittingLoan] = useState(false);

  const openLoanModal = async (substanceItem) => {
    setSelectedSubstance(substanceItem);
    setLoanQuantity('1.0');
    setLoanNotes('');
    setLoanUserType('Docente');
    setLoanModalVisible(true);
    try {
      const res = await apiService.getRegisteredUsers();
      if (res.status === 'success') {
        setRegisteredUsers(res.data || []);
        const currentUser = (res.data || []).find(u => u.username === user);
        if (currentUser) setSelectedUserId(currentUser.id);
        else if (res.data && res.data.length > 0) setSelectedUserId(res.data[0].id);
      }
    } catch (e) {
      console.warn("Error cargando usuarios registrados:", e);
    }
  };

  const handleSubstanceLoanSubmit = async () => {
    if (!selectedSubstance) return;
    const qty = parseFloat(loanQuantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Cantidad Inválida', 'Por favor ingrese una cantidad válida mayor a 0.');
      return;
    }

    setSubmittingLoan(true);
    try {
      const foundUser = registeredUsers.find(u => u.id === selectedUserId);
      const borrowerName = foundUser ? foundUser.username : (user || 'Docente');

      const payload = {
        borrower_name: borrowerName,
        borrower_user_id: selectedUserId || 0,
        borrower_type: loanUserType,
        items_list: [
          {
            id: selectedSubstance.id,
            name: selectedSubstance.name,
            type: 'substance',
            quantity: qty,
            unit: selectedSubstance.unit || 'g',
            location: selectedSubstance.location || '',
            chemical_formula: selectedSubstance.chemical_formula || ''
          }
        ],
        notes: loanNotes.trim()
      };

      const res = await apiService.createLoan(payload);
      if (res.status === 'success') {
        Alert.alert(
          '✅ Préstamo Solicitado Exitosamente',
          'La solicitud de préstamo ha sido guardada en la lista de préstamos y se notificó a los administradores.'
        );
        setLoanModalVisible(false);
      } else {
        Alert.alert('Error', res.message || 'No se pudo guardar la solicitud.');
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo enviar el préstamo: ' + err.message);
    } finally {
      setSubmittingLoan(false);
    }
  };

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
        substance_group: formGroup.trim(),
        container_content: formContainerContent.trim(),
        physical_state: formState,
        quantity: parseFloat(formQuantity) || 1.0,
        unit: formUnit.trim() || 'g',
        stock_units: parseInt(formStockUnits, 10) || 1,
        location: formLocation.trim(),
        entry_date: formEntryDate.trim(),
        expiration_date: formExpiration.trim(),
        risks_warnings: formRisks.trim(),
        external_links: formExternalLinks.trim(),
        observations: formObservations.trim(),
        responsible: user || 'Móvil',
        image_path: serverImagePath
      };

      const res = await apiService.createSubstance(payload);
      if (res.status === 'success') {
        Alert.alert(
          '✅ Registro Exitoso',
          'La sustancia se ha agregado exitosamente al inventario.'
        );
        setAddModalVisible(false);
        // Limpiar formulario
        setFormName('');
        setFormCas('');
        setFormFormula('');
        setFormGroup('');
        setFormContainerContent('');
        setFormQuantity('1.0');
        setFormUnit('g');
        setFormStockUnits('1');
        setFormLocation('');
        setFormEntryDate('');
        setFormExpiration('');
        setFormRisks('');
        setFormExternalLinks('');
        setFormObservations('');
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
    const qNorm = normalizeText(text);
    const result = substances.filter(item => 
      normalizeText(item.name).includes(qNorm) ||
      normalizeText(item.cas_number).includes(qNorm) ||
      normalizeText(item.chemical_formula).includes(qNorm) ||
      normalizeText(item.substance_group).includes(qNorm) ||
      normalizeText(item.responsible).includes(qNorm) ||
      normalizeText(item.location).includes(qNorm)
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
                <Text style={styles.quantityText}>{item.quantity} {item.unit || 'g'}</Text>
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
          <Text style={{ fontSize: 16, marginRight: 6 }}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { flex: 1 }]}
            placeholder="Buscar por nombre, CAS, fórmula..."
            value={search}
            onChangeText={handleSearch}
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search ? (
            <TouchableOpacity onPress={() => handleSearch('')} style={{ padding: 4 }}>
              <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {(role === 'admin' || role === 'responsable') ? (
          <TouchableOpacity style={styles.addBtnHeader} onPress={() => setAddModalVisible(true)}>
            <Text style={styles.addBtnHeaderText}>+ Registrar</Text>
          </TouchableOpacity>
        ) : null}
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

      {/* MODAL SOLICITUD DE PRÉSTAMO DE SUSTANCIA */}
      <Modal
        visible={loanModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLoanModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🤝 Solicitar Préstamo</Text>
              <TouchableOpacity onPress={() => setLoanModalVisible(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedSubstance && (
              <ScrollView style={{ maxHeight: 440 }}>
                <View style={styles.substanceSummaryBox}>
                  <Text style={styles.substanceSummaryName}>{selectedSubstance.name}</Text>
                  {selectedSubstance.chemical_formula ? (
                    <Text style={styles.substanceSummaryMeta}>Fórmula: {selectedSubstance.chemical_formula}</Text>
                  ) : null}
                  <Text style={styles.substanceSummaryStock}>
                    Stock Disponible: {selectedSubstance.quantity} {selectedSubstance.unit || ''}
                  </Text>
                </View>

                <Text style={styles.inputLabel}>Cantidad a Solicitar *</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    keyboardType="numeric"
                    value={loanQuantity}
                    onChangeText={setLoanQuantity}
                  />
                  <Text style={styles.unitBadge}>{selectedSubstance.unit || 'uds'}</Text>
                </View>

                <Text style={styles.inputLabel}>Solicitante / Prestatario</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {registeredUsers.length > 0 ? (
                      registeredUsers.map(u => (
                        <TouchableOpacity
                          key={u.id}
                          style={[
                            styles.userChip,
                            selectedUserId === u.id && styles.userChipSelected
                          ]}
                          onPress={() => setSelectedUserId(u.id)}
                        >
                          <Text style={[
                            styles.userChipText,
                            selectedUserId === u.id && styles.userChipTextSelected
                          ]}>
                            {u.username}
                          </Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text style={{ color: '#94a3b8', fontSize: 13 }}>{user || 'Usuario Actual'}</Text>
                    )}
                  </View>
                </ScrollView>

                <Text style={styles.inputLabel}>Tipo de Solicitante</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 }}>
                  {['Docente', 'Responsable de Laboratorio', 'Alumno / Estudiante', 'Investigador'].map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.userChip,
                        loanUserType === t && styles.userChipSelected
                      ]}
                      onPress={() => setLoanUserType(t)}
                    >
                      <Text style={[
                        styles.userChipText,
                        loanUserType === t && styles.userChipTextSelected
                      ]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Motivo / Observaciones del Préstamo</Text>
                <TextInput
                  style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
                  multiline
                  placeholder="Ej. Práctica de laboratorio, investigación..."
                  placeholderTextColor="#64748b"
                  value={loanNotes}
                  onChangeText={setLoanNotes}
                />

                <TouchableOpacity
                  style={[styles.submitLoanBtn, submittingLoan && { opacity: 0.6 }]}
                  disabled={submittingLoan}
                  onPress={handleSubstanceLoanSubmit}
                >
                  {submittingLoan ? (
                    <ActivityIndicator color="#0f172a" />
                  ) : (
                    <Text style={styles.submitLoanBtnText}>Enviar Solicitud de Préstamo</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL COMPLETO DE REGISTRO DE NUEVA SUSTANCIA */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🧪 Registrar Sustancia</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520 }}>
              <Text style={styles.inputLabel}>Nombre del Compuesto *</Text>
              <TextInput style={styles.input} value={formName} onChangeText={setFormName} placeholder="Ej. Ácido Clorhídrico" placeholderTextColor="#64748b" />

              <Text style={styles.inputLabel}>Fórmula Química</Text>
              <TextInput style={styles.input} value={formFormula} onChangeText={setFormFormula} placeholder="Ej. HCl" placeholderTextColor="#64748b" />

              <Text style={styles.inputLabel}>Número CAS</Text>
              <TextInput style={styles.input} value={formCas} onChangeText={setFormCas} placeholder="Ej. 7647-01-0" placeholderTextColor="#64748b" />

              <Text style={styles.inputLabel}>Grupo SGA / Almacenamiento</Text>
              <TextInput style={styles.input} value={formGroup} onChangeText={setFormGroup} placeholder="Ej. Grupo 8 Corrosivos" placeholderTextColor="#64748b" />

              <Text style={styles.inputLabel}>Contenido / Presentación del Envase</Text>
              <TextInput style={styles.input} value={formContainerContent} onChangeText={setFormContainerContent} placeholder="Ej. Frasco 500 mL, Garrafa 5 L" placeholderTextColor="#64748b" />

              <Text style={styles.inputLabel}>Estado Físico</Text>
              <View style={styles.stateSelector}>
                {['Líquido', 'Sólido', 'Gaseoso', 'Solución'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.stateOption, formState === st && styles.stateOptionActive]}
                    onPress={() => setFormState(st)}
                  >
                    <Text style={[styles.stateOptionText, formState === st && styles.stateOptionTextActive]}>{st}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Cantidad Total *</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={formQuantity} onChangeText={setFormQuantity} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Unidad *</Text>
                  <TextInput style={styles.input} value={formUnit} onChangeText={setFormUnit} placeholder="g, mL, kg, L" placeholderTextColor="#64748b" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Envases Stock</Text>
                  <TextInput style={styles.input} keyboardType="number-pad" value={formStockUnits} onChangeText={setFormStockUnits} placeholder="1" placeholderTextColor="#64748b" />
                </View>
              </View>

              <Text style={styles.inputLabel}>Ubicación Física</Text>
              <TextInput style={styles.input} value={formLocation} onChangeText={setFormLocation} placeholder="Ej. Estante A - Nivel 2" placeholderTextColor="#64748b" />

              <Text style={styles.inputLabel}>Fecha de Ingreso / Compra</Text>
              <TextInput style={styles.input} value={formEntryDate} onChangeText={setFormEntryDate} placeholder="AAAA-MM-DD" placeholderTextColor="#64748b" />

              <Text style={styles.inputLabel}>Fecha de Caducidad</Text>
              <TextInput style={styles.input} value={formExpiration} onChangeText={setFormExpiration} placeholder="AAAA-MM-DD o Sin caducidad" placeholderTextColor="#64748b" />

              <Text style={styles.inputLabel}>Riesgos y Advertencias SGA</Text>
              <TextInput style={styles.input} value={formRisks} onChangeText={setFormRisks} placeholder="Ej. H314 Provoca quemaduras..." placeholderTextColor="#64748b" />

              <Text style={styles.inputLabel}>Enlace HDS / FDS (URL)</Text>
              <TextInput style={styles.input} value={formExternalLinks} onChangeText={setFormExternalLinks} placeholder="https://..." placeholderTextColor="#64748b" />

              <Text style={styles.inputLabel}>Observaciones</Text>
              <TextInput style={[styles.input, { height: 75, textAlignVertical: 'top' }]} multiline value={formObservations} onChangeText={setFormObservations} />

              <Text style={styles.inputLabel}>Fotografía Principal (Cuadrada 1:1)</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginVertical: 6 }}>
                <TouchableOpacity style={[styles.photoPickerBtn, { flex: 1 }]} onPress={() => handleSelectPhoto(true)}>
                  <Text style={styles.photoPickerBtnText}>📷 Cámara</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.photoPickerBtn, { flex: 1, backgroundColor: '#334155' }]} onPress={() => handleSelectPhoto(false)}>
                  <Text style={styles.photoPickerBtnText}>🖼️ Galería</Text>
                </TouchableOpacity>
              </View>

              {formPhotoUri ? (
                <View style={{ alignItems: 'center', marginVertical: 6 }}>
                  <Image source={{ uri: formPhotoUri }} style={{ width: 100, height: 100, borderRadius: 12, borderWidth: 1, borderColor: '#10b981' }} />
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.submitLoanBtn, submitting && { opacity: 0.6 }]}
                disabled={submitting}
                onPress={handleQuickSubmit}
              >
                {submitting ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <Text style={styles.submitLoanBtnText}>💾 Registrar Sustancia</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  cardLoanBtn: {
    marginTop: 10,
    backgroundColor: '#d97706',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  cardLoanBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f59e0b',
  },
  closeBtnText: {
    color: '#94a3b8',
    fontSize: 20,
    fontWeight: 'bold',
  },
  substanceSummaryBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  substanceSummaryName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: 'bold',
  },
  substanceSummaryMeta: {
    color: '#38bdf8',
    fontSize: 12,
    marginTop: 2,
  },
  substanceSummaryStock: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 14,
  },
  unitBadge: {
    backgroundColor: '#334155',
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    fontWeight: 'bold',
    fontSize: 12,
    overflow: 'hidden',
  },
  userChip: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  userChipSelected: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  userChipText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  userChipTextSelected: {
    color: '#0f172a',
    fontWeight: 'bold',
  },
  submitLoanBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 18,
  },
  submitLoanBtnText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 15,
  },
});
