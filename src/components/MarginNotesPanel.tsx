import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

export interface MarginNoteData {
  id: string;
  noteIndex: number;
  content: string;
  line: number;
  blockIndex: number;
}

interface MarginNotesPanelProps {
  notes: MarginNoteData[];
  onNoteChange: (id: string, content: string) => void;
  onNoteDelete: (id: string) => void;
  selectedNoteId: string | null;
  onNoteSelect: (id: string) => void;
}

// Line height in the editor (approximate, for alignment)
const LINE_HEIGHT = 24;
const MIN_NOTE_GAP = 8;

interface NoteLayout {
  id: string;
  top: number;
}

function calculateNoteLayouts(notes: MarginNoteData[]): NoteLayout[] {
  const layouts: NoteLayout[] = [];
  let currentBottom = 0;

  // Sort by line number
  const sortedNotes = [...notes].sort((a, b) => a.line - b.line);

  for (const note of sortedNotes) {
    // Target: align with line (line * LINE_HEIGHT)
    const targetTop = note.line * LINE_HEIGHT;

    // Constraint: don't overlap with previous note (push down if needed)
    const minTop = currentBottom + MIN_NOTE_GAP;

    // Use the larger of target and minimum
    const actualTop = Math.max(targetTop, minTop);

    layouts.push({
      id: note.id,
      top: actualTop,
    });

    // Estimate note height (will be adjusted dynamically)
    currentBottom = actualTop + 60;
  }

  return layouts;
}

export function MarginNotesPanel({
  notes,
  onNoteChange,
  onNoteDelete,
  selectedNoteId,
  onNoteSelect,
}: MarginNotesPanelProps) {
  const [noteHeights, setNoteHeights] = useState<Map<string, number>>(new Map());

  // Recalculate layouts with actual heights
  const calculateLayoutsWithHeights = useCallback(() => {
    const layouts: NoteLayout[] = [];
    let currentBottom = 0;

    const sortedNotes = [...notes].sort((a, b) => a.line - b.line);

    for (const note of sortedNotes) {
      const targetTop = note.line * LINE_HEIGHT;
      const minTop = currentBottom + MIN_NOTE_GAP;
      const actualTop = Math.max(targetTop, minTop);

      layouts.push({
        id: note.id,
        top: actualTop,
      });

      const height = noteHeights.get(note.id) || 60;
      currentBottom = actualTop + height;
    }

    return layouts;
  }, [notes, noteHeights]);

  const layouts = calculateLayoutsWithHeights();

  const handleNoteLayout = (id: string, height: number) => {
    setNoteHeights(prev => {
      const next = new Map(prev);
      next.set(id, height);
      return next;
    });
  };

  const handleDeletePress = (id: string, content: string) => {
    // Only delete if content is empty
    if (content.trim() === '') {
      onNoteDelete(id);
    }
  };

  if (notes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No notes</Text>
        <Text style={styles.emptyHint}>Click 📝 to add a note</Text>
      </View>
    );
  }

  // Calculate total height needed
  const lastLayout = layouts[layouts.length - 1];
  const lastNoteHeight = lastLayout ? (noteHeights.get(lastLayout.id) || 60) : 0;
  const totalHeight = lastLayout ? lastLayout.top + lastNoteHeight + 20 : 100;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[styles.contentContainer, { minHeight: totalHeight }]}
    >
      {layouts.map(layout => {
        const note = notes.find(n => n.id === layout.id);
        if (!note) return null;

        const isSelected = note.id === selectedNoteId;

        return (
          <View
            key={note.id}
            style={[
              styles.noteItem,
              { top: layout.top },
              isSelected && styles.noteItemSelected,
            ]}
            onLayout={(e) => handleNoteLayout(note.id, e.nativeEvent.layout.height)}
          >
            <TouchableOpacity
              style={styles.noteIndexButton}
              onPress={() => handleDeletePress(note.id, note.content)}
            >
              <View style={styles.noteIndexCircle}>
                <Text style={styles.noteIndexText}>{note.noteIndex}</Text>
              </View>
            </TouchableOpacity>
            <TextInput
              style={[styles.noteInput, isSelected && styles.noteInputSelected]}
              value={note.content}
              onChangeText={(text) => onNoteChange(note.id, text)}
              onFocus={() => onNoteSelect(note.id)}
              multiline
              placeholder="Add note..."
              placeholderTextColor="#999"
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  contentContainer: {
    position: 'relative',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fafafa',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 12,
    color: '#999',
  },
  noteItem: {
    position: 'absolute',
    left: 4,
    right: 4,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noteItemSelected: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  noteIndexButton: {
    marginRight: 8,
  },
  noteIndexCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteIndexText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noteInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    padding: 0,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  noteInputSelected: {
    color: '#000',
  },
});

export default MarginNotesPanel;
