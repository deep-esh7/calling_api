
const FirestoreModel = require("../models/FirebaseModule");


let fetchedDetails = null;


module.exports = {
  async fetchMasterCollectionDetails(req, res) {

    const did = req.params.caller_id_number;


    try {

      fetchedDetails = await FirestoreModel.fetchMasterCollection(did); 
      const fetchedDetails = await FirestoreModel.fetchMasterCollection(did);
    //   
    console.log(fetchedDetails);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};