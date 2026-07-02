const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCpRlTNQKmyFqUKUo5zH_8ZbyaWZQe-Vec",
  authDomain: "ffhh-5f5b1.firebaseapp.com",
  databaseURL: "https://ffhh-5f5b1-default-rtdb.firebaseio.com",
  projectId: "ffhh-5f5b1",
  storageBucket: "ffhh-5f5b1.firebasestorage.app",
  messagingSenderId: "1060819037700",
  appId: "1:1060819037700:web:3277aa663d612687e00f51",
  measurementId: "G-M3VXQQVEWX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testConnection() {
  console.log("Attempting to connect to Firestore...");
  try {
    const testDocRef = doc(db, 'test_collection', 'test_doc');
    await setDoc(testDocRef, {
      message: "Hello from developer scratch script!",
      timestamp: new Date().toISOString()
    });
    console.log("✅ Success: Wrote document to test_collection/test_doc");

    const querySnapshot = await getDocs(collection(db, 'test_collection'));
    console.log(`✅ Success: Fetched ${querySnapshot.size} documents from test_collection`);
    querySnapshot.forEach((doc) => {
      console.log(`Document ID: ${doc.id}, Data:`, doc.data());
    });
  } catch (error) {
    console.error("❌ Connection failed with error:", error);
  }
}

testConnection();
