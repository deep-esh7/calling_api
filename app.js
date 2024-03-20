// app.js

const express = require("express");
const FirestoreRoutes = require("./routeLayers/routes");

const app = express();

// Middleware
app.use(express.json()); // Parse JSON bodies

// Routes
app.use("/fetchnumber", FirestoreRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Internal server error");
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
