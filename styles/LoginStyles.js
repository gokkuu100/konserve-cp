import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fdf6fb',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 20,
      },
      headerImage: {
        width: '100%',
        height: 200,
        resizeMode: 'cover',
        marginBottom: 20,
      },
      title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 10,
      },
      subtitle: {
        fontSize: 14,
        color: '#333',
        marginBottom: 20,
      },
      input: {
        width: '100%',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
      },
      passwordContainer: {
        position: 'relative',
        width: '100%',
      },
      icon: {
        position: 'absolute',
        right: 15,
        top: 18,
      },
      loginButton: {
        width: '100%',
        backgroundColor: '#000',
        padding: 15,
        borderRadius: 30,
        alignItems: 'center',
        marginVertical: 10,
      },
      loginText: {
        color: '#fff',
        fontWeight: 'bold',
      },
      googleButton: {
        width: '100%',
        backgroundColor: '#00a6e7',
        padding: 15,
        borderRadius: 30,
        alignItems: 'center',
        marginBottom: 10,
      },
      googleText: {
        color: '#fff',
        fontWeight: 'bold',
      },
      signupText: {
        marginTop: 10,
        fontStyle: 'italic',
      },
});
