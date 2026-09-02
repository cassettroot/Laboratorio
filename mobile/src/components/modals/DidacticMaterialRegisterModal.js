import React, { useState, useEffect, useContext } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Switch,
  Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../api/services';
import apiClient, { getImageUrl } from '../../api/client';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import QRBatchPrintModal from './QRBatchPrintModal';

const { width } = Dimensions.get('window');

const DIDACTIC_TEMPLATES = [
  {
    name: 'Kit de Geometría Molecular (100 piezas)',
    subject: 'Química Orgánica',
    materialType: 'Kit Didáctico',
    contents: '50 esferas atómicas (Carbono, Hidrógeno, Oxígeno, Nitrógeno), 50 enlaces flexibles',
    capacityVal: '100',
    capacityUnit: 'piezas',
    condition: 'Excelente'
  },
  {
    name: 'Modelo Tridimensional de ADN',
    subject: 'Biología / Bioquímica',
    materialType: 'Modelo Tridimensional',
    contents: 'Bases nitrogenadas A-T-C-G, esqueleto desoxirribosa-fosfato, soporte cromado',
    capacityVal: '1',
    capacityUnit: 'modelo',
    condition: 'Excelente'
  },
  {
    name: 'Sensor de pH Digital Vernier / Pasco',
    subject: 'Física y Química',
    materialType: 'Sensor / Transductor',
    contents: 'Electrodo de vidrio, cable USB-C de conexión, frasco amortiguador pH 7.0',
    capacityVal: '0-14',
    capacityUnit: 'pH',
    condition: 'Excelente'
  },
  {
    name: 'Kit de Circuitos Eléctricos y Magnetismo',
    subject: 'Física II',
    materialType: 'Kit Didáctico',
    contents: 'Placa de pruebas, cables puente, multímetro digital, bobinas de cobre, imanes de neodimio',
    capacityVal: '25',
    capacityUnit: 'componentes',
    condition: 'Excelente'
  },
  {
    name: 'Sensor de Temperatura de Inmersión',
    subject: 'Termodinámica',
    materialType: 'Sensor / Transductor',
    contents: 'Sonda de acero inoxidable, cable blindado, módulo de interfaz',
    capacityVal: '-40 a 125',
    capacityUnit: '°C',
    condition: 'Excelente'
  },
  {
    name: 'Balanza Analítica Didáctica de Precisión',
    subject: 'Química Analítica',
    materialType: 'Equipo Didáctico',
    contents: 'Balanza digital, plato de acero inox, pesas de calibración 100g, cubierta protectora',
    capacityVal: '0-220',
    capacityUnit: 'g (0.001g)',
    condition: 'Excelente'
  }
];

