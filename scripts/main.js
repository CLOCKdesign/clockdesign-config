// https://novelbits.io/web-bluetooth-getting-started-guide/
// https://developer.mozilla.org/en-US/docs/Web/API/BluetoothRemoteGATTCharacteristic/readValue

const deviceService = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const deviceTXcharacteristic = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // send to ESP32
const deviceRXcharacteristic = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // transmit from ESP32

var uartTXCharacteristic;
var device;
var connectedDevice;

// buttons on main
const btnUpdateTime = document.getElementById("btnUpdateTime");
const btnChangeModi = document.getElementById("btnChangeModi");

btnUpdateTime.addEventListener("click", sendNewTime);

// buttons on debug
const btnConnect = document.getElementById("connect");
const btnSend0x30 = document.getElementById("send0x30");
const btnPrintTime = document.getElementById("printTime");
const btnStrandtest = document.getElementById("stateStrandtest");
const btnMatrix = document.getElementById("stateMatrix");
const btnWordclock = document.getElementById("stateWordclock");

btnConnect.addEventListener("click", connectToCLOCK);
btnSend0x30.addEventListener("click", send0x30);
btnPrintTime.addEventListener("click", sendTime);
btnStrandtest.addEventListener("click", sendStrandtest);
btnMatrix.addEventListener("click", sendMatrix);
btnWordclock.addEventListener("click", sendWordclock);

async function connectToCLOCK() {
    connectionStatus.textContent = "Wordclock wird gesucht...";
    try {
        device = await navigator.bluetooth.requestDevice({
            filters: [
                { namePrefix: 'CLOCKdesign' }
            ],
            optionalServices: [deviceService]
        });
        console.log(device);
        connectedDevice = await device.gatt.connect();
        connectionStatus.textContent = "CONNECTED";
        const espService = await connectedDevice.getPrimaryService(deviceService);
        connectionStatus.textContent = "UART RX connected";
        const uartRXCharacteristic = await espService.getCharacteristic(deviceRXcharacteristic);
        uartTXCharacteristic = await espService.getCharacteristic(deviceTXcharacteristic);
        connectionStatus.textContent = "UART RX characteristic discovered";
        const uartRXtext = await uartRXCharacteristic.startNotifications()
        console.log(uartRXtext);
        const eventRXlistener = await uartRXCharacteristic.addEventListener('characteristicvaluechanged', handleNotifications);

    } catch (error) {
        if (typeof device !== 'undefined') {
            connectionStatus.textContent = "CONNECTION FAILED";
        }
        else {
            connectionStatus.textContent = "CANCELLED"
        }
        console.log(String(error));
    }

}

var text = "";
function handleNotifications(event) {
    let value = event.target.value;
    let a = [];
    // Convert raw data bytes to hex values just for the sake of showing something.
    // In the "real" world, you'd use data.getUint8, data.getUint16 or even
    // TextDecoder to process raw data bytes.
    console.log(value);
    for (let i = 0; i < value.byteLength; i++) {
        a.push(String.fromCharCode(value.getUint8(i)));
    }
    text += a.join('');
    receivedData.textContent = text;
    console.log(text);
}

function send0x30() {
    if (uartTXCharacteristic) {
        console.log("Write to esp32");
        let sendText = new Uint8Array([0x02, 0x30, 0x00, 0x00, 0x00, 0x00, 0x03]);
        console.log(sendText);
        uartTXCharacteristic.writeValueWithoutResponse(sendText);
        sentData.textContent = "0x30 to ESP";
    }
}

function sendTime() {
    if (uartTXCharacteristic) {
        console.log("Write to esp32");
        let sendText = new Uint8Array([0x02, 0x40, 0x00, 0x00, 0x00, 0x00, 0x03]);
        console.log(sendText);
        uartTXCharacteristic.writeValueWithoutResponse(sendText);
        sentData.textContent = "0x40 to ESP";
    }
}

function sendStrandtest() {
    if (uartTXCharacteristic) {
        console.log("Write to esp32");
        let sendText = new Uint8Array([0x02, 0x50, 0x01, 0x00, 0x00, 0x00, 0x03]);
        console.log(sendText);
        uartTXCharacteristic.writeValueWithoutResponse(sendText);
        sentData.textContent = "Darstellungsmodus: Test";
    }
}

function sendMatrix() {
    if (uartTXCharacteristic) {
        console.log("Write to esp32");
        let sendText = new Uint8Array([0x02, 0x50, 0x02, 0x00, 0x00, 0x00, 0x03]);
        console.log(sendText);
        uartTXCharacteristic.writeValueWithoutResponse(sendText);
        sentData.textContent = "Darstellungsmodus: Matrix";
    }
}

function sendWordclock() {
    if (uartTXCharacteristic) {
        console.log("Write to esp32");
        let sendText = new Uint8Array([0x02, 0x50, 0x03, 0x00, 0x00, 0x00, 0x03]);
        console.log(sendText);
        uartTXCharacteristic.writeValueWithoutResponse(sendText);
        sentData.textContent = "Darstellungsmodus: Wordclock";
    }
}

async function sendNewTime() {
    await connectToCLOCK();
    if (device) {
        extractTime();
        alert("Uhrzeit erfolgreich aktualisiert");
        setTimeout(async function () {
            await device.gatt.disconnect();
            console.log("Disconnected");
        }, 300);
    }
}

function extractTime() {
    const unixTime = Math.floor(Date.now() / 1000);
    console.log(unixTime);
    const timeArray = new Uint32Array([unixTime]);
    const timeBuffer = timeArray.buffer;
    const packetBuffer = new ArrayBuffer(7); // 1 bytes (start), 1 byte ('A'), 4 bytes (Unix time), 1 byte (end)
    const packetView = new DataView(packetBuffer);

    packetView.setUint8(0, 0x02);

    // Set the 'A' byte (0x41)
    packetView.setUint8(1, 0x41);

    // Set the Unix time bytes (4 bytes)
    packetView.setUint32(2, timeArray[0], false); // false for little-endian byte order

    // Set the end byte (0x03)
    packetView.setUint8(6, 0x03);

    // Create a new Uint8Array from the packetBuffer
    const packetArray = new Uint8Array(packetBuffer);
    if (uartTXCharacteristic) {
        uartTXCharacteristic.writeValueWithoutResponse(packetArray);
    }
    console.log(packetArray);
}

setTimeout(function () {
    const currentUrl = window.location.href;
    if(currentUrl.endsWith('debug')) {
        var collection = document.getElementsByClassName('debugOnly');
        for (let el of collection) {
        el.style.display  = "block";
        }
    //   if (x.style.display === "none") {
    //   } else {
    //     x.style.display = "none";
    //   }
    console.log(currentUrl);
    console.log(currentUrl.endsWith('debug'));
    }
}, 300);

