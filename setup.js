document.getElementById('nextBtn').addEventListener('click', () => {
    const data = {}; // Initialise `data` en tant qu'objet
    data.top = document.getElementById('keyboardTop').value;
    data.bottom = document.getElementById('keyboardBottom').value;
    data.username = document.getElementById('usernameInput').value;
    data.lang = document.getElementById('languageSelector').value;
    window.electron.send('set-data', data); // Envoie au processus principal
});

window.electron.receive('color', (data) => {
    document.documentElement.style.setProperty('--systemColor', data);
});

window.electron.receive('lang', (data) => {
    loadLanguage(data);
});

window.electron.receive('name', (data) => {
    document.getElementById("usernameInput").value = data;
    document.getElementById("waitname").innerHTML = "OK !";
    document.getElementById("waitname").removeAttribute("data-translate-key");
    document.getElementById("waitname").classList.remove("loading");
    document.getElementById("nextBtn").classList.add("nextBtnColValid");
});

document.getElementById('exitButton').addEventListener('click', () => {
    window.electron.send('setup-quit'); // Envoie au processus principal
});

window.electron.receive('filePath', (data) => {
    document.getElementById("filePath").innerHTML = data;
});


//#region language

async function loadLanguage(lang) {
    try {
        const response = await fetch(`./locales/${lang}.json`);
        const translations = await response.json();

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

        if (translations["keyboardTopValue"]) {
            document.getElementById("keyboardTop").value = translations["keyboardTopValue"];
        }
        if (translations["keyboardBottomValue"]) {
            document.getElementById("keyboardBottom").value = translations["keyboardBottomValue"];
        }

    } catch (error) {
        console.error("Error loading language:", error);
    }
}

// Listener for language selection
document.getElementById('languageSelector').addEventListener('change', (event) => {
    loadLanguage(event.target.value);
});

//#endregion