var websocket = null,
    uuid = null,
    actionInfo = {},
    inInfo = {},
    runningApps = [],
    isQT = navigator.appVersion.includes('QtWebEngine');

// Global settings
var settings = {};

// Global cache
var cache = {};

function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
    uuid = inUUID;
    actionInfo = JSON.parse(inActionInfo); // cache the info
    inInfo = JSON.parse(inInfo);
    websocket = new WebSocket('ws://127.0.0.1:' + inPort);

    // Save global settings
    settings = actionInfo["payload"]["settings"];

    // Retrieve action identifier
    var action = actionInfo["action"];

    addDynamicStyles(inInfo.colors);

    websocket.onopen = function () {
        var json = {
            event: inRegisterEvent,
            uuid: inUUID
        };
        websocket.send(JSON.stringify(json));
        sendValueToPlugin('propertyInspectorConnected', 'property_inspector');
    };

    websocket.onmessage = function (evt) {
        // Received message from Stream Deck
        var jsonObj = JSON.parse(evt.data);
        var action = actionInfo["action"];
        actions[action](jsonObj);
    };
}

actions = {
    'com.sheriffbuzz.ahkclient.ahkrequest': function(jsonObj) {
        if (jsonObj.event === 'sendToPropertyInspector') {
            var payload = jsonObj.payload;
            if (payload.error) {
                // Show Error
                // You can use this to show any errors and short circuit the rest of the refresh code
                return;
            }

            settings = jsonObj.payload; //for this event, the settings are on the payload, not an additional prop "settings"
            prepareDOM(settings);
            // Save global cache
            cache = jsonObj;
            
        } else if (jsonObj.event === 'didReceiveSettings') {
            settings = jsonObj.payload.settings;
            prepareDOM(settings);
        }
    },
    'com.sheriffbuzz.ahkclient.ahklibraryfunction': function (jsonObj) {
        if (jsonObj.event === 'sendToPropertyInspector') {
            var payload = jsonObj.payload;
            if (payload.error) {
                // Show Error
                // You can use this to show any errors and short circuit the rest of the refresh code
                return;
            }

            settings = jsonObj.payload; //for this event, the settings are on the payload, not an additional prop "settings"
            prepareDOM(settings);

            getGlobalSettings() //try to populate default persistent script name
            // Save global cache
            cache = jsonObj;
            
        } else if (jsonObj.event === 'didReceiveSettings') {
            settings = jsonObj.payload.settings;
            prepareDOM(settings);
        } else if (jsonObj.event === 'didReceiveGlobalSettings') {
            settings = jsonObj.payload.settings;
            var persistentScriptNameEl = document.getElementById("call-library-function-persistent-scriptname");
            var persistentScriptName = persistentScriptNameEl.value;
            if (settings["CallLibraryFunctionDefaultScriptName"] && (persistentScriptName == undefined || persistentScriptName === "")) {
                persistentScriptNameEl.placeholder = settings["CallLibraryFunctionDefaultScriptName"]
            }
        }
    },
    'com.sheriffbuzz.ahkclient.ahkglobalsettings': function(jsonObj) {
        if (jsonObj.event === 'didReceiveGlobalSettings') {
            var payload = jsonObj.payload;
            settings = payload.settings;
            clipEl = document.getElementById('ClipboardFormat')
            clipEl.value = settings.ClipboardFormat;

            prepareFile("autohotkey-exe-path", "AhkExePath", settings)
            prepareValue('call-library-function-default-scriptname', settings, "CallLibraryFunctionDefaultScriptName")
            prepareValue('send-message-argument-delimiter', settings, "SendMessageArgumentDelimiter")

        } else if (jsonObj.event === 'sendToPropertyInspector') {
            getGlobalSettings()
        }
    }
};

function addAArg() {
    var container = document.getElementById('aargContainer')
    var itemContainer = document.createElement('div');
    itemContainer.className = 'sdpi-item';
    var itemLabel = document.createElement('div')
    itemLabel.className = 'sdpi-item-label';
    itemLabel.innerHTML = 'Arg'
    var inputEl = document.createElement('input')
    inputEl.setAttribute('onchange', 'updateSettings()');
    inputEl.placeholder = 'Aarg';
    inputEl.className = 'sdpi-item-value'

    itemContainer.appendChild(itemLabel);
    itemContainer.appendChild(inputEl);
    //text.innerHTML = '<div class="sdpi-item">< div class="sdpi-item-label"> AArg1</div><input class="sdpi-item-value" id="aarg1" onchange="updateSettings()" value="" placeholder="AArg1"></div>';
    container.appendChild(itemContainer);
    return itemContainer
}

