// Firebase configuration
// For prototype: You'll need to create a Firebase project and add your config here
// IMPORTANT: For production, use environment variables

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDAEVVLihDrxUQeH7_rTcZkZPVtk1c6MGg",
  authDomain: "krysselista-eventyrhagen.firebaseapp.com",
  projectId: "krysselista-eventyrhagen",
  storageBucket: "krysselista-eventyrhagen.firebasestorage.app",
  messagingSenderId: "802236463930",
  appId: "1:802236463930:web:cb8bf535ef62cd21e4ae03",
  measurementId: "G-NETQEQVTYC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
