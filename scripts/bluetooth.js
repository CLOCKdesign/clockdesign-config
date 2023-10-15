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

import { MessageParser } from "./parser.js"
import { toggleState } from "./display.js";

const parser = new MessageParser();

const Modes = {
    gitHash: 0x30,
    gitTag: 0x31,
    readLDR: 0x60,
    checkTime: 0x61,
}

let tagMajor = 0;
let tagMinor = 0;
let tagPatch = 0;
let tagOffset = 0;

const dirtyFlagMask = 0x10000000;
const gitHashMask = 0x0FFFFFFF;

const deviceService = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const deviceTXcharacteristic = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // send to ESP32
const deviceRXcharacteristic = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // transmit from ESP32

var uartTXCharacteristic;
var device;
var connectedDevice;

// buttons on main
const btnUpdateTime = document.getElementById("btnUpdateTime");

btnUpdateTime.addEventListener("click", sendNewTime);

const textarea = document.getElementById('receivedData');

// buttons on debug
const btnToggleConnection = document.getElementById("toggleConnection");
const btnDeviceInfo = document.getElementById("deviceInfo");
const btnReadGitHash = document.getElementById("readGitHash");
const btnReadLDR = document.getElementById("readLDR");
const btnReadBrightness = document.getElementById("readBrightness");
const btnSetDark = document.getElementById("setDark");
const btnSetBright = document.getElementById("setBright");
const btnResetCalibration = document.getElementById("resetCalibration");
const btnPrintTime = document.getElementById("printTime");
const btnCheckTime = document.getElementById("checkTime");
const btnStrandtest = document.getElementById("stateStrandtest");
const btnMatrix = document.getElementById("stateMatrix");
const btnWordclock = document.getElementById("stateWordclock");

btnToggleConnection.addEventListener("click", connectToCLOCK);
btnDeviceInfo.addEventListener("click", async function() {await sendModeUint(Modes.gitHash, "Get gitHash", 0x01)});
btnReadGitHash.addEventListener("click", getVersionInfo);
btnReadLDR.addEventListener("click", async function () { sendModePayload(Modes.readLDR, "Read LDR") });
btnReadBrightness.addEventListener("click", async function () { sendModeUint(0x4B, "Read sensor value", 0x04) });
btnSetDark.addEventListener("click", async function () { sendModeUint(0x4B, "It's now dark", 0x01) });
btnSetBright.addEventListener("click", async function () { sendModeUint(0x4B, "It's now bright", 0x02) });
btnResetCalibration.addEventListener("click", async function () { sendModeUint(0x4B, "Reset to default", 0x03) });
btnPrintTime.addEventListener("click", async function () { sendModePayload(0x40, "Print time") });
btnCheckTime.addEventListener("click", checkTime);
btnStrandtest.addEventListener("click", async function () { sendModeUint(0x50, "Blinken", 0x01) });
btnMatrix.addEventListener("click", async function () { sendModeUint(0x50, "Matrix", 0x02) });
btnWordclock.addEventListener("click", async function () { sendModeUint(0x50, "Wordclock", 0x03) });

async function connectToCLOCK() {
    try {
        toggleState(connectedDevice);
        if (!connectedDevice) {
            connectionStatus.textContent = "Wordclock wird gesucht...";
            device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'CLOCKdesign' }
                ],
                optionalServices: [deviceService]
            });
            connectedDevice = await device.gatt.connect();
            connectionStatus.textContent = "CONNECTED";
            const espService = await connectedDevice.getPrimaryService(deviceService);
            connectionStatus.textContent = "UART RX connected";
            const uartRXCharacteristic = await espService.getCharacteristic(deviceRXcharacteristic);
            uartTXCharacteristic = await espService.getCharacteristic(deviceTXcharacteristic);
            connectionStatus.textContent = "UART RX characteristic discovered";
            const uartRXtext = await uartRXCharacteristic.startNotifications()
            const eventRXlistener = await uartRXCharacteristic.addEventListener('characteristicvaluechanged', handleNotifications);
            setTimeout(async function () {
                await getVersionInfo();
            }, 300);
            // 
        }
        else {
            console.log("alreadyConnected");
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
        toggleState(connectedDevice);
    }

}

var text = "";
function handleNotifications(event) {
    let value = event.target.value;
    for (let i = 0; i < value.byteLength; i++) {
        text += String.fromCharCode(value.getUint8(i));
        const message = parser.parseByte(value.getUint8(i));
        if (message !== null) {
            text = text.slice(0, -7); // remove M2M hex communication
            text += "M2M: 02 " + message.mode.toString(16).toUpperCase() + " ";
            message.payload.forEach(element => { text += element.toString(16).toUpperCase().padStart(2, '0') + " " });
            text += "03 \n";
            handleM2M(message.mode, message.payload);
        }
    }
    receivedData.textContent = text;
    textarea.scrollTop = textarea.scrollHeight;
}

