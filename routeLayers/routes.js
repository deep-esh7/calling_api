// routes/FirestoreRoutes.js

const express = require("express");
const router = express.Router();
const FirestoreController = require("../controllers/FirestoreControllers");


router.get("/fetchedDetails", FirestoreController.fetchMasterCollectionDetails); // New route to get fetched details

module.exports = router;
