import { Platform, PermissionsAndroid } from 'react-native';
import * as Location from 'expo-location';


// Recycling points data converted from your Kotlin code
const recyclingPoints = [
  {
    id: 1,
    name: "Garden City Mall 4-in-1",
    description: "Metal/Aluminium\nCardboard/Paper/Tetrapak\nPlastic Containers\nPET bottles\n\nLocation: Entry roundabout",
    coordinate: {
      latitude: -1.22673611761586,
      longitude: 36.877799278963,
    },
    type: "4-in-1"
  },
  {
    id: 2,
    name: "The Hub Karen 4-in-1",
    description: "Metal/Aluminium\nCardboard/Paper/Tetrapak\nPlastic Containers\nPET bottles\n\nLocation: Right-hand side from exit",
    coordinate: {
      latitude: -1.3123735078513,
      longitude: 36.7023952882332,
    },
    type: "4-in-1"
  },
  {
    id: 3,
    name: "Yaya Centre 4-in-1",
    description: "Metal/Aluminium\nCardboard/Paper/Tetrapak\nPlastic Containers\nPET bottles\n\nLocation: Main pedestrian entry",
    coordinate: {
      latitude: -1.28738310977764,
      longitude: 36.7884312472338,
    },
    type: "4-in-1"
  },
  {
    id: 4,
    name: "Sarit Centre 4-in-1",
    description: "Metal/Aluminium\nCardboard/Paper/Tetrapak\nPlastic Containers\nPET bottles\n\nLocation: Lower Kabete Entry",
    coordinate: {
      latitude: -1.25397075499649,
      longitude: 36.8019204790111,
    },
    type: "4-in-1"
  },
  {
    id: 5,
    name: "Waterfront Karen 4-in-1",
    description: "Metal/Aluminium\nCardboard/Paper/Tetrapak\nPlastic Containers\nPET bottles\n\nLocation: Main parking",
    coordinate: {
      latitude: -1.32453425019841,
      longitude: 36.7133590336962,
    },
    type: "4-in-1"
  },
  {
    id: 6,
    name: "Nairobi Farmers Market 4-in-1",
    description: "Metal/Aluminium\nCardboard/Paper/Tetrapak\nPlastic Containers\nPET bottles\n\nLocation: Pedestrian entry",
    coordinate: {
      latitude: -1.2013373372329,
      longitude: 36.8317678334769,
    },
    type: "4-in-1"
  },
  {
    id: 7,
    name: "Capital Centre 4-in-1",
    description: "Metal/Aluminium\nCardboard/Paper/Tetrapak\nPlastic Containers\nPET bottles\n\nLocation: Outside Artcaffe",
    coordinate: {
      latitude: -1.30737300360881,
      longitude: 36.8341484563918,
    },
    type: "4-in-1"
  },
  {
    id: 8,
    name: "Shell Arging 4-in-1",
    description: "Metal/Aluminium\nCardboard/Paper/Tetrapak\nPlastic Containers\nPET bottles",
    coordinate: {
      latitude: -1.28467719122485,
      longitude: 36.7840723336259,
    },
    type: "4-in-1"
  },
  {
    id: 9,
    name: "Ciata Mall, 4-in-1",
    description: "Metal/Aluminium\nCardboard/Paper/Tetrapak\nPlastic Containers\nPET bottles\n\nLocation: Next to exit",
    coordinate: {
      latitude: -1.22241646644833,
      longitude: 36.8380232107866,
    },
    type: "4-in-1"
  },
  {
    id: 10,
    name: "Two Rivers Mall 4-in-1",
    description: "Metal/Aluminium\nCardboard/Paper/Tetrapak\nPlastic Containers\nPET bottles\n\nLocation: Basement 1 opposite escalator ramp",
    coordinate: {
      latitude: -1.20350440095644,
      longitude: 36.7932719107611,
    },
    type: "4-in-1"
  },
  {
    id: 11,
    name: "Galleria Mall, 4-in-1",
    description: "Metal/Aluminium\nCardboard/Paper/Tetrapak\nPlastic Containers\nPET bottles\n\nLocation: Left of entry",
    coordinate: {
      latitude: -1.33733336464252,
      longitude: 36.7649754791631,
    },
    type: "4-in-1"
  },
  {
    id: 12,
    name: "Spring Valley Coffee 4-in-1",
    description: "Metal/Aluminium\nCardboard/Paper/Tetrapak\nPlastic Containers\nPET bottles",
    coordinate: {
      latitude: -1.24697526341762,
      longitude: 36.7913998335572,
    },
    type: "4-in-1"
  },
  {
    id: 13,
    name: "The place@67, General Mathenge 2-in-1",
    description: "Plastic Containers\nPet Bottles",
    coordinate: {
      latitude: -1.25146725394106,
      longitude: 36.8070081471676,
    },
    type: "2-in-1"
  },
  {
    id: 14,
    name: "Onn the Way, Limuru Road: 2-in-1",
    description: "Plastic Containers\nPet Bottles",
    coordinate: {
      latitude: -1.25672761920116,
      longitude: 36.826262869902,
    },
    type: "2-in-1"
  },
  {
    id: 15,
    name: "Chandarana, Muthaiga: 2-in-1",
    description: "Plastic Containers\nPet Bottles",
    coordinate: {
      latitude: -1.25364603448047,
      longitude: 36.8398411244551,
    },
    type: "2-in-1"
  },
  {
    id: 16,
    name: "Chandarana, New Muthaiga Mall: 2-in-1",
    description: "Plastic Containers\nPet Bottles",
    coordinate: {
      latitude: -1.23246142643811,
      longitude: 36.7944694698541,
    },
    type: "2-in-1"
  },
  {
    id: 17,
    name: "Chandarana, Ridgeways Mall: 2-in-1",
    description: "Plastic Containers\nPet Bottles",
    coordinate: {
      latitude: -1.21813367219964,
      longitude: 36.8379903426218,
    },
    type: "2-in-1"
  },
  {
    id: 18,
    name: "Zucchini, ABC Place: 2-in-1",
    description: "Plastic Containers\nPet Bottles",
    coordinate: {
      latitude: -1.25604497752791,
      longitude: 36.7778505790099,
    },
    type: "2-in-1"
  },
  {
    id: 19,
    name: "Zucchini, The Hub: 2-in-1",
    description: "Plastic Containers\nPet Bottles",
    coordinate: {
      latitude: -1.31437920691551,
      longitude: 36.7047811245631,
    },
    type: "2-in-1"
  },
  {
    id: 20,
    name: "Green Spoon, Langata: 2-in-1",
    description: "Plastic Containers\nPet Bottles",
    coordinate: {
      latitude: -1.36720099775713,
      longitude: 36.749977556494,
    },
    type: "2-in-1"
  },
  {
    id: 21,
    name: "The Well, Karen: 2-in-1",
    description: "Plastic Containers\nPet Bottles",
    coordinate: {
      latitude: -1.33671318003037,
      longitude: 36.7561757337167,
    },
    type: "2-in-1"
  }
];

// Initial region (Nairobi)
const initialRegion = {
  latitude: -1.2921,
  longitude: 36.8219,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1
};

// Request location permission for Android
const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  };

// Get current user location
const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.log('Error getting location:', error);
      throw error;
    }
  };
  
  // Open directions to a location
  const openDirections = (latitude, longitude) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${latitude},${longitude}`;
    const url = Platform.select({
      ios: `${scheme}${latLng}`,
      android: `${scheme}${latLng}`
    });
    
    return url;
  };

export default {
  recyclingPoints,
  initialRegion,
  requestLocationPermission,
  getCurrentLocation,
  openDirections
};