function removeAArg() {
    var aargContainer = document.getElementById("aargContainer");
    var aargsFromContainer = aargContainer.children
    aargContainer.removeChild(aargContainer.lastChild)
    updateSettings();
}

function prepareFile(idName, jsonName, actionSettings) {
    const pathEl = document.getElementById(idName);
    if (pathEl == undefined || pathEl == null) {
        return;
    }
    const path = actionSettings[jsonName];
    if (path == "" || path == undefined) { //case when global settings have not been populated yet.
        return;
    }
    const info = document.querySelector('.sdpi-file-info[for="' + idName + '"]');
    if (info) {
        const s = path.split('/').pop();
        info.textContent = s.length > 28
            ? s.substr(0, 10)
            + '...'
            + s.substr(s.length - 10, s.length)
            : s;
    }
}

function prepareCheckbox(id, baseJsonObj, jsonPropName) {
    prepareField(id, baseJsonObj, jsonPropName, "checked")
}

function prepareFunctionPostProcessorCheckbox(id, functionPostProcessorCfg, postProcessorKey) {
    var postProcessorObj = functionPostProcessorCfg[postProcessorKey];
    if (postProcessorObj != undefined && postProcessorObj != null) {
        prepareField(id, postProcessorObj, "enabled", "checked")
    }
}

/*
 *  Prepare value for "value" input property
 */
function prepareValue(id, baseJsonObj, jsonPropName, overwrite) {
    prepareField(id, baseJsonObj, jsonPropName, "value", overwrite)
}

function prepareField(id, baseJsonObj, jsonPropName, propToChange, overwrite) {
    var el = document.getElementById(id);
    if (el == undefined || el == null || baseJsonObj == undefined || baseJsonObj == null) {
        return;
    }
    var newValue = baseJsonObj[jsonPropName];
    if (newValue == undefined || newValue == null) {
        return; //for text inputs, include a placeholder or show nothing if value stored in plugin is not there
    }
    if (overwrite == undefined || overwrite === true || el[propToChange] === undefined || el[propToChange] === "") {
        el[propToChange] = newValue;
    }
    return el;
}
function prepareDOM(actionSettings) {
    console.log('prepare dom settings: ' + JSON.stringify(actionSettings));
    prepareFile("ahk-file-path", "AhkFilePath", settings)

    prepareValue('library-function-name', actionSettings, "LibraryFunctionName")
    prepareValue('call-library-function-persistent-scriptname', actionSettings, "PersistentScriptName")

    var ppCfg = actionSettings.FunctionPostProcessorCfg || {};
    prepareFunctionPostProcessorCheckbox("post-processor-cfg-msgbox", ppCfg, "messageBox");
    prepareFunctionPostProcessorCheckbox("post-processor-cfg-traytip", ppCfg, "trayTip");
    prepareFunctionPostProcessorCheckbox("post-processor-cfg-clipboard", ppCfg, "clipboard");
    prepareFunctionPostProcessorCheckbox("post-processor-cfg-fileexplorer", ppCfg, "fileExplorer");
    prepareFunctionPostProcessorCheckbox("post-processor-cfg-guipopup", ppCfg, "guiPopup");


    var webBrowser = document.getElementById("post-processor-cfg-webbrowser");
    var webBrowserOptions = document.getElementById("post-processor-cfg-webbrowser-options");
    prepareFunctionPostProcessorCheckbox("post-processor-cfg-webbrowser", ppCfg, "webBrowser");
    if (webBrowser) {
        if (webBrowser.checked === true) {
            webBrowserOptions.style.display = "block";

            prepareFunctionPostProcessorCheckbox("post-processor-cfg-webbrowser-incognito", webBrowser, "incognito");
            var webBrowserIncognito = document.getElementById("post-processor-cfg-webbrowser-incognito");
            var incognitoEnabled = ppCfg.webBrowser.incognito;
            webBrowserIncognito.checked = incognitoEnabled;

            var webBrowserBrowser = document.getElementById("post-processor-webbrowser-browser");
            var browserName = ppCfg.webBrowser.browser;
            var dd = document.getElementById('post-processor-webbrowser-browser');
            for (var i = 0; i < webBrowserBrowser.options.length; i++) {
                if (webBrowserBrowser.options[i].value === browserName) {
                    webBrowserBrowser.selectedIndex = i;
                    break;
                }
            }
        } else {
            webBrowserOptions.style.display = "none";
        }
    }

    var aargs = actionSettings.aargs;
    if (aargs == undefined || aargs == null) {
        return;
    }

    aargCount = aargs.length; //check if aargs empty
    var aargContainer = document.getElementById("aargContainer");
    var aargsFromContainer = aargContainer.children
    for (var i = 0; i < aargs.length; i++) {
        var aargFromContainer = aargsFromContainer[i];
        if (aargFromContainer == undefined) {
            aargFromContainer = addAArg()
        }
        var aarginput = aargFromContainer.getElementsByTagName('input')[0];
        aarginput.value = aargs[i];    
    }
}
function updateSettings() {
    var payload = {};
    payload.property_inspector = 'updateSettings';

    processFile("ahk-file-path", "AhkFilePath", payload, settings)

    const functionNameEl = document.getElementById("library-function-name");
    if (!(functionNameEl == undefined || functionNameEl == null || functionNameEl === "")) {
        const functionName = functionNameEl.value;
        settings.LibraryFunctionName = functionName;
        payload.LibraryFunctionName = functionName;
        payload.AhkFilePath = settings.AhkFilePath;

        const persistentScriptNameEl = document.getElementById("call-library-function-persistent-scriptname");
        const persistentScriptName = persistentScriptNameEl.value;
        settings.PersistentScriptName = persistentScriptName;
        payload.PersistentScriptName = persistentScriptName;

        const msgboxEnabled = document.getElementById("post-processor-cfg-msgbox").checked
        const trayTipEnabled = document.getElementById("post-processor-cfg-traytip").checked
        const clipboardEnabled = document.getElementById("post-processor-cfg-clipboard").checked

        const fileExplorerEnabled = document.getElementById("post-processor-cfg-fileexplorer").checked;
        const webBrowserEnabled = document.getElementById("post-processor-cfg-webbrowser").checked;
        const webBrowserIncognito = document.getElementById("post-processor-cfg-webbrowser-incognito").checked;
        const webBrowserBrowser = document.getElementById("post-processor-webbrowser-browser").value;

        const guiPopupEnabled = document.getElementById("post-processor-cfg-guipopup").checked;

        var functionPostProcessorCfg = settings.FunctionPostProcessorCfg || {};

        functionPostProcessorCfg.messageBox = functionPostProcessorCfg.messageBox || {};
        functionPostProcessorCfg.messageBox.enabled = msgboxEnabled;
        functionPostProcessorCfg.trayTip = functionPostProcessorCfg.trayTip || {};
        functionPostProcessorCfg.trayTip.enabled = trayTipEnabled;
        functionPostProcessorCfg.clipboard = functionPostProcessorCfg.clipboard || {};
        functionPostProcessorCfg.clipboard.enabled = clipboardEnabled;

        functionPostProcessorCfg.fileExplorer = functionPostProcessorCfg.fileExplorer || {};
        functionPostProcessorCfg.fileExplorer.enabled = fileExplorerEnabled;

        functionPostProcessorCfg.webBrowser = functionPostProcessorCfg.webBrowser || {};
        functionPostProcessorCfg.webBrowser.enabled = webBrowserEnabled;
        functionPostProcessorCfg.webBrowser.browser = webBrowserBrowser;
        functionPostProcessorCfg.webBrowser.incognito = webBrowserIncognito;

        functionPostProcessorCfg.guiPopup = functionPostProcessorCfg.guiPopup || {};
        functionPostProcessorCfg.guiPopup.enabled = guiPopupEnabled;

        payload.FunctionPostProcessorCfg = functionPostProcessorCfg;
        settings.FunctionPostProcessorCfg = functionPostProcessorCfg;
    }

    processAArguments(payload, settings);
    sendPayloadToPlugin(payload);
}

