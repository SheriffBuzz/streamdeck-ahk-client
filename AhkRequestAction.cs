using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using streamdeck_client_csharp;
using streamdeck_client_csharp.Events;

namespace AhkClient
{
    public class AhkRequestActionSettings
    {
        [JsonProperty("aargs")]
        public List<string> AArgs { get; set; }

        [JsonProperty("AhkFilePath")]
        public string AhkFilePath { get; set; }
    }

    [Action("com.sheriffbuzz.ahkclient.ahkrequest")]
    public class AhkRequestAction : ActionBase
    {
        private StreamDeckConnection m_Connection;
        private string m_Action;
        private string m_Context;
        private AhkRequestActionSettings m_Settings;

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
            m_Settings = settings.ToObject<AhkRequestActionSettings>();
            if (m_GlobalSettings == null)
            {
                //preload global settings in case user has not updated a value in property inspector for globals
                m_Connection.GetGlobalSettingsAsync();
            }

            return Task.FromResult(0);
        }

        public override Task LoadGlobalSettings(AhkGlobalSettingsDef globalSettings)
        {
            m_GlobalSettings = globalSettings; //hack, global settings might need to be kept separate when used by actions that have both global and per action settings. Right now this is used to popuplate pi dom on pi connected
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
                    m_Settings = propertyInspectorEvent.Payload.ToObject<AhkRequestActionSettings>();
                    await SaveAsync();
                    break;
            }
        }

        public override async Task RunTickAsync() { }

        public override async Task SaveAsync()
        {
            await m_Connection.SetSettingsAsync(JObject.FromObject(m_Settings), m_Context);
        }

        void LaunchCommandLineApp(AhkRequestActionSettings settings)
        {
            /*
             * args passed to ahk:
             * 1 - File Name, CallLibraryFunction.ahk
             * 2* - Rest of args
             */
            if (m_GlobalSettings == null || settings.AhkFilePath == null)
            {
                return; //TODO throw error
            }
            List<string> args = new List<string>();
            List<String> aargs = m_Settings.AArgs;
            args.AddRange(aargs);
            StartProcessUtil.LaunchCommandLineApp(m_GlobalSettings, settings.AhkFilePath, args);
        } 
    }
}
