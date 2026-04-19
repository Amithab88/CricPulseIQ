import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function MatchStrategyScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>AI Pre-Match Strategy Generator</Text>
      
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Opponent: Titans CC</Text>
        <Text style={styles.text}>Pitch Conditions: Dry, turning track.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Batting Plan</Text>
        <Text style={styles.text}>- See off the new ball safely.</Text>
        <Text style={styles.text}>- Attack their 5th bowler who averages 10+ economy.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Bowling Plan</Text>
        <Text style={styles.text}>- Start with spin at one end early.</Text>
        <Text style={styles.text}>- Bowl wide outside off to their opener, he loves pulling on leg side.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Key Matchups</Text>
        <Text style={styles.text}>1. Our Ace Spinner vs Their Captain (Advantage: Spin)</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f0f0f0' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  text: { fontSize: 16, marginBottom: 5, color: '#444' }
});
