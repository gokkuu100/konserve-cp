import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../ThemeContext';

const ClarificationForm = ({ onSubmit, questions }) => {
  const { isDarkMode, theme } = useTheme();
  const [answers, setAnswers] = useState({});

  const handleAnswerChange = (questionIndex, answer) => {
    setAnswers({
      ...answers,
      [questionIndex]: answer
    });
  };

  const handleSubmit = () => {
    // Check if all questions have answers
    const unansweredQuestions = questions.filter((_, index) => !answers[index]);
    
    if (unansweredQuestions.length > 0) {
      Alert.alert(
        'Missing Answers',
        'Please answer all questions before submitting.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Format answers for submission
    const formattedAnswers = questions.map((question, index) => ({
      question,
      answer: answers[index]
    }));

    onSubmit({
      responseType: 'clarification',
      clarificationAnswers: {
        answers: formattedAnswers
      }
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          <Text style={[styles.formTitle, { color: isDarkMode ? theme.text : '#333' }]}>
            Clarification Questions
          </Text>
          
          <Text style={[styles.formDescription, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
            Please answer the following questions to proceed with the negotiation.
          </Text>
          
          <View style={styles.questionsContainer}>
            {questions.map((question, index) => (
              <View key={index} style={styles.questionItem}>
                <View style={styles.questionHeader}>
                  <MaterialIcons name="help" size={20} color="#FF9800" />
                  <Text style={[styles.questionText, { color: isDarkMode ? theme.text : '#333' }]}>
                    {question}
                  </Text>
                </View>
                
                <TextInput
                  style={[styles.answerInput, { 
                    backgroundColor: isDarkMode ? theme.inputBackground : '#f5f5f5',
                    color: isDarkMode ? theme.text : '#333',
                    borderColor: isDarkMode ? theme.border : '#e0e0e0',
                    textAlignVertical: 'top'
                  }]}
                  value={answers[index] || ''}
                  onChangeText={(text) => handleAnswerChange(index, text)}
                  placeholder="Type your answer here..."
                  placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
                  multiline
                  numberOfLines={3}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Submit Answers</Text>
          <MaterialIcons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  formDescription: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  questionsContainer: {
    marginBottom: 16,
  },
  questionItem: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  answerInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 80,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default ClarificationForm;
