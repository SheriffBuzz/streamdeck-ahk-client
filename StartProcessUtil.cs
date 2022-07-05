using System.Collections.Generic;
using System.Diagnostics;

namespace AhkClient
{
    class StartProcessUtil
    {
        public static void LaunchCommandLineApp(AhkGlobalSettingsDef globalSettings, string filePath, List<string> aargs)
        {
            if (globalSettings == null)
            {
                return; //TODO throw error
            }
            string clipboardFormat = globalSettings.ClipboardFormat;
            string ahkExePath = globalSettings.AhkExePath;

            List<string> clipReplacedAargs = ClipboardUtil.ReplaceArgumentsWithClipboardValue(globalSettings, aargs);

            string command = "";
            string PathArg = "\"\"" + filePath + "\"\"";
            string singleQuote = "\"";
            string doubleQuote = "\"\"";

            command = command + PathArg + " ";
            if (!(aargs == null))
            {
                foreach (string a in clipReplacedAargs)
                {
                    if (!(string.IsNullOrEmpty(a)))
                    {
                        string replaced = a;
                        replaced = replaced.Replace(singleQuote, doubleQuote);
                        //https://docs.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.arguments?view=net-6.0

                        command = command + " " + singleQuote + replaced + singleQuote + " ";
                    }
                }
            }

            System.Diagnostics.ProcessStartInfo startInfo = new ProcessStartInfo();
            startInfo.CreateNoWindow = false;
            startInfo.UseShellExecute = false;
            startInfo.FileName = ahkExePath;
            startInfo.WindowStyle = System.Diagnostics.ProcessWindowStyle.Hidden;
            startInfo.Arguments = command;
            try
            {
                using (Process exeProcess = Process.Start(startInfo))
                {
                    //exeProcess.WaitForExit();
                }
            }
            catch
            {
                // Log error.
            }
        }
    }
}
