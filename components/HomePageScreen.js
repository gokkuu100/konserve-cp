import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';

// Mock data for environmental reports
const mockReports = [
  {
    id: 1,
    category: 'AIR QUALITY',
    title: 'Urban pollution levels reached critical state in downtown area',
    timeAgo: '3 min ago',
    image: require('../assets/resized.jpg'),
    content: 'Air quality index has dropped significantly over the past 24 hours due to increased industrial activities and traffic congestion. Local authorities recommend residents to limit outdoor activities until further notice.',
    expanded: false,
  },
  {
    id: 2,
    category: 'CONSERVATION',
    title: 'Local wetland restoration project exceeds expectations',
    timeAgo: '2 hours ago',
    image: require('../assets/resized.jpg'),
    content: 'The community-led wetland restoration initiative has shown remarkable progress, with biodiversity increasing by 40% since the project began six months ago.',
    expanded: false,
  },
  {
    id: 3,
    category: 'CLIMATE',
    title: 'New sustainable energy initiative launches in rural communities',
    timeAgo: '5 hours ago',
    image: require('../assets/resized.jpg'),
    content: 'A coalition of environmental organizations has launched a program to bring renewable energy solutions to underserved rural communities, aiming to reduce carbon emissions while creating local jobs.',
    expanded: false,
  },
  {
    id: 4,
    category: 'WASTE MANAGEMENT',
    title: 'City implements new recycling program to reduce landfill waste',
    timeAgo: '1 day ago',
    image: require('../assets/resized.jpg'),
    content: 'The municipal waste management department has introduced an innovative recycling initiative expected to divert up to 60% of household waste from landfills within the first year.',
    expanded: false,
  },
];

const HomePageScreen = ({ navigation }) => {
  const [reports, setReports] = useState(mockReports);
  const [userName, setUserName] = useState('Alex');
  
  // Function to handle expanding/collapsing a report
  const toggleReportExpansion = (id) => {
    setReports(reports.map(report => 
      report.id === id ? { ...report, expanded: !report.expanded } : report
    ));
  };

  // Featured report is the first one
  const featuredReport = reports[0];
  // The rest are regular reports
  const regularReports = reports.slice(1);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Top Navigation */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={28} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.appTitle}>EcoTracker</Text>
        
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle-outline" size={32} color="#333" />
          </View>
        </TouchableOpacity>
      </View>
      
      {/* Welcome Message */}
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeText}>Welcome, {userName}</Text>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Featured Report */}
        <TouchableOpacity 
          style={styles.featuredReportContainer}
          onPress={() => toggleReportExpansion(featuredReport.id)}
        >
          <Image 
            source={featuredReport.image} 
            style={styles.featuredImage}
            defaultSource={require('../assets/resized.jpg')}
          />
          <View style={styles.featuredOverlay}>
            <Text style={styles.reportCategory}>{featuredReport.category}</Text>
            <Text style={styles.featuredTitle}>{featuredReport.title}</Text>
            <Text style={styles.reportTime}>{featuredReport.timeAgo}</Text>
            
            {featuredReport.expanded && (
              <View style={styles.expandedContent}>
                <Text style={styles.reportContent}>{featuredReport.content}</Text>
                <TouchableOpacity style={styles.readMoreButton}>
                  <Text style={styles.readMoreText}>View Full Report</Text>
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.reportActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="chatbubble-outline" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="bookmark-outline" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="share-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
        
        {/* Latest Reports Section */}
        <View style={styles.latestReportsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest Reports</Text>
            <TouchableOpacity>
              <Ionicons name="chevron-forward-circle-outline" size={24} color="#999" />
            </TouchableOpacity>
          </View>
          
          {/* List of Regular Reports */}
          {regularReports.map(report => (
            <TouchableOpacity 
              key={report.id}
              style={styles.reportCard}
              onPress={() => toggleReportExpansion(report.id)}
            >
              <Image 
                source={report.image} 
                style={styles.reportImage}
                defaultSource={require('../assets/resized.jpg')}
              />
              <View style={styles.reportInfo}>
                <Text style={styles.reportCategory}>{report.category}</Text>
                <Text style={styles.reportTitle}>{report.title}</Text>
                <Text style={styles.reportTime}>{report.timeAgo}</Text>
                
                {report.expanded && (
                  <View style={styles.expandedContent}>
                    <Text style={styles.reportContent}>{report.content}</Text>
                    <TouchableOpacity style={styles.readMoreButton}>
                      <Text style={styles.readMoreText}>View Full Report</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      
      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color="#3366CC" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="bookmark-outline" size={24} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="search" size={24} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="notifications-outline" size={24} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="settings-outline" size={24} color="#999" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  welcomeContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#FFF',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  featuredReportContainer: {
    height: 280,
    position: 'relative',
    marginBottom: 15,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 15,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  reportCategory: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  reportTime: {
    fontSize: 12,
    color: '#CCC',
  },
  reportActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionButton: {
    marginRight: 20,
  },
  latestReportsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 10,
    marginBottom: 80,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  reportCard: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 15,
  },
  reportImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 15,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  expandedContent: {
    marginTop: 10,
  },
  reportContent: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 10,
  },
  readMoreButton: {
    backgroundColor: '#3366CC',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  readMoreText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    alignItems: 'center',
  },
});

export default HomePageScreen;