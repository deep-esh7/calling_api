const admin = require ("firebase-admin");
const serviceAccount= require("../key.json");
const { masterCollection } = require("../utils/collectionNames.js");

admin.initializeApp({

    credential: admin.credential.credential(serviceAccount)
});

const db=admin.firestore();


module.exports= {
    async fetchMasterCollection(didNumber){


        try {
            const snapshot = await db.collection(masterCollection).doc("didNumbers").collection("didNumbers").where("didNo","==",didNumber).get();
            const documents = snapshot.docs.map(doc=> doc.data());
            return documents;
        } catch(error){
            throw error;
        }
    }
}