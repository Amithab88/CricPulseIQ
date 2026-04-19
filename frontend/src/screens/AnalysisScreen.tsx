import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AnalysisScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Match Analysis</Text>
      
      <View style={styles.chartPlaceholder}>
        <Text>Phase Breakdown Chart</Text>
        <Text style={styles.small}>(Powerplay vs Middle Overs vs Death)</Text>
      </View>

      <View style={styles.chartPlaceholder}>
        <Text>Momentum Chart</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  chartPlaceholder: { backgroundColor: '#ddd', height: 150, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderRadius: 10 },
  small: { fontSize: 12, color: '#666' }
});
