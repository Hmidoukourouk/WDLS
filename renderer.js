//#region eye button

const eyeButton = document.getElementById('eyeButton');
const userInput = document.getElementById('userInput');

let hassubmitted = false;

eyeButton.addEventListener('mousedown', () => {
    if (eyeButton.classList.contains('eyeButtonActive')) {
        userInput.type = "text";
        userInput.style.fontSize = "1em";
    }
});

eyeButton.addEventListener('mouseup', () => {
    userInput.type = "password";
    userInput.style.removeProperty('font-size');
});

// Gère le cas où le bouton est relâché en dehors du bouton
eyeButton.addEventListener('mouseleave', () => {
    userInput.type = "password";
    userInput.style.removeProperty('font-size');
});

document.getElementById('userInput').addEventListener('input', () => {
    const eyeButton = document.getElementById('eyeButton');
    const eyeButtonIconPath = document.getElementById('eyeButtonIconPath');
    const eyeButtonIconFill = document.getElementById('eyeButtonIconFill');
    const userInput = document.getElementById('userInput').value;

    if (userInput.length > 0) {
        eyeButtonIconFill.setAttribute('fill', 'black');
        eyeButtonIconPath.setAttribute('stroke', 'black');
        eyeButton.classList.add('eyeButtonActive'); // Ajoute la classe active
    } else {
        eyeButtonIconFill.setAttribute('fill', 'white');
        eyeButtonIconPath.setAttribute('stroke', 'white');
        eyeButton.classList.remove('eyeButtonActive'); // Retire la classe active
    }
});

//#endregion

//#region password input
document.getElementById('nextBtn').addEventListener('click', () => {
    submitInput();
});

document.getElementById('userInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        submitInput();
    }
});

function fadeOutAndClose() {
    let opacity = 1;

    // Fonction d’animation pour diminuer l’opacité
    function animate() {
        opacity -= 0.0085; // Réduit l’opacité progressivement, ajustez cette valeur pour un effet plus ou moins rapide

        if (opacity > 0) {
            window.electron.send('set-opacity', opacity); // Envoie l'opacité mise à jour au processus principal
            requestAnimationFrame(animate); // Continue l'animation
        } else {
            window.electron.send('set-opacity', 0); // Assure une opacité de 0 à la fin
            window.electron.send('close-window'); // Envoie un signal pour fermer la fenêtre
        }
    }

    requestAnimationFrame(animate); // Lance l’animation
}

function submitInput() {
    if (hassubmitted === false) {
        document.getElementById("overlay").style.removeProperty("opacity");
        document.getElementById("botomPart").style.opacity = 0;
        const userInput = document.getElementById('userInput').value;
        window.electron.send('get-pass', userInput);
        hassubmitted = true;
        setTimeout(fadeOutAndClose, 20);
    }
}




//#endregion

//#region nextBtn active

const nextBtn = document.getElementById('nextBtn');
const centreurmdp = document.getElementById('centreurmdp');

// Applique les styles lorsque le bouton est cliqué et maintenu enfoncé
nextBtn.addEventListener('mousedown', () => {
    centreurmdp.style.border = 'var(--border-width) solid white';
    userInput.style.backgroundColor = 'var(--backroungActiveColor)';
    userInput.style.color = 'white';
    eyeButton.style.backgroundColor = 'var(--backroungActiveColor)';
});

// Rétablit les styles lorsque la souris est relâchée
nextBtn.addEventListener('mouseup', () => {
    resetStyles();
});

// Rétablit les styles lorsque la souris quitte le bouton
nextBtn.addEventListener('mouseleave', () => {
    resetStyles();
});

// Fonction pour réinitialiser les styles de #centreurmdp
function resetStyles() {
    centreurmdp.style.border = ''; // Réinitialise la bordure
    userInput.style.backgroundColor = '';
    eyeButton.style.backgroundColor = '';
    userInput.style.color = '';
}

//#endregion

//#region language

async function loadLanguage(translations) {
    console.log(translations);
    if (!translations) return;
    
    document.querySelectorAll("[data-translate-key]").forEach(element => {
        const key = element.getAttribute("data-translate-key");
        if (translations[key]) {
            if (element.placeholder !== undefined) {
                element.placeholder = translations[key];
            } else {
                element.textContent = translations[key];
            }
        }
    });
}

//#endregion

//#region set de la data

window.electron.receive('set-data', (data) => {
    if (data.username) {
        document.getElementById('username').innerHTML = `${data.username}`;
    }
    if (data.top) {
        document.getElementById('keyboardTop').innerHTML = `${data.top}`;
    }
    if (data.bottom) {
        document.getElementById('keyboardBottom').innerHTML = `${data.bottom}`;
    }
    if (data.isWifi === true) {
        document.getElementById('connectionCable').style.display = "none";
    }
    if (data.profileImagePath) {
        document.getElementById('img').src = data.profileImagePath;
    }
    if (data.profileImagebase64) {
        document.getElementById('img').style.backgroundImage = `url("${data.profileImagebase64}")`;
        console.log("bouing");
    }
    if (data.syscolor) {
        document.documentElement.style.setProperty('--systemColor', data.syscolor);
    }
    if (data.lang) {
        loadLanguage(data.lang);
    }
});

//#endregion