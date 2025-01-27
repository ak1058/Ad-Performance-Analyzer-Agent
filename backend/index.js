const express = require('express');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const { uploadFile, analyzeFileFromUrl } = require('./controllers/fileControllers'); // Importing the controller

const app = express();
const PORT = 3000;


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());


app.post('/upload', uploadFile);
app.post('/analyze', analyzeFileFromUrl)


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
