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
import { toggleState, checkBrowser } from "./display.js";

const parser = new MessageParser();

// global modes for v0.1.0
let mode_gitHash = 0x30;
let mode_gitTag = 0x31;
let mode_setTime = 0x41;
let mode_printTime = 0x40;
let mode_brightnessCal = 0x4B;
let mode_setState = 0x50;
let mode_readLDR = 0x60;
let mode_checkTime = 0x61;
let mode_color = 0x71;
let color_time = 0x00;
let color_happy = 0x01;

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

btnToggleConnection.addEventListener("click", toggleConnection);
btnDeviceInfo.addEventListener("click", async function () { await sendModeUint(mode_gitHash, "Get gitHash", 0x01) });
btnReadGitHash.addEventListener("click", getDeviceInfo);
btnReadLDR.addEventListener("click", async function () { sendModePayload(mode_readLDR, "Read LDR") });
btnReadBrightness.addEventListener("click", async function () { sendModeUint(mode_brightnessCal, "Read sensor value", 0x04) });
btnSetDark.addEventListener("click", async function () { sendModeUint(mode_brightnessCal, "It's now dark", 0x01) });
btnSetBright.addEventListener("click", async function () { sendModeUint(mode_brightnessCal, "It's now bright", 0x02) });
btnResetCalibration.addEventListener("click", async function () { sendModeUint(mode_brightnessCal, "Reset to default", 0x03) });
btnPrintTime.addEventListener("click", async function () { sendModePayload(mode_printTime, "Print time", 0x1) });
btnCheckTime.addEventListener("click", function () { sendModeUint(mode_checkTime, "Check time", getUnixTime()) });
btnStrandtest.addEventListener("click", async function () { sendModeUint(mode_setState, "Blinken", 0x01) });
btnMatrix.addEventListener("click", async function () { sendModeUint(mode_setState, "Matrix", 0x02) });
btnWordclock.addEventListener("click", async function () { sendModeUint(mode_setState, "Wordclock", 0x03) });

// color picker
const colorPickerTime = document.getElementById("colorInputTime");
const colorPickerHappy = document.getElementById("colorInputHappy");
colorPickerTime.addEventListener("change", updateColorTime, false);
colorPickerHappy.addEventListener("change", updateColorHappy, false);

async function toggleConnection() {
    if (!connectedDevice) {
        await connectCLOCK();
    }
    else {
        disconnectCLOCK();
    }
}

async function connectCLOCK() {
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
            await uartRXCharacteristic.startNotifications()
            await uartRXCharacteristic.addEventListener('characteristicvaluechanged', handleNotifications);
            setTimeout(async function () { await getDeviceInfo(); }, 400);
        }
    }
    catch (error) {
        if (typeof device !== 'undefined') {
            connectionStatus.textContent = "CONNECTION FAILED";
        }
        else {
            connectionStatus.textContent = "CANCELLED"
        }
        console.alert(String(error));
        connectedDevice = null;
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
        case mode_gitHash:
            {
                gitHash.textContent = "0x" + (combinedValue & gitHashMask).toString(16);
                if (combinedValue & dirtyFlagMask) {
                    gitHash.textContent += " - dirty";
                }
                break;
            }

        case mode_gitTag:
            {
                tagMajor = payload[0];
                tagMinor = payload[1];
                tagPatch = payload[2];
                tagOffset = payload[3];
                gitTag.textContent = "v" + tagMajor + "." + tagMinor + "." + tagPatch;
                if (tagOffset) {
                    gitTag.textContent += " offset: " + tagOffset;
                }
                changeModes(tagMajor, tagMinor, tagPatch);
                break;
            }
        case mode_checkTime:
            {
                text += "CLOCK deltaT: " + combinedValue.toString() + " seconds.\n";
            }

        case mode_color:
            {
                let newColor = "#" + ((payload[1] << 16) | (payload[2] << 8) | payload[3]).toString(16).padStart(6, '0');
                switch (payload[0]) {
                    case color_time:
                        colorPickerTime.value = newColor;
                        break;
                    case color_happy:
                        colorPickerHappy.value = newColor;
                    default:
                        break;
                }
            }
        default:
            break;
    }
}

