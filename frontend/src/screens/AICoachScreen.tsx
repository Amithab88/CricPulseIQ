import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList,
  TouchableOpacity, KeyboardAvoidingView,
  Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useAICoach } from '../hooks/useCricPulseIQ';

// Example: this would be passed in via route params in production
const DEMO_PLAYER: Parameters<typeof useAICoach>[0] = {
  playerName: 'Ravi Kumar',
  role: 'batsman',
  recentForm: '22(18), 4(6), 67(45), 11(9), 53(38)',
  vsSpinRating: 42,
  vsPaceRating: 71,
  phaseRatings: { powerplay: 68, middleOvers: 74, death: 38 },
  shotZones: { cover: 28, midWicket: 22, straight: 14, point: 12, midOff: 10, squareLeg: 8, fineLeg: 4, midOn: 2, thirdMan: 0 },
};

export default function AICoachScreen() {
  const [inputText, setInputText] = useState('');
  const {
    chatHistory, streamBuffer, isStreaming,
    suggestedFollowUps, sendMessage, clearHistory, error,
  } = useAICoach(DEMO_PLAYER);

  const handleSend = useCallback(async () => {
    const msg = inputText.trim();
    if (!msg || isStreaming) return;
    setInputText('');
    await sendMessage(msg, true); // streaming = true
  }, [inputText, isStreaming, sendMessage]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>RK</Text></View>
        <View>
          <Text style={styles.playerName}>{DEMO_PLAYER.playerName}</Text>
          <Text style={styles.playerMeta}>
            vs Spin: {DEMO_PLAYER.vsSpinRating}/100 · vs Pace: {DEMO_PLAYER.vsPaceRating}/100
          </Text>
        </View>
        <TouchableOpacity onPress={clearHistory} style={styles.clearBtn}>
          <Text style={styles.clearBtnText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Chat history */}
      <FlatList
        data={chatHistory}
        keyExtractor={(_, i) => i.toString()}
        style={styles.chatList}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.coachBubble]}>
            <Text style={item.role === 'user' ? styles.userText : styles.coachText}>
              {item.content}
            </Text>
          </View>
        )}
        ListFooterComponent={
          isStreaming && streamBuffer ? (
            <View style={[styles.bubble, styles.coachBubble]}>
              <Text style={styles.coachText}>{streamBuffer}<Text style={styles.cursor}>▌</Text></Text>
            </View>
          ) : null
        }
      />

      {/* Suggested follow-ups */}
      {suggestedFollowUps.length > 0 && !isStreaming && (
        <View style={styles.followUps}>
          {suggestedFollowUps.map((q, i) => (
            <TouchableOpacity key={i} style={styles.followUpChip} onPress={() => {
              setInputText(q);
            }}>
              <Text style={styles.followUpText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask your AI coach..."
          placeholderTextColor="#888"
          multiline
          onSubmitEditing={handleSend}
          editable={!isStreaming}
        />
        <TouchableOpacity
          style={[styles.sendBtn, isStreaming && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={isStreaming}
        >
          {isStreaming ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendBtnText}>→</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1117' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#1a1d27', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  playerName: { color: '#fff', fontWeight: '700', fontSize: 15 },
  playerMeta: { color: '#9ca3af', fontSize: 11 },
  clearBtn: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#374151' },
  clearBtnText: { color: '#9ca3af', fontSize: 12 },
  chatList: { flex: 1 },
  bubble: { maxWidth: '82%', borderRadius: 14, padding: 12, marginBottom: 8 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#2563eb' },
  coachBubble: { alignSelf: 'flex-start', backgroundColor: '#1f2937' },
  userText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  coachText: { color: '#e5e7eb', fontSize: 14, lineHeight: 20 },
  cursor: { color: '#60a5fa' },
  followUps: { paddingHorizontal: 12, paddingBottom: 6, gap: 6 },
  followUpChip: { backgroundColor: '#1f2937', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: '#374151', alignSelf: 'flex-start', marginBottom: 4 },
  followUpText: { color: '#60a5fa', fontSize: 12 },
  errorText: { color: '#f87171', fontSize: 12, paddingHorizontal: 12, paddingBottom: 4 },
  inputRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#1a1d27', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#111827', color: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#374151', maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#1e40af' },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
