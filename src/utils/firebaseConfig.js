// src/utils/firebaseConfig.js - Firebase Configuration
// IMPORTANT: You need to replace these with your actual Firebase project credentials
// Get these from: Firebase Console > Project Settings > General > Your apps > Web app

window.FirebaseConfig = {
  // TODO: Replace with your Firebase project configuration
  config: {
	apiKey: "AIzaSyAJEn4czqUEpb_CkFiAm5uyja3NvaRz8v8",
	authDomain: "banana-71ab3.firebaseapp.com",
	projectId: "banana-71ab3",
	storageBucket: "banana-71ab3.firebasestorage.app",
	messagingSenderId: "90756917579",
	appId: "1:90756917579:web:554f6d382ded11a7f120ce",
	measurementId: "G-87KVXYKFBN"
  },

  // Initialize Firebase (called automatically when Firebase SDK loads)
  initialize: function() {
    if (typeof firebase === 'undefined') {
      console.error('Firebase SDK not loaded. Make sure to include Firebase scripts in index.html');
      return null;
    }

    try {
      // Check if already initialized
      if (firebase.apps.length === 0) {
        firebase.initializeApp(this.config);
        console.log('Firebase initialized successfully');
      }
      return firebase;
    } catch (error) {
      console.error('Error initializing Firebase:', error);
      return null;
    }
  },

  // Get Firebase database reference
  getDatabase: function() {
    const app = this.initialize();
    if (!app) return null;
    return firebase.database();
  },

  // Get Firebase auth reference
  getAuth: function() {
    const app = this.initialize();
    if (!app) return null;
    return firebase.auth();
  }
};

// SETUP INSTRUCTIONS:
//
// 1. Create a Firebase project at https://console.firebase.google.com/
// 2. In your Firebase project, enable:
//    - Realtime Database (under Build > Realtime Database)
//    - Authentication > Sign-in method > Anonymous (Enable it)
//
// 3. Get your config from: Project Settings > General > Your apps > Web app
//    Click "Add app" if you haven't created a web app yet
//
// 4. Replace the config object above with your actual values
//
// 5. Add Firebase CDN scripts to index.html (see README-FIREBASE.md for details)
//
// 6. Set up Security Rules (see FIREBASE-SECURITY-RULES.md)
