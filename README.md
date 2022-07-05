# streamdeck-ahk-client
## Client for [ScriptHook.ahk](/../../../../SheriffBuzz/ScriptHook.ahk) as an Elgato StreamDeck Plugin

This plugin allows you to call functions in a persistent AHK script, without spawning a new AHK process or using hotkeys. Along with a **FunctionPostProcessor**, you can call a function and choose what to do with the result without hardcoding that functionality into your low level components.

# Objectives
  * Call ahk routines from StreamDeck without starting a new AHK script each time.
    - A persistent script can maintain state between function calls, in memory
    - Perform faster if the function does any pre initialization on large data (reading from files, etc..)
    - Call a script that also has a GUI, as to not reload the GUI every time
  * Provide an alternative to defining hotkeys directly in an ahk script.
    - Less maintainance and more compatability when working around programs that define many shortcuts
    - Avoid hard coding multiple hotkeys which call a subroutine with different parameters. The parameters can live in the StreamDeck cfg on a button by button basis.
    - StreamDeck profiles can be exported, so you can easily transfer your requests to other machines without fear of interacting with different hotkeys you have setup on another machine.
  * Abstract the presentation/displaying of a function result from its core operation.
    

# Project
### Links
[streamdeck-client-csharp](https://github.com/TyrenDe/streamdeck-client-csharp)

This project was built on top of [streamdeck-timerandclock](https://github.com/TyrenDe/streamdeck-timerandclock). It was used as a template as I dont have prior c# experience.

This plugin utilizes the SendMessage API.
  * [SendMessage AHK Tutorial](https://www.autohotkey.com/docs/misc/SendMessage.htm)
  * [SendMessage Microsoft Docs](https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendmessage)
  * [SendMessage WM_COPYDATA](https://docs.microsoft.com/en-us/windows/win32/dataxchg/wm-copydata)

# Usage
### Installation
Find the [Latest Release](../../releases/latest). Download and run the .sdplugin file while the StreamDeck Windows App is running.

You need a persistent script that [#Include](https://www.autohotkey.com/docs/commands/_Include.htm)'s [ScriptHook.ahk](https://github.com/SheriffBuzz/ScriptHook.ahk), which is the window the plugin will send the request to.

## AhkSettings
Ahk Settings must be set before using this plugin. Once it is set, you can remove this button from your menu.
  * ClipFormat - String that will be replaced with the current contents of the clipboard. You can use this to replace 1 or more function parameters with the current contents of the clipboard.
  * Autohotkey.exe path - Path to AuthoHotkey.exe. The default install location is at C:\Program Files\AutoHotkey\Autohotkey.exe. This is used by AhkRequest as an abstraction of running an ahk script from the command line. See **AhkRequest** for more.
  * Default Persistent Script: This is the [WinTitle](https://www.autohotkey.com/docs/misc/WinTitle.htm) of your persistent script that is either ScriptHook.ahk or [#Include](https://www.autohotkey.com/docs/commands/_Include.htm)'s ScriptHook.ahk. We are using the Windows SendMessageApi which requires a HWND (window handle) to send our request to. The plugin retrieves the HWND given the WinTitle. **Note** *This is a WinTitle, not a file name*. (ScriptHook not ScriptHook.ahk)
![image](https://user-images.githubusercontent.com/83767022/177401319-67b2c113-f34e-4282-b119-0558c23c9fa7.png)

## LibraryFunction
LibraryFunction calls ScriptHook.ahk or any peristent script that **#Include**'s it. 

### FunctionName
Functions can be called if they reside at the global scope, or alternatively, methods of class instances at the global scope. Class instances are supported by passing "ClassInstanceVariableName.FunctionName"

### Persistent Script
*Optional*, if it is set in global settings, otherwise *Required*. This is the WinTitle to send the request to.

### Function Output
We allow 5 main function post processors that will act upon a function result. The function result must be of type String (or anything that is not an Ahk Object)
  * [Msgbox](https://www.autohotkey.com/docs/commands/MsgBox.htm)
  * [TrayTip](https://www.autohotkey.com/docs/commands/TrayTip.htm)
  * Copy to Clipboard
  * Open in Windows Explorer
  * Open in Browser - can be used to open urls or local files.
  * GuiPopup - *Planned*, this code is not yet included in ScriptHook.ahk. It displays the result in a GUI popup that allows the user to copy the result to clipboard with an Enter keypress. A user could conditionally copy something to the clipboard, but only if the result looked correct.
  
![image](https://user-images.githubusercontent.com/83767022/177404483-8dbd52c7-8935-4bf7-ae85-e21cfd2aab12.png)

### Function Parameters
Parameters to send to a function.

### Remarks
  * For *Explorer* option, validations may be done that alter the output type and prevent Explorer from being launched (if you pass an invalid file).
    * Also disable the Clipboard option if the file path is determined to be invalid.
  * If a function receives less than the number of required parameters, it will not be called. See [optional parameters](https://www.autohotkey.com/docs/Functions.htm#optional) for more.

## AhkRequest
AhkRequest is an abstraction of calling a single ahk script via the command line (see [Ahk Documentation](https://www.autohotkey.com/docs/Scripts.htm#cmd)). This can be achieved with similar StreamDeck plugins, but has certain advantages over a simple command line runner:
  * File Picker to select your script
  * Dont need to escape quotes in parameters
  * Each parameter is on a separate line, so you can view more content before it overflows the UI textbox
  
### Remarks
Each parameter will be accessable in the called ahk script using the built in variable [A_Args](https://www.autohotkey.com/docs/Scripts.htm#cmd)

![image](https://user-images.githubusercontent.com/83767022/177403412-00461913-710b-4bbc-bf31-86c701ede9c5.png)


