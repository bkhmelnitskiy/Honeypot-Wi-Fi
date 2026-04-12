import { addItem, deleteItem, getItems } from '@/constants/db';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Scan = {
  id: number;
  network: string;
  safety_score: number;
  started_at: string;
};

export default function MyNetworksScreen() {
  const router = useRouter();
  const [networkName, setNetworkName] = useState('');
  const [scans, setScans] = useState<Scan[]>(() => getItems() as Scan[]);

  function handleAdd() {
    if (!networkName.trim()) return;
    addItem(networkName.trim());
    setNetworkName('');
    setScans(getItems() as Scan[]);
  }

  function handleDelete(id: number) {
    deleteItem(id);
    setScans(getItems() as Scan[]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lista zeskanowanych sieci</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Network name"
          value={networkName}
          onChangeText={setNetworkName}
        />
        <Button title="Add" onPress={handleAdd} />
      </View>

      <FlatList
        data={scans}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push(`/network_details?id=${item.id}`)}
          >
            <Text style={styles.rowText}>{item.network ?? '(unnamed)'}</Text>
            <Button title="Delete" color="red" onPress={() => handleDelete(item.id)} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No networks yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rowText: {
    fontSize: 16,
  },
  empty: {
    textAlign: 'center',
    color: '#aaa',
    marginTop: 32,
  },
});