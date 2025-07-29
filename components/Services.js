import React from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '../ThemeContext';

const ServiceCard = ({ title, subtitle, buttonText, imageSource, onPress }) => {
    const { theme } = useTheme();
    return (
      <View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.text }]}>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: theme.secondary + '30' }]} onPress={onPress}>
            <Text style={[styles.buttonText, { color: theme.primary }]}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.imageContainer, { backgroundColor: theme.background }]}>
          <Image
            source={imageSource}
            style={styles.cardImage}
            resizeMode="contain"
          />
        </View>
      </View>
    );
  };

const ServiceOption = ({ title, imageSource, onPress }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity 
      style={[styles.serviceOption, { backgroundColor: theme.surface, shadowColor: theme.text }]} 
      onPress={onPress}
    >
      <View style={styles.serviceImageContainer}>
        <Image 
          source={imageSource} 
          style={styles.serviceImage} 
          resizeMode="contain"
        />
      </View>
      <Text style={[styles.serviceTitle, { color: theme.text }]}>{title}</Text>
    </TouchableOpacity>
  );
};

const Services = ({ navigation }) => {
  const { theme } = useTheme();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.header, { color: theme.text }]}>Services</Text>

        {/* Section 1: Map Feature */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Find Recycling Centers</Text>
        <ServiceCard 
          title="Locate recycling centers near you"
          subtitle="Find pinpoints to various recycling centres around Nairobi"
          buttonText="Open Map"
          imageSource={require('../assets/map.png')}
          onPress={() => navigation.navigate('Maps')}
        />
        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* Section 2: Collection Agencies & Messages */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Manage Waste Collection</Text>
        <View style={styles.serviceOptionsContainer}>
          <ServiceOption 
            title="Collection Services"
            imageSource={require('../assets/building.png')}
            onPress={() => navigation.navigate('CollectionTypeSelection')}
          />
          <ServiceOption 
            title="Marketplace"
            imageSource={require('../assets/recycling.png')}
            onPress={() => navigation.navigate('MarketPlace')}
          />
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* Section 3: Calendar/Schedule Feature */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Schedule Collection</Text>
        <ServiceCard 
          title="Plan your waste collection"
          subtitle="Select convenient collection days from calendar"
          buttonText="Open Schedule"
          onPress={() => navigation.navigate('WasteCalendar')}
          imageSource={require('../assets/calendar.png')}
        />
        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* Section 4: Feedback & Reports */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Service Feedback</Text>
        <View style={styles.serviceOptionsContainer}>
          <ServiceOption 
            title="Submit Feedback"
            imageSource={require('../assets/feedbackreview.png')}
            onPress={() => navigation.navigate('AgencyFeedback')}
          />
          <ServiceOption 
            title="Messages"
            imageSource={require('../assets/messages.png')}
            onPress={() => navigation.navigate('Messages')}
          />
        </View>
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12, 
  },
  header: {
    fontSize: 28, 
    fontWeight: 'bold',
    marginTop: 15, 
    marginBottom: 10, 
    paddingHorizontal: 4, 
  },
  sectionTitle: {
    fontSize: 20, 
    fontWeight: '600',
    marginTop: 16, 
    marginBottom: 8, 
    paddingHorizontal: 4, 
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12, 
    padding: 16, 
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1, 
  },
  cardContent: {
    flex: 1,
    marginRight: 12, 
  },
  cardTitle: {
    fontSize: 18, 
    fontWeight: 'bold',
    marginBottom: 6, 
  },
  cardSubtitle: {
    fontSize: 13, // Smaller font size
    color: '#666',
    marginBottom: 12, 
  },
  button: {
    backgroundColor: '#f0f0f0', // Lighter color
    paddingVertical: 8, 
    paddingHorizontal: 14, 
    borderRadius: 20, 
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  imageContainer: {
    width: 80, 
    height: 80, 
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10, 
  },
  cardImage: {
    width: 60, 
    height: 60,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16, 
    marginHorizontal: 4,
  },
  serviceOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0, 
  },
  serviceOption: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '48.5%', 
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1
  },
  serviceImageContainer: {
    width: 50, 
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceImage: {
    width: 40, 
    height: 40, 
  },
  serviceTitle: {
    fontSize: 14, 
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 20, 
  }
});

export default Services;