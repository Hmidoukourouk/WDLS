document.getElementById('nextBtn').addEventListener('click', () => {
    const data = {}; // Initialise `data` en tant qu'objet
    data.top = document.getElementById('keyboardTop').value;
    data.bottom = document.getElementById('keyboardBottom').value;
    data.username = document.getElementById('usernameInput').value;
    window.electron.send('set-data', data); // Envoie au processus principal
});


window.electron.receive('color', (data) => {
    document.documentElement.style.setProperty('--systemColor', data);
});

window.electron.receive('name', (data) => {
    document.getElementById("usernameInput").value = data;
    document.getElementById("waitname").innerHTML = "c'est bon ! on l'a trouvé !";
    document.getElementById("waitname").classList.remove("loading");
    document.getElementById("nextBtn").classList.add("nextBtnColValid");
});

document.getElementById('exitButton').addEventListener('click', () => {
    window.electron.send('setup-quit'); // Envoie au processus principal
});

window.electron.receive('debug', (data) => {
    document.getElementById("gangedebug").innerHTML = data;
});