function processAArguments(payload, actionSettings) {
    var aargs = [];
    payload.Aargs = aargs;

    var aargContainer = document.getElementById("aargContainer");
    var aargsFromContainer = aargContainer.children
    for (var i = 0; i < aargsFromContainer.length; i++) {
        var aargFromContainer = aargsFromContainer[i];
        var aarginput = aargFromContainer.getElementsByTagName('input')[0];
        aargs.push(aarginput.value);
    }
    actionSettings.aargs = aargs;
}

function processFile(idName, jsonName, payload, actionSettings) {
    const pathEl = document.getElementById(idName);
    if (pathEl == undefined || pathEl == null) {
        return;
    }
    var path = (pathEl.type === 'file')
        ? decodeURIComponent(pathEl.value.replace(/^C:\\fakepath\\/, ''))
        : pathEl.value

    if (path) {
        actionSettings[jsonName] = path;
    } else {
        path = actionSettings[jsonName];
    }
    payload[jsonName] = path;
}

function updateGlobalSettings() {
    var payload = {};
    payload.property_inspector = 'updateglobalsettings';
    var clipboardFormat = document.getElementById('ClipboardFormat');
    payload.ClipboardFormat = clipboardFormat.value;
    var sendMessageArgumentDelimiter = document.getElementById('send-message-argument-delimiter');
    payload.sendMessageArgumentDelimiter = sendMessageArgumentDelimiter.value;

    processFile("autohotkey-exe-path", "AhkExePath", payload, settings)
    var callLibraryFunctionDefaultScriptName = document.getElementById('call-library-function-default-scriptname');
    payload.CallLibraryFunctionDefaultScriptName = callLibraryFunctionDefaultScriptName.value;

    sendPayloadToPlugin(payload);
}

