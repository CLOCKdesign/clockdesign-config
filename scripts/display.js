export function toggleState(connected) {
    var button = document.getElementById("toggleConnection");
    var btnToggleConnection = document.getElementById("toggleConnection");
    if (connected) {
        button.style.backgroundColor = "green";
        btnToggleConnection.textContent = "Click to disconnect";
    }
    else {
        button.style.backgroundColor = "red";
        btnToggleConnection.textContent = "Click to connect";
    }
    var disabled;
    var color;
    if (connected) {
        disabled = false;
        color = "black"
    } else {
        disabled = true;
        color = "gray"
    }
    var buttons = document.getElementsByClassName("onConnOnly");
    for (let el of buttons) {
        el.disabled = disabled;
        el.style.backgroundColor = color;
    }

    // Check BLE availability
    navigator.bluetooth.getAvailability().then((available) => {
        if (available) {
            console.log("This device supports Bluetooth!");
        } else {
            var collection = document.getElementsByClassName('bleDisabled');
            for (let el of collection) {
                el.style.display = "block";
            }
            var collection = document.getElementsByClassName('bleEnabled');
            for (let el of collection) {
                el.style.display = "none";
            }
        }
    });
}

// Check for debug interface
const currentUrl = window.location.href;
if (currentUrl.endsWith('debug')) {
    var collection = document.getElementsByClassName('debugOnly');
    for (let el of collection) {
        el.style.display = "block";
    }
    var currentTitle = document.title;
    document.title = "dev." + currentTitle;
}
