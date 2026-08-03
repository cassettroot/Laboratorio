import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking
} from 'react-native';

export default function DetailScreen({ route, navigation }) {
  const { type, item } = route.params || {};

  if (!item) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No se proporcionó información del elemento.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{item.name}</Text>
        
        {item.chemical_formula ? (
          <Text style={styles.formula}>Fórmula: {item.chemical_formula}</Text>
        ) : null}

        <View style={styles.badgeRow}>
          <View style={styles.badgePrimary}>
            <Text style={styles.badgePrimaryText}>{item.quantity} {item.unit || 'piezas'}</Text>
          </View>
          {item.cas_number ? (
            <View style={styles.badgeSecondary}>
              <Text style={styles.badgeSecondaryText}>CAS: {item.cas_number}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ubicación y Responsable</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Ubicación:</Text>
          <Text style={styles.value}>{item.location || 'No asignada'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Responsable:</Text>
          <Text style={styles.value}>{item.responsible || 'No asignado'}</Text>
        </View>
      </View>

      {/* Secciones específicas de sustancias químicas */}
      {type === 'substance' ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Propiedades Físicas y Químicas</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Estado Físico:</Text>
              <Text style={styles.value}>{item.physical_state || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Color:</Text>
              <Text style={styles.value}>{item.color || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Olor:</Text>
              <Text style={styles.value}>{item.odor || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Concentración:</Text>
              <Text style={styles.value}>{item.concentration || 'N/A'}</Text>
            </View>
          </View>

          {item.risks_warnings ? (
            <View style={[styles.section, { borderLeftColor: '#ef4444', borderLeftWidth: 4 }]}>
              <Text style={[styles.sectionTitle, { color: '#f87171' }]}>⚠️ Riesgos y Advertencias</Text>
              <Text style={styles.descText}>{item.risks_warnings}</Text>
            </View>
          ) : null}
        </>
      ) : null}

      {item.observations ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observaciones</Text>
          <Text style={styles.descText}>{item.observations}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  formula: {
    fontSize: 15,
    color: '#38bdf8',
    marginBottom: 12,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  badgePrimary: {
    backgroundColor: '#0369a1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgePrimaryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  badgeSecondary: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeSecondaryText: {
    color: '#cbd5e1',
    fontWeight: '600',
    fontSize: 13,
  },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#38bdf8',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  label: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  value: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  descText: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
  },
});