// our method to pass values to the plugin
function sendPayloadToPlugin(payload) {
    if (websocket && (websocket.readyState === 1)) {
        const json = {
            'action': actionInfo['action'],
            'event': 'sendToPlugin',
            'context': uuid,
            'payload': payload
        };
        websocket.send(JSON.stringify(json));
    }
}

function sendValueToPlugin(value, param) {
    if (websocket && (websocket.readyState === 1)) {
        const json = {
            'action': actionInfo['action'],
            'event': 'sendToPlugin',
            'context': uuid,
            'payload': {
                [param]: value
            }
        };
        websocket.send(JSON.stringify(json));
    }
}

function saveGlobalSettings(payload) {
    if (websocket && (websocket.readyState === 1)) {
        const json = {
            'event': 'setGlobalSettings',
            'context': uuid,
            'payload': payload
        };
        websocket.send(JSON.stringify(json));
    }
}

function getGlobalSettings() {
    if (websocket && (websocket.readyState === 1)) {
        const json = {
            'event': 'getGlobalSettings',
            'context': uuid
        };
        websocket.send(JSON.stringify(json));
    }
}

if (!isQT) {
    document.addEventListener('DOMContentLoaded', function () {
        //initPropertyInspector();
    });
}

window.addEventListener('beforeunload', function (e) {
    e.preventDefault();

    // Notify the plugin we are about to leave
    sendValueToPlugin('propertyInspectorWillDisappear', 'property_inspector');

    // Don't set a returnValue to the event, otherwise Chromium with throw an error.
});

function addDynamicStyles(clrs) {
    const node = document.getElementById('#sdpi-dynamic-styles') || document.createElement('style');
    if (!clrs.mouseDownColor) clrs.mouseDownColor = fadeColor(clrs.highlightColor, -100);
    const clr = clrs.highlightColor.slice(0, 7);
    const clr1 = fadeColor(clr, 100);
    const clr2 = fadeColor(clr, 60);
    const metersActiveColor = fadeColor(clr, -60);

    node.setAttribute('id', 'sdpi-dynamic-styles');
    node.innerHTML = `

    input[type="radio"]:checked + label span,
    input[type="checkbox"]:checked + label span {
        background-color: ${clrs.highlightColor};
    }

    input[type="radio"]:active:checked + label span,
    input[type="radio"]:active + label span,
    input[type="checkbox"]:active:checked + label span,
    input[type="checkbox"]:active + label span {
      background-color: ${clrs.mouseDownColor};
    }

    input[type="radio"]:active + label span,
    input[type="checkbox"]:active + label span {
      background-color: ${clrs.buttonPressedBorderColor};
    }

    td.selected,
    td.selected:hover,
    li.selected:hover,
    li.selected {
      color: white;
      background-color: ${clrs.highlightColor};
    }

    .sdpi-file-label > label:active,
    .sdpi-file-label.file:active,
    label.sdpi-file-label:active,
    label.sdpi-file-info:active,
    input[type="file"]::-webkit-file-upload-button:active,
    button:active {
      background-color: ${clrs.buttonPressedBackgroundColor};
      color: ${clrs.buttonPressedTextColor};
      border-color: ${clrs.buttonPressedBorderColor};
    }

    ::-webkit-progress-value,
    meter::-webkit-meter-optimum-value {
        background: linear-gradient(${clr2}, ${clr1} 20%, ${clr} 45%, ${clr} 55%, ${clr2})
    }

    ::-webkit-progress-value:active,
    meter::-webkit-meter-optimum-value:active {
        background: linear-gradient(${clr}, ${clr2} 20%, ${metersActiveColor} 45%, ${metersActiveColor} 55%, ${clr})
    }
    `;
    document.body.appendChild(node);
};

/** UTILITIES */

/*
    Quick utility to lighten or darken a color (doesn't take color-drifting, etc. into account)
    Usage:
    fadeColor('#061261', 100); // will lighten the color
    fadeColor('#200867'), -100); // will darken the color
*/
function fadeColor(col, amt) {
    const min = Math.min, max = Math.max;
    const num = parseInt(col.replace(/#/g, ''), 16);
    const r = min(255, max((num >> 16) + amt, 0));
    const g = min(255, max((num & 0x0000FF) + amt, 0));
    const b = min(255, max(((num >> 8) & 0x00FF) + amt, 0));
    return '#' + (g | (b << 8) | (r << 16)).toString(16).padStart(6, 0);
}
