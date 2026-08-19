const { Firestore } = require('@google-cloud/firestore');
async function test() {
  try {
    const firestore = new Firestore({ 
      projectId: 'neural-gear-56vd8',
      databaseId: 'ai-studio-vetstock-14a00c8f-cc83-44f9-bcce-0fddf33e376a'
    });
    const docRef = firestore.collection('test').doc('testdoc');
    await docRef.set({ hello: 'world', timestamp: Date.now() });
    const doc = await docRef.get();
    console.log('Success:', doc.data());
  } catch (err) {
    console.error('Error:', err.message);
  }
}
test();
