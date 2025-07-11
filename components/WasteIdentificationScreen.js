import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import ProfileManager from '../supabase/manager/auth/ProfileManager';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

// Google Cloud Vision API key 
const GOOGLE_CLOUD_VISION_API_KEY = Constants.expoConfig.extra.GOOGLE_CLOUD_VISION_API_KEY;
const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

// Waste categories and recycling information
const wasteCategories = {
  plastic: {
    title: 'Plastic',
    description: 'Plastic waste takes hundreds of years to decompose and can harm wildlife and ecosystems.',
    recyclable: true,
    biodegradable: false,
    biodegradabilityInfo: 'Most conventional plastics are non-biodegradable and can persist in the environment for hundreds to thousands of years. Some newer bioplastics may be biodegradable under specific conditions.',
    recyclingMethods: [
      'Clean and rinse plastic containers before recycling',
      'Check the recycling symbol (1-7) to ensure it\'s accepted in your area',
      'Remove caps and lids and recycle separately',
      'Consider reusing plastic containers for storage',
      'Avoid single-use plastics when possible'
    ],
    icon: 'bottle-soda-outline',
    color: '#2196F3',
    gradientColors: ['#2196F3', '#03A9F4']
  },
  paper: {
    title: 'Paper',
    description: 'Paper is one of the most recyclable materials and can be reprocessed multiple times.',
    recyclable: true,
    biodegradable: true,
    biodegradabilityInfo: 'Paper is naturally biodegradable and will decompose within 2-6 weeks under proper conditions. Paper products with coatings or laminates may take longer to break down.',
    recyclingMethods: [
      'Keep paper dry and clean for recycling',
      'Flatten cardboard boxes to save space',
      'Remove plastic windows from envelopes',
      'Shredded paper should be placed in a paper bag for recycling',
      'Consider composting certain paper products'
    ],
    icon: 'newspaper',
    color: '#795548',
    gradientColors: ['#8D6E63', '#A1887F']
  },
  glass: {
    title: 'Glass',
    description: 'Glass is 100% recyclable and can be recycled endlessly without loss in quality or purity.',
    recyclable: true,
    biodegradable: false,
    biodegradabilityInfo: 'Glass is non-biodegradable and can persist in the environment for over a million years. However, it is inert and does not release harmful chemicals into the environment.',
    recyclingMethods: [
      'Rinse glass containers before recycling',
      'Remove metal or plastic lids and recycle separately',
      'Sort by color if required by your local recycling program',
      'Broken glass should be wrapped and disposed of in regular trash',
      'Consider reusing glass jars for storage'
    ],
    icon: 'bottle-wine-outline',
    color: '#00BCD4',
    gradientColors: ['#00BCD4', '#26C6DA']
  },
  metal: {
    title: 'Metal',
    description: 'Metals like aluminum and steel can be recycled indefinitely without degrading their properties.',
    recyclable: true,
    biodegradable: false,
    biodegradabilityInfo: 'Metals are non-biodegradable but can corrode or oxidize over time. Aluminum cans may take 80-200 years to break down, while steel cans can take 50-100 years to degrade through rusting.',
    recyclingMethods: [
      'Rinse food residue from cans',
      'Crush aluminum cans to save space',
      'Remove paper labels if possible',
      'Small metal items can be collected in a larger metal container',
      'Keep metal separate from other recyclables if required'
    ],
    icon: 'can-outline',
    color: '#9E9E9E',
    gradientColors: ['#9E9E9E', '#BDBDBD']
  },
  electronic: {
    title: 'Electronic Waste',
    description: 'E-waste contains valuable materials as well as toxic components that require special handling.',
    recyclable: true,
    biodegradable: false,
    biodegradabilityInfo: 'Electronic waste is non-biodegradable and contains various hazardous materials that can leach into soil and water. Circuit boards, batteries, and other components can persist for centuries and release toxic substances if not properly disposed of.',
    recyclingMethods: [
      'Never dispose of electronics in regular trash',
      'Take to designated e-waste collection centers',
      'Many retailers offer take-back programs',
      'Remove batteries before recycling if possible',
      'Consider donating working electronics',
      'Data should be wiped from devices before recycling or donating',
      'Some components contain valuable metals that can be recovered'
    ],
    icon: 'cellphone',
    color: '#FF9800',
    gradientColors: ['#FF9800', '#FFB74D']
  },
  organic: {
    title: 'Organic Waste',
    description: 'Organic waste includes food scraps and yard waste that can be composted into nutrient-rich soil.',
    recyclable: true,
    biodegradable: true,
    biodegradabilityInfo: 'Organic waste is highly biodegradable and breaks down naturally through microbial activity. Food scraps can decompose in 2-4 weeks in a compost pile, while yard waste may take 3-12 months depending on conditions.',
    recyclingMethods: [
      'Compost fruit and vegetable scraps, coffee grounds, and eggshells',
      'Avoid composting meat, dairy, and oily foods in home systems',
      'Mix green materials (food scraps) with brown materials (leaves, paper)',
      'Consider worm composting for apartment living',
      'Use compost in gardens to reduce need for chemical fertilizers',
      'Turn compost regularly to aerate and speed decomposition',
      'Keep compost moist but not soggy for optimal breakdown'
    ],
    icon: 'food-apple',
    color: '#4CAF50',
    gradientColors: ['#4CAF50', '#66BB6A']
  },
  hazardous: {
    title: 'Hazardous Waste',
    description: 'Hazardous waste requires special handling to prevent harm to people and the environment.',
    recyclable: false,
    biodegradable: false,
    biodegradabilityInfo: 'Hazardous waste is generally non-biodegradable and can persist in the environment for decades or centuries. Many chemicals can leach into soil and groundwater, causing long-term contamination and environmental damage.',
    recyclingMethods: [
      'Never dispose of in regular trash or pour down drains',
      'Take to designated hazardous waste collection facilities',
      'Store in original containers with labels intact',
      'Keep separate from other waste materials',
      'Check with local authorities for disposal guidelines',
      'Some items like batteries and paint may have special recycling programs',
      'Certain chemicals can be neutralized by professional waste handlers'
    ],
    icon: 'alert-outline',
    color: '#F44336',
    gradientColors: ['#F44336', '#EF5350']
  },
  unknown: {
    title: 'Unidentified Waste',
    description: 'We couldn\'t identify this waste with certainty. Please check with local recycling guidelines.',
    recyclable: 'unknown',
    recyclingMethods: [
      'Check with your local recycling center',
      'Look for recycling symbols or codes on the item',
      'When in doubt, throw it out to avoid contaminating recyclables',
      'Consider reusing the item if possible',
      'Research proper disposal methods for your specific item'
    ],
    icon: 'help-circle-outline',
    color: '#7b68ee',
    gradientColors: ['#7b68ee', '#9370DB']
  }
};

