import React, { useContext } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform
} from 'react-native';
import { ThemeContext } from '../../context/ThemeContext';

export default function RegistrationSelectorModal({ visible, onClose, onSelectType }) {
  const { theme } = useContext(ThemeContext);

  const options = [
    {
      id: 'substances',
      title: 'Sustancia Química',
      subtitle: 'Reactivos, solventes y soluciones',
      icon: '🧪',
      color: '#0d9488',
      bgColor: 'rgba(13, 148, 136, 0.15)',
    },
    {
      id: 'chemical_materials',
      title: 'Material Químico',
      subtitle: 'Cristalería, utensilios y recipientes',
      icon: '💧',
      color: '#0284c7',
      bgColor: 'rgba(2, 132, 199, 0.15)',
    },
    {
      id: 'didactic_materials',
      title: 'Material Didáctico',
      subtitle: 'Modelos, maquetas, kits y sensores',
      icon: '🎓',
      color: '#8b5cf6',
      bgColor: 'rgba(139, 92, 246, 0.15)',
    },
    {
      id: 'equipos',
      title: 'Bien / Equipo (Oficina / Sistemas)',
      subtitle: 'Equipos informáticos, mobiliario y activos',
      icon: '💻',
      color: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.15)',
    },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.container, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder, borderTopWidth: 1 }]} onStartShouldSetResponder={() => true}>
          <View style={[styles.handle, { backgroundColor: theme.subtext }]} />
          
          <Text style={[styles.title, { color: theme.text }]}>¿Qué deseas registrar?</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>Selecciona el tipo de elemento para abrir su formulario correspondiente</Text>

          <View style={styles.optionsList}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.optionCard, { backgroundColor: theme.glassPill, borderColor: theme.glassBorder }]}
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
                  <Text style={[styles.optionTitle, { color: theme.text }]}>{opt.title}</Text>
                  <Text style={[styles.optionSubtitle, { color: theme.subtext }]}>{opt.subtitle}</Text>
                </View>
                <Text style={[styles.arrow, { color: opt.color }]}>→</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.closeButton, { borderColor: theme.glassBorder, backgroundColor: theme.glassPill }]} onPress={onClose}>
            <Text style={[styles.closeButtonText, { color: theme.text }]}>Cancelar</Text>
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
    opacity: 0.4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
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
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
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
  },
  optionSubtitle: {
    fontSize: 11,
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
    alignItems: 'center',
  },
  closeButtonText: {
    fontWeight: '700',
    fontSize: 13,
  },
});
