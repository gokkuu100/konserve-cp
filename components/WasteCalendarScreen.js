import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '../contexts/AuthContext';
import CalendarManager from '../supabase/manager/calendar/CalendarManager';
import NotificationService from '../supabase/services/NotificationService';
import { useTheme } from '../ThemeContext';


const WasteCalendarScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();
  
  // Define waste management themed colors with dark mode support
  const colors = {
    background: isDarkMode ? theme.background : '#F7F9F4',
    card: isDarkMode ? theme.cardBackground : '#FFFFFF',
    cardAlt: isDarkMode ? '#222' : '#F0F4EA',
    text: isDarkMode ? theme.text : '#2C3E50',
    secondaryText: isDarkMode ? theme.textSecondary : '#617487',
    primary: theme.primary || '#4CAF50',    // Green 
    accent: '#FFA000',     // Amber color
    border: isDarkMode ? '#444' : '#E0E6D9',
    error: isDarkMode ? '#ff6b6b' : '#E74C3C',
    headerBackground: isDarkMode ? '#1a331a' : '#3E7D41' // Darker green for header
  };
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [memoText, setMemoText] = useState('');
  const [memoTitle, setMemoTitle] = useState('');
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [memos, setMemos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [upcomingMemos, setUpcomingMemos] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedMemoId, setSelectedMemoId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Format today's date for the calendar
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (user?.id) {
      loadSavedMemos(user.id);
      loadMemoDates(user.id);
      loadUpcomingMemos(user.id);
    }
  }, [user, selectedDate]);

  const loadMemoDates = async (uid) => {
    try {
      setLoading(true);
      const { data, error } = await CalendarManager.getMemoDates(uid);
      
      if (error) {
        console.error('Error loading memo dates:', error);
        return;
      }
      
      const marks = {};
      data.forEach(date => {
        marks[date] = {
          marked: true,
          dotColor: colors.primary
        };
      });
      
      const todayObj = marks[today] || {};
      marks[today] = {
        ...todayObj,
        selected: today === selectedDate,
        selectedColor: colors.accent, // Use amber color for today
      };
      
      if (selectedDate && selectedDate !== today) {
        const selectedObj = marks[selectedDate] || {};
        marks[selectedDate] = {
          ...selectedObj,
          selected: true,
          selectedColor: colors.primary, 
        };
      }
      
      setMarkedDates(marks);
    } catch (error) {
      console.error('Error loading memo dates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedMemos = async (uid) => {
    try {
      setLoading(true);
      const { data, error } = await CalendarManager.getMemosByDate(uid, selectedDate);
      
      if (error) {
        Alert.alert('Error', 'Failed to load memos');
        console.error('Error loading memos:', error);
        return;
      }
      
      // Make sure data is for the selected date only
      const filteredData = data ? data.filter(memo => memo.date === selectedDate) : [];
      setMemos(filteredData);
    } catch (error) {
      console.error('Error in loadSavedMemos:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const loadUpcomingMemos = async (uid) => {
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      
      const { data, error } = await CalendarManager.getUpcomingMemos(uid, 5);
      
      if (error) {
        console.error('Error loading upcoming memos:', error);
        return;
      }
      
      const filteredUpcoming = data ? data.filter(memo => {
        return memo.date >= currentDate && memo.date !== selectedDate;
      }) : [];
      
      filteredUpcoming.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.time || '00:00').localeCompare(b.time || '00:00');
      });
      
      setUpcomingMemos(filteredUpcoming);
    } catch (error) {
      console.error('Error in loadUpcomingMemos:', error);
    }
  };

  const saveMemoToSupabase = async (memoData) => {
    try {
      const { data, error } = await CalendarManager.createMemo({
        user_id: user.id,
        date: selectedDate,
        title: memoTitle || 'Reminder',
        text: memoText,
        time: selectedTime ? moment(selectedTime).format('HH:mm') : null,
        notification_id: memoData.notification_id
      });
      
      if (error) {
        Alert.alert('Error', 'Failed to save memo');
        console.error('Error saving memo:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in saveMemoToSupabase:', error);
      Alert.alert('Error', 'An unexpected error occurred');
      return null;
    }
  };

  const updateMemoInSupabase = async (memoId, memoData) => {
    try {
      const { data, error } = await CalendarManager.updateMemo(memoId, {
        title: memoTitle,
        text: memoText,
        time: moment(selectedTime).format('HH:mm'),
        notification_id: memoData.notification_id
      });
      
      if (error) {
        Alert.alert('Error', 'Failed to update memo');
        console.error('Error updating memo:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in updateMemoInSupabase:', error);
      Alert.alert('Error', 'An unexpected error occurred');
      return null;
    }
  };

  const deleteMemoFromSupabase = async (memoId) => {
    try {
      const memo = memos.find(m => m.id === memoId);
      
      if (memo?.notification_id) {
        await cancelNotification(memo.notification_id);
      }
      
      const { error } = await CalendarManager.deleteMemo(memoId);
      
      if (error) {
        Alert.alert('Error', 'Failed to delete memo');
        console.error('Error deleting memo:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteMemoFromSupabase:', error);
      Alert.alert('Error', 'An unexpected error occurred');
      return false;
    }
  };

  const handleDateSelect = (date) => {
    const formattedDate = date.dateString;
    setSelectedDate(formattedDate);
    
    // Update marked dates to show selected date
    const updatedMarks = { ...markedDates };
    
    // Remove previous selection
    Object.keys(updatedMarks).forEach(key => {
      if (updatedMarks[key].selected && key !== today) {
        updatedMarks[key] = {
          ...updatedMarks[key],
          selected: false
        };
      }
    });
    
    // Add new selection
    updatedMarks[formattedDate] = {
      ...updatedMarks[formattedDate],
      selected: true,
      selectedColor: colors.primary
    };
    
    // Make sure today keeps its special color
    if (today in updatedMarks && today !== formattedDate) {
      updatedMarks[today] = {
        ...updatedMarks[today],
        selectedColor: colors.accent
      };
    }
    
    setMarkedDates(updatedMarks);
    
  };


  const scheduleNotification = async (date, time, memo) => {
    try {
      const trigger = new Date(date);
      const [hours, minutes] = time.split(':');
      trigger.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
      
      // Don't schedule if the time is in the past
      if (trigger < new Date()) {
        console.log('Notification time is in the past');
        return null;
      }
      
      const memoTitle = memo.title || 'Waste Calendar Reminder';
      
      const identifier = await NotificationService.scheduleNotification({
        title: memoTitle,
        body: memo.text,
        data: { screen: 'WasteCalendar', date: date, memoId: memo.id },
        trigger,
      });
      
      return identifier;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  };

  const cancelNotification = async (identifier) => {
    if (!identifier) return;
    
    try {
      await NotificationService.cancelNotification(identifier);
      console.log('Notification canceled:', identifier);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setSelectedTime(selectedTime);
    }
  };

  const formatTime = (time) => {
    return moment(time).format('hh:mm A');
  };

  const saveMemo = async () => {
    if (!memoText.trim()) {
      Alert.alert('Error', 'Please enter memo text');
      return;
    }
    
    try {
      setLoading(true);
      
      // If editing existing memo
      if (isEditing && selectedMemoId) {
        const memo = memos.find(m => m.id === selectedMemoId);
        
        // Cancel existing notification if there is one
        if (memo.notification_id) {
          await cancelNotification(memo.notification_id);
        }
        
        // Schedule new notification if needed
        let notificationId = null;
        if (selectedTime) {
          const memoData = {
            id: selectedMemoId,
            title: memoTitle,
            text: memoText
          };
          notificationId = await scheduleNotification(
            selectedDate,
            moment(selectedTime).format('HH:mm'),
            memoData
          );
        }
        
        // Update memo in database
        await updateMemoInSupabase(selectedMemoId, { notification_id: notificationId });
        
      } else {
        // Creating a new memo
        const memoData = {
          title: memoTitle,
          text: memoText,
          notification_id: null
        };
        
        // Save memo first to get ID
        const savedMemo = await saveMemoToSupabase(memoData);
        
        if (savedMemo) {
          // Schedule notification if time is selected
          if (selectedTime) {
            const notificationId = await scheduleNotification(
              selectedDate,
              moment(selectedTime).format('HH:mm'),
              savedMemo
            );
            
            if (notificationId) {
              // Update memo with notification ID
              await CalendarManager.updateMemo(savedMemo.id, {
                notification_id: notificationId
              });
            }
          }
        }
      }
      
      setMemoText('');
      setMemoTitle('');
      setSelectedTime(new Date());
      setModalVisible(false);
      setIsEditing(false);
      setSelectedMemoId(null);
      
      // Reload data
      await loadSavedMemos(user.id);
      await loadMemoDates(user.id);
      await loadUpcomingMemos(user.id);
      
    } catch (error) {
      console.error('Error saving memo:', error);
      Alert.alert('Error', 'Failed to save memo');
    } finally {
      setLoading(false);
    }
  };

  const editMemo = (memo) => {
    setMemoTitle(memo.title || '');
    setMemoText(memo.text || '');
    setSelectedMemoId(memo.id);
    setIsEditing(true);
    
    // Set the time if available
    if (memo.time) {
      const [hours, minutes] = memo.time.split(':');
      const timeDate = new Date();
      timeDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
      setSelectedTime(timeDate);
    } else {
      setSelectedTime(new Date());
    }
    
    setModalVisible(true);
  };

  const deleteMemo = async (memoId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this memo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const success = await deleteMemoFromSupabase(memoId);
              
              if (success) {
                await loadSavedMemos(user.id);
                await loadMemoDates(user.id);
                await loadUpcomingMemos(user.id);
              }
            } catch (error) {
              console.error('Error deleting memo:', error);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderMemoItem = (memo) => {
    const formattedDate = moment(memo.date).format('MMM DD, YYYY');
    
    return (
      <View key={memo.id} style={[styles.memoItem, { 
        backgroundColor: isDarkMode ? theme.cardBackground : 'rgba(255,255,255,0.9)',
        borderColor: isDarkMode ? '#444' : undefined
      }]}>
        <View style={styles.memoContent}>
          <Text style={[styles.memoTitle, { color: colors.text }]}>
            {memo.title || 'Reminder'}
          </Text>
          <Text style={[styles.memoText, { color: colors.text }]}>{memo.text}</Text>
          {memo.time && (
            <Text style={[styles.memoTime, { color: colors.secondaryText }]}>
              {memo.time ? moment(memo.time, 'HH:mm').format('hh:mm A') : ''}
            </Text>
          )}
          {selectedDate !== memo.date && (
            <Text style={[styles.memoDate, { color: colors.secondaryText }]}>
              {formattedDate}
            </Text>
          )}
        </View>
        <View style={styles.memoActions}>
          <TouchableOpacity onPress={() => editMemo(memo)} style={styles.actionButton}>
            <Ionicons name="pencil" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteMemo(memo.id)} style={styles.actionButton}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <>
      {/* Top Safe Area - colored */}
      {Platform.OS === 'ios' && (
        <SafeAreaView style={{ flex: 0, backgroundColor: colors.headerBackground }} />
      )}
      
      {/* Main Content - with different background */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView 
          style={[
            styles.safeArea, 
            { backgroundColor: colors.background }
          ]}
        >
          <StatusBar 
            barStyle={isDarkMode ? "light-content" : "light-content"} 
            backgroundColor={colors.headerBackground} 
          />
          
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.headerBackground }]}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Waste Collection Calendar</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.calendarContainer, { 
              backgroundColor: colors.card,
              shadowColor: isDarkMode ? '#000' : '#000',
            }]}>
              <Calendar
                onDayPress={handleDateSelect}
                markedDates={markedDates}
                theme={{
                  backgroundColor: colors.background,
                  calendarBackground: colors.card,
                  textSectionTitleColor: colors.text,
                  selectedDayBackgroundColor: colors.primary,
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: colors.accent,
                  dayTextColor: colors.text,
                  textDisabledColor: colors.secondaryText,
                  monthTextColor: colors.text,
                  arrowColor: colors.primary,
                  dotColor: colors.primary,
                  todayBackgroundColor: 'transparent',
                  textMonthFontWeight: 'bold',
                  textDayHeaderFontWeight: '600',
                  textDayFontSize: 16,
                  textMonthFontSize: 16,
                }}
              />
            </View>

            <View style={styles.contentContainer}>
              <View style={styles.headerRow}>
                <Text style={[styles.dateHeader, { color: colors.text }]}>
                  {moment(selectedDate).format('MMMM DD, YYYY')}
                </Text>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setMemoText('');
                    setMemoTitle('');
                    setSelectedTime(new Date());
                    setIsEditing(false);
                    setSelectedMemoId(null);
                    setModalVisible(true);
                  }}
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.memosContainer}>
                {loading ? (
                  <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
                ) : (
                  <>
                    <View style={styles.section}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Reminders for {moment(selectedDate).format('MMM D')}
                      </Text>
                      {memos.length > 0 ? (
                        memos.map(memo => renderMemoItem(memo))
                      ) : (
                        <View style={[styles.emptyContainer, { backgroundColor: colors.cardAlt }]}>
                          <Ionicons name="calendar-outline" size={32} color={colors.secondaryText} />
                          <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                            No waste collection reminders for this date
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.section}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Upcoming Collection Reminders
                      </Text>
                      {upcomingMemos.length > 0 ? (
                        upcomingMemos.map(memo => renderMemoItem(memo))
                      ) : (
                        <View style={[styles.emptyContainer, { backgroundColor: colors.cardAlt }]}>
                          <Ionicons name="notifications-off-outline" size={32} color={colors.secondaryText} />
                          <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                            No upcoming waste collection reminders
                          </Text>
                        </View>
                      )}
                    </View>
                  </>
                )}
              </ScrollView>
            </View>

            {/* Main Modal for Adding/Editing Reminders */}
            <Modal
              animationType="slide"
              transparent={true}
              visible={modalVisible}
              onRequestClose={() => setModalVisible(false)}
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={[styles.modalContainer, {
                  backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)'
                }]}>
                  <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                    <View style={styles.modalHeader}>
                      <Text style={[styles.modalTitle, { color: colors.text }]}>
                        {isEditing ? 'Edit Collection Reminder' : 'Add Collection Reminder'}
                      </Text>
                      <TouchableOpacity onPress={() => setModalVisible(false)}>
                        <Ionicons name="close" size={24} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                    
                    <ScrollView keyboardShouldPersistTaps="handled">
                      <TextInput
                        style={[styles.titleInput, { 
                          color: colors.text, 
                          borderColor: colors.border,
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'transparent'
                        }]}
                        placeholder="Reminder Title (e.g., Recycling Day)"
                        placeholderTextColor={colors.secondaryText}
                        value={memoTitle}
                        onChangeText={setMemoTitle}
                      />
                      
                      <TextInput
                        style={[styles.textInput, { 
                          color: colors.text, 
                          borderColor: colors.border,
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'transparent'
                        }]}
                        placeholder="Reminder details (e.g., Put out recycling bins)"
                        placeholderTextColor={colors.secondaryText}
                        multiline={true}
                        value={memoText}
                        onChangeText={setMemoText}
                      />
                      
                      {/* Enhanced Time Selector */}
                      <View style={[styles.timePickerContainer, { borderColor: colors.border }]}>
                        <View style={styles.timeLabelRow}>
                          <Ionicons name="time-outline" size={20} color={colors.primary} />
                          <Text style={[styles.timeLabel, { color: colors.text }]}>
                            Reminder Time
                          </Text>
                        </View>
                        
                        <TouchableOpacity
                          style={[styles.timeDisplay, { backgroundColor: colors.cardAlt }]}
                          onPress={() => setShowTimePicker(true)}
                        >
                          <Text style={[styles.timeDisplayText, { color: colors.text }]}>
                            {formatTime(selectedTime)}
                          </Text>
                          <Ionicons name="chevron-down" size={18} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                      
                      <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: colors.primary }]}
                        onPress={saveMemo}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.saveButtonText}>
                            {isEditing ? 'Update' : 'Save'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </ScrollView>
                    
                    {/* Time Picker remains outside the ScrollView but inside the modal */}
                    {Platform.OS === 'ios' && showTimePicker && (
                      <View style={[styles.iosTimePickerContainer, {
                        backgroundColor: isDarkMode ? '#333' : 'white'
                      }]}>
                        <View style={[styles.iosTimePickerHeader, {
                          borderBottomColor: isDarkMode ? '#444' : '#EEE'
                        }]}>
                          <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                            <Text style={{ color: colors.error }}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                            <Text style={{ color: colors.primary }}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={selectedTime}
                          mode="time"
                          display="spinner"
                          onChange={onTimeChange}
                          style={styles.iosTimePicker}
                          textColor={isDarkMode ? '#fff' : '#000'}
                          themeVariant={isDarkMode ? "dark" : "light"}
                        />
                      </View>
                    )}
                    
                    {Platform.OS === 'android' && showTimePicker && (
                      <DateTimePicker
                        value={selectedTime}
                        mode="time"
                        is24Hour={false}
                        display="default"
                        onChange={onTimeChange}
                        themeVariant={isDarkMode ? "dark" : "light"}
                      />
                    )}
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
          </View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    padding: 4,
  },
  container: {
    flex: 1,
  },
  calendarContainer: {
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  memosContainer: {
    flex: 1,
    marginBottom: 10,  // Small margin at the bottom
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 8,
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
  },
  memoItem: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
    borderWidth: 0.5, // Add subtle border for dark mode
  },
  memoContent: {
    flex: 1,
  },
  memoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  memoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  memoTime: {
    fontSize: 12,
  },
  memoDate: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  memoActions: {
    flexDirection: 'column',
    justifyContent: 'space-around',
    paddingLeft: 10,
  },
  actionButton: {
    padding: 6,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderRadius: 10,
    padding: 20,
    maxHeight: height * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  titleInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  textInput: {
    height: Math.min(100, height * 0.15),
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  // Enhanced time picker styles
  timePickerContainer: {
    borderWidth: 0,
    marginBottom: 20,
  },
  timeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  timeDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  timeDisplayText: {
    fontSize: 18,
    fontWeight: '500',
  },
  iosTimePickerContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 20,
  },
  iosTimePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    padding: 10,
  },
  iosTimePicker: {
    height: 200,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loader: {
    marginTop: 20,
  },
});

export default WasteCalendarScreen;