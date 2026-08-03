import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform
} from 'react-native';
import { apiService } from '../api/services';

export default function SubstancesScreen({ navigation }) {
  const [substances, setSubstances] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      (item.responsible && item.responsible.toLowerCase().includes(q))
    );
    setFiltered(result);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('Detail', { type: 'substance', item })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={styles.quantityBadge}>
          <Text style={styles.quantityText}>{item.quantity} {item.unit}</Text>
        </View>
      </View>

      {item.chemical_formula ? (
        <Text style={styles.formula}>Fórmula: {item.chemical_formula}</Text>
      ) : null}

      {item.cas_number ? (
        <Text style={styles.meta}>CAS: {item.cas_number}</Text>
      ) : null}

      <View style={styles.cardFooter}>
        <Text style={styles.location}>📍 {item.location || 'Sin ubicación'}</Text>
        <Text style={styles.responsible}>👤 {item.responsible || 'N/A'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, CAS, fórmula..."
          value={search}
          onChangeText={handleSearch}
          placeholderTextColor="#94a3b8"
        />
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
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  quantityBadge: {
    backgroundColor: '#0369a1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quantityText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  formula: {
    fontSize: 13,
    color: '#38bdf8',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  meta: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  location: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  responsible: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
});
