// https://novelbits.io/web-bluetooth-getting-started-guide/
// https://developer.mozilla.org/en-US/docs/Web/API/BluetoothRemoteGATTCharacteristic/readValue

const btnConnect = document.getElementById("connect");
const btnUpdate = document.getElementById("updateTimeButton");
const btnWrite = document.getElementById("sendToESP");

const btnStrandtest = document.getElementById("stateStrandtest");
const btnMatrix = document.getElementById("stateMatrix");
const btnWordclock = document.getElementById("stateWordclock");

const connectionStatus = document.getElementById("connectionStatus");

const deviceService = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const deviceTXcharacteristic = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // send to ESP32
const deviceRXcharacteristic = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // transmit from ESP32

btnConnect.addEventListener("click", BLEManager);
// btnConnect.addEventListener("click", BLEManager);
btnWrite.addEventListener("click", sendToESP);
btnStrandtest.addEventListener("click", sendStrandtest);
btnMatrix.addEventListener("click", sendMatrix);
btnWordclock.addEventListener("click", sendWordclock);

var uartTXCharacteristic;

/// @todo Add disconnect action

async function BLEManager() {
    connectionStatus.textContent = "Wordclock wird gesucht...";
    try {
        device = await navigator.bluetooth.requestDevice({
            filters: [
                {namePrefix: 'CLOCKdesign'}
            ],
            optionalServices: [deviceService]
        });
        console.log(device);
        const connectedDevice = await device.gatt.connect();
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
    text = a.join('');
    receivedData.textContent = text;
  }

  function sendToESP() {
    if (uartTXCharacteristic) {
        console.log("Write to esp32");
        let sendText = new Uint8Array([0x02, 0x30, 0x00,0x00,0x00,0x00,0x03]);
        console.log(sendText);
        uartTXCharacteristic.writeValueWithoutResponse(sendText);
        sentData.textContent = "0x30 to ESP";
    }
  }

  function sendStrandtest() {
    if (uartTXCharacteristic) {
        console.log("Write to esp32");
        let sendText = new Uint8Array([0x02, 0x50, 0x01,0x00,0x00,0x00,0x03]);
        console.log(sendText);
        uartTXCharacteristic.writeValueWithoutResponse(sendText);
        sentData.textContent = "Darstellungsmodus: Test";
    }
  }

  function sendMatrix() {
    if (uartTXCharacteristic) {
        console.log("Write to esp32");
        let sendText = new Uint8Array([0x02, 0x50, 0x02,0x00,0x00,0x00,0x03]);
        console.log(sendText);
        uartTXCharacteristic.writeValueWithoutResponse(sendText);
        sentData.textContent = "Darstellungsmodus: Matrix";
    }
  }

  function sendWordclock() {
    if (uartTXCharacteristic) {
        console.log("Write to esp32");
        let sendText = new Uint8Array([0x02, 0x50, 0x03,0x00,0x00,0x00,0x03]);
        console.log(sendText);
        uartTXCharacteristic.writeValueWithoutResponse(sendText);
        sentData.textContent = "Darstellungsmodus: Wordclock";
    }
  }

function updateTime() {
    var today = new Date();

    var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    options.timeZone = 'UTC';
    options.timeZoneName = 'short';

    var now = today.toLocaleString('de-CH');
    document.getElementById("timeBrowser").innerHTML = now;
    setTimeout(updateTime, 1000);
}

updateTime();
