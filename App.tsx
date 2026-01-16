import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useState, useCallback } from 'react';
import { TipTapEditor, TipTapEditorRef, EditorState, EditorContent, MarginNoteData, MarginNotesProvider, useFocus } from './src/editor';
import { SquareIcon, CircleIcon, FlowerIcon } from './src/components/ShapeIcons';
import { MarginNotesPanel, MarginNotesPanelRef } from './src/components/MarginNotesPanel';
import { reconcile, type NoteData } from './src/margin-notes';

// Generate unique ID
function generateId(): string {
	return Math.random().toString(36).substring(2, 11);
}

// Inner component that uses the focus context
function AppContent() {
	const editorRef = useRef<TipTapEditorRef>(null);
	const notesPanelRef = useRef<MarginNotesPanelRef>(null);
	const { isMainEditorFocused, focusedNoteId, hasAnyEditorFocus, focusMainEditor } = useFocus();
	
	const [editorState, setEditorState] = useState<EditorState>({
		isBold: false,
		isItalic: false,
		isStrike: false,
		isCode: false,
		isBulletList: false,
		isOrderedList: false,
		isHeading: false,
	});

	// Margin notes state
	const [marginNotes, setMarginNotes] = useState<MarginNoteData[]>([]);
	const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
	
	// Ref to track latest margin notes (prevents stale closure in callbacks)
	const marginNotesRef = useRef<MarginNoteData[]>([]);
	marginNotesRef.current = marginNotes;

	const handleContentChange = useCallback((content: EditorContent) => {
	}, []);

	const handleSelectionChange = useCallback((state: EditorState) => {
		setEditorState(state);
	}, []);

	const handleReady = useCallback(() => {
	}, []);

	// Track when main editor is focused - use the state machine
	const handleEditorFocus = useCallback(() => {
		focusMainEditor();
	}, [focusMainEditor]);

	// Insert a new margin note
	// Only insert anchor in main editor - the reconciler will handle sync
	const handleInsertMarginNote = useCallback(() => {
		const id = generateId();
		const noteIndex = marginNotes.length + 1;
		
		// Only insert anchor in main editor
		// The margin note block will be created by handleAnchorsChanged via reconciler
		editorRef.current?.insertMarginNote(id, noteIndex);
		
		setSelectedNoteId(id);
	}, [marginNotes.length]);

	// Handle anchor positions update from editor using the reconciler
	// This is the SINGLE SOURCE OF TRUTH for syncing anchors with margin notes
	const handleAnchorsChanged = useCallback((anchors: MarginNoteData[]) => {
		// Convert to reconciler format
		const anchorData = anchors.map(a => ({
			id: a.id,
			line: a.line,
			blockIndex: a.blockIndex,
		}));
		
		// Use ref to get latest notes (prevents stale closure issue)
		const currentNotes = marginNotesRef.current;
		
		console.log('[Reconciler] Input:', {
			anchors: anchorData.map(a => a.id),
			currentNotes: currentNotes.map(n => n.id),
		});
		
		// Run reconciler to compute new notes and commands
		const { notes: newNotes, commands, diff } = reconcile({
			anchors: anchorData,
			currentNotes: currentNotes.map(n => ({
				id: n.id,
				noteIndex: n.noteIndex,
				line: n.line,
				blockIndex: n.blockIndex,
			})),
		});
		
		console.log('[Reconciler] Output:', {
			hasChanges: diff.hasChanges,
			commands: commands.map(c => c.type),
			newNotes: newNotes.map(n => n.id),
		});
		
		// Skip if no changes
		if (!diff.hasChanges) {
			return;
		}
		
		// Execute commands on the margin editor
		commands.forEach(cmd => {
			switch (cmd.type) {
				case 'INSERT_NOTE_BLOCK':
					notesPanelRef.current?.insertNoteBlock(cmd.payload.noteId, cmd.payload.noteIndex);
					break;
				case 'DELETE_NOTE_BLOCK':
					notesPanelRef.current?.deleteNoteBlock(cmd.payload.noteId);
					// Clear selection if deleted note was selected
					if (selectedNoteId === cmd.payload.noteId) {
						setSelectedNoteId(null);
					}
					break;
				case 'UPDATE_NOTE_INDICES':
					notesPanelRef.current?.updateNoteIndices(
						cmd.payload.notes.map(n => ({
							id: n.noteId,
							noteIndex: n.noteIndex,
							line: 0, // Not needed for updateNoteIndices
							blockIndex: 0,
						}))
					);
					break;
			}
		});
		
		// Update state AND ref immediately (ref prevents stale closure on next call)
		const updatedNotes = newNotes.map(n => ({
			id: n.id,
			noteIndex: n.noteIndex,
			line: n.line,
			blockIndex: n.blockIndex,
		}));
		marginNotesRef.current = updatedNotes;
		setMarginNotes(updatedNotes);
		
		console.log('[Reconciler] State updated, ref now has:', marginNotesRef.current.map(n => n.id));
	}, [selectedNoteId]);

	// Handle margin note deleted from editor (anchor was deleted)
	// This is now handled by the reconciler in handleAnchorsChanged
	const handleMarginNoteDeleted = useCallback((id: string) => {
		// The reconciler will handle deletion when it receives updated anchors
		// Just clear selection if this note was selected
		if (selectedNoteId === id) {
			setSelectedNoteId(null);
		}
	}, [selectedNoteId]);

	// Handle note deleted from margin panel (badge click on empty note)
	// This needs to delete the anchor in the main editor
	const handleDeleteNoteFromPanel = useCallback((noteId: string) => {
		editorRef.current?.deleteMarginNote(noteId);
	}, []);

	// Handle content change from margin editor
	const handleMarginContentChange = useCallback((content: string) => {
	}, []);

	// Handle note block focus in margin editor
	const handleNoteBlockFocus = useCallback((noteId: string | null) => {
		setSelectedNoteId(noteId);
	}, []);

	// Toolbar action handlers - route to focused editor
	const handleToggleBold = useCallback(() => {
		if (isMainEditorFocused) {
			editorRef.current?.toggleBold();
		} else if (focusedNoteId) {
			const marginEditor = notesPanelRef.current?.getMarginEditorRef();
			marginEditor?.toggleBold();
		}
	}, [isMainEditorFocused, focusedNoteId]);

	const handleToggleItalic = useCallback(() => {
		if (isMainEditorFocused) {
			editorRef.current?.toggleItalic();
		} else if (focusedNoteId) {
			notesPanelRef.current?.getMarginEditorRef()?.toggleItalic();
		}
	}, [isMainEditorFocused, focusedNoteId]);

	const handleInsertSquare = useCallback(() => {
		if (isMainEditorFocused) {
			editorRef.current?.insertSquare();
		} else if (focusedNoteId) {
			notesPanelRef.current?.getMarginEditorRef()?.insertSquare();
		}
	}, [isMainEditorFocused, focusedNoteId]);

	const handleInsertCircle = useCallback(() => {
		if (isMainEditorFocused) {
			editorRef.current?.insertCircle();
		} else if (focusedNoteId) {
			notesPanelRef.current?.getMarginEditorRef()?.insertCircle();
		}
	}, [isMainEditorFocused, focusedNoteId]);

	const handleInsertFlower = useCallback(() => {
		if (isMainEditorFocused) {
			editorRef.current?.insertFlower();
		} else if (focusedNoteId) {
			notesPanelRef.current?.getMarginEditorRef()?.insertFlower();
		}
	}, [isMainEditorFocused, focusedNoteId]);

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="auto" />

			{/* Toolbar */}
			<View style={styles.toolbar}>
				<TouchableOpacity
					style={[
						styles.toolbarButton, 
						editorState.isBold && styles.toolbarButtonActive,
						!hasAnyEditorFocus && styles.toolbarButtonDisabled,
					]}
					onPress={handleToggleBold}
					disabled={!hasAnyEditorFocus}
				>
					<Text style={[
						styles.toolbarButtonText, 
						editorState.isBold && styles.toolbarButtonTextActive,
						!hasAnyEditorFocus && styles.toolbarButtonTextDisabled,
					]}>
						B
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[
						styles.toolbarButton, 
						editorState.isItalic && styles.toolbarButtonActive,
						!hasAnyEditorFocus && styles.toolbarButtonDisabled,
					]}
					onPress={handleToggleItalic}
					disabled={!hasAnyEditorFocus}
				>
					<Text style={[
						styles.toolbarButtonText, 
						editorState.isItalic && styles.toolbarButtonTextActive, 
						{ fontStyle: 'italic' },
						!hasAnyEditorFocus && styles.toolbarButtonTextDisabled,
					]}>
						I
					</Text>
				</TouchableOpacity>

				<View style={styles.separator} />

				<TouchableOpacity
					style={[styles.shapeButton, !hasAnyEditorFocus && styles.toolbarButtonDisabled]}
					onPress={handleInsertSquare}
					disabled={!hasAnyEditorFocus}
				>
					<SquareIcon size={20} color={hasAnyEditorFocus ? undefined : '#ccc'} />
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.shapeButton, !hasAnyEditorFocus && styles.toolbarButtonDisabled]}
					onPress={handleInsertCircle}
					disabled={!hasAnyEditorFocus}
				>
					<CircleIcon size={20} color={hasAnyEditorFocus ? undefined : '#ccc'} />
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.shapeButton, !hasAnyEditorFocus && styles.toolbarButtonDisabled]}
					onPress={handleInsertFlower}
					disabled={!hasAnyEditorFocus}
				>
					<FlowerIcon size={20} color={hasAnyEditorFocus ? 'lightgray' : '#ccc'} />
				</TouchableOpacity>

				<View style={styles.separator} />

				<TouchableOpacity
					style={[styles.noteButton, !isMainEditorFocused && styles.toolbarButtonDisabled]}
					onPress={handleInsertMarginNote}
					disabled={!isMainEditorFocused}
				>
					<Text style={[styles.noteButtonText, !isMainEditorFocused && { opacity: 0.4 }]}>📝</Text>
				</TouchableOpacity>
			</View>

			{/* Editor Container */}
			<View style={styles.editorContainer}>
				<TipTapEditor
					ref={editorRef}
					initialContent=""
					onContentChange={handleContentChange}
					onSelectionChange={handleSelectionChange}
					onReady={handleReady}
					onFocus={handleEditorFocus}
					onAnchorPositions={handleAnchorsChanged}
					onMarginNoteDeleted={handleMarginNoteDeleted}
					style={styles.editor}
				/>

				<View style={styles.notesPanel}>
					<MarginNotesPanel
						ref={notesPanelRef}
						notes={marginNotes}
						onContentChange={handleMarginContentChange}
						onNoteBlockFocus={handleNoteBlockFocus}
						onDeleteNote={handleDeleteNoteFromPanel}
					/>
				</View>
			</View>
		</SafeAreaView>
	);
}