// Add recycling tips for each waste category
const recyclingTips = {
  plastic: [
    "Non-biodegradable: Most plastics take 450+ years to decompose",
    "Rinse containers before recycling to remove food residue",
    "Remove caps and lids as they may be made from different types of plastic",
    "Check for recycling symbols (1-7) to identify the type of plastic",
    "Plastic bags are often not accepted in curbside recycling",
    "Avoid black plastic as it's often not detectable by sorting equipment",
    "PET (1) and HDPE (2) are the most widely recycled plastic types",
    "Consider alternatives like glass, metal, or biodegradable materials",
    "Microplastics from degrading plastic can harm marine life"
  ],
  paper: [
    "Biodegradable: Paper typically decomposes in 2-6 weeks under proper conditions",
    "Keep paper dry and clean for effective recycling",
    "Remove plastic windows from envelopes before recycling",
    "Shredded paper should be contained in a paper bag for recycling",
    "Cardboard should be flattened to save space",
    "Remove tape and staples when possible for better processing",
    "Paper can be recycled 5-7 times before fibers become too short",
    "Glossy paper and receipts may contain chemicals that make them harder to recycle",
    "Consider composting clean paper products as an alternative to recycling"
  ],
  glass: [
    "Non-biodegradable: Glass can persist in the environment for over a million years",
    "Rinse glass containers thoroughly before recycling",
    "Remove lids and caps as they're often made from different materials",
    "Sort glass by color if required by your local recycling program",
    "Broken glass should be wrapped and disposed of in regular trash for safety",
    "Window glass and drinking glasses are different from container glass and often not recyclable",
    "Glass can be recycled indefinitely without loss of quality or purity",
    "Recycling glass saves energy - one recycled bottle saves enough energy to power a light bulb for 4 hours",
    "Consider reusing glass jars for food storage, crafts, or organization"
  ],
  metal: [
    "Rinse food cans to remove residue before recycling",
    "Small metal items can be collected in a larger metal container",
    "Aluminum foil should be clean and balled up for recycling",
    "Check if your community accepts aerosol cans for recycling",
    "Scrap metal may need to be taken to specialized recycling centers",
    "Non-biodegradable: Metal cans take 50-200 years to break down through oxidation",
    "Recycling aluminum uses 95% less energy than producing it from raw materials",
    "Separate different types of metals when possible for more efficient recycling",
    "Metal items with mixed materials (like electronics) require special handling"
  ],
  electronic: [
    "Non-biodegradable: Electronics can take 50-200 years to break down through oxidation",
    "Never dispose of electronics in regular trash due to hazardous materials",
    "Remove batteries before recycling electronic devices",
    "Look for e-waste collection events in your community",
    "Many retailers offer take-back programs for old electronics",
    "Consider donating working electronics for reuse before recycling"
  ],
  organic: [
    "Biodegradable: Organics typically decomposes in 2-6 weeks under proper conditions",
    "Compost fruit and vegetable scraps, coffee grounds, and eggshells",
    "Avoid composting meat, dairy, and oily foods in home compost systems",
    "Use a kitchen compost bin for convenient collection",
    "Layer green (food waste) and brown (leaves, paper) materials in compost",
    "Check if your community offers curbside compost collection"
  ],
  hazardous: [
    "Never pour chemicals down drains or place in regular trash",
    "Store in original containers with labels intact",
    "Take to designated hazardous waste collection facilities",
    "Many communities have special collection days for hazardous materials",
    "Some retailers accept specific items like batteries or paint for proper disposal"
  ],
  unknown: [
    "Contact your local waste management authority for guidance",
    "Search online waste databases for specific disposal instructions",
    "Consider if the item can be reused or repurposed instead",
    "When in doubt, keep it out of recycling to avoid contamination",
    "Take a photo and use waste identification apps for help"
  ]
};

