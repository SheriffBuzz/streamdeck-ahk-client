using System;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using streamdeck_client_csharp;
using streamdeck_client_csharp.Events;

namespace AhkClient
{
    public class AhkGlobalSettingsDef
    {
        [JsonProperty("ClipboardFormat")]
        public string ClipboardFormat { get; set; }

        [JsonProperty("MousePosFormat")]
        public string MousePosFormat { get; set; }

        [JsonProperty("CallLibraryFunctionDefaultScriptName")]
        public string CallLibraryFunctionDefaultScriptName { get; set; }

        [JsonProperty("AhkExePath")]
        public string AhkExePath { get; set; }
    }

    [Action("com.sheriffbuzz.ahkclient.ahkglobalsettings")]
    class AhkGlobalSettings : ActionBase
    {
        private StreamDeckConnection m_Connection;
        private string m_Action;
        private string m_Context;
        private AhkGlobalSettingsDef m_Settings;
        public static JsonSerializer JsonSerializer { get; set; }

        public override Task KeyDownAsync()
        {
            m_Connection.GetGlobalSettingsAsync();
            return Task.FromResult(0);
        }

        public override Task KeyUpAsync()
        {
            return Task.FromResult(0);
        }

        public override Task LoadAsync(StreamDeckConnection connection, string action, string context, JObject settings)
        {
            m_Connection = connection;
            m_Action = action;
            m_Context = context;
            m_Settings = new JObject().ToObject<AhkGlobalSettingsDef>(); //this action only scopes settings global to the plugin
            JsonSerializer serializer = new JsonSerializer();
            JsonConverter jsonConverter = new BooleanJsonConverter();
            serializer.Converters.Add(jsonConverter);
            JsonSerializer = serializer;

            return Task.FromResult(0);
        }

        public override Task LoadGlobalSettings(AhkGlobalSettingsDef globalSettings)
        {
            m_Settings = globalSettings; //hack, global settings might need to be kept separate when used by actions that have both global and per action settings. Right now this is used to popuplate pi dom on pi connected
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
                    m_Settings = propertyInspectorEvent.Payload.ToObject<AhkGlobalSettingsDef>();
                    await SaveAsync();
                    break;
                case "updateglobalsettings":
                    m_Settings = propertyInspectorEvent.Payload.ToObject<AhkGlobalSettingsDef>();
                    await m_Connection.SetGlobalSettingsAsync(JObject.FromObject(m_Settings));
                    await SaveAsync();
                    break;
            }
        }

        public override async Task RunTickAsync()
        {

            string text = "AHKtext";

            //await m_Connection.SetTitleAsync(text, m_Context, SDKTarget.HardwareAndSoftware, null);
            
        }

        public override async Task SaveAsync()
        {
            await m_Connection.SetSettingsAsync(JObject.FromObject(m_Settings), m_Context);
            await m_Connection.GetGlobalSettingsAsync();
        }
    }
}
