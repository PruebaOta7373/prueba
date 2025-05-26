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
    var aux ="";
    if(version != [] && version != "" & version != null){
      version.forEach((element) => {
        aux += element.replace('_', '.').replace("V", "")+", ";
      })
      aux = aux.slice(0, -2);
    }else{
      aux = "None";
    }
    return " " + aux;
  } catch (err) {
    console.error('Error reading version file:', err);
    return "0.0"; // Default version
  }
}
function getNames() {
  try {
    const data = fs.readFileSync(versionFilePath, 'utf8');
    const doc = JSON.parse(data);
    const json = {}; // Initialize json as an object
    let cont = 1;     // Use 'let', not 'cont' which was a typo

    for (const key in doc) {
      json[cont] = key;
      cont++;
    }

    return json;
  } catch (err) {
    console.error('Error reading version file:', err);
    return "0.0"; // Default version
  }
}
function updateVersion(name, newVer) {
  try {
    const data = fs.readFileSync(versionFilePath, 'utf8');
    const doc = JSON.parse(data);
    var aux = "V"+newVer;
    aux = aux.replace('.', '_');
    doc[name].push(aux);
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
//get the update file for a specific board and version
app.get('/:name/:version/update', (req, res) => {
  const version = req.params.version;
  const name = req.params.name;
  const firmwareDir = path.join(__dirname,"uploads", name, version);

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
      const targetFolder = path.join(__dirname, 'uploads', req.params.name,req.params.version);
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


// Upload a new firmware file version for a specific board
const upload = multer({ storage: storage });
app.post("/:name/:version/new", upload.single('file'), async function (req, res, next) {
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

// Get the list of all versions for a specific board
app.get('/:name/version', (req, res) => {
  let n = getVersion(req.params.name);
  n = Number.isInteger(n) ? `${n}.0` : `${n}`;
  if (!n) {
    return res.status(404).send('Version not found');
  }
  res.json({ version: n });
});


  app.get('/:name/empty', (req, res) => {
  try {
    const name = req.params.name;
    const uploadsDir = path.join(__dirname, 'uploads', name);
    
    // Check if directory exists
    if (!fs.existsSync(uploadsDir)) {
      return res.status(404).send('Directory not found');
    }

    // Remove all subdirectories and files
    fs.readdirSync(uploadsDir).forEach((dir) => {
      const dirPath = path.join(uploadsDir, dir);
      fs.rmSync(dirPath, { recursive: true, force: true });
    });

    // Update version.json to empty array for this name
    const data = fs.readFileSync(versionFilePath, 'utf8');
    const doc = JSON.parse(data);
    doc[name] = [];
    fs.writeFileSync(versionFilePath, JSON.stringify(doc, null, 2));

    res.sendStatus(200);
  } catch (err) {
    console.error('Error emptying directory:', err);
    res.status(500).send('Error emptying directory');
  }
});
app.get('/placas', (req, res) => {
  let n = getNames();
  if (!n) {
    return res.status(404).send('Version not found');
  }
  res.json( n );
});     


app.listen(port, () => {
  console.log('Server is running on port '+ port);
  //Ensure the version file exists.
  if(!fs.existsSync(versionFilePath)){
    fs.writeFileSync(versionFilePath, "0.0");
    console.log("Version file created");
  }
});