export default function App() {
	return (
		<SafeAreaProvider>
			<MarginNotesProvider>
				<AppContent />
			</MarginNotesProvider>
		</SafeAreaProvider>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	toolbar: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
		backgroundColor: '#f5f5f5',
	},
	toolbarButton: {
		padding: 8,
		marginHorizontal: 4,
		borderRadius: 4,
		backgroundColor: '#fff',
		minWidth: 36,
		alignItems: 'center',
	},
	toolbarButtonActive: {
		backgroundColor: '#007AFF',
	},
	toolbarButtonDisabled: {
		opacity: 0.5,
	},
	toolbarButtonText: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#333',
	},
	toolbarButtonTextActive: {
		color: '#fff',
	},
	toolbarButtonTextDisabled: {
		color: '#999',
	},
	separator: {
		width: 1,
		height: 24,
		backgroundColor: '#ccc',
		marginHorizontal: 8,
	},
	sectionLabel: {
		fontSize: 12,
		color: '#666',
		marginRight: 4,
	},
	shapeButton: {
		padding: 8,
		marginHorizontal: 4,
		borderRadius: 4,
		backgroundColor: '#fff',
		alignItems: 'center',
		justifyContent: 'center',
	},
	editor: {
		flex: 2,
	},
	editorContainer: {
		flex: 1,
		flexDirection: 'row',
	},
	notesPanel: {
		flex: 1,
		borderLeftWidth: 1,
		borderLeftColor: '#e0e0e0',
	},
	noteButton: {
		padding: 8,
		marginHorizontal: 4,
		borderRadius: 4,
		backgroundColor: '#fff',
		alignItems: 'center',
		justifyContent: 'center',
	},
	noteButtonText: {
		fontSize: 18,
	},
	focusIndicator: {
		marginLeft: 8,
		padding: 4,
	},
	focusIndicatorText: {
		fontSize: 16,
	},
	saveButton: {
		padding: 8,
		marginHorizontal: 4,
		borderRadius: 4,
		backgroundColor: '#007AFF',
		minWidth: 60,
		alignItems: 'center',
	},
	saveButtonText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#fff',
	},
});
