import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const WasteCalendarScreen = () => {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState('');
  const [memo, setMemo] = useState('');
  const [memoTime, setMemoTime] = useState('09:00');
  const [markedDates, setMarkedDates] = useState({});
  const [savedMemos, setSavedMemos] = useState({});

  // Request notification permissions
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow notifications to receive reminders');
      }
    })();
    
    // Load saved memos on component mount
    loadSavedMemos();
  }, []);

  // Load saved memos from AsyncStorage
  const loadSavedMemos = async () => {
    try {
      const savedMemosData = await AsyncStorage.getItem('wasteMemos');
      if (savedMemosData) {
        const memos = JSON.parse(savedMemosData);
        setSavedMemos(memos);
        
        // Update marked dates based on saved memos
        const dates = {};
        Object.keys(memos).forEach(date => {
          dates[date] = { selected: true, marked: true, dotColor: '#2ecc71' };
        });
        setMarkedDates(dates);
      }
    } catch (error) {
      console.error('Error loading saved memos:', error);
    }
  };

  // Save memos to AsyncStorage
  const saveMemos = async (updatedMemos) => {
    try {
      await AsyncStorage.setItem('wasteMemos', JSON.stringify(updatedMemos));
    } catch (error) {
      console.error('Error saving memos:', error);
    }
  };

  // Handle date selection
  const handleDateSelect = (date) => {
    setSelectedDate(date.dateString);
    setMemo(savedMemos[date.dateString]?.text || '');
    setMemoTime(savedMemos[date.dateString]?.time || '09:00');
  };

  // Schedule a notification
  const scheduleNotification = async (date, time, memo) => {
    const [hours, minutes] = time.split(':').map(Number);
    
    const notificationDate = new Date(date);
    notificationDate.setHours(hours, minutes, 0);
    
    // Don't schedule if date is in the past
    if (notificationDate <= new Date()) {
      return null;
    }
    
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Waste Management Reminder',
          body: memo,
          data: { date, memo },
        },
        trigger: {
          date: notificationDate,
        },
      });
      return identifier;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  };

  // Cancel a notification
  const cancelNotification = async (identifier) => {
    if (identifier) {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    }
  };

  // Save memo for selected date
  const saveMemo = async () => {
    if (!selectedDate) {
      Alert.alert('Select a date', 'Please select a date first');
      return;
    }
    
    if (!memo.trim()) {
      Alert.alert('Enter memo', 'Please enter a memo description');
      return;
    }
    
    // Cancel previous notification if exists
    if (savedMemos[selectedDate]?.notificationId) {
      await cancelNotification(savedMemos[selectedDate].notificationId);
    }
    
    // Schedule new notification
    const notificationId = await scheduleNotification(selectedDate, memoTime, memo);
    
    // Update saved memos
    const updatedMemos = {
      ...savedMemos,
      [selectedDate]: {
        text: memo,
        time: memoTime,
        notificationId,
      },
    };
    
    // Update marked dates
    const updatedMarkedDates = {
      ...markedDates,
      [selectedDate]: { selected: true, marked: true, dotColor: '#2ecc71' },
    };
    
    setSavedMemos(updatedMemos);
    setMarkedDates(updatedMarkedDates);
    await saveMemos(updatedMemos);
    
    Alert.alert('Success', 'Memo saved and reminder scheduled');
  };

  // Delete memo for selected date
  const deleteMemo = async () => {
    if (!selectedDate || !savedMemos[selectedDate]) {
      return;
    }
    
    // Cancel notification
    if (savedMemos[selectedDate].notificationId) {
      await cancelNotification(savedMemos[selectedDate].notificationId);
    }
    
    // Update saved memos
    const updatedMemos = { ...savedMemos };
    delete updatedMemos[selectedDate];
    
    // Update marked dates
    const updatedMarkedDates = { ...markedDates };
    delete updatedMarkedDates[selectedDate];
    
    setSavedMemos(updatedMemos);
    setMarkedDates(updatedMarkedDates);
    setMemo('');
    await saveMemos(updatedMemos);
    
    Alert.alert('Success', 'Memo deleted');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.headerTitle}>Waste Collection Calendar</Text>
      <Text style={styles.headerSubtitle}>Schedule your waste collection reminders</Text>
      
      <View style={styles.calendarContainer}>
        <Calendar
          onDayPress={handleDateSelect}
          markedDates={{
            ...markedDates,
            [selectedDate]: { 
              ...(markedDates[selectedDate] || {}), 
              selected: true, 
              selectedColor: '#3498db',
            },
          }}
          theme={{
            todayTextColor: '#2ecc71',
            arrowColor: '#3498db',
            selectedDayBackgroundColor: '#3498db',
            textDayFontSize: 14,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 13,
          }}
        />
      </View>
      
      {selectedDate ? (
        <View style={styles.memoContainer}>
          <Text style={styles.dateTitle}>
            {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Reminder time:</Text>
            <TextInput
              style={styles.timeInput}
              value={memoTime}
              onChangeText={setMemoTime}
              placeholder="09:00"
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            />
          </View>
          
          <TextInput
            style={styles.memoInput}
            value={memo}
            onChangeText={setMemo}
            placeholder="Enter collection details or reminder notes..."
            multiline
          />
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.saveButton} onPress={saveMemo}>
              <MaterialIcons name="save" size={20} color="#fff" />
              <Text style={styles.buttonText}>Save Reminder</Text>
            </TouchableOpacity>
            
            {savedMemos[selectedDate] && (
              <TouchableOpacity style={styles.deleteButton} onPress={deleteMemo}>
                <MaterialIcons name="delete" size={20} color="#fff" />
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.placeholderContainer}>
          <MaterialIcons name="event-note" size={60} color="#bdc3c7" />
          <Text style={styles.placeholderText}>Select a date to add a reminder</Text>
        </View>
      )}
      
      <View style={styles.savedMemosContainer}>
        <Text style={styles.savedMemosTitle}>Upcoming Reminders</Text>
        <ScrollView style={styles.savedMemosList}>
          {Object.entries(savedMemos)
            .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
            .filter(([date]) => new Date(date) >= new Date().setHours(0, 0, 0, 0))
            .slice(0, 3)
            .map(([date, memoData]) => (
              <TouchableOpacity 
                key={date} 
                style={styles.savedMemoItem}
                onPress={() => {
                  setSelectedDate(date);
                  setMemo(memoData.text);
                  setMemoTime(memoData.time);
                }}
              >
                <View style={styles.savedMemoDate}>
                  <Text style={styles.savedMemoDay}>
                    {new Date(date).getDate()}
                  </Text>
                  <Text style={styles.savedMemoMonth}>
                    {new Date(date).toLocaleDateString('en-US', { month: 'short' })}
                  </Text>
                </View>
                <View style={styles.savedMemoContent}>
                  <Text style={styles.savedMemoTime}>{memoData.time}</Text>
                  <Text style={styles.savedMemoText} numberOfLines={2}>
                    {memoData.text}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#bdc3c7" />
              </TouchableOpacity>
            ))}
          
          {Object.keys(savedMemos).filter(date => new Date(date) >= new Date().setHours(0, 0, 0, 0)).length === 0 && (
            <Text style={styles.noRemindersText}>No upcoming reminders</Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    marginHorizontal: 16,
    color: '#34495e',
  },
  headerSubtitle: {
    fontSize: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    color: '#7f8c8d',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memoContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#34495e',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 16,
    marginRight: 12,
    color: '#34495e',
    width: 110,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    flex: 1,
  },
  memoInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  saveButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  placeholderText: {
    fontSize: 16,
    color: '#95a5a6',
    marginTop: 16,
    textAlign: 'center',
  },
  savedMemosContainer: {
    flex: 1,
    margin: 16,
    marginTop: 0,
  },
  savedMemosTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#34495e',
  },
  savedMemosList: {
    flex: 1,
  },
  savedMemoItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
  },
  savedMemoDate: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  savedMemoDay: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  savedMemoMonth: {
    color: '#fff',
    fontSize: 12,
  },
  savedMemoContent: {
    flex: 1,
  },
  savedMemoTime: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  savedMemoText: {
    fontSize: 16,
    color: '#34495e',
  },
  noRemindersText: {
    textAlign: 'center',
    color: '#95a5a6',
    fontSize: 16,
    padding: 20,
  },
});

export default WasteCalendarScreen;