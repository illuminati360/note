import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useState, useCallback } from 'react';
import { TipTapEditor, TipTapEditorRef, EditorState, EditorContent, AnchorPosition, EditorFocusProvider, useEditorFocus } from './src/editor';
import { SquareIcon, CircleIcon, FlowerIcon } from './src/components/ShapeIcons';
import { MarginNotesPanel, MarginNotesPanelRef } from './src/components/MarginNotesPanel';

// Margin note data structure
interface MarginNoteData {
	id: string;
	noteIndex: number;
	content: string;
	line: number;
	blockIndex: number;
}

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
		console.log('Content changed:', content.html);
	}, []);

	const handleSelectionChange = useCallback((state: EditorState) => {
		setEditorState(state);
	}, []);

	const handleReady = useCallback(() => {
		console.log('Editor is ready!');
	}, []);

	// Track when main editor is focused
	const handleEditorFocus = useCallback(() => {
		setFocusedEditor('main');
	}, [setFocusedEditor]);

	const handleSave = useCallback(async () => {
		const content = await editorRef.current?.getContent();
		if (content) {
			console.log('=== Save Button Pressed ===');
			console.log('HTML:', content.html);
			console.log('Margin Notes:', marginNotes);
		}
	}, [marginNotes]);

	// Insert a new margin note - noteIndex will be calculated dynamically
	const handleInsertMarginNote = useCallback(() => {
		const id = generateId();
		
		// Insert anchor in editor (noteIndex will be recalculated based on position)
		editorRef.current?.insertMarginNote(id, 0);
		
		// Create note data (line will be updated when we receive anchor positions)
		setMarginNotes(prev => [...prev, {
			id,
			noteIndex: 0,
			content: '',
			line: 0,
			blockIndex: 0,
		}]);
		
		setSelectedNoteId(id);
	}, []);

	// Handle anchor positions update from editor - this gives us the document order
	const handleAnchorPositions = useCallback((positions: AnchorPosition[]) => {
		setMarginNotes(prev => {
			const sortedPositions = [...positions].sort((a, b) => a.line - b.line);
			
			return prev.map(note => {
				const pos = positions.find(p => p.id === note.id);
				if (pos) {
					const dynamicIndex = sortedPositions.findIndex(p => p.id === note.id) + 1;
					return {
						...note,
						noteIndex: dynamicIndex,
						line: pos.line,
						blockIndex: pos.blockIndex,
					};
				}
				return note;
			});
		});
	}, []);

	// Handle margin note deleted from editor (anchor was deleted)
	const handleMarginNoteDeleted = useCallback((id: string) => {
		setMarginNotes(prev => prev.filter(note => note.id !== id));
		if (selectedNoteId === id) {
			setSelectedNoteId(null);
		}
	}, [selectedNoteId]);

	// Update note content
	const handleNoteContentChange = useCallback((id: string, content: string) => {
		setMarginNotes(prev => prev.map(note => 
			note.id === id ? { ...note, content } : note
		));
	}, []);

	// Delete note (from notes panel)
	const handleNoteDelete = useCallback((id: string) => {
		editorRef.current?.deleteMarginNote(id);
	}, []);

	// Toolbar action handlers - route to focused editor
	const handleToggleBold = useCallback(() => {
		if (isMainEditorFocused) {
			editorRef.current?.toggleBold();
		} else if (focusedNoteId) {
			notesPanelRef.current?.getNoteEditorRef(focusedNoteId)?.toggleBold();
		}
	}, [isMainEditorFocused, focusedNoteId]);

	const handleToggleItalic = useCallback(() => {
		if (isMainEditorFocused) {
			editorRef.current?.toggleItalic();
		} else if (focusedNoteId) {
			notesPanelRef.current?.getNoteEditorRef(focusedNoteId)?.toggleItalic();
		}
	}, [isMainEditorFocused, focusedNoteId]);

	const handleInsertSquare = useCallback(() => {
		if (isMainEditorFocused) {
			editorRef.current?.insertSquare();
		} else if (focusedNoteId) {
			notesPanelRef.current?.getNoteEditorRef(focusedNoteId)?.insertSquare();
		}
	}, [isMainEditorFocused, focusedNoteId]);

	const handleInsertCircle = useCallback(() => {
		if (isMainEditorFocused) {
			editorRef.current?.insertCircle();
		} else if (focusedNoteId) {
			notesPanelRef.current?.getNoteEditorRef(focusedNoteId)?.insertCircle();
		}
	}, [isMainEditorFocused, focusedNoteId]);

	const handleInsertFlower = useCallback(() => {
		if (isMainEditorFocused) {
			editorRef.current?.insertFlower();
		} else if (focusedNoteId) {
			notesPanelRef.current?.getNoteEditorRef(focusedNoteId)?.insertFlower();
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

				<Text style={styles.sectionLabel}>Shapes:</Text>
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

				<View style={{ flex: 1 }} />

				<TouchableOpacity style={styles.saveButton} onPress={handleSave}>
					<Text style={styles.saveButtonText}>Save</Text>
				</TouchableOpacity>
			</View>

			{/* Editor Container */}
			<View style={styles.editorContainer}>
				<TipTapEditor
					ref={editorRef}
					initialContent="<p>Hello from <strong>TipTap</strong> in React Native!</p>"
					onContentChange={handleContentChange}
					onSelectionChange={handleSelectionChange}
					onReady={handleReady}
					onFocus={handleEditorFocus}
					onAnchorPositions={handleAnchorPositions}
					onMarginNoteDeleted={handleMarginNoteDeleted}
					style={styles.editor}
				/>

				<View style={styles.notesPanel}>
					<MarginNotesPanel
						ref={notesPanelRef}
						notes={marginNotes}
						onNoteChange={handleNoteContentChange}
						onNoteDelete={handleNoteDelete}
						selectedNoteId={selectedNoteId}
						onNoteSelect={setSelectedNoteId}
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
