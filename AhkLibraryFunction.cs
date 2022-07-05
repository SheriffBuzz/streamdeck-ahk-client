using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using streamdeck_client_csharp;
using streamdeck_client_csharp.Events;

namespace AhkClient
{
    public class BaseJsonCfg
    {
        [JsonProperty("enabled")]
        public bool Enabled { get; set; }
    }

    public class WebBrowserCfg : BaseJsonCfg
    {
        [JsonProperty("browser")]
        public string Browser { get; set; }

        [JsonProperty("incognito")]
        public bool Incognito { get; set; }

        [JsonProperty("resolveFilePath")]
        public bool ResolveFilePath { get; set; }
    }

    public class FunctionPostProcessorCfg
    {
        [JsonProperty("messageBox")]
        public BaseJsonCfg MessageBox { get; set; }

        [JsonProperty("trayTip")]
        public BaseJsonCfg TrayTip { get; set; }

        [JsonProperty("clipboard")]
        public BaseJsonCfg Clipboard { get; set; }

        [JsonProperty("webBrowser")]
        public WebBrowserCfg WebBrowser { get; set; }

        [JsonProperty("fileExplorer")]
        public BaseJsonCfg FileExplorer { get; set; }

        [JsonProperty("guiPopup")]
        public BaseJsonCfg GuiPopup { get; set; }
    }

    //TODO remove and consolidate into AhkLibraryFunctionRequest
    public class AhkLibraryFunctionActionSettings
    {
        [JsonProperty("aargs")]
        public List<string> AArgs { get; set; }

        [JsonProperty("LibraryFunctionName")]
        public string LibraryFunctionName { get; set; }

        [JsonProperty("PersistentScriptName")]
        public string PersistentScriptName { get; set; }

        [JsonProperty("FunctionPostProcessorCfg")]
        public FunctionPostProcessorCfg FunctionPostProcessorCfg { get; set; }
    }

    public class AhkLibraryFunctionRequest
    {
        [JsonProperty("functionParameters")]
        public List<string> FunctionParameters { get; set; }

        [JsonProperty("functionName")]
        public string FunctionName { get; set; }

        [JsonProperty("classInstanceName")]
        public string ClassInstanceName { get; set; }

        [JsonProperty("postProcessorCfg")]
        public FunctionPostProcessorCfg FunctionPostProcessorCfg { get; set; }
    }

    [Action("com.sheriffbuzz.ahkclient.ahklibraryfunction")]
    public class AhkLibraryFunctionAction : ActionBase
    {
        private StreamDeckConnection m_Connection;
        private string m_Action;
        private string m_Context;
        private AhkLibraryFunctionActionSettings m_Settings;

        public override Task KeyDownAsync()
        {
            // Nothing to do
            return Task.FromResult(0);
        }

        public override Task KeyUpAsync()
        {
            LaunchCommandLineApp(m_Settings);
            return Task.FromResult(0);
        }

        public override Task LoadAsync(StreamDeckConnection connection, string action, string context, JObject settings)
        {
            m_Connection = connection;
            m_Action = action;
            m_Context = context;
            m_Settings = settings.ToObject<AhkLibraryFunctionActionSettings>();
            if (m_Settings.FunctionPostProcessorCfg == null)
            {
                FunctionPostProcessorCfg cfg = new FunctionPostProcessorCfg();
                cfg.MessageBox = new BaseJsonCfg();
                cfg.TrayTip = new BaseJsonCfg();
                cfg.Clipboard = new BaseJsonCfg();
                cfg.FileExplorer = new BaseJsonCfg();
                cfg.WebBrowser = new WebBrowserCfg();
                cfg.GuiPopup = new BaseJsonCfg();
                m_Settings.FunctionPostProcessorCfg = cfg;
            }
            if (m_GlobalSettings == null)
            {
                //preload global settings in case user has not updated a value in property inspector for globals
                m_Connection.GetGlobalSettingsAsync();
            }

            return Task.FromResult(0);
        }

        public override Task LoadGlobalSettings(AhkGlobalSettingsDef globalSettings)
        {
            m_GlobalSettings = globalSettings;
            return Task.FromResult(0);
        }

        public override async Task ProcessPropertyInspectorAsync(SendToPluginEvent propertyInspectorEvent)
        {
            switch (propertyInspectorEvent.Payload["property_inspector"].ToString().ToLower())
            {
                case "propertyinspectorconnected":
                    // Send settings to Property Inspector
                    await m_Connection.SendToPropertyInspectorAsync(m_Action, JObject.FromObject(m_Settings), m_Context);
                    break;
                case "propertyinspectorwilldisappear":
                    await SaveAsync();
                    break;
                case "updatesettings":
                    m_Settings = propertyInspectorEvent.Payload.ToObject<AhkLibraryFunctionActionSettings>();
                    await SaveAsync();
                    break;
            }
        }

        public override async Task RunTickAsync() { }

        public override async Task SaveAsync()
        {
            await m_Connection.SetSettingsAsync(JObject.FromObject(m_Settings), m_Context);
        }

        void LaunchCommandLineApp(AhkLibraryFunctionActionSettings settings)
        {
            /*
             * args passed to ahk:
             * 1 - Function name
             * 2 - FunctionPostProcessorCfg - json cfg
             * 3...n - Rest of args
             */
            if (m_GlobalSettings == null)
            {
                return; //TODO throw error
            }
            List<string> args = new List<string>();
            string functionName = m_Settings.LibraryFunctionName;
            string persistentScriptName = m_Settings.PersistentScriptName;
            FunctionPostProcessorCfg functionPostProcessorCfg = m_Settings.FunctionPostProcessorCfg;

            if (string.IsNullOrEmpty(persistentScriptName))
            {
                persistentScriptName = m_GlobalSettings.CallLibraryFunctionDefaultScriptName;
            }
            List<String> aargs = m_Settings.AArgs;
            List<string> clipReplacedAargs = ClipboardUtil.ReplaceArgumentsWithClipboardValue(m_GlobalSettings, aargs);

            if (string.IsNullOrEmpty(functionName)
                || string.IsNullOrEmpty(persistentScriptName)
                || functionPostProcessorCfg == null
              ) {
                m_Connection.ShowAlertAsync(m_Context);
                return;
            }
            //TODO log these settings
            string functionPostProcessorCfgStr = JObject.FromObject(functionPostProcessorCfg, AhkGlobalSettings.JsonSerializer).ToString();


            var AhkLibraryFunctionRequest = new AhkLibraryFunctionRequest();
            AhkLibraryFunctionRequest.FunctionPostProcessorCfg = functionPostProcessorCfg;
            AhkLibraryFunctionRequest.FunctionName = functionName;
            AhkLibraryFunctionRequest.FunctionParameters = clipReplacedAargs;
            //TODO infer the class instance from the function name (if it has a . in it) or separate field
            AhkLibraryFunctionRequest.ClassInstanceName = "";
            string copyDataMsg = JObject.FromObject(AhkLibraryFunctionRequest, AhkGlobalSettings.JsonSerializer).ToString();


            MessageHelper msg = new MessageHelper();
            int result = 0;
            int hWnd = msg.getWindowId(null, persistentScriptName);

            // string copyDataMsg = functionName + sendMessageArgumentDelimiter + functionPostProcessorCfgStr + sendMessageArgumentDelimiter
            //    + string.Join(sendMessageArgumentDelimiter, clipReplacedAargs);

            result = msg.sendWindowsStringMessage(hWnd, 1, copyDataMsg);
            if (result < 1)
            {
                m_Connection.ShowAlertAsync(m_Context);
            }
        }
    }
}