export default function DidacticMaterialRegisterModal({ visible, onClose, onSuccess, prefillItem }) {
  const { serverUrl } = useContext(AuthContext) || {};
  const { theme } = useContext(ThemeContext);
  const isDark = theme?.isDark !== false;

  const [activeStep, setActiveStep] = useState(1); // 1: Básicos, 2: Técnico, 3: Kit/Piezas, 4: Ubicación, 5: Foto
  const [loading, setLoading] = useState(false);

  // Sección 1: Datos Básicos
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('Química');
  const [materialType, setMaterialType] = useState('Kit Didáctico');

  // Sección 2: Detalles Técnicos
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [capacityVal, setCapacityVal] = useState('');
  const [capacityUnit, setCapacityUnit] = useState('piezas');
  const [techSpec, setTechSpec] = useState('');

  // Sección 3: Contenido del Kit / Componentes
  const [contents, setContents] = useState('');
  const [kitItems, setKitItems] = useState([
    { id: '1', name: 'Pieza Principal', quantity: 1 }
  ]);

  // Sección 4: Ubicación e Inventario
  const [location, setLocation] = useState('');
  const [stock, setStock] = useState('1');
  const [inventoryNumber, setInventoryNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [condition, setCondition] = useState('Excelente');
  const [responsible, setResponsible] = useState('');
  const [notes, setNotes] = useState('');

  // Sección 5: Foto
  const [imageUri, setImageUri] = useState(null);

  // QR Print Modal State
  const [createdItem, setCreatedItem] = useState(null);
  const [showQRBatchPrint, setShowQRBatchPrint] = useState(false);

  // Inicializar o limpiar el formulario cuando cambia la visibilidad o prefillItem
  useEffect(() => {
    if (visible) {
      setActiveStep(1);
      if (prefillItem) {
        setName(prefillItem.name || '');
        setSubject(prefillItem.subject || prefillItem.category || 'Química');
        setMaterialType(prefillItem.type || prefillItem.materialType || 'Kit Didáctico');
        setBrand(prefillItem.brand || '');
        setModel(prefillItem.model || '');
        setTechSpec(prefillItem.technical_specifications || prefillItem.techSpec || '');
        
        if (prefillItem.capacity) {
          const capMatch = String(prefillItem.capacity).match(/^([\d.-]+)\s*(.*)$/);
          if (capMatch) {
            setCapacityVal(capMatch[1]);
            setCapacityUnit(capMatch[2] || 'piezas');
          } else {
            setCapacityVal(String(prefillItem.capacity));
          }
        } else {
          setCapacityVal('');
        }

        setContents(prefillItem.contents || prefillItem.container_content || '');
        setLocation(prefillItem.location || '');
        setStock(String(prefillItem.stock || prefillItem.quantity || 1));
        setInventoryNumber(prefillItem.inventory_number || '');
        setSerialNumber(prefillItem.serial_number || '');
        setCondition(prefillItem.condition || prefillItem.status || 'Excelente');
        setResponsible(prefillItem.responsible || '');
        setNotes(prefillItem.observations || prefillItem.notes || '');
        setImageUri(prefillItem.image_path ? getImageUrl(prefillItem.image_path, serverUrl) : null);

        // Cargar Sub-piezas del kit si existen
        const rawContents = prefillItem.contents || prefillItem.container_content || '';
        if (rawContents) {
          if (typeof rawContents === 'string' && (rawContents.trim().startsWith('[') || rawContents.trim().startsWith('{'))) {
            try {
              const parsed = JSON.parse(rawContents);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setKitItems(parsed.map((sub, i) => ({
                  id: String(i + 1),
                  name: sub.name || '',
                  quantity: sub.quantity || 1,
                  imageUri: sub.imageUri || sub.image_path || null,
                })));
              }
            } catch (e) {
              setKitItems([{ id: '1', name: String(rawContents).trim(), quantity: 1 }]);
            }
          } else if (Array.isArray(rawContents) && rawContents.length > 0) {
            setKitItems(rawContents.map((sub, i) => ({
              id: String(i + 1),
              name: sub.name || '',
              quantity: sub.quantity || 1,
              imageUri: sub.imageUri || sub.image_path || null,
            })));
          }
        }
      } else {
        resetForm();
      }
    } else {
      setCreatedItem(null);
    }
  }, [visible, prefillItem]);

  const resetForm = () => {
    setName('');
    setSubject('Química');
    setMaterialType('Kit Didáctico');
    setBrand('');
    setModel('');
    setCapacityVal('');
    setCapacityUnit('piezas');
    setTechSpec('');
    setContents('');
    setKitItems([
      { id: '1', name: 'Pieza Principal', quantity: 1 }
    ]);
    setLocation('');
    setStock('1');
    setInventoryNumber('');
    setSerialNumber('');
    setCondition('Excelente');
    setResponsible('');
    setNotes('');
    setImageUri(null);
    setCreatedItem(null);
  };

  const applyTemplate = (tpl) => {
    setName(tpl.name);
    setSubject(tpl.subject);
    setMaterialType(tpl.materialType);
    setContents(tpl.contents);
    if (tpl.capacityVal) setCapacityVal(tpl.capacityVal);
    if (tpl.capacityUnit) setCapacityUnit(tpl.capacityUnit);
    if (tpl.condition) setCondition(tpl.condition);
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

  const handleAddKitItem = () => {
    setKitItems(prev => [
      ...prev,
      { id: Date.now().toString(), name: '', quantity: 1 }
    ]);
  };

  const handleRemoveKitItem = (id) => {
    if (kitItems.length <= 1) {
      Alert.alert('Aviso', 'El kit debe contener al menos un elemento.');
      return;
    }
    setKitItems(prev => prev.filter(i => i.id !== id));
  };

  const handleUpdateKitItem = (id, field, value) => {
    setKitItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Campo Requerido', 'Ingresa el nombre del material didáctico.');
      setActiveStep(1);
      return;
    }

    setLoading(true);
    try {
      let serverImagePath = prefillItem?.image_path || '';

      if (imageUri && (imageUri.startsWith('file://') || imageUri.startsWith('content://'))) {
        const filename = imageUri.split('/').pop() || 'didactic_photo.jpg';
        const formData = new FormData();
        formData.append('photo', {
          uri: imageUri,
          name: filename,
          type: 'image/jpeg',
        });
        const uploadRes = await apiService.uploadPhoto(formData);
        if (uploadRes && uploadRes.status === 'success') {
          serverImagePath = uploadRes.image_path;
        }
      }

      // Preparar sub-elementos limpiamente
      const cleanKitItems = kitItems
        .filter(i => i.name && i.name.trim().length > 0)
        .map(i => ({ name: i.name.trim(), quantity: parseInt(i.quantity, 10) || 1 }));

      const payload = {
        name: name.trim(),
        subject: subject.trim(),
        type: materialType.trim(),
        category: `${materialType.trim()} - ${subject.trim()}`.trim(),
        brand: brand.trim(),
        model: model.trim(),
        capacity: capacityVal ? `${capacityVal} ${capacityUnit}` : '',
        technical_specifications: techSpec.trim(),
        contents: contents.trim(),
        kit_items: cleanKitItems,
        container_content: cleanKitItems.length > 0 ? JSON.stringify(cleanKitItems) : contents.trim(),
        location: location.trim(),
        stock: parseInt(stock, 10) || 1,
        quantity: parseInt(stock, 10) || 1,
        inventory_number: inventoryNumber.trim(),
        serial_number: serialNumber.trim(),
        condition: condition.trim(),
        status: condition.trim(),
        responsible: responsible.trim(),
        notes: notes.trim(),
        observations: notes.trim(),
        image_path: serverImagePath
      };

      let res;
      if (prefillItem?.id) {
        const apiRes = await apiClient.put(`/api/didactic-materials/${prefillItem.id}`, payload);
        res = apiRes.data;
      } else {
        res = await apiService.createDidacticMaterial(payload);
      }

      if (res && res.status === 'success') {
        const savedData = res.data || { ...payload, id: prefillItem?.id || Date.now() };
        setCreatedItem(savedData);
        
        Alert.alert(
          '✅ Registro Exitoso',
          prefillItem?.id 
            ? 'El material didáctico fue actualizado correctamente.' 
            : 'El material didáctico fue guardado en el inventario.',
          [
            {
              text: '🖨️ Imprimir Etiqueta QR',
              onPress: () => {
                setShowQRBatchPrint(true);
              }
            },
            {
              text: 'Aceptar',
              onPress: () => {
                onSuccess && onSuccess();
                onClose();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', res?.message || 'No se pudo guardar el material didáctico.');
      }
    } catch (err) {
      Alert.alert('Error de conexión', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Theme Colors
  const modalBg = isDark ? '#0b1329' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#0f172a';
  const subtextColor = isDark ? '#94a3b8' : '#64748b';
  const cardBg = isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(248, 250, 252, 0.95)';
  const cardBorder = isDark ? 'rgba(34, 211, 238, 0.25)' : 'rgba(6, 182, 212, 0.3)';
  const inputBg = isDark ? 'rgba(3, 7, 18, 0.85)' : 'rgba(255, 255, 255, 0.95)';
  const inputBorder = isDark ? 'rgba(34, 211, 238, 0.3)' : 'rgba(203, 213, 225, 0.8)';
  const brandColor = isDark ? '#22d3ee' : '#0891b2';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: modalBg, borderColor: cardBorder }]}>
          
          {/* Header con gradiente glass y paso actual */}
          <View style={[styles.header, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(241, 245, 249, 0.95)', borderBottomColor: cardBorder }]}>
            <View style={styles.titleRow}>
              <View style={[styles.headerIconBadge, { backgroundColor: isDark ? 'rgba(6, 182, 212, 0.2)' : 'rgba(6, 182, 212, 0.12)', borderColor: brandColor }]}>
                <Text style={{ fontSize: 20 }}>🎓</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: textColor }]}>
                  {prefillItem?.id ? 'Editar Material Didáctico' : 'Registrar Material Didáctico'}
                </Text>
                <Text style={[styles.subtitle, { color: subtextColor }]}>
                  Paso {activeStep} de 5 • {
                    activeStep === 1 ? 'Datos Básicos' :
                    activeStep === 2 ? 'Especificaciones' :
                    activeStep === 3 ? 'Kit y Piezas' :
                    activeStep === 4 ? 'Ubicación y Estado' : 'Fotografía'
                  }
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)' }]}>
              <Ionicons name="close" size={20} color={textColor} />
            </TouchableOpacity>
          </View>

          {/* Barra de progreso por pestañas */}
          <View style={styles.stepTabsRow}>
            {[
              { step: 1, label: '1. Básicos', icon: 'book-outline' },
              { step: 2, label: '2. Técnico', icon: 'construct-outline' },
              { step: 3, label: '3. Piezas', icon: 'grid-outline' },
              { step: 4, label: '4. Ubicación', icon: 'location-outline' },
              { step: 5, label: '5. Foto', icon: 'camera-outline' },
            ].map(item => (
              <TouchableOpacity
                key={item.step}
                style={[
                  styles.stepTabPill,
                  activeStep === item.step && { backgroundColor: brandColor, borderColor: brandColor }
                ]}
                onPress={() => setActiveStep(item.step)}
              >
                <Text style={[
                  styles.stepTabPillText,
                  activeStep === item.step ? { color: '#ffffff', fontWeight: '800' } : { color: subtextColor }
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form Body ScrollView */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            
            {/* PASO 1: DATOS BÁSICOS */}
            {activeStep === 1 && (
              <View>
                <Text style={[styles.sectionTitle, { color: brandColor }]}>🎓 Identificación del Elemento</Text>

                {/* Plantillas Rápidas */}
                {!prefillItem && (
                  <View style={{ marginBottom: 14 }}>
                    <Text style={[styles.label, { color: subtextColor, marginBottom: 6 }]}>⚡ Plantillas Rápidas (Toca para autocompletar):</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {DIDACTIC_TEMPLATES.map((tpl, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[styles.templateChip, { backgroundColor: cardBg, borderColor: cardBorder }]}
                          onPress={() => applyTemplate(tpl)}
                        >
                          <Text style={[styles.templateChipText, { color: textColor }]}>
                            {tpl.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: textColor }]}>Nombre del Kit / Modelo Didáctico *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor: inputBorder }]}
                    placeholder="Ej. Kit de Geometría Molecular (100 piezas)"
                    placeholderTextColor={subtextColor}
                    value={name}
                    onChangeText={setName}
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.label, { color: textColor }]}>Asignatura / Área</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor: inputBorder }]}
                      placeholder="Ej. Química Orgánica"
                      placeholderTextColor={subtextColor}
                      value={subject}
                      onChangeText={setSubject}
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.label, { color: textColor }]}>Tipo de Elemento</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor: inputBorder }]}
                      placeholder="Ej. Kit / Modelo / Sensor"
                      placeholderTextColor={subtextColor}
                      value={materialType}
                      onChangeText={setMaterialType}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* PASO 2: ESPECIFICACIONES TÉCNICAS */}
            {activeStep === 2 && (
              <View>
                <Text style={[styles.sectionTitle, { color: brandColor }]}>📐 Especificaciones y Marca</Text>

                <View style={styles.row}>
                  <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.label, { color: textColor }]}>Marca / Fabricante</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor: inputBorder }]}
                      placeholder="Ej. Vernier / Pasco / 3B Scientific"
                      placeholderTextColor={subtextColor}
                      value={brand}
                      onChangeText={setBrand}
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.label, { color: textColor }]}>Modelo / Catálogo</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor: inputBorder }]}
                      placeholder="Ej. MOL-2000"
                      placeholderTextColor={subtextColor}
                      value={model}
                      onChangeText={setModel}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.label, { color: textColor }]}>Capacidad / Rango</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor: inputBorder }]}
                      placeholder="Ej. 100 o 0-14"
                      placeholderTextColor={subtextColor}
                      value={capacityVal}
                      onChangeText={setCapacityVal}
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.label, { color: textColor }]}>Unidad de Medida</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor: inputBorder }]}
                      placeholder="Ej. piezas, pH, °C, modelo"
                      placeholderTextColor={subtextColor}
                      value={capacityUnit}
                      onChangeText={setCapacityUnit}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: textColor }]}>Especificaciones Técnicas / Descripción</Text>
                  <TextInput
                    style={[styles.input, { height: 80, textAlignVertical: 'top', backgroundColor: inputBg, color: textColor, borderColor: inputBorder }]}
                    multiline
                    placeholder="Detalles sobre resolución, rango de medición, compatibilidad o materiales de fabricación..."
                    placeholderTextColor={subtextColor}
                    value={techSpec}
                    onChangeText={setTechSpec}
                  />
                </View>
              </View>
            )}

            {/* PASO 3: COMPONENTES Y SUB-PIEZAS DEL KIT */}
            {activeStep === 3 && (
              <View>
                <Text style={[styles.sectionTitle, { color: brandColor }]}>🧰 Componentes del Kit / Piezas Incluidas</Text>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: textColor }]}>Resumen del Contenido</Text>
                  <TextInput
                    style={[styles.input, { height: 60, textAlignVertical: 'top', backgroundColor: inputBg, color: textColor, borderColor: inputBorder }]}
                    multiline
                    placeholder="Ej. 50 esferas de carbono, 30 conectores de hidrógeno, 1 pinza de extracción..."
                    placeholderTextColor={subtextColor}
                    value={contents}
                    onChangeText={setContents}
                  />
                </View>

                <Text style={[styles.label, { color: textColor, marginTop: 10, marginBottom: 8 }]}>Sub-Piezas Detalladas del Kit:</Text>
                
                {kitItems.map((item, index) => (
                  <View key={item.id} style={[styles.kitItemRow, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                    <Text style={[styles.kitItemIndex, { color: brandColor }]}>#{index + 1}</Text>
                    <TextInput
                      style={[styles.kitItemNameInput, { backgroundColor: inputBg, color: textColor, borderColor: inputBorder }]}
                      placeholder="Nombre de la pieza..."
                      placeholderTextColor={subtextColor}
                      value={item.name}
                      onChangeText={(val) => handleUpdateKitItem(item.id, 'name', val)}
                    />
                    <TextInput
                      style={[styles.kitItemQtyInput, { backgroundColor: inputBg, color: textColor, borderColor: inputBorder }]}
                      placeholder="Cant."
                      keyboardType="numeric"
                      placeholderTextColor={subtextColor}
                      value={String(item.quantity)}
                      onChangeText={(val) => handleUpdateKitItem(item.id, 'quantity', val)}
                    />
                    <TouchableOpacity
                      style={styles.removeKitItemBtn}
                      onPress={() => handleRemoveKitItem(item.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  style={[styles.addKitItemBtn, { borderColor: brandColor }]}
                  onPress={handleAddKitItem}
                >
                  <Ionicons name="add-circle-outline" size={20} color={brandColor} style={{ marginRight: 6 }} />
                  <Text style={[styles.addKitItemBtnText, { color: brandColor }]}>Agregar Otra Pieza al Kit</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* PASO 4: UBICACIÓN Y ESTADO */}
            {activeStep === 4 && (
              <View>
                <Text style={[styles.sectionTitle, { color: brandColor }]}>📍 Ubicación, Custodia e Inventario</Text>

                <View style={styles.row}>
                  <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.label, { color: textColor }]}>Ubicación (Estante / Gabinete)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor: inputBorder }]}
                      placeholder="Ej. Estante B-3"
                      placeholderTextColor={subtextColor}
                      value={location}
                      onChangeText={setLocation}
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.label, { color: textColor }]}>Cantidad / Stock</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor: inputBorder }]}
                      placeholder="1"
                      keyboardType="numeric"
                      placeholderTextColor={subtextColor}
                      value={stock}
                      onChangeText={setStock}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.label, { color: textColor }]}>N° de Inventario</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor: inputBorder }]}
                      placeholder="Ej. LAB-DID-102"
                      placeholderTextColor={subtextColor}
                      value={inventoryNumber}
                      onChangeText={setInventoryNumber}
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.label, { color: textColor }]}>N° de Serie</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor: inputBorder }]}
                      placeholder="Ej. SN-998822"
                      placeholderTextColor={subtextColor}
                      value={serialNumber}
                      onChangeText={setSerialNumber}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: textColor }]}>Estado / Condición del Material</Text>
                  <View style={styles.chipsRow}>
                    {['Excelente', 'Buenas Condiciones', 'Regular', 'Incompleto', 'En Reparación'].map((cond) => (
                      <TouchableOpacity
                        key={cond}
                        style={[
                          styles.chip,
                          { backgroundColor: cardBg, borderColor: cardBorder },
                          condition === cond && { backgroundColor: brandColor, borderColor: brandColor }
                        ]}
                        onPress={() => setCondition(cond)}
                      >
                        <Text style={[
                          styles.chipText,
                          { color: subtextColor },
                          condition === cond && { color: '#ffffff', fontWeight: '800' }
                        ]}>
                          {cond}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: textColor }]}>Responsable de Custodia</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor: inputBorder }]}
                    placeholder="Ej. Ing. Carlos Martínez"
                    placeholderTextColor={subtextColor}
                    value={responsible}
                    onChangeText={setResponsible}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: textColor }]}>Observaciones y Notas</Text>
                  <TextInput
                    style={[styles.input, { height: 60, textAlignVertical: 'top', backgroundColor: inputBg, color: textColor, borderColor: inputBorder }]}
                    multiline
                    placeholder="Piezas faltantes, instrucciones de cuidado..."
                    placeholderTextColor={subtextColor}
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>
              </View>
            )}

            {/* PASO 5: FOTOGRAFÍA Y CONFIRMACIÓN */}
            {activeStep === 5 && (
              <View>
                <Text style={[styles.sectionTitle, { color: brandColor }]}>📷 Fotografía del Material</Text>
                
                <View style={styles.fieldGroup}>
                  {imageUri ? (
                    <View style={[styles.photoPreviewBox, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                      <Image source={{ uri: imageUri }} style={styles.photoPreviewImage} resizeMode="cover" />
                      <View style={styles.photoActionsRow}>
                        <TouchableOpacity style={[styles.photoActionBtn, { backgroundColor: '#475569' }]} onPress={handleTakePhoto}>
                          <Ionicons name="camera" size={16} color="#fff" />
                          <Text style={styles.photoActionBtnText}>Tomar Otra</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.photoActionBtn, { backgroundColor: '#0284c7' }]} onPress={handlePickImage}>
                          <Ionicons name="images" size={16} color="#fff" />
                          <Text style={styles.photoActionBtnText}>Galería</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.photoActionBtn, { backgroundColor: '#ef4444' }]} onPress={() => setImageUri(null)}>
                          <Ionicons name="trash" size={16} color="#fff" />
                          <Text style={styles.photoActionBtnText}>Quitar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.photoPickerBox, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                      <Ionicons name="camera-outline" size={42} color={brandColor} style={{ marginBottom: 8 }} />
                      <Text style={[styles.photoPickerHint, { color: subtextColor }]}>
                        Captura una imagen del material didáctico con la cámara o selecciona una desde tu galería.
                      </Text>
                      <View style={styles.photoButtonsRow}>
                        <TouchableOpacity style={[styles.photoBtn, { backgroundColor: brandColor }]} onPress={handleTakePhoto}>
                          <Ionicons name="camera" size={18} color="#fff" />
                          <Text style={styles.photoBtnText}>Cámara</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.photoBtn, { backgroundColor: '#0284c7' }]} onPress={handlePickImage}>
                          <Ionicons name="images" size={18} color="#fff" />
                          <Text style={styles.photoBtnText}>Galería</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>

                {/* Resumen Final */}
                <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                  <Text style={[styles.summaryTitle, { color: textColor }]}>📋 Resumen del Registro</Text>
                  <Text style={[styles.summaryItem, { color: subtextColor }]}>• Nombre: <Text style={{ color: textColor, fontWeight: '700' }}>{name || '(Sin nombre)'}</Text></Text>
                  <Text style={[styles.summaryItem, { color: subtextColor }]}>• Área/Asignatura: <Text style={{ color: textColor, fontWeight: '700' }}>{subject}</Text></Text>
                  <Text style={[styles.summaryItem, { color: subtextColor }]}>• Ubicación: <Text style={{ color: textColor, fontWeight: '700' }}>{location || 'No asignada'}</Text></Text>
                  <Text style={[styles.summaryItem, { color: subtextColor }]}>• Piezas en Kit: <Text style={{ color: textColor, fontWeight: '700' }}>{kitItems.length} sub-piezas</Text></Text>
                </View>
              </View>
            )}

          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(241, 245, 249, 0.95)', borderTopColor: cardBorder }]}>
            {activeStep > 1 ? (
              <TouchableOpacity style={[styles.prevBtn, { borderColor: cardBorder }]} onPress={() => setActiveStep(prev => prev - 1)}>
                <Ionicons name="chevron-back" size={18} color={textColor} />
                <Text style={[styles.prevBtnText, { color: textColor }]}>Anterior</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.prevBtn, { borderColor: cardBorder }]} onPress={onClose}>
                <Text style={[styles.prevBtnText, { color: subtextColor }]}>Cancelar</Text>
              </TouchableOpacity>
            )}

            {activeStep < 5 ? (
              <TouchableOpacity style={[styles.nextBtn, { backgroundColor: brandColor }]} onPress={() => setActiveStep(prev => prev + 1)}>
                <Text style={styles.nextBtnText}>Siguiente</Text>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: brandColor }]} onPress={handleSave} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {prefillItem?.id ? 'Guardar Cambios' : 'Registrar Didáctico'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Modal de Impresión de Código QR */}
      {showQRBatchPrint && createdItem && (
        <QRBatchPrintModal
          visible={showQRBatchPrint}
          onClose={() => {
            setShowQRBatchPrint(false);
            onSuccess && onSuccess();
            onClose();
          }}
          items={[{
            id: createdItem.id,
            type: 'didactic_material',
            name: createdItem.name || name,
            code: createdItem.inventory_number || `LAB-DID-${createdItem.id}`,
            qr_content: createdItem.qr_content || `LAB-DID-${createdItem.id}`
          }]}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    height: '92%',
    borderWidth: 1.2,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  headerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
  },
  stepTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  stepTabPill: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  stepTabPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 14,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1.2,
  },
  templateChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  templateChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  kitItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  kitItemIndex: {
    fontSize: 12,
    fontWeight: '800',
    width: 24,
    textAlign: 'center',
  },
  kitItemNameInput: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    borderWidth: 1,
  },
  kitItemQtyInput: {
    width: 55,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    textAlign: 'center',
    borderWidth: 1,
  },
  removeKitItemBtn: {
    padding: 6,
  },
  addKitItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    marginTop: 6,
    marginBottom: 14,
  },
  addKitItemBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  photoPickerBox: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  photoPickerHint: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 18,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  photoBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  photoPreviewBox: {
    alignItems: 'center',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
  },
  photoPreviewImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginBottom: 12,
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  photoActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginTop: 10,
    gap: 4,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  summaryItem: {
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
    borderTopWidth: 1,
  },
  prevBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  prevBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  nextBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 4,
  },
  nextBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  submitBtn: {
    flex: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
});
