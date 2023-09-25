/******************************************************************************
 * Copyright (C) 2023 by Niederberger Marco                                   *
 *                                                                            *
 * This file is part of config.CLOCKdesign.                                   *
 *                                                                            *
 * config.CLOCKdesign is free software: you can redistribute it and/or modify *
 * it under the terms of the GNU General Public License as published by       *
 * the Free Software Foundation, either version 3 of the License, or          *
 * (at your option) any later version.                                        *
 *                                                                            *
 * config.CLOCKdesign is distributed in the hope that it will be useful,      *
 * but WITHOUT ANY WARRANTY; without even the implied warranty of             *
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the               *
 * GNU General Public License for more details.                               *
 *                                                                            *
 * You should have received a copy of the GNU General Public License          *
 * along with config.CLOCKdesign. If not, see <http://www.gnu.org/licenses/>. *
 ******************************************************************************/
/**
 * @file main.js
 * @authors Niederberger Marco
 *
 * @brief The javascript file for the config site
 * It contains all BLE functionality's.
 * 
 * @see
 * https://novelbits.io/web-bluetooth-getting-started-guide/
 * https://developer.mozilla.org/en-US/docs/Web/API/BluetoothRemoteGATTCharacteristic/readValue
 * https://developer.chrome.com/articles/bluetooth/
*/

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
const btnToggleConnection = document.getElementById("toggleConnection");
const btnSend0x30 = document.getElementById("send0x30");
const btnReadLDR = document.getElementById("readLDR");
const btnPrintTime = document.getElementById("printTime");
const btnStrandtest = document.getElementById("stateStrandtest");
const btnMatrix = document.getElementById("stateMatrix");
const btnWordclock = document.getElementById("stateWordclock");

btnToggleConnection.addEventListener("click", connectToCLOCK);
btnSend0x30.addEventListener("click", send0x30);
btnReadLDR.addEventListener("click", readLDR);
btnPrintTime.addEventListener("click", sendTime);
btnStrandtest.addEventListener("click", sendStrandtest);
btnMatrix.addEventListener("click", sendMatrix);
btnWordclock.addEventListener("click", sendWordclock);

async function connectToCLOCK(force = false) {
    try {
        toggleState();
        if (!connectedDevice || !force) {
            connectionStatus.textContent = "Wordclock wird gesucht...";
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
        }
        else {
            disconnect();
        }
    }
    catch (error) {
        if (typeof device !== 'undefined') {
            connectionStatus.textContent = "CONNECTION FAILED";
        }
        else {
            connectionStatus.textContent = "CANCELLED"
        }
        console.log(String(error));
    }
    finally {
        toggleState();
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

function readLDR() {
    if (uartTXCharacteristic) {
        console.log("Write to esp32");
        let sendText = new Uint8Array([0x02, 0x60, 0x00, 0x00, 0x00, 0x00, 0x03]);
        console.log(sendText);
        uartTXCharacteristic.writeValueWithoutResponse(sendText);
        sentData.textContent = "0x40 to ESP";
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

async function disconnect() {
    if (device) {
        setTimeout(async function () {
            connectedDevice = await device.gatt.disconnect();
            console.log("Disconnected");
            connectionStatus.textContent = "Disconnected"
            toggleState();
        }, 300);
    }
}

async function sendNewTime() {
    await connectToCLOCK(force = true);
    if (device) {
        extractTime();
        alert("Uhrzeit erfolgreich aktualisiert");
        disconnect();
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

function toggleState() {
    var button = document.getElementById("toggleConnection");
    if (connectedDevice) {
        button.style.backgroundColor = "green";
    }
    else {
        button.style.backgroundColor = "red";
    }
    var disabled;
    var color;
    if (connectedDevice) {
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
}

toggleState();

const currentUrl = window.location.href;
if (currentUrl.endsWith('debug')) {
    var collection = document.getElementsByClassName('debugOnly');
    for (let el of collection) {
        el.style.display = "block";
    }
    var currentTitle = document.title;
    document.title = "dev." + currentTitle;
}

const idleDuration = 60;
let idleTimeout;
const resetIdleTimeout = function () {
    if (idleTimeout) clearTimeout(idleTimeout)
    idleTimeout = setTimeout(disconnect, idleDuration * 1000);
}
resetIdleTimeout();
['click', 'touchstart', 'mousemove'].forEach(evt =>
    document.addEventListener(evt, resetIdleTimeout, false));
