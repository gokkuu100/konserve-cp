import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

const DaySelector = ({ onDaySelect, selectedDays = {}, maxDays = null }) => {
  const handleDayPress = (day) => {
    const isCurrentlySelected = selectedDays[day];
    const selectedCount = Object.values(selectedDays).filter(Boolean).length;
    
    if (isCurrentlySelected) {
      onDaySelect(day, false);
      return;
    }
    
    // If maxDays is set and we've reached the limit, show an alert
    if (maxDays !== null && selectedCount >= maxDays && !isCurrentlySelected) {
      Alert.alert(
        'Maximum Days Selected',
        `You can only select up to ${maxDays} collection ${maxDays === 1 ? 'day' : 'days'} for this plan.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    onDaySelect(day, true);
  };

  return (
    <View style={styles.container}>
      {DAYS_OF_WEEK.map(day => (
        <TouchableOpacity
          key={day}
          style={[
            styles.dayButton,
            selectedDays[day] && styles.selectedDayButton
          ]}
          onPress={() => handleDayPress(day)}
        >
          <Text style={[
            styles.dayText,
            selectedDays[day] && styles.selectedDayText
          ]}>
            {day.substring(0, 3)}
          </Text>
          {selectedDays[day] && (
            <MaterialIcons name="check" size={16} color="#fff" style={styles.checkIcon} />
          )}
        </TouchableOpacity>
      ))}
      
      {maxDays !== null && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Select up to {maxDays} collection {maxDays === 1 ? 'day' : 'days'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dayButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
    width: '30%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  selectedDayButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  dayText: {
    fontSize: 14,
    color: '#333',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: '500',
  },
  checkIcon: {
    marginLeft: 4,
  },
  infoContainer: {
    width: '100%',
    marginTop: 8,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  }
});

export default DaySelector;