import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function WagonWheelScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wagon Wheel</Text>
      <Text style={styles.subtitle}>Shot Zone Analysis</Text>

      <View style={styles.fieldContainer}>
        {/* Placeholder for interactive field / canvas */}
        <View style={styles.fieldCircle}>
           <Text style={styles.overlayText}>Field Heatmap UI</Text>
        </View>
      </View>
      
      <View style={styles.statsPanel}>
        <Text>Off Side: 45% of runs</Text>
        <Text>Leg Side: 55% of runs</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 30 },
  fieldContainer: { width: 300, height: 300, justifyContent: 'center', alignItems: 'center' },
  fieldCircle: { width: 280, height: 280, borderRadius: 140, backgroundColor: '#c5e1a5', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#33691e' },
  overlayText: { color: '#33691e', fontWeight: 'bold' },
  statsPanel: { marginTop: 30, alignItems: 'center' }
});
