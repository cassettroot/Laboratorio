import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { apiService } from '../api/services';
import { AuthContext } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

export default function EquiposScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { role } = useContext(AuthContext);
  const { theme } = useTheme();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiService.getEquipos();
      if (result.status === 'success') {
        setData(result.data || []);
      }
    } catch (e) {
      console.warn('Error loading equipos:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filteredData = data.filter(item => 
    item.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    item.no_inventario?.toLowerCase().includes(search.toLowerCase()) ||
    item.marca?.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.itemName} numberOfLines={1}>{item.nombre}</Text>
        {item.no_inventario ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.no_inventario}</Text>
          </View>
        ) : null}
      </View>
      
      {item.caracteristicas_bien ? (
        <Text style={styles.itemDesc} numberOfLines={2}>{item.caracteristicas_bien}</Text>
      ) : null}
      
      <View style={styles.detailsRow}>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Marca</Text>
          <Text style={styles.detailValue}>{item.marca || 'N/A'}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Modelo</Text>
          <Text style={styles.detailValue}>{item.modelo || 'N/A'}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Serie</Text>
          <Text style={styles.detailValue}>{item.serie || 'N/A'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput 
          style={styles.searchInput}
          placeholder="Buscar bien o equipo..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.main} style={{marginTop: 30}} />
      ) : (
        <FlatList 
          data={filteredData}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No se encontraron bienes o equipos.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#fff',
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#38bdf8', // Can be dynamic if we want
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemDesc: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    color: '#64748b',
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 2,
    fontWeight: 'bold',
  },
  detailValue: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '500',
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  }
});
