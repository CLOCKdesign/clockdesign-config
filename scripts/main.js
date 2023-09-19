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
// btnChangeModi.addEventListener("click", sendNewModi);

// buttons on debug
const btnConnect = document.getElementById("connect");
const btnSend0x30 = document.getElementById("send0x30");
const btnStrandtest = document.getElementById("stateStrandtest");
const btnMatrix = document.getElementById("stateMatrix");
const btnWordclock = document.getElementById("stateWordclock");


if (btnConnect) {
    btnConnect.addEventListener("click", connectToCLOCK);
}
if (btnSend0x30) {
    btnSend0x30.addEventListener("click", send0x30);
}
if (btnStrandtest) {
    btnStrandtest.addEventListener("click", sendStrandtest);
}
if (btnMatrix) {
    btnMatrix.addEventListener("click", sendMatrix);
}
if (btnWordclock) {
    btnWordclock.addEventListener("click", sendWordclock);
}

/// @todo Add disconnect action
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

async function disconnectFromCLOCK() {
    await device.gatt.disconnect();
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
    extractTime();
    // await disconnectFromCLOCK();
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

function updateTime() {
    var today = new Date();

    var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    options.timeZone = 'UTC';
    options.timeZoneName = 'short';

    var now = today.toLocaleString('de-CH');
    // document.getElementById("timeBrowser").innerHTML = now;
    setTimeout(updateTime, 1000);
}

updateTime();

extractTime();
