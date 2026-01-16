import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useState, useCallback, useEffect } from 'react';
import { TipTapEditor, TipTapEditorRef, EditorState, EditorContent, MarginNoteData, EditorFocusProvider, useEditorFocus } from './src/editor';
import { SquareIcon, CircleIcon, FlowerIcon } from './src/components/ShapeIcons';
import { MarginNotesPanel, MarginNotesPanelRef } from './src/components/MarginNotesPanel';

// Generate unique ID
function generateId(): string {
	return Math.random().toString(36).substring(2, 11);
}

// Inner component that uses the focus context
function AppContent() {
	const editorRef = useRef<TipTapEditorRef>(null);
	const notesPanelRef = useRef<MarginNotesPanelRef>(null);
	const { focusedEditor, setFocusedEditor, isMainEditorFocused, focusedNoteId } = useEditorFocus();
	
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

	const handleContentChange = useCallback((content: EditorContent) => {
	}, []);

	const handleSelectionChange = useCallback((state: EditorState) => {
		setEditorState(state);
	}, []);

	const handleReady = useCallback(() => {
	}, []);

	// Track when main editor is focused
	const handleEditorFocus = useCallback(() => {
		setFocusedEditor('main');
	}, [setFocusedEditor]);

	// Insert a new margin note
	// Only insert anchor in main editor - the sync will be handled by syncMarginNotes
	const handleInsertMarginNote = useCallback(() => {
		const id = generateId();
		const noteIndex = marginNotes.length + 1;
		
		// Only insert anchor in main editor
		// The margin note block will be created by syncMarginNotes when it detects the new anchor
		editorRef.current?.insertMarginNote(id, noteIndex);
		
		setSelectedNoteId(id);
	}, [marginNotes.length]);

	// Track previous notes to detect changes
	const prevNotesRef = useRef<MarginNoteData[]>([]);

	// Handle anchor positions update from editor - this gives us the document order
	// This is the SINGLE SOURCE OF TRUTH for syncing anchors with margin notes
	const syncMarginNotes = useCallback((positions: MarginNoteData[]) => {
		// Sort positions by document order (line number)
		const sortedPositions = [...positions].sort((a, b) => a.line - b.line);
		
		// Build new notes array based on anchor order
		const updatedNotes: MarginNoteData[] = sortedPositions.map((pos, index) => ({
			id: pos.id,
			noteIndex: index + 1,
			line: pos.line,
			blockIndex: pos.blockIndex,
		}));

		setMarginNotes(updatedNotes);
	}, []);

	// Sync MarginEditor with marginNotes state changes
	useEffect(() => {
		const prev = prevNotesRef.current;
		const current = marginNotes;
		
		const prevIds = new Set(prev.map(n => n.id));
		const currentIds = new Set(current.map(n => n.id));
		
		// Delete removed notes first
		prev.forEach(note => {
			if (!currentIds.has(note.id)) {
				notesPanelRef.current?.deleteNoteBlock(note.id);
			}
		});
		
		// Insert new notes
		current.forEach(note => {
			if (!prevIds.has(note.id)) {
				notesPanelRef.current?.insertNoteBlock(note.id, note.noteIndex);
			}
		});
		
		// Update all note block indices
		notesPanelRef.current?.updateNoteIndices(current);
		
		prevNotesRef.current = current;
	}, [marginNotes]);

	// Handle margin note deleted from editor (anchor was deleted)
	// Note: This is now handled in syncMarginNotes, but we keep this
	// for immediate feedback when user explicitly deletes an anchor
	const handleMarginNoteDeleted = useCallback((id: string) => {
		// The actual deletion will be handled by syncMarginNotes
		// when it receives the updated positions
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
	}, [isMainEditorFocused, focusedNoteId, focusedEditor]);

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

	const hasEditorFocus = focusedEditor !== null;

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="auto" />

			{/* Toolbar */}
			<View style={styles.toolbar}>
				<TouchableOpacity
					style={[
						styles.toolbarButton, 
						editorState.isBold && styles.toolbarButtonActive,
						!hasEditorFocus && styles.toolbarButtonDisabled,
					]}
					onPress={handleToggleBold}
					disabled={!hasEditorFocus}
				>
					<Text style={[
						styles.toolbarButtonText, 
						editorState.isBold && styles.toolbarButtonTextActive,
						!hasEditorFocus && styles.toolbarButtonTextDisabled,
					]}>
						B
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[
						styles.toolbarButton, 
						editorState.isItalic && styles.toolbarButtonActive,
						!hasEditorFocus && styles.toolbarButtonDisabled,
					]}
					onPress={handleToggleItalic}
					disabled={!hasEditorFocus}
				>
					<Text style={[
						styles.toolbarButtonText, 
						editorState.isItalic && styles.toolbarButtonTextActive, 
						{ fontStyle: 'italic' },
						!hasEditorFocus && styles.toolbarButtonTextDisabled,
					]}>
						I
					</Text>
				</TouchableOpacity>

				<View style={styles.separator} />

				<TouchableOpacity
					style={[styles.shapeButton, !hasEditorFocus && styles.toolbarButtonDisabled]}
					onPress={handleInsertSquare}
					disabled={!hasEditorFocus}
				>
					<SquareIcon size={20} color={hasEditorFocus ? undefined : '#ccc'} />
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.shapeButton, !hasEditorFocus && styles.toolbarButtonDisabled]}
					onPress={handleInsertCircle}
					disabled={!hasEditorFocus}
				>
					<CircleIcon size={20} color={hasEditorFocus ? undefined : '#ccc'} />
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.shapeButton, !hasEditorFocus && styles.toolbarButtonDisabled]}
					onPress={handleInsertFlower}
					disabled={!hasEditorFocus}
				>
					<FlowerIcon size={20} color={hasEditorFocus ? 'lightgray' : '#ccc'} />
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
					onAnchorPositions={syncMarginNotes}
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
			<EditorFocusProvider>
				<AppContent />
			</EditorFocusProvider>
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
