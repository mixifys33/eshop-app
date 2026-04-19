import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const RichTextEditor = ({ value, onChange, placeholder = "Write a detailed product description here..." }) => {
  const [editorValue, setEditorValue] = useState(value || '');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  const handleTextChange = (text) => {
    setEditorValue(text);
    onChange && onChange(text);
  };

  const formatText = (format) => {
    // Simple text formatting for React Native
    // In a real implementation, you'd use a proper rich text editor
    switch (format) {
      case 'bold':
        setIsBold(!isBold);
        break;
      case 'italic':
        setIsItalic(!isItalic);
        break;
      case 'underline':
        setIsUnderline(!isUnderline);
        break;
    }
  };

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.toolbarContent}>
            <TouchableOpacity
              style={[styles.toolButton, isBold && styles.activeButton]}
              onPress={() => formatText('bold')}
            >
              <Text style={[styles.toolButtonText, isBold && styles.activeButtonText]}>B</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolButton, isItalic && styles.activeButton]}
              onPress={() => formatText('italic')}
            >
              <Text style={[styles.toolButtonText, styles.italicText, isItalic && styles.activeButtonText]}>I</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolButton, isUnderline && styles.activeButton]}
              onPress={() => formatText('underline')}
            >
              <Text style={[styles.toolButtonText, styles.underlineText, isUnderline && styles.activeButtonText]}>U</Text>
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity style={styles.toolButton}>
              <Ionicons name="list" size={16} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolButton}>
              <Ionicons name="link" size={16} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolButton}>
              <Ionicons name="image" size={16} color="#ccc" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Editor */}
      <TextInput
        style={[
          styles.editor,
          isBold && { fontWeight: 'bold' },
          isItalic && { fontStyle: 'italic' },
          isUnderline && { textDecorationLine: 'underline' }
        ]}
        placeholder={placeholder}
        placeholderTextColor="#666"
        multiline
        numberOfLines={10}
        value={editorValue}
        onChangeText={handleTextChange}
        textAlignVertical="top"
      />

      {/* Word Count */}
      <View style={styles.footer}>
        <Text style={styles.wordCount}>
          {editorValue.split(/\s+/).filter(word => word).length} words
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#333',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
    overflow: 'hidden',
  },
  toolbar: {
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    paddingVertical: 8,
  },
  toolbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 4,
  },
  toolButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'transparent',
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeButton: {
    backgroundColor: '#3498db',
  },
  toolButtonText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
  },
  activeButtonText: {
    color: '#fff',
  },
  italicText: {
    fontStyle: 'italic',
  },
  underlineText: {
    textDecorationLine: 'underline',
  },
  separator: {
    width: 1,
    height: 20,
    backgroundColor: '#555',
    marginHorizontal: 8,
  },
  editor: {
    padding: 15,
    fontSize: 16,
    color: '#fff',
    minHeight: 200,
    maxHeight: 300,
  },
  footer: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  wordCount: {
    color: '#666',
    fontSize: 12,
    textAlign: 'right',
  },
});

export default RichTextEditor;