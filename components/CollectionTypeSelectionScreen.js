import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '../ThemeContext';

const CollectionTypeSelectionScreen = ({ navigation }) => {
  const { isDarkMode, theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? theme.background : '#f5f7fa' }]}>
      {/* Header */}
      <View style={[styles.header, {
        backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
        borderBottomColor: isDarkMode ? '#444' : '#e0e0e0'
      }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? theme.text : "#333"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {
          color: isDarkMode ? theme.text : '#333'
        }]}>Choose Collection Type</Text>
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={[styles.introText, { color: isDarkMode ? theme.text : '#333' }]}>
          Select the type of waste collection service that best fits your needs:
        </Text>
        
        {/* Option Cards Container */}
        <View style={styles.cardsContainer}>
          {/* Household Collection Option */}
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: isDarkMode ? theme.cardBackground : '#fff' }]}
            onPress={() => navigation.navigate('CollectionAgencies')}
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <MaterialIcons name="home" size={28} color="#4CAF50" />
              </View>
              <Text style={[styles.cardTitle, { color: isDarkMode ? theme.text : '#333' }]}>
                Household Collection
              </Text>
            </View>
            
            <View style={styles.cardContent}>
              <View style={styles.featureItem}>
                <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                <Text style={[styles.featureText, { color: isDarkMode ? theme.textSecondary : '#555' }]}>
                  8kg or less
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                <Text style={[styles.featureText, { color: isDarkMode ? theme.textSecondary : '#555' }]}>
                  Residential waste
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                <Text style={[styles.featureText, { color: isDarkMode ? theme.textSecondary : '#555' }]}>
                  Regular schedules
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          
          {/* Business Collection Option */}
          <TouchableOpacity 
            style={[styles.card, { 
              backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
            }]}
            onPress={() => navigation.navigate('CollectionAgenciesForBusiness')}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                <MaterialIcons name="business" size={28} color="#1976D2" />
              </View>
              <Text style={[styles.cardTitle, { color: isDarkMode ? theme.text : '#333' }]}>
                Business Collection
              </Text>
            </View>
            
            <View style={styles.cardContent}>
              <View style={styles.featureItem}>
                <MaterialIcons name="check-circle" size={16} color="#1976D2" />
                <Text style={[styles.featureText, { color: isDarkMode ? theme.textSecondary : '#555' }]}>
                  Greater than 8kg
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <MaterialIcons name="check-circle" size={16} color="#1976D2" />
                <Text style={[styles.featureText, { color: isDarkMode ? theme.textSecondary : '#555' }]}>
                  Commercial waste
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <MaterialIcons name="check-circle" size={16} color="#1976D2" />
                <Text style={[styles.featureText, { color: isDarkMode ? theme.textSecondary : '#555' }]}>
                  Flexible schedules
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.noteContainer}>
          <Text style={[styles.noteText, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
            Not sure which to choose? Consider the average amount of waste you generate. 
            If your waste is primarily from a household and is typically 8kg or less, 
            choose Household Collection. For larger volumes or commercial settings, 
            choose Business Collection.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  contentContainer: {
    padding: 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  introText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  cardsContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardContent: {
    padding: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  noteContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default CollectionTypeSelectionScreen; 