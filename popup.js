// On/off switch. content.js reads `isEnabled` when each page loads (default: on).
document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('toggleButton');
    const status = document.getElementById('statusText');

    function render(on) {
        button.textContent = on ? 'Turn off' : 'Turn on';
        button.classList.toggle('off', on);
        status.textContent = `Status: ${on ? 'On' : 'Off'}`;
    }

    chrome.storage.local.get(['isEnabled'], r => render(r.isEnabled !== false));

    button.addEventListener('click', () => {
        chrome.storage.local.get(['isEnabled'], r => {
            const on = !(r.isEnabled !== false);
            chrome.storage.local.set({ isEnabled: on }, () => render(on));
        });
    });
});
