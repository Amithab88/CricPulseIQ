import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

export default function PlayerProfileScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Player Profile</Text>
      
      <View style={styles.header}>
        <View style={styles.avatar}></View>
        <View>
          <Text style={styles.name}>Virat Sharma</Text>
          <Text>Right Hand Batsman</Text>
          <Text>Matches: 45 | Runs: 1250 | Avg: 35.7</Text>
        </View>
      </View>

      <View style={styles.tabsMenu}>
        <Text style={styles.activeTab}>Overview</Text>
        <Text style={styles.tab}>Form</Text>
        <Text style={styles.tab}>Scouting AI</Text>
      </View>

      <View style={styles.content}>
        <Text>AI Scouting Report: Strong on the leg side. Struggles against left-arm spin.</Text>
        <Button title="View Shot Wagon Wheel" onPress={() => navigation.navigate('WagonWheel')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#555', marginRight: 15 },
  name: { fontSize: 20, fontWeight: 'bold' },
  tabsMenu: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee', marginBottom: 20 },
  tab: { marginRight: 20, paddingBottom: 10, color: '#888' },
  activeTab: { marginRight: 20, paddingBottom: 10, color: '#000', fontWeight: 'bold', borderBottomWidth: 2, borderBottomColor: '#000' },
  content: { flex: 1 }
});
