import React, { useState, useContext } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, Image, Platform, Switch } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import { apiService } from '../../api/services';
import apiClient, { getImageUrl } from '../../api/client';
import { AuthContext } from '../../context/AuthContext';

export default function ChemicalMaterialRegisterModal({ visible, onClose, onSuccess, prefillItem }) {
  const { serverUrl } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('📦 Lote / Kit');
  const [stock, setStock] = useState('1');
  const [imageUri, setImageUri] = useState(null);

  // SECTION B: Conditional Technical Details
  const [useTechDetails, setUseTechDetails] = useState(false);
  const [capacityVal, setCapacityVal] = useState('');
  const [capacityUnit, setCapacityUnit] = useState('mL');
  const [volumeVal, setVolumeVal] = useState('');
  const [volumeUnit, setVolumeUnit] = useState('mL');
  const [techSpec, setTechSpec] = useState('');

  // SECTION C: Kit Contents (Sub-objects)
  const [kitItems, setKitItems] = useState([]);

  // SECTION D: Control & Location
  const [location, setLocation] = useState('');
  const [inventoryNumber, setInventoryNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [noSep, setNoSep] = useState('');
  const [originalId, setOriginalId] = useState('');
  const [itemStatus, setItemStatus] = useState('Buenas Condiciones');
  const [responsible, setResponsible] = useState('');
  const [notes, setNotes] = useState('');

  const [splitIntoIndividualUnits, setSplitIntoIndividualUnits] = useState(false);
  const [isNewUnitMode, setIsNewUnitMode] = useState(false);
  const [activeStep, setActiveStep] = useState(1); // 1: Básicos, 2: Técnico, 3: Kit, 4: Ubicación
  const [loading, setLoading] = useState(false);
  const [createdItem, setCreatedItem] = useState(null);
  const [templates, setTemplates] = useState([]);

  const fetchTemplates = async () => {
    try {
      const res = await apiClient.get('/api/chemical-materials/templates');
      if (res.data && res.data.status === 'success' && Array.isArray(res.data.data)) {
        setTemplates(res.data.data);
      }
    } catch (e) {
      console.warn("Error fetching templates:", e);
    }
  };

  React.useEffect(() => {
    if (visible) {
      fetchTemplates();
      if (prefillItem) {
        setName(prefillItem.name || '');
        setCategory(prefillItem.category || '📦 Lote / Kit');
        setStock('1'); // Inicializar en 1 unidad nueva a ingresar por defecto
        setLocation(prefillItem.location || '');
        setResponsible(prefillItem.responsible || '');
        setItemStatus(prefillItem.status || prefillItem.condition || 'Buenas Condiciones');
        setInventoryNumber(prefillItem.inventory_number || '');
        setSerialNumber(prefillItem.serial_number || '');
        setNoSep(prefillItem.no_sep || '');
        setOriginalId(prefillItem.original_id ? String(prefillItem.original_id) : (prefillItem.id ? String(prefillItem.id) : ''));
        setNotes(prefillItem.observations || prefillItem.notes || '');
        setImageUri(prefillItem.image_path || prefillItem.photo || null);
        setTechSpec(prefillItem.technical_specifications || prefillItem.techSpec || '');
        if (prefillItem.capacity) {
          setUseTechDetails(true);
          const capMatch = String(prefillItem.capacity).match(/^([\d.]+)\s*(.*)$/);
          if (capMatch) {
            setCapacityVal(capMatch[1]);
            setCapacityUnit(capMatch[2] || 'mL');
          } else {
            setCapacityVal(String(prefillItem.capacity));
          }
        }
        const rawContents = prefillItem.contents || prefillItem.container_content || '';
        if (rawContents) {
          if (typeof rawContents === 'string' && (rawContents.trim().startsWith('[') || rawContents.trim().startsWith('{'))) {
            try {
              const parsed = JSON.parse(rawContents);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setKitItems(parsed.map((sub, i) => {
                  const pathVal = sub.imageUri || sub.image_path || sub.photo || null;
                  return {
                    id: String(i + 1),
                    name: sub.name || '',
                    quantity: sub.quantity || 1,
                    imageUri: pathVal,
                    image_path: pathVal,
                    localUri: sub.localUri || (pathVal && (pathVal.startsWith('file://') || pathVal.startsWith('content://')) ? pathVal : null)
                  };
                }));
              }
            } catch (e) {
              setKitItems([{ id: '1', name: String(rawContents).trim(), quantity: 1, imageUri: null, image_path: null }]);
            }
          } else if (typeof rawContents === 'string' && rawContents.trim() !== '') {
            setKitItems([{ id: '1', name: rawContents.trim(), quantity: 1, imageUri: null, image_path: null }]);
          } else if (Array.isArray(rawContents) && rawContents.length > 0) {
            setKitItems(rawContents.map((sub, i) => {
              const pathVal = sub.imageUri || sub.image_path || sub.photo || null;
              return {
                id: String(i + 1),
                name: sub.name || '',
                quantity: sub.quantity || 1,
                imageUri: pathVal,
                image_path: pathVal
              };
            }));
          }
        }
      }
    } else {
      setCreatedItem(null);
    }
  }, [visible, prefillItem]);

  const resetForm = () => {
    setName('');
    setCategory('📦 Lote / Kit');
    setStock('1');
    setImageUri(null);
    setUseTechDetails(false);
    setCapacityVal('');
    setCapacityUnit('mL');
    setVolumeVal('');
    setVolumeUnit('mL');
    setTechSpec('');
    setKitItems([
      { id: '1', name: 'Tubos de Ensayo', quantity: 5 },
      { id: '2', name: 'Vaso de Precipitados', quantity: 2 }
    ]);
    setLocation('');
    setInventoryNumber('');
    setSerialNumber('');
    setNoSep('');
    setOriginalId('');
    setItemStatus('Buenas Condiciones');
    setResponsible('');
    setNotes('');
    setCreatedItem(null);
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.6,
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo abrir la galería.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso Requerido', 'Se requiere acceso a la cámara para tomar fotografías.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.6,
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo abrir la cámara.');
    }
  };

  const handlePickSubItemPhoto = async (id) => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso Requerido', 'Se requiere acceso a la cámara para tomar fotografías.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.6,
      });
      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        // Subir inmediatamente la foto al servidor para asegurar persistencia
        try {
          const filename = photoUri.split('/').pop() || 'sub_photo.jpg';
          const formData = new FormData();
          formData.append('photo', {
            uri: photoUri,
            name: filename,
            type: 'image/jpeg'
          });
          const uploadRes = await apiService.uploadPhoto(formData);
          if (uploadRes && uploadRes.status === 'success') {
            const serverPath = uploadRes.image_path;
            setKitItems(prev => prev.map(item => item.id === id ? { ...item, imageUri: serverPath, image_path: serverPath, localUri: photoUri } : item));
            Alert.alert('✅ Fotografía Guardada', 'La imagen del sub-objeto se subió correctamente.');
            return;
          }
        } catch (err) {
          console.warn("Error subiendo foto instantánea de sub-objeto:", err);
        }
        setKitItems(prev => prev.map(item => item.id === id ? { ...item, imageUri: photoUri, localUri: photoUri } : item));
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo tomar la foto del sub-objeto.');
    }
  };

  const handleSaveKitItemsNow = async () => {
    if (!prefillItem?.id) return;
    try {
      const validContents = [];
      for (let i = 0; i < kitItems.length; i++) {
        const item = kitItems[i];
        let subPhotoPath = item.imageUri || item.image_path || item.photo || '';
        if (subPhotoPath && (subPhotoPath.startsWith('file://') || subPhotoPath.startsWith('content://'))) {
          try {
            const filename = subPhotoPath.split('/').pop() || 'sub_photo.jpg';
            const formData = new FormData();
            formData.append('photo', {
              uri: subPhotoPath,
              name: filename,
              type: 'image/jpeg'
            });
            const uploadRes = await apiService.uploadPhoto(formData);
            if (uploadRes && uploadRes.status === 'success') {
              subPhotoPath = uploadRes.image_path;
            }
          } catch (e) {
            console.warn("Error subiendo foto de sub-objeto:", e);
          }
        }

        const rawName = (item.name || '').trim();
        const displayName = rawName || (subPhotoPath ? `Pieza con Foto #${i + 1}` : `Sub-objeto #${i + 1}`);

        validContents.push({
          name: displayName,
          quantity: item.quantity || 1,
          imageUri: subPhotoPath,
          image_path: subPhotoPath,
          localUri: item.localUri || (subPhotoPath && (subPhotoPath.startsWith('file://') || subPhotoPath.startsWith('content://')) ? subPhotoPath : null)
        });
      }

      const payload = {
        contents: validContents.length > 0 ? JSON.stringify(validContents) : ''
      };
      const res = await apiClient.put(`/api/chemical-materials/${prefillItem.id}`, payload);
      if (res.data && res.data.status === 'success') {
        Alert.alert('✅ Sub-objetos Guardados', 'Los elementos del kit se guardaron correctamente en la base de datos.');
        onSuccess && onSuccess();
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar los sub-objetos: ' + e.message);
    }
  };

  const addKitItem = () => {
    const newItem = {
      id: Date.now().toString(),
      name: '',
      quantity: 1,
      imageUri: null
    };
    setKitItems([...kitItems, newItem]);
  };

  const updateKitItemName = (id, newName) => {
    setKitItems(kitItems.map(item => item.id === id ? { ...item, name: newName } : item));
  };

  const updateKitItemQty = (id, delta) => {
    setKitItems(kitItems.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeKitItem = (id) => {
    setKitItems(kitItems.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Campo Obligatorio', 'Por favor ingresa el nombre del lote o material.');
      return;
    }

    setLoading(true);
    try {
      let serverImagePath = '';

      if (imageUri) {
        if (imageUri.startsWith('http://') || imageUri.startsWith('https://') || imageUri.startsWith('/static/')) {
          serverImagePath = imageUri;
        } else {
          const filename = imageUri.split('/').pop() || 'photo.jpg';
          const formData = new FormData();
          formData.append('photo', {
            uri: imageUri,
            name: filename,
            type: 'image/jpeg'
          });
          const uploadRes = await apiService.uploadPhoto(formData);
          if (uploadRes && uploadRes.status === 'success') {
            serverImagePath = uploadRes.image_path;
          }
        }
      }

      // Technical capacity string assembly
      let capacityStr = '';
      if (useTechDetails) {
        const parts = [];
        if (capacityVal.trim()) parts.push(`${capacityVal.trim()} ${capacityUnit}`);
        if (volumeVal.trim()) parts.push(`Vol: ${volumeVal.trim()} ${volumeUnit}`);
        if (techSpec.trim()) parts.push(techSpec.trim());
        capacityStr = parts.join(' / ');
      }

      // Kit items filtering & sub-photo upload
      const validContents = [];
      for (let i = 0; i < kitItems.length; i++) {
        const kItem = kitItems[i];
        let subPhotoPath = kItem.imageUri || kItem.image_path || kItem.photo || '';
        if (subPhotoPath && (subPhotoPath.startsWith('file://') || subPhotoPath.startsWith('content://'))) {
          try {
            const filename = subPhotoPath.split('/').pop() || 'sub_photo.jpg';
            const formData = new FormData();
            formData.append('photo', {
              uri: subPhotoPath,
              name: filename,
              type: 'image/jpeg'
            });
            const uploadRes = await apiService.uploadPhoto(formData);
            if (uploadRes && uploadRes.status === 'success') {
              subPhotoPath = uploadRes.image_path;
            }
          } catch (e) {
            console.warn("Error subiendo foto de sub-objeto:", e);
          }
        }

        if (subPhotoPath && (subPhotoPath.startsWith('file://') || subPhotoPath.startsWith('content://'))) {
          subPhotoPath = null;
        }

        const rawName = (kItem.name || '').trim();
        const displayName = rawName || (subPhotoPath ? `Pieza con Foto #${i + 1}` : `Sub-objeto #${i + 1}`);

        validContents.push({
          name: displayName,
          quantity: kItem.quantity || 1,
          imageUri: subPhotoPath,
          image_path: subPhotoPath,
          localUri: kItem.localUri || null
        });
      }

      const incomingQty = parseInt(stock, 10) || 0;
      let finalQuantity = incomingQty > 0 ? incomingQty : 1;

      if (prefillItem && prefillItem.id) {
        const currentQty = parseInt(prefillItem.quantity || prefillItem.stock || 1, 10);
        finalQuantity = currentQty + incomingQty;
      }

      const payload = {
        name: name.trim(),
        category: category.trim(),
        capacity: capacityStr,
        quantity: finalQuantity,
        location: location.trim(),
        inventory_number: inventoryNumber.trim(),
        serial_number: serialNumber.trim(),
        no_sep: noSep.trim(),
        original_id: originalId.trim(),
        status: itemStatus.trim(),
        responsible: responsible.trim(),
        observations: notes.trim(),
        image_path: serverImagePath,
        contents: validContents.length > 0 ? JSON.stringify(validContents) : ''
      };

      if (prefillItem && prefillItem.id && !isNewUnitMode) {
        // MODO EDICIÓN DE UN ÍTEM ESPECÍFICO (PUT)
        const res = await apiClient.put(`/api/chemical-materials/${prefillItem.id}`, payload);
        if (res.data && res.data.status === 'success') {
          Alert.alert('✅ Stock Actualizado', `Se ingresaron +${incomingQty} unidades. Nuevo stock total: ${finalQuantity} piezas.`);
          onSuccess && onSuccess();
          resetForm();
          onClose();
        } else {
          Alert.alert('Error', res.data?.message || 'No se pudo actualizar el material.');
        }
      } else {
        // MODO CREACIÓN (POST): REGISTRO NUEVO O REGISTRO DE NUEVAS UNIDADES FÍSICAS
        if ((splitIntoIndividualUnits || incomingQty > 1) && incomingQty > 1) {
          let successCount = 0;
          for (let i = 1; i <= Math.min(incomingQty, 50); i++) {
            const unitPayload = {
              ...payload,
              quantity: 1,
              inventory_number: inventoryNumber.trim() ? `${inventoryNumber.trim()}-${i}` : '',
              serial_number: serialNumber.trim() ? `${serialNumber.trim()}-${i}` : '',
              no_sep: noSep.trim() ? `${noSep.trim()}-${i}` : ''
            };
            const unitRes = await apiService.createChemicalMaterial(unitPayload);
            if (unitRes.status === 'success') successCount++;
          }
          Alert.alert('✅ Éxito', `Se registraron ${successCount} unidades físicas individuales de "${name.trim()}".`);
          onSuccess && onSuccess();
          resetForm();
          onClose();
        } else {
          const res = await apiService.createChemicalMaterial(payload);
          if (res.status === 'success') {
            const itemData = res.data || {};
            onSuccess && onSuccess();
            if (itemData.qr_path || itemData.qr_content) {
              setCreatedItem(itemData);
            } else {
              Alert.alert('Éxito', '📦 Lote / Kit registrado correctamente.');
              resetForm();
              onClose();
            }
          } else {
            Alert.alert('Error', res.message || 'No se pudo registrar el lote o material.');
          }
        }
      }
    } catch (err) {
      Alert.alert('Error de conexión', err.message);
    } finally {
      setLoading(false);
    }
  };

  const closeWithReset = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={closeWithReset}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.headerIcon}>📦</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Añadir / Editar Material o Kit</Text>
                <Text style={styles.subtitle}>Paso {activeStep} de 4 — {activeStep === 1 ? 'Datos Básicos' : activeStep === 2 ? 'Datos Técnicos' : activeStep === 3 ? 'Objetos del Kit' : 'Ubicación y Serie'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={closeWithReset} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* STEP TABS NAVEGACIÓN PRINCIPAL */}
          <View style={styles.stepTabsRow}>
            {[
              { id: 1, label: '1. Básicos', icon: '📌' },
              { id: 2, label: '2. Técnico', icon: '⚙️' },
              { id: 3, label: '3. Kit', icon: '📦' },
              { id: 4, label: '4. Ubicación', icon: '📍' },
            ].map((tab) => {
              const isActive = activeStep === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.stepTabItem, isActive && styles.stepTabItemActive]}
                  onPress={() => {
                    if (tab.id === 2) setUseTechDetails(true);
                    setActiveStep(tab.id);
                  }}
                >
                  <Text style={[styles.stepTabIcon, isActive && styles.stepTabIconActive]}>{tab.icon}</Text>
                  <Text style={[styles.stepTabText, isActive && styles.stepTabTextActive]} numberOfLines={1}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* FORM BODY SCROLLVIEW */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            
            {/* PASO 1: BÁSICOS */}
            {activeStep === 1 ? (
              <>
                {/* TEMPLATE AUTOCOMPLETE CHIPS */}
                {templates.length > 0 ? (
                  <View style={{ marginBottom: 12, backgroundColor: '#0f172a', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#1e293b' }}>
                    <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: '800', marginBottom: 6 }}>
                      ⚡ Autocompletar con producto existente ({templates.length}):
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {templates.map((tpl) => (
                        <TouchableOpacity
                          key={tpl.id}
                          style={{ backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#0284c7', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                          onPress={() => {
                            setName(tpl.name || '');
                            if (tpl.category) setCategory(tpl.category);
                            if (tpl.capacity) setCapacityVal(tpl.capacity);
                            if (tpl.location) setLocation(tpl.location);
                            if (tpl.status) setItemStatus(tpl.status);
                            if (tpl.observations) setNotes(tpl.observations);
                            if (tpl.image_path) {
                              const fullUrl = tpl.image_path.startsWith('http') ? tpl.image_path : `${apiClient.defaults.baseURL}${tpl.image_path}`;
                              setImageUri(fullUrl);
                            }
                            Alert.alert('Plantilla Cargada ⚡', `Se autocompletó con los datos de "${tpl.name}". Ingresa únicamente el nuevo No. SEP / Inventario.`);
                          }}
                        >
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{tpl.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}

                {/* SECTION A: MASTER OBJECT PHOTO & INFO */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>PASO 1: Foto e Información Principal</Text>
                  </View>

              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                {imageUri ? (
                  <View style={{ width: '100%', height: 160, borderRadius: 16, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: '#0d9488' }}>
                    <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    <TouchableOpacity
                      style={{ position: 'absolute', top: 8, right: 8, backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}
                      onPress={() => setImageUri(null)}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>✕ Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Text style={{ fontSize: 24, marginBottom: 2 }}>📷</Text>
                    <Text style={{ fontSize: 12, color: '#0d9488', fontWeight: '700' }}>Foto General del Lote o Caja</Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                  <TouchableOpacity style={styles.primaryTealBtn} onPress={handleTakePhoto}>
                    <Text style={styles.primaryTealBtnText}>📷 Tomar Foto General del Lote</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={handlePickImage}>
                    <Text style={styles.secondaryBtnText}>🖼️ Galería</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Nombre / Descripción del Lote o Material *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ej. Caja de Experimentación Escolar / Microscopio Binocular"
                  placeholderTextColor="#94a3b8"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* CATEGORÍA EN FILA COMPLETA */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Categoría del Material / Lote</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4, marginBottom: 8 }}>
                  {[
                    '🔬 Equipo',
                    '💻 Cómputo',
                    '🧪 Cristalería',
                    '📦 Lote / Kit',
                    '🧰 Herramientas',
                    '⚖️ Medición',
                    '🔥 Calentamiento',
                    '🛡️ Seguridad',
                    '🧬 Didáctico',
                    '🧴 Consumibles',
                    '📐 Instrumentos'
                  ].map((catName) => {
                    const isSelected = category.toLowerCase().includes((catName.split(' ')[1] || catName).toLowerCase());
                    return (
                      <TouchableOpacity
                        key={catName}
                        style={{
                          backgroundColor: isSelected ? '#0d9488' : '#f1f5f9',
                          borderWidth: 1.5,
                          borderColor: isSelected ? '#0f766e' : '#cbd5e1',
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 10
                        }}
                        onPress={() => setCategory(catName)}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: isSelected ? '#ffffff' : '#334155' }}>
                          {catName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TextInput
                  style={styles.input}
                  placeholder="ej. 📦 Lote / Kit"
                  placeholderTextColor="#94a3b8"
                  value={category}
                  onChangeText={setCategory}
                />
              </View>

              {/* CANTIDAD A INGRESAR / AÑADIR DE MÁS */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Cantidad de Unidades a Ingresar / Añadir de Más *</Text>
                <Text style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>
                  (Escribe el número de unidades físicas nuevas que deseas incorporar a este registro).
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#fee2e2',
                      borderWidth: 1.5,
                      borderColor: '#fca5a5',
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                    onPress={() => {
                      const val = Math.max(1, (parseInt(stock, 10) || 1) - 1);
                      setStock(String(val));
                    }}
                  >
                    <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#ef4444' }}>-</Text>
                  </TouchableOpacity>

                  <TextInput
                    style={[styles.input, { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 'bold', borderColor: '#0d9488' }]}
                    placeholder="1"
                    keyboardType="numeric"
                    placeholderTextColor="#94a3b8"
                    value={stock}
                    onChangeText={setStock}
                  />

                  <TouchableOpacity
                    style={{
                      backgroundColor: '#ccfbf1',
                      borderWidth: 1.5,
                      borderColor: '#5eead4',
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                    onPress={() => {
                      const val = (parseInt(stock, 10) || 0) + 1;
                      setStock(String(val));
                    }}
                  >
                    <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#0f766e' }}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* NOTA DE EXISTENCIA Y UNIDADES A INCORPORAR */}
                {prefillItem?.id ? (
                  <View style={{ backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#86efac', padding: 10, borderRadius: 12, marginTop: 8 }}>
                    <Text style={{ fontSize: 11, color: '#166534', fontWeight: 'bold' }}>
                      📦 En existencia actualmente: {prefillItem.quantity || prefillItem.stock || 1} unidades
                    </Text>
                    <Text style={{ fontSize: 11, color: '#047857', marginTop: 2 }}>
                      ➕ Unidades nuevas a ingresar ahora: {stock || 1}
                    </Text>
                  </View>
                ) : null}

                {/* SI ESTÁ EDITANDO UN ÍTEM EXISTENTE: OPCIÓN PARA AÑADIR OTRA UNIDAD FÍSICA A ESTE PRODUCTO */}
                {prefillItem?.id ? (
                  <View style={{ backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#86efac', padding: 12, borderRadius: 14, marginTop: 10 }}>
                    <Text style={{ fontWeight: 'bold', color: '#166534', fontSize: 12 }}>
                      📌 Editando unidad física (ID #{prefillItem.id})
                    </Text>
                    <Text style={{ fontSize: 10, color: '#15803d', marginTop: 2, marginBottom: 8 }}>
                      ¿Deseas agregar una NUEVA unidad física a este mismo producto (con su propio No. SEP o Serie)?
                    </Text>
                    <TouchableOpacity
                      style={{ backgroundColor: '#10b981', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center' }}
                      onPress={() => {
                        setNoSep('');
                        setSerialNumber('');
                        setInventoryNumber('');
                        setOriginalId('');
                        setIsNewUnitMode(true);
                        Alert.alert('📋 Modo Nueva Unidad', `Los datos del producto "${name}" se mantuvieron. Ingresa el nuevo No. SEP / Serie para la nueva unidad.`);
                      }}
                    >
                      <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 11 }}>
                        ➕ Registrar Nueva Unidad Física (Nuevo SEP)
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* SI ES UN REGISTRO NUEVO CON STOCK > 1: OPCIÓN PARA DESGLOSAR EN UNIDADES INDIVIDUALES */}
                {parseInt(stock, 10) > 1 && !prefillItem?.id ? (
                  <View style={{ backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#86efac', padding: 12, borderRadius: 12, marginTop: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontWeight: 'bold', color: '#166534', fontSize: 12 }}>
                          📦 Registrar como {stock} unidades físicas individuales
                        </Text>
                        <Text style={{ fontSize: 10, color: '#15803d', marginTop: 2 }}>
                          Crea {stock} registros independientes con su propio QR para asignar No. SEP o Serie único a cada una.
                        </Text>
                      </View>
                      <Switch
                        trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                        thumbColor={splitIntoIndividualUnits ? '#ffffff' : '#f8fafc'}
                        onValueChange={setSplitIntoIndividualUnits}
                        value={splitIntoIndividualUnits}
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          </>
        ) : null}

            {/* PASO 2: TÉCNICO */}
            {activeStep === 2 ? (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>PASO 2: Especificaciones Técnicas</Text>
                </View>

                {/* BOTÓN / BANNER DE ACTIVACIÓN DE ALTA VISIBILIDAD */}
                <TouchableOpacity
                  style={{
                    backgroundColor: useTechDetails ? '#0d9488' : '#f1f5f9',
                    borderColor: useTechDetails ? '#0f766e' : '#cbd5e1',
                    borderWidth: 2,
                    borderRadius: 14,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justify: 'space-between',
                    marginVertical: 10
                  }}
                  activeOpacity={0.8}
                  onPress={() => setUseTechDetails(!useTechDetails)}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ color: useTechDetails ? '#ffffff' : '#0f172a', fontWeight: 'bold', fontSize: 13 }}>
                      {useTechDetails ? '✅ Datos Técnicos ACTIVADOS' : '⚡ ACTIVAR Datos Técnicos'}
                    </Text>
                    <Text style={{ color: useTechDetails ? '#ccfbf1' : '#64748b', fontSize: 11, marginTop: 2 }}>
                      {useTechDetails ? 'Campos habilitados. Toca para desactivar.' : 'Toca este botón para ingresar Capacidad, Volumen y Especificaciones.'}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: useTechDetails ? '#ffffff' : '#0d9488',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 10
                  }}>
                    <Text style={{ color: useTechDetails ? '#0d9488' : '#ffffff', fontWeight: 'bold', fontSize: 11 }}>
                      {useTechDetails ? 'ACTIVADO ✓' : 'ACTIVAR ⚡'}
                    </Text>
                  </View>
                </TouchableOpacity>

              {useTechDetails ? (
                <View style={{ marginTop: 8, gap: 14 }}>
                  {/* CAPACIDAD Y UNIDADES DESPLEGABLES */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Capacidad</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="ej. 250"
                      placeholderTextColor="#94a3b8"
                      value={capacityVal}
                      onChangeText={setCapacityVal}
                    />
                    <Text style={[styles.label, { marginTop: 6, fontSize: 10, color: '#64748b' }]}>Unidad Seleccionada:</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                      {['mL', 'L', 'g', 'kg', 'mg', 'cm³', 'piezas', 'kits'].map((u) => {
                        const active = capacityUnit === u;
                        return (
                          <TouchableOpacity
                            key={u}
                            style={{
                              backgroundColor: active ? '#0d9488' : '#f1f5f9',
                              borderColor: active ? '#0f766e' : '#cbd5e1',
                              borderWidth: 1.5,
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 8
                            }}
                            onPress={() => setCapacityUnit(u)}
                          >
                            <Text style={{ color: active ? '#fff' : '#334155', fontWeight: 'bold', fontSize: 11 }}>{u}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* VOLUMEN Y UNIDADES DESPLEGABLES */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Volumen</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="ej. 500"
                      placeholderTextColor="#94a3b8"
                      value={volumeVal}
                      onChangeText={setVolumeVal}
                    />
                    <Text style={[styles.label, { marginTop: 6, fontSize: 10, color: '#64748b' }]}>Unidad Seleccionada:</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                      {['mL', 'L', 'cm³', 'm³', 'fl oz'].map((u) => {
                        const active = volumeUnit === u;
                        return (
                          <TouchableOpacity
                            key={u}
                            style={{
                              backgroundColor: active ? '#0d9488' : '#f1f5f9',
                              borderColor: active ? '#0f766e' : '#cbd5e1',
                              borderWidth: 1.5,
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 8
                            }}
                            onPress={() => setVolumeUnit(u)}
                          >
                            <Text style={{ color: active ? '#fff' : '#334155', fontWeight: 'bold', fontSize: 11 }}>{u}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Especificación Técnica Adicional</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="ej. Vidrio Borosilicato 3.3 / Lente Acromático"
                      placeholderTextColor="#94a3b8"
                      value={techSpec}
                      onChangeText={setTechSpec}
                    />
                  </View>
                </View>
              ) : (
                <Text style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginTop: 4 }}>
                  (Sección desactivada. Activa el interruptor verde arriba para especificar capacidad o volumen).
                </Text>
              )}
            </View>
            ) : null}

            {/* PASO 3: KIT / CONTENIDO */}
            {activeStep === 3 ? (
              <View style={styles.sectionCard}>
                <View style={{ borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 8, marginBottom: 12 }}>
                  <Text style={styles.sectionTitle}>PASO 3: Sub-objetos del Kit / Lote</Text>
                  <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Elementos y componentes individuales incluidos en este paquete
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: '#0d9488',
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6
                    }}
                    onPress={addKitItem}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>➕ Añadir Objeto al Kit</Text>
                  </TouchableOpacity>

                  {prefillItem?.id ? (
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#10b981',
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderRadius: 12,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 4
                      }}
                      onPress={handleSaveKitItemsNow}
                    >
                      <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>💾 Guardar Kit Ahora</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={{ gap: 12 }}>
                  {kitItems.map((item, idx) => {
                    const subPhotoUri = item.localUri || getImageUrl(item.imageUri || item.image_path, serverUrl);
                    return (
                      <View key={item.id} style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', padding: 12, borderRadius: 14, gap: 10 }}>
                        {/* FILA 1: FOTO + NOMBRE + ELIMINAR */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <TouchableOpacity
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 10,
                              backgroundColor: '#ffffff',
                              borderWidth: 1,
                              borderColor: '#0d9488',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden'
                            }}
                            onPress={() => handlePickSubItemPhoto(item.id)}
                          >
                            {subPhotoUri ? (
                              <Image source={{ uri: subPhotoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            ) : (
                              <Text style={{ fontSize: 16 }}>📷</Text>
                            )}
                          </TouchableOpacity>

                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', marginBottom: 2 }}>
                              Sub-objeto #{idx + 1}
                            </Text>
                            <TextInput
                              style={[styles.input, { height: 38, paddingVertical: 4 }]}
                              placeholder="ej. Tubos de Ensayo 15mL"
                              placeholderTextColor="#94a3b8"
                              value={item.name}
                              onChangeText={(val) => updateKitItemName(item.id, val)}
                            />
                          </View>

                          <TouchableOpacity 
                            onPress={() => removeKitItem(item.id)} 
                            style={{ backgroundColor: '#fee2e2', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#fca5a5' }}
                          >
                            <Text style={{ fontSize: 14 }}>🗑️</Text>
                          </TouchableOpacity>
                        </View>

                        {/* FILA 2: CONTADOR DE CANTIDAD */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>Cantidad en este kit:</Text>
                          <View style={styles.stepperContainer}>
                            <TouchableOpacity onPress={() => updateKitItemQty(item.id, -1)} style={styles.stepperBtn}>
                              <Text style={styles.stepperBtnText}> - </Text>
                            </TouchableOpacity>
                            <Text style={styles.stepperVal}>{item.quantity}</Text>
                            <TouchableOpacity onPress={() => updateKitItemQty(item.id, 1)} style={styles.stepperBtn}>
                              <Text style={styles.stepperBtnText}> + </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}

                  {kitItems.length === 0 ? (
                    <Text style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 }}>
                      No hay sub-objetos agregados. Presiona "➕ Añadir Nuevo Objeto al Kit" arriba.
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* PASO 4: UBICACIÓN Y CONTROL */}
            {activeStep === 4 ? (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>PASO 4: Control y Ubicación Física</Text>
                </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Ubicación Física</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ej. Estante B-4 / LABORATORIO DE CIENCIAS BÁSICAS"
                  placeholderTextColor="#94a3b8"
                  value={location}
                  onChangeText={setLocation}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>No. Inventario / QR</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="115130001I51101..."
                    placeholderTextColor="#94a3b8"
                    value={inventoryNumber}
                    onChangeText={setInventoryNumber}
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.label}>No. Serie</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1P1822369599"
                    placeholderTextColor="#94a3b8"
                    value={serialNumber}
                    onChangeText={setSerialNumber}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>No. SEP (Etiqueta Oficial)</Text>
                  <TextInput
                    style={[styles.input, { borderColor: '#10b981', color: '#047857' }]}
                    placeholder="ej. 12900397"
                    placeholderTextColor="#94a3b8"
                    value={noSep}
                    onChangeText={setNoSep}
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.label}>ID Excel (CB)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ej. 154"
                    placeholderTextColor="#94a3b8"
                    value={originalId}
                    onChangeText={setOriginalId}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Estado / Condición Físico</Text>
                <View style={styles.chipsRow}>
                  {['Buenas Condiciones', 'Nuevo', 'Excelente', 'Bueno', 'Regular', 'Dañado', 'Roto / Incompleto'].map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.chip,
                        itemStatus === st && styles.chipActive,
                        st === 'Dañado' && itemStatus === st && { backgroundColor: '#ea580c', borderColor: '#c2410c' },
                        st.includes('Roto') && itemStatus === st && { backgroundColor: '#dc2626', borderColor: '#b91c1c' }
                      ]}
                      onPress={() => setItemStatus(st)}
                    >
                      <Text style={[styles.chipText, itemStatus === st && styles.chipTextActive]}>
                        {st === 'Dañado' ? '⚠️ Dañado' : (st.includes('Roto') ? '🚫 Roto' : st)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Observaciones</Text>
                <TextInput
                  style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                  multiline
                  placeholder="Detalles sobre entregas u observaciones..."
                  placeholderTextColor="#94a3b8"
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>
            </View>
            ) : null}
          </ScrollView>

          {/* FOOTER ACTIONS WITH ACCESSIBLE STEP CONTROLS */}
          <View style={styles.footer}>
            {activeStep > 1 ? (
              <TouchableOpacity style={styles.prevBtn} onPress={() => setActiveStep(activeStep - 1)}>
                <Text style={styles.prevBtnText}>⬅️ Ant.</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.cancelBtn} onPress={closeWithReset}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            )}

            {activeStep < 4 ? (
              <TouchableOpacity style={styles.nextBtn} onPress={() => setActiveStep(activeStep + 1)}>
                <Text style={styles.nextBtnText}>Sig. ➔</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>💾 Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* QR SUCCESS MODAL */}
      <Modal visible={!!createdItem} animationType="fade" transparent onRequestClose={closeWithReset}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#1e293b', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center', borderWidth: 1, borderColor: '#334155' }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🎉</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 4 }}>¡Registro Exitoso!</Text>
            <Text style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 16 }}>{createdItem?.name}</Text>

            {createdItem?.qr_path ? (
              <View style={{ backgroundColor: '#fff', padding: 12, borderRadius: 16, marginBottom: 16 }}>
                <Image source={{ uri: createdItem.qr_path }} style={{ width: 180, height: 180 }} resizeMode="contain" />
              </View>
            ) : (
              <View style={{ backgroundColor: '#0f172a', padding: 16, borderRadius: 16, marginBottom: 16, width: '100%' }}>
                <Text style={{ color: '#0d9488', fontSize: 12, fontFamily: 'monospace', textAlign: 'center' }}>
                  {createdItem?.qr_content || `LAB-CHEMICAL_MATERIALS-${createdItem?.id}`}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={{ backgroundColor: '#0d9488', paddingVertical: 11, paddingHorizontal: 20, borderRadius: 14, width: '100%', alignItems: 'center', marginBottom: 10 }}
              onPress={() => {
                resetForm();
                setCreatedItem(null);
                setActiveStep(1);
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>➕ Registrar Otro Material Nuevo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ backgroundColor: '#0284c7', paddingVertical: 11, paddingHorizontal: 20, borderRadius: 14, width: '100%', alignItems: 'center', marginBottom: 10 }}
              onPress={async () => {
                try {
                  const qrImageUrl = createdItem?.qr_path
                    ? (createdItem.qr_path.startsWith('http') ? createdItem.qr_path : `${apiClient.defaults.baseURL}${createdItem.qr_path}`)
                    : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(createdItem?.qr_content || `LAB-CHEMICAL_MATERIALS-${createdItem?.id}`)}`;

                  const htmlContent = `
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta charset="utf-8">
                        <style>
                          body { font-family: Arial, sans-serif; text-align: center; margin: 0; padding: 15px; }
                          .label-card { border: 2px solid #0f172a; border-radius: 12px; padding: 15px; max-width: 280px; margin: 0 auto; }
                          .header { font-size: 11px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px; }
                          .title { font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 4px; }
                          .subtitle { font-size: 10px; color: #64748b; margin-bottom: 10px; }
                          .qr-img { width: 150px; height: 150px; object-fit: contain; margin: 5px auto; display: block; }
                          .code-badge { font-family: monospace; font-size: 10px; font-weight: bold; background-color: #f1f5f9; color: #0f172a; padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 6px; display: inline-block; word-break: break-all; }
                        </style>
                      </head>
                      <body>
                        <div class="label-card">
                          <div class="header">TECNM - MILPA ALTA II</div>
                          <div class="title">${createdItem?.name || 'Material Químico'}</div>
                          <div class="subtitle">Categoría: ${createdItem?.category || 'Material Químico'} | Ubicación: ${createdItem?.location || 'Laboratorio'}</div>
                          <img class="qr-img" src="${qrImageUrl}" />
                          <div class="code-badge">${createdItem?.qr_content || `LAB-CHEMICAL_MATERIALS-${createdItem?.id}`}</div>
                        </div>
                      </body>
                    </html>
                  `;
                  await Print.printAsync({ html: htmlContent });
                } catch (err) {
                  Alert.alert('Error al Imprimir', 'No se pudo generar la etiqueta QR: ' + err.message);
                }
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>🖨️ Imprimir Etiqueta QR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ backgroundColor: '#10b981', paddingVertical: 11, paddingHorizontal: 20, borderRadius: 14, width: '100%', alignItems: 'center', marginBottom: 10 }}
              onPress={() => {
                const prevName = createdItem?.name || name;
                const prevCat = category;
                const prevLoc = location;
                const prevImg = imageUri;
                resetForm();
                setName(prevName);
                setCategory(prevCat);
                setLocation(prevLoc);
                setImageUri(prevImg);
                setCreatedItem(null);
                Alert.alert('Registrar Nueva Unidad 📋', `Los datos de "${prevName}" se mantuvieron cargados. Escanea o escribe el nuevo No. SEP / Inventario.`);
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>📋 Registrar otra unidad (Nuevo No. SEP)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ backgroundColor: '#475569', paddingVertical: 11, paddingHorizontal: 20, borderRadius: 14, width: '100%', alignItems: 'center' }}
              onPress={() => {
                resetForm();
                onClose();
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#0f766e',
    backgroundColor: '#0d9488',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 11,
    color: '#ccfbf1',
    marginTop: 1,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#0f766e',
    borderRadius: 12,
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  body: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
    marginBottom: 12,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0d9488',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  photoPlaceholder: {
    width: '100%',
    height: 100,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ccfbf1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    marginBottom: 8,
  },
  primaryTealBtn: {
    flex: 1,
    backgroundColor: '#0d9488',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryTealBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#475569',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  fieldGroup: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  smallTealBtn: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  smallTealBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  kitItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 8,
    borderRadius: 12,
  },
  kitItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ccfbf1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    overflow: 'hidden',
  },
  stepperBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f1f5f9',
  },
  stepperBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
  },
  stepperVal: {
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 13,
  },
  submitBtn: {
    flex: 2,
    backgroundColor: '#0d9488',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  stepTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
  },
  stepTabItem: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
  },
  stepTabItemActive: {
    backgroundColor: '#0d9488',
  },
  stepTabIcon: {
    fontSize: 12,
    marginBottom: 2,
  },
  stepTabIconActive: {
    fontSize: 13,
  },
  stepTabText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  stepTabTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  prevBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  prevBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12.5,
  },
  nextBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#0284c7',
    alignItems: 'center',
  },
  nextBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12.5,
  },
});
