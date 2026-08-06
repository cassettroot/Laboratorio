import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform
} from 'react-native';

export default function RegistrationSelectorModal({ visible, onClose, onSelectType }) {
  const options = [
    {
      id: 'substances',
      title: 'Sustancia Química',
      subtitle: 'Reactivos, solventes y soluciones',
      icon: '🧪',
      color: '#0d9488',
      bgColor: '#ccfbf1',
    },
    {
      id: 'chemical_materials',
      title: 'Material Químico',
      subtitle: 'Cristalería, utensilios y recipientes',
      icon: '💧',
      color: '#0284c7',
      bgColor: '#e0f2fe',
    },
    {
      id: 'didactic_materials',
      title: 'Material Didáctico',
      subtitle: 'Modelos, maquetas, kits y sensores',
      icon: '🎓',
      color: '#4f46e5',
      bgColor: '#e0e7ff',
    },
    {
      id: 'equipos',
      title: 'Bien / Equipo (Oficina / Sistemas)',
      subtitle: 'Equipos informáticos, mobiliario y activos',
      icon: '💻',
      color: '#2563eb',
      bgColor: '#dbeafe',
    },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} />
          
          <Text style={styles.title}>¿Qué deseas registrar?</Text>
          <Text style={styles.subtitle}>Selecciona el tipo de elemento para abrir su formulario correspondiente</Text>

          <View style={styles.optionsList}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={styles.optionCard}
                activeOpacity={0.7}
                onPress={() => {
                  onSelectType(opt.id);
                  onClose();
                }}
              >
                <View style={[styles.iconContainer, { backgroundColor: opt.bgColor }]}>
                  <Text style={styles.icon}>{opt.icon}</Text>
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.optionTitle}>{opt.title}</Text>
                  <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
                </View>
                <Text style={[styles.arrow, { color: opt.color }]}>→</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  optionsList: {
    gap: 10,
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  icon: {
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  optionSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  arrow: {
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 8,
  },
  closeButton: {
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 13,
  },
});