function handleM2M(mode, payload) {
    const combinedValue = (payload[0] << 24) | (payload[1] << 16) | (payload[2] << 8) | payload[3];
    switch (mode) {
        case Modes.gitHash:
            {
                gitHash.textContent = "0x" + (combinedValue & gitHashMask).toString(16);
                if (combinedValue & dirtyFlagMask) {
                    gitHash.textContent += " - dirty";
                }
                break;
            }

        case Modes.gitTag:
            {
                tagMajor = payload[0];
                tagMinor = payload[1];
                tagPatch = payload[2];
                tagOffset = payload[3];
                gitTag.textContent = "v" + tagMajor + "." + tagMinor + "." + tagPatch;
                if (tagOffset) {
                    gitTag.textContent += " offset: " + tagOffset;
                }
                break;
            }
        case Modes.checkTime:
            {
                text += "CLOCK deltaT: " + combinedValue.toString() + " seconds.\n";
            }
        default:
            break;
    }
}

async function sendModePayload(mode, text, firstPayload = 0x00) {
    await connectToCLOCK();
    if (uartTXCharacteristic) {
        console.log("Write 0x" + mode.toString(16));
        let sendText = new Uint8Array([0x02, mode, firstPayload, 0x00, 0x00, 0x00, 0x03]);
        console.log(sendText);
        const writeSuccess = uartTXCharacteristic.writeValueWithoutResponse(sendText);
        sentData.textContent = text;
    }
}

async function sendModeUint(mode, text, payloadUint = 0) {
    await connectToCLOCK();
    if (uartTXCharacteristic) {
        console.log("Write 0x" + mode.toString(16));
        const packetBuffer = new ArrayBuffer(7); // 1 bytes (start), 1 byte ('A'), 4 bytes (Unix time), 1 byte (end)
        const packetView = new DataView(packetBuffer);

        packetView.setUint8(0, 0x02);
        packetView.setUint8(1, mode);
        packetView.setUint32(2, payloadUint, false); // false for little-endian byte order
        packetView.setUint8(6, 0x03);

        // Create a new Uint8Array from the packetBuffer
        const packetArray = new Uint8Array(packetBuffer);
        const writeSuccess = uartTXCharacteristic.writeValueWithoutResponse(packetArray);
        sentData.textContent = text;
    }
}

async function disconnect() {
    if (device) {
        setTimeout(async function () {
            connectedDevice = await device.gatt.disconnect();
            console.log("Disconnected");
            connectionStatus.textContent = "Disconnected"
            toggleState(connectedDevice);
        }, 300);
    }
}

async function getVersionInfo() {
    if (uartTXCharacteristic) {
        await sendModeUint(Modes.gitHash, "Get gitHash");
        setTimeout(async function () {
            await sendModeUint(Modes.gitTag, "Get gitTag");
        }, 300);
    }
}

async function sendNewTime() {
    await connectToCLOCK(true);
    if (device) {
        extractTime();
        alert("Uhrzeit erfolgreich aktualisiert");
    }
}

async function checkTime() {
    console.log("Check time");
    await connectToCLOCK();
    if (uartTXCharacteristic) {
        extractTime(Modes.checkTime);
    }
}

function extractTime(mode = 0x41) {
    const unixTime = Math.floor(Date.now() / 1000);
    console.log(unixTime);
    const timeArray = new Uint32Array([unixTime]);
    const timeBuffer = timeArray.buffer;
    const packetBuffer = new ArrayBuffer(7); // 1 bytes (start), 1 byte ('A'), 4 bytes (Unix time), 1 byte (end)
    const packetView = new DataView(packetBuffer);

    packetView.setUint8(0, 0x02);
    packetView.setUint8(1, mode);
    packetView.setUint32(2, timeArray[0], false); // false for little-endian byte order
    packetView.setUint8(6, 0x03);

    // Create a new Uint8Array from the packetBuffer
    const packetArray = new Uint8Array(packetBuffer);
    if (uartTXCharacteristic) {
        uartTXCharacteristic.writeValueWithoutResponse(packetArray);
    }
    console.log(packetArray);
}

toggleState(connectedDevice);

// Disconnect on timeout
const idleDuration = 60;
let idleTimeout;
const resetIdleTimeout = function () {
    if (idleTimeout) clearTimeout(idleTimeout)
    idleTimeout = setTimeout(disconnect, idleDuration * 1000);
}
resetIdleTimeout();
['click', 'touchstart', 'mousemove'].forEach(evt =>
    document.addEventListener(evt, resetIdleTimeout, false));
