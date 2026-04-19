import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

export default function HomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>CricPulseIQ Dashboard</Text>
      
      <View style={styles.card}>
        <Text style={styles.subtitle}>AI Daily Briefing</Text>
        <Text>Your next match is against "Titans CC" at 3 PM.</Text>
        <Text>Weather is clear. Focus on slow bouncers.</Text>
      </View>

      <Button title="Pre-Match Strategy" onPress={() => navigation.navigate('MatchStrategy')} />
      <Button title="Tournament Standings" onPress={() => navigation.navigate('TournamentManager')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 20 },
  subtitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
});
