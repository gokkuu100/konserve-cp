import { StyleSheet, Text, View } from 'react-native';
export default function AppScreen() {
return (
<View style={styles.container}>
<Text style={styles.subText}>Login to your account</Text>

</View>
 );
}
const styles = StyleSheet.create({
container: {
flex: 1,
backgroundColor: '#fff',
alignItems: 'center',
justifyContent: 'center',
 },
});