import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useState, useCallback } from 'react';
import { TipTapEditor, TipTapEditorRef, EditorState, EditorContent, AnchorPosition } from './src/editor';
import { SquareIcon, CircleIcon, FlowerIcon } from './src/components/ShapeIcons';
import { MarginNotesPanel } from './src/components/MarginNotesPanel';

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

export default function App() {
	const editorRef = useRef<TipTapEditorRef>(null);
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
	const [noteCounter, setNoteCounter] = useState(1);
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

	const handleSave = useCallback(async () => {
		const content = await editorRef.current?.getContent();
		if (content) {
			console.log('=== Save Button Pressed ===');
			console.log('HTML:', content.html);
			console.log('Margin Notes:', marginNotes);
		}
	}, [marginNotes]);

	// Insert a new margin note
	const handleInsertMarginNote = useCallback(() => {
		const id = generateId();
		const index = noteCounter;
		
		// Insert anchor in editor
		editorRef.current?.insertMarginNote(id, index);
		
		// Create note data (line will be updated when we receive anchor positions)
		setMarginNotes(prev => [...prev, {
			id,
			noteIndex: index,
			content: '',
			line: 0,
			blockIndex: 0,
		}]);
		
		setNoteCounter(prev => prev + 1);
		setSelectedNoteId(id);
	}, [noteCounter]);

	// Handle anchor positions update from editor
	const handleAnchorPositions = useCallback((positions: AnchorPosition[]) => {
		setMarginNotes(prev => prev.map(note => {
			const pos = positions.find(p => p.id === note.id);
			if (pos) {
				return {
					...note,
					noteIndex: pos.noteIndex,
					line: pos.line,
					blockIndex: pos.blockIndex,
				};
			}
			return note;
		}));
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
		// Delete anchor in editor
		editorRef.current?.deleteMarginNote(id);
		// Note will be removed when we receive margin-note-deleted message
	}, []);

	return (
		<SafeAreaProvider>
			<SafeAreaView style={styles.container}>
				<StatusBar style="auto" />

				{/* Toolbar */}
				<View style={styles.toolbar}>
					<TouchableOpacity
						style={[styles.toolbarButton, editorState.isBold && styles.toolbarButtonActive]}
						onPress={() => editorRef.current?.toggleBold()}
					>
						<Text style={[styles.toolbarButtonText, editorState.isBold && styles.toolbarButtonTextActive]}>
							B
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.toolbarButton, editorState.isItalic && styles.toolbarButtonActive]}
						onPress={() => editorRef.current?.toggleItalic()}
					>
						<Text style={[styles.toolbarButtonText, editorState.isItalic && styles.toolbarButtonTextActive, { fontStyle: 'italic' }]}>
							I
						</Text>
					</TouchableOpacity>

					{/* Separator */}
					<View style={styles.separator} />

					{/* Shapes Section */}
					<Text style={styles.sectionLabel}>Shapes:</Text>
					<TouchableOpacity
						style={styles.shapeButton}
						onPress={() => editorRef.current?.insertSquare()}
					>
						<SquareIcon size={20} />
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.shapeButton}
						onPress={() => editorRef.current?.insertCircle()}
					>
						<CircleIcon size={20} />
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.shapeButton}
						onPress={() => editorRef.current?.insertFlower()}
					>
						<FlowerIcon size={20} color='lightgray'/>
					</TouchableOpacity>

					{/* Separator */}
					<View style={styles.separator} />

					{/* Margin Note Button */}
					<TouchableOpacity
						style={styles.noteButton}
						onPress={handleInsertMarginNote}
					>
						<Text style={styles.noteButtonText}>📝</Text>
					</TouchableOpacity>

					{/* Spacer */}
					<View style={{ flex: 1 }} />

					{/* Save Button */}
					<TouchableOpacity
						style={styles.saveButton}
						onPress={handleSave}
					>
						<Text style={styles.saveButtonText}>Save</Text>
					</TouchableOpacity>
				</View>

				{/* Editor Container - Side by side layout */}
				<View style={styles.editorContainer}>
					{/* Main Editor */}
					<TipTapEditor
						ref={editorRef}
						initialContent="<p>Hello from <strong>TipTap</strong> in React Native!</p>"
						onContentChange={handleContentChange}
						onSelectionChange={handleSelectionChange}
						onReady={handleReady}
						onAnchorPositions={handleAnchorPositions}
						onMarginNoteDeleted={handleMarginNoteDeleted}
						style={styles.editor}
					/>

					{/* Margin Notes Panel */}
					<View style={styles.notesPanel}>
						<MarginNotesPanel
							notes={marginNotes}
							onNoteChange={handleNoteContentChange}
							onNoteDelete={handleNoteDelete}
							selectedNoteId={selectedNoteId}
							onNoteSelect={setSelectedNoteId}
						/>
					</View>
				</View>
			</SafeAreaView>
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
	toolbarButtonText: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#333',
	},
	toolbarButtonTextActive: {
		color: '#fff',
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
	squareIcon: {
		width: 18,
		height: 18,
		borderWidth: 2,
		borderColor: '#333',
		backgroundColor: 'transparent',
	},
	circleIcon: {
		width: 18,
		height: 18,
		borderWidth: 2,
		borderColor: '#333',
		borderRadius: 9,
		backgroundColor: 'transparent',
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