// Add the recycling tips to each waste category
Object.keys(wasteCategories).forEach(key => {
  wasteCategories[key].recyclingTips = recyclingTips[key] || recyclingTips.unknown;
});

const wasteExamples = {
  plastic: [
    { imageUrl: "https://images.unsplash.com/photo-1572964734607-0051976fac79?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8cGxhc3RpYyUyMGJvdHRsZXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGxhc3RpYyUyMGNvbnRhaW5lcnxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1589030343991-69ea1433b941?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8cGxhc3RpYyUyMGJhZ3xlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60" }
  ],
  paper: [
    { imageUrl: "https://images.unsplash.com/photo-1603484477859-abe6a73f9366?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y2FyZGJvYXJkfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1595231776515-ddffb1f4eb73?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fG5ld3NwYXBlcnxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1598620617148-c9e8ddee6711?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bWFnYXppbmVzfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" }
  ],
  glass: [
    { imageUrl: "https://images.unsplash.com/photo-1550411294-56f7d0c7fbe6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Z2xhc3MlMjBib3R0bGVzfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1563201180-1c57435ae249?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Z2xhc3MlMjBqYXJ8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Z2xhc3N3YXJlfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" }
  ],
  metal: [
    { imageUrl: "https://images.unsplash.com/photo-1610478920392-95888fc8a407?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YWx1bWludW0lMjBjYW5zfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1531522060268-8c17d1298ce8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8bWV0YWwlMjBzY3JhcHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c3RlZWwlMjBjb250YWluZXJ8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60" }
  ],
  electronic: [
    { imageUrl: "https://images.unsplash.com/photo-1526406915894-7bcd65f60845?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8ZWxlY3Ryb25pYyUyMHdhc3RlfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1601791074012-d4e0ee30d77a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8b2xkJTIwcGhvbmVzfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1602800458591-eddda28a498b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y29tcHV0ZXIlMjBwYXJ0c3xlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60" }
  ],
  organic: [
    { imageUrl: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8Zm9vZCUyMHdhc3RlfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1610348725531-843dff563e2c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y29tcG9zdHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Z2FyZGVuJTIwd2FzdGV8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60" }
  ],
  hazardous: [
    { imageUrl: "https://images.unsplash.com/photo-1605256585681-455837661b76?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Y2hlbWljYWxzfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1530533718754-001d2668365a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGFpbnQlMjBjYW5zfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1583225214464-9296029427aa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YmF0dGVyaWVzfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" }
  ],
  unknown: [
    { imageUrl: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8dW5rbm93biUyMHdhc3RlfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1604187351574-c75ca79f5807?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8bWl4ZWQlMjB3YXN0ZXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGxhc3RpYyUyMGNvbnRhaW5lcnxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60" }
  ]
};

Object.keys(wasteCategories).forEach(key => {
  wasteCategories[key].examples = wasteExamples[key] || wasteExamples.unknown;
});

// AI facts about waste identification and recycling
const aiFacts = [
  {
    id: 1,
    title: "AI can identify 5,000+ types of waste materials",
    description: "Modern AI models can recognize thousands of different waste items with over 95% accuracy to improve recycling rates.",
    additionalInfo: "These advanced AI systems use deep learning algorithms trained on millions of images to identify materials like plastics, metals, glass, and organic waste. The technology continues to improve, with some systems now able to distinguish between different types of plastics (PET, HDPE, PVC) and even detect contamination in recycling streams."
  },
  {
    id: 2,
    title: "AI reduces contamination in recycling streams",
    description: "Smart waste sorting powered by AI can reduce contamination in recycling by up to 90%, making recycling more efficient.",
    additionalInfo: "Contamination is one of the biggest challenges in recycling. When non-recyclable items end up in recycling bins, they can damage equipment, reduce the quality of recycled materials, and even cause entire batches to be sent to landfills. AI-powered sorting systems can identify and remove contaminants at processing facilities, while mobile apps can help consumers make better recycling decisions at home."
  },
  {
    id: 3,
    title: "AI helps track global waste patterns",
    description: "AI systems analyze waste data across regions to identify trends and optimize waste management strategies worldwide.",
    additionalInfo: "By analyzing data from waste collection points, landfills, and recycling centers, AI can identify patterns in waste generation and disposal. This information helps cities and countries develop more effective waste management policies, predict future waste volumes, and measure the impact of recycling initiatives. Some systems can even track the movement of waste across borders to combat illegal dumping."
  }
];

const WasteIdentificationScreen = ({ navigation }) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  // State variables
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [wasteInfo, setWasteInfo] = useState(null);
  const [detectedItems, setDetectedItems] = useState([]);
  const [error, setError] = useState(null);
  const [showTips, setShowTips] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [userName, setUserName] = useState('Earth Hero');
  const [greeting, setGreeting] = useState('Hi');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  // Check authentication on mount and when auth state changes
  useEffect(() => {
    console.log('Authentication state in WasteIdentificationScreen:', 
      authLoading ? 'Loading auth state...' : 
      isAuthenticated ? 'Authenticated' : 'Not authenticated');
    
    // Only redirect if auth is not loading and user is not authenticated
    if (!authLoading && !isAuthenticated) {
      console.log('User not authenticated, redirecting to Login');
      navigation.replace('Login');
      return;
    }
    
    // If authenticated and not loading, get user name and request permissions
    if (isAuthenticated && !authLoading) {
      getUserName();
      requestPermissions();
      setTimeBasedGreeting();
    }
  }, [isAuthenticated, authLoading]);
  
  // Set greeting based on time of day
  const setTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good morning');
    } else if (hour < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }
  };

  // Request camera permissions
  const requestPermissions = async () => {
    try {
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (mediaStatus !== 'granted' || cameraStatus !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Camera and media library permissions are required to use this feature.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const getUserName = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        console.error('No user logged in');
        setLoading(false);
        return;
      }
      
      console.log('Fetching user profile for:', user.id);
      
      // Use ProfileManager to get user profile
      const { data: profile, error } = await ProfileManager.getUserProfile(user.id);
      
      if (error) {
        console.error('Error fetching user name:', error);
        setLoading(false);
        return;
      }
      
      if (profile) {
        console.log('User profile fetched successfully:', profile.full_name);
        setUserName(profile.full_name || 'Earth Hero');
      } else {
        console.log('No profile data returned');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user name:', error);
      setLoading(false);
    }
  };

  // Animation references
  const scanAnimation = useRef(new Animated.Value(0)).current;
  const resultAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const animationRef = useRef(null);
  const cardScaleAnim = useRef(new Animated.Value(0.95)).current;

  // Progress animation
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%']
  });

  // Start rotation animation for loading icon
  useEffect(() => {
    if (analyzing) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [analyzing, rotateAnim]);

  // Pick image from gallery
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
        setWasteInfo(null);
        setDetectedItems([]);
        setError(null);
        setScanComplete(false);
        
        // Automatically analyze the image once selected
        analyzeImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery.');
    }
  };

  // Take photo with camera
  const takePicture = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
        setWasteInfo(null);
        setDetectedItems([]);
        setError(null);
        setScanComplete(false);
        
        // Automatically analyze the image once taken
        analyzeImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture.');
    }
  };

  // Analyze image with Google Cloud Vision API - Modified to accept an image parameter
  const analyzeImage = async (imageUri = null) => {
    if (!imageUri && !image) {
      Alert.alert('No Image', 'Please take or select an image first.');
      return;
    }

    const imageToAnalyze = imageUri || image;

    try {
      setAnalyzing(true);
      setLoading(true);
      setError(null);
      setWasteInfo(null);
      setDetectedItems([]);
      setScanComplete(false);

      // Resize and compress image for faster upload
      const manipResult = await ImageManipulator.manipulateAsync(
        imageToAnalyze,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Convert image to base64
      const base64Image = await FileSystem.readAsStringAsync(manipResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // For testing purposes, let's simulate a successful response
      // This will bypass the actual API call which requires a valid API key
      console.log('Image size (base64):', base64Image.length);
      
      // Check if we have a valid API key
      if (GOOGLE_CLOUD_VISION_API_KEY === Constants.expoConfig.extra.SUPABASE_URL || !GOOGLE_CLOUD_VISION_API_KEY) {
        console.log('Using mock response - no valid API key found');
        // Simulate a response with mock data
        const mockDetections = ['plastic', 'bottle', 'container', 'water', 'recyclable', 'PET'];
        setDetectedItems(mockDetections);
        
        // Determine waste type
        const wasteType = determineWasteType(mockDetections);
        setWasteInfo(wasteType);
        
        // Simulate a delay for better UX
        setTimeout(() => {
          setAnalyzing(false);
          setLoading(false);
          setScanComplete(true);
        }, 3000);
        return;
      }

      // Prepare request to Google Cloud Vision API
      const visionRequest = {
        requests: [
          {
            image: {
              content: base64Image,
            },
            features: [
              { type: 'LABEL_DETECTION', maxResults: 10 },
              { type: 'OBJECT_LOCALIZATION', maxResults: 5 },
            ],
          },
        ],
      };

      console.log('Sending request to Vision API...');
      
      // Send request to Google Cloud Vision API
      const response = await axios.post(
        `${VISION_API_URL}?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
        visionRequest
      );

      console.log('Response received:', JSON.stringify(response.data));

      // Process the response
      const labels = response.data.responses[0].labelAnnotations || [];
      const objects = response.data.responses[0].localizedObjectAnnotations || [];
      
      // Combine and analyze results
      const allDetections = [
        ...labels.map(label => label.description.toLowerCase()),
        ...objects.map(obj => obj.name.toLowerCase())
      ];
      
      console.log('Detected items:', allDetections);
      setDetectedItems(allDetections);
      
      // Determine waste category
      const wasteType = determineWasteType(allDetections);
      setWasteInfo(wasteType);
      
      // Simulate a delay for better UX
      setTimeout(() => {
        setAnalyzing(false);
        setLoading(false);
        setScanComplete(true);
      }, 1500);
      
    } catch (error) {
      console.error('Error analyzing image:', error);
      
      // More detailed error logging
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
        
        // Show more specific error message
        if (error.response.status === 400) {
          setError('API Error: Bad request. Check API key and request format.');
        } else if (error.response.status === 403) {
          setError('API Error: Access denied. Check API key permissions.');
        } else {
          setError(`API Error: ${error.response.status}. ${error.response.data?.error?.message || ''}`);
        }
      } else if (error.request) {
        console.error('Error request:', error.request);
        setError('Network error. No response received from the server.');
      } else {
        console.error('Error message:', error.message);
        setError(`Error: ${error.message}`);
      }
      
      // Fallback to mock data for demo purposes
      console.log('Using mock response due to error');
      const mockDetections = ['plastic', 'bottle', 'container', 'water', 'recyclable', 'PET'];
      setDetectedItems(mockDetections);
      const wasteType = determineWasteType(mockDetections);
      setWasteInfo(wasteType);
      
      setAnalyzing(false);
      setLoading(false);
      setScanComplete(true);
    }
  };

  // Determine waste type based on detected labels
  const determineWasteType = (detections) => {
    // Keywords for different waste categories
    const keywords = {
      plastic: ['plastic', 'bottle', 'container', 'packaging', 'bag', 'wrapper', 'styrofoam', 'polymer', 'pet', 'hdpe', 'pvc', 'ldpe', 'pp', 'ps'],
      paper: ['paper', 'cardboard', 'newspaper', 'magazine', 'book', 'mail', 'carton', 'box', 'tissue', 'napkin'],
      glass: ['glass', 'bottle', 'jar', 'window', 'mirror', 'glassware', 'cup', 'vase'],
      metal: ['metal', 'aluminum', 'can', 'tin', 'steel', 'foil', 'copper', 'iron', 'zinc', 'brass'],
      electronic: ['electronic', 'device', 'computer', 'phone', 'battery', 'charger', 'cable', 'appliance', 'gadget', 'circuit'],
      organic: ['food', 'fruit', 'vegetable', 'plant', 'leaf', 'grass', 'wood', 'compost', 'organic', 'bio', 'garden'],
      hazardous: ['chemical', 'paint', 'oil', 'battery', 'medication', 'pesticide', 'cleaner', 'toxic', 'poison', 'bleach']
    };
    
    // Count matches for each category
    const matches = {};
    Object.keys(keywords).forEach(category => {
      matches[category] = 0;
      keywords[category].forEach(keyword => {
        detections.forEach(detection => {
          if (detection.includes(keyword)) {
            matches[category]++;
          }
        });
      });
    });
    
    // Find category with most matches
    let bestMatch = 'unknown';
    let highestCount = 0;
    
    Object.keys(matches).forEach(category => {
      if (matches[category] > highestCount) {
        highestCount = matches[category];
        bestMatch = category;
      }
    });
    
    // If confidence is too low, return unknown
    return highestCount > 0 ? bestMatch : 'unknown';
  };

  // Reset the analysis
  const resetAnalysis = () => {
    setImage(null);
    setWasteInfo(null);
    setDetectedItems([]);
    setError(null);
    setAnalyzing(false);
    setScanComplete(false);
  };
  
  // Handle pull-to-refresh
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    resetAnalysis();
    // Set refreshing to false after a short delay to show the refresh animation
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // State for expanded fact
  const [expandedFactId, setExpandedFactId] = useState(null);

  // Toggle fact expansion
  const toggleFactExpansion = (factId) => {
    if (expandedFactId === factId) {
      setExpandedFactId(null);
    } else {
      setExpandedFactId(factId);
    }
  };
  
  // Toggle section expansion
  const toggleSectionExpansion = (section) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  // Toggle recycling tips visibility
  const toggleTips = () => {
    setShowTips(!showTips);
  };

  // Calculate rotation for loading icon
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* App Name Header */}
        <View style={styles.appHeader}>
          <Text style={styles.appNameText}>Konserve</Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#7ec83e']} 
              tintColor="#7ec83e"
              title="Pull to refresh"
              titleColor="#FFFFFF"
            />
          }
        >
          {/* Greeting Section */}
          <View style={styles.greetingSection}>
            <Text style={styles.greetingText}>
              {greeting}, {userName}
            </Text>
          </View>

          {/* Display analyzed image if available */}
          {wasteInfo && image && (
            <View style={styles.analyzedImageContainer}>
              <Image source={{ uri: image }} style={styles.analyzedImage} />
            </View>
          )}

          {/* Camera and Gallery Section - Always visible */}
          <View style={styles.actionsContainer}>
            {/* Camera Card */}
            <TouchableOpacity 
              style={styles.actionCardSmall}
              onPress={takePicture}
            >
              <View style={styles.actionCardIconSmall}>
                <MaterialIcons name="camera-alt" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.actionCardTitleSmall}>{wasteInfo ? 'Take Another Photo' : 'Take a Photo'}</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" style={styles.arrowIconSmall} />
            </TouchableOpacity>

            {/* Gallery Card */}
            <TouchableOpacity 
              style={styles.actionCardSmall}
              onPress={pickImage}
            >
              <View style={styles.actionCardIconSmall}>
                <MaterialIcons name="photo-library" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.actionCardTitleSmall}>{wasteInfo ? 'Choose Another Image' : 'Pick from Gallery'}</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" style={styles.arrowIconSmall} />
            </TouchableOpacity>
          </View>

          {/* Loading Screen */}
          {analyzing && (
            <View style={styles.loadingContainer}>
              <Animated.View style={styles.spinnerContainer}>
                <Animated.View style={{transform: [{rotate: spin}]}}>
                  <MaterialIcons name="refresh" size={36} color="#4CAF50" style={styles.spinnerIcon} />
                </Animated.View>
              </Animated.View>
              <Text style={styles.loadingText}>Analyzing waste...</Text>
            </View>
          )}

          {/* Selected Image Preview - Only show when not analyzing and no results yet */}
          {image && !analyzing && !wasteInfo && (
            <View style={styles.selectedImageContainer}>
              <Text style={styles.sectionTitle}>Selected Image</Text>
              <View style={styles.imagePreview}>
                <Image source={{ uri: image }} style={styles.previewImage} />
              </View>
              
              {/* Detected Items List */}
              {detectedItems.length > 0 && (
                <View style={styles.detectedItemsContainer}>
                  <Text style={styles.detectedItemsTitle}>Detected Items:</Text>
                  <View style={styles.tagsContainer}>
                    {detectedItems.map((item, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Results Section - Simplified with 3 main sections */}
          {wasteInfo && !analyzing && (
            <View style={styles.resultsSection}>
              
              {/* Simple Results Cards */}
              <View style={styles.simpleResultsContainer}>
                {/* Identity Card */}
                <TouchableOpacity 
                  style={styles.simpleResultCard}
                  onPress={() => setExpandedSection(expandedSection === 'identity' ? null : 'identity')}
                >
                  <View style={styles.simpleResultHeader}>
                    <MaterialIcons name="info" size={20} color="#FFFFFF" />
                    <Text style={styles.simpleResultHeaderText}>Identity:</Text>
                    <Text style={styles.simpleResultValue}>{wasteCategories[wasteInfo].title}</Text>
                    <MaterialIcons 
                      name={expandedSection === 'identity' ? "expand-less" : "expand-more"} 
                      size={20} 
                      color="#FFFFFF" 
                      style={styles.expandIcon} 
                    />
                  </View>
                </TouchableOpacity>
                
                {expandedSection === 'identity' && (
                  <View style={styles.expandedContent}>
                    <Text style={styles.expandedDescription}>{wasteCategories[wasteInfo].description}</Text>
                    
                    {/* Detected Items */}
                    {detectedItems.length > 0 && (
                      <View style={styles.detectedItemsContainer}>
                        <Text style={styles.detectedItemsTitle}>Detected Items:</Text>
                        <View style={styles.tagsContainer}>
                          {detectedItems.map((item, index) => (
                            <View key={index} style={styles.tag}>
                              <Text style={styles.tagText}>{item}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                )}
                
                {/* Recyclability Card */}
                <TouchableOpacity 
                  style={styles.simpleResultCard}
                  onPress={() => setExpandedSection(expandedSection === 'recyclable' ? null : 'recyclable')}
                >
                  <View style={styles.simpleResultHeader}>
                    <MaterialIcons name="recycling" size={20} color="#FFFFFF" />
                    <Text style={styles.simpleResultHeaderText}>Recyclable:</Text>
                    <Text style={[styles.simpleResultValue, {color: wasteCategories[wasteInfo].recyclable ? '#4CAF50' : '#F44336'}]}>
                      {wasteCategories[wasteInfo].recyclable ? 'YES' : 'NO'}
                    </Text>
                    <MaterialIcons 
                      name={expandedSection === 'recyclable' ? "expand-less" : "expand-more"} 
                      size={20} 
                      color="#FFFFFF" 
                      style={styles.expandIcon} 
                    />
                  </View>
                </TouchableOpacity>
                
                {expandedSection === 'recyclable' && (
                  <View style={styles.expandedContent}>
                    {/* Recycling Methods */}
                    <Text style={styles.expandedSubtitle}>Recycling Methods:</Text>
                    {wasteCategories[wasteInfo].recyclingMethods.map((method, index) => (
                      <View key={index} style={styles.recyclingTipItem}>
                        <MaterialIcons name="check-circle" size={16} color="#4A54EB" style={styles.tipIcon} />
                        <Text style={styles.recyclingTipText}>{method}</Text>
                      </View>
                    ))}
                  </View>
                )}
                
                {/* Disposal Card */}
                <TouchableOpacity 
                  style={styles.simpleResultCard}
                  onPress={() => setExpandedSection(expandedSection === 'disposal' ? null : 'disposal')}
                >
                  <View style={styles.simpleResultHeader}>
                    <MaterialIcons name="delete" size={20} color="#FFFFFF" />
                    <Text style={styles.simpleResultHeaderText}>Disposal:</Text>
                    <Text style={styles.simpleResultValue}>
                      {wasteCategories[wasteInfo].biodegradable ? 'Biodegradable' : 'Non-biodegradable'}
                    </Text>
                    <MaterialIcons 
                      name={expandedSection === 'disposal' ? "expand-less" : "expand-more"} 
                      size={20} 
                      color="#FFFFFF" 
                      style={styles.expandIcon} 
                    />
                  </View>
                </TouchableOpacity>
                
                {expandedSection === 'disposal' && (
                  <View style={styles.expandedContent}>
                    <Text style={styles.expandedDescription}>{wasteCategories[wasteInfo].biodegradabilityInfo}</Text>
                  </View>
                )}
              </View>
              
              {/* Recycling Tips Section */}
              <View style={styles.recyclingInfoSection}>
                <Text style={styles.recyclingInfoTitle}>Recycling Tips</Text>
                {wasteCategories[wasteInfo].recyclingTips && wasteCategories[wasteInfo].recyclingTips.map((tip, index) => (
                  <View key={index} style={styles.recyclingTipItem}>
                    <MaterialIcons name="check-circle" size={16} color="#4A54EB" style={styles.tipIcon} />
                    <Text style={styles.recyclingTipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* App Information Section - Replaces AI Facts when no waste analysis is shown */}
          {!wasteInfo && !analyzing && (
            <View style={styles.appInfoSection}>
              <Text style={styles.appInfoTitle}>About Konserve</Text>
              <Text style={styles.appInfoDescription}>
              Konserve is a digital platform that empowers communities in Nairobi to manage waste smarter through education, real-time tracking, and convenient recycling. By connecting residents, businesses, and waste collectors, Konserve increases recycling rates, reduces landfill waste, and builds a cleaner, greener city. {"\n\n"}
                Take a photo of any waste item and let KonserveAI analyze it for you.
              </Text>
              
              <Text style={styles.appInfoTitle}>What KonserveAI Does</Text>
              <Text style={styles.appInfoDescription}>
                KonserveAI uses advanced image recognition to identify waste materials, determine if they're recyclable, 
                and provide specific disposal recommendations to help reduce environmental impact.
              </Text>
              
              <Text style={styles.appVersionText}>Version 1.0.0</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  // App Header
  appHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  appNameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7ec83e',
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  greetingSection: {
    marginTop: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  actionsContainer: {
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
  },
  actionCardSmall: {
    width: '48%',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 12,
  },
  actionCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionCardIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    paddingRight: 20,
  },
  actionCardTitleSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    paddingRight: 16,
  },
  arrowIcon: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  arrowIconSmall: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  // Loading Screen
  loadingContainer: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  spinnerContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerIcon: {
    color: '#4CAF50',
  },
  selectedImageContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  // Results Section
  resultsSection: {
    marginBottom: 24,
    marginTop: 16,
  },
  // Analyzed Image Container
  analyzedImageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  analyzedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  // Simple Results Cards
  simpleResultsContainer: {
    marginBottom: 16,
  },
  simpleResultCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  simpleResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  simpleResultHeaderText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    marginRight: 4,
  },
  simpleResultValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  expandIcon: {
    marginLeft: 'auto',
  },
  expandedContent: {
    backgroundColor: '#333333',
    padding: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -8,
    marginBottom: 12,
  },
  expandedDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  expandedSubtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  // Identity Card (keeping for compatibility)
  identityCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#357002',
    padding: 12,
  },
  identityHeaderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  identityContent: {
    padding: 16,
  },
  identityTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  identityDescription: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  // Recyclability Card (keeping for compatibility)
  recyclabilityCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  recyclabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A54EB',
    padding: 12,
  },
  recyclabilityHeaderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  recyclabilityContent: {
    padding: 16,
    alignItems: 'center',
  },
  recyclabilityIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recyclabilityIndicatorText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Disposal Card (keeping for compatibility)
  disposalCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  disposalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F44336',
    padding: 12,
  },
  disposalHeaderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  disposalContent: {
    padding: 16,
  },
  disposalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  disposalDescription: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  // AI Facts Section
  factsSection: {
    marginBottom: 24,
  },
  factsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  factCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  factIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  factContent: {
    flex: 1,
    paddingRight: 24,
  },
  factTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  factDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  expandedFactContent: {
    backgroundColor: '#333333',
    padding: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginTop: -12,
    marginBottom: 12,
  },
  expandedFactText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  // Detected Items styles
  detectedItemsContainer: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  detectedItemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(74, 84, 235, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    margin: 4,
  },
  tagText: {
    color: '#4A54EB',
    fontSize: 12,
    fontWeight: '500',
  },
  // Recycling Info Section
  recyclingInfoSection: {
    marginTop: 0,
    marginBottom: 16,
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
  },
  recyclingInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  recyclingTipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tipIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  recyclingTipText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  // Waste Category Details Styles
  wasteCategoryDetails: {
    backgroundColor: '#333333',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  biodegradabilityInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  biodegradabilityInfoText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  // App Info Section
  appInfoSection: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 24,
  },
  appInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    marginTop: 16,
  },
  appInfoDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
    marginBottom: 16,
  },
  appVersionText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default WasteIdentificationScreen;