async function sendModePayload(mode, text, firstPayload = 0x00) {
    await connectCLOCK();
    if (uartTXCharacteristic) {
        let sendText = new Uint8Array([0x02, mode, firstPayload, 0x00, 0x00, 0x00, 0x03]);
        const writeSuccess = uartTXCharacteristic.writeValueWithoutResponse(sendText);
        sentData.textContent = text;
    }
}

async function sendModeUint(mode, text, payloadUint = 0) {
    await connectCLOCK();
    if (uartTXCharacteristic) {
        const packetBuffer = new ArrayBuffer(7); // 1 bytes (start), 1 byte ('A'), 4 bytes (Unix time), 1 byte (end)
        const packetView = new DataView(packetBuffer);

        packetView.setUint8(0, 0x02);
        packetView.setUint8(1, mode);
        packetView.setUint32(2, payloadUint, false); // false for little-endian byte order
        packetView.setUint8(6, 0x03);

        // Create a new Uint8Array from the packetBuffer
        const packetArray = new Uint8Array(packetBuffer);
        uartTXCharacteristic.writeValueWithoutResponse(packetArray);
        sentData.textContent = text;
    }
}

async function disconnectCLOCK() {
    if (device) {
        setTimeout(async function () {
            connectedDevice = await device.gatt.disconnect();
            console.log("Disconnected");
            connectionStatus.textContent = "Disconnected"
            toggleState(connectedDevice);
        }, 300);
    }
}

async function getDeviceInfo() {
    if (uartTXCharacteristic) {
        sendModeUint(mode_gitHash, "Get gitHash");
        setTimeout(async function () {
            sendModeUint(mode_gitTag, "Get gitTag");
        }, 200);
        setTimeout(async function () {
            getColor(color_time);
        }, 400);
        setTimeout(async function () {
            getColor(color_happy);
        }, 600);
    }
}

async function getColor(colorID) {
    const combinedValue = (colorID << 24) | 0x000000;
    if (uartTXCharacteristic) {
        sendModeUint(mode_color, "Get color", combinedValue);
    }
}

async function updateColorTime() {
    await connectCLOCK(true);
    let combinedValue = parseInt(colorPickerTime.value.slice(1), 16);
    combinedValue = (color_time << 24) | combinedValue;
    combinedValue |= 0xF0000000;
    if (device) {
        sendModeUint(mode_color, "Set time color", combinedValue);
    }
}

async function updateColorHappy() {
    await connectCLOCK(true);
    let combinedValue = parseInt(colorPickerHappy.value.slice(1), 16);
    combinedValue = (color_happy << 24) | combinedValue;
    combinedValue |= 0xF0000000;
    if (device) {
        sendModeUint(mode_color, "Set happy color", combinedValue);
    }
}

async function sendNewTime() {
    await connectCLOCK(true);
    if (device) {
        sendModeUint(mode_setTime, "Set time", getUnixTime());
        alert("Uhrzeit erfolgreich aktualisiert");
    }
}

function getUnixTime() {
    return Math.floor(Date.now() / 1000);
}

function changeModes(major, minor, patch) {
    if (major > 0 || (major == 0 && minor >= 2)) {
        text += ">=v0.2.0 detected\n"
        // mode_gitHash [unchanged]
        // mode_gitTag [unchanged]
        mode_setTime = 0x62;
        mode_readLDR = 0x60;
        mode_checkTime = 0x64;
        mode_brightnessCal = 0x44;
        // mode_setState = [unchanged]
        mode_printTime = 0x61;
    }
}

toggleState(connectedDevice);
checkBrowser();

// Disconnect on timeout
const idleDuration = 60;
let idleTimeout;
const resetIdleTimeout = function () {
    if (idleTimeout) clearTimeout(idleTimeout)
    idleTimeout = setTimeout(disconnectCLOCK, idleDuration * 1000);
}
resetIdleTimeout();
['click', 'touchstart', 'mousemove'].forEach(evt =>
    document.addEventListener(evt, resetIdleTimeout, false));
