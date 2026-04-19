import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function TournamentManagerScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tournament Leaderboard</Text>
      
      <View style={styles.tableHeader}>
        <Text style={[styles.cell, {flex: 2}]}>Team</Text>
        <Text style={styles.cell}>P</Text>
        <Text style={styles.cell}>W</Text>
        <Text style={styles.cell}>Pts</Text>
      </View>

      <View style={styles.tableRow}>
        <Text style={[styles.cell, {flex: 2}]}>1. Eagles CC</Text>
        <Text style={styles.cell}>5</Text>
        <Text style={styles.cell}>4</Text>
        <Text style={styles.cell}>8</Text>
      </View>

      <View style={styles.tableRow}>
        <Text style={[styles.cell, {flex: 2}]}>2. Titans CC</Text>
        <Text style={styles.cell}>5</Text>
        <Text style={styles.cell}>3</Text>
        <Text style={styles.cell}>6</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#eee', padding: 10, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  tableRow: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  cell: { flex: 1, fontWeight: 'bold', color: '#333' }
});
