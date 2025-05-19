const express = require('express');
const app = express();
const port = process.env.PORT || 5000; 
const path = require('path');
const fs = require('fs');
app.use(express.json());


const versionFilePath = path.join(__dirname, 'version.json');

function getVersion(name) {
  try {
    const data = fs.readFileSync(versionFilePath, 'utf8');
    const doc = JSON.parse(data);
    let version = doc[name];
    return version;
  } catch (err) {
    console.error('Error reading version file:', err);
    return "0.0"; // Default version
  }
}
function updateVersion(name, newVer) {
  try {
    const data = fs.readFileSync(versionFilePath, 'utf8');
    const doc = JSON.parse(data);
    doc[name] = newVer;
    fs.writeFileSync(versionFilePath, JSON.stringify(doc, 2));
    console.log('Version updated successfully');
  } catch (err) {
    console.error('Error updating version file:', err);
  }
}

app.get('/', (req, res) => {
    res.sendFile('index.html', {root: path.join(__dirname, "/page/")});

  //res.send('<p>hello from express</p>');
});

app.get('/:name/update', (req, res) => {
  const name = req.params.name;
  const firmwareDir = path.join(__dirname,"uploads", name);
  // Check if directory exists
  if (!fs.existsSync(firmwareDir)) {
    return res.status(404).send('Directory not found');
  }

  const files = fs.readdirSync(firmwareDir);

  if (files.length === 0) {
    return res.status(404).send('No firmware file found');
  }

  if (files.length > 1) {
    return res.status(409).send('Multiple firmware files found');
  }

  const firmwarePath = path.join(firmwareDir, files[0]);
  const stat = fs.statSync(firmwarePath);
  //res.download(firmwarePath, files[0]);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', stat.size);

  res.sendFile(firmwarePath);
});

const multer = require('multer')


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (req.body.version != ""){

      // Ensure the target folder exists
      const targetFolder = path.join(__dirname, 'uploads', req.params.name);
      fs.mkdirSync(targetFolder, { recursive: true });

      // Delete previous files in the folder
      fs.readdir(targetFolder, (err, files) => {
        if (err) return cb(err);
        for (const f of files) {
          fs.unlinkSync(path.join(targetFolder, f));
        }
        cb(null, targetFolder);
      });
    }else{
      console.log("No version provided");
    }
  },
  filename: function (req, file, cb) {
    // Save the new file with its original name (or change if needed)
    if (req.body.version != ""){
      cb(null, file.originalname);
    }
  }
});



const upload = multer({ storage: storage });
app.post("/:name/new", upload.single('file'), async function (req, res, next) {
  try {
      console.log("Uploaded file:", req.file.originalname); // file
      console.log("Version:", req.body.version);          
      updateVersion(req.params.name, parseFloat(req.body.version));
      res.sendStatus(200);
      
      //res.write(200);
  } catch (err) {
      next(err)
  }
});


app.get('/:name/version', (req, res) => {
  let n = getVersion(req.params.name);
  n = Number.isInteger(n) ? `${n}.0` : `${n}`;
  if (!n) {
    return res.status(404).send('Version not found');
  }
  res.json({ version: n });
});

app.listen(port, () => {
  console.log('Server is running on port'+ port);
  //Ensure the version file exists.
  if(!fs.existsSync(versionFilePath)){
    fs.writeFileSync(versionFilePath, "0.0");
    console.log("Version file created");
  }
});


