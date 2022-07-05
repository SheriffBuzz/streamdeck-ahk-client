using System;
using System.Collections.Generic;
using System.Threading;
using System.Windows;

namespace AhkClient
{
    class ClipboardUtil
    {
        public static string getClipboardAsString()
        {
            /*
             * Exception thrown: 'System.Threading.ThreadStateException' in PresentationCore.dll
             * An exception of type 'System.Threading.ThreadStateException' occurred in PresentationCore.dll but was not handled in user code
             * Current thread must be set to single thread apartment (STA) mode before OLE calls can be made.
             * 
             * https://stackoverflow.com/questions/17762037/current-thread-must-be-set-to-single-thread-apartment-sta-error-in-copy-stri
             */
            IDataObject idat = null;
            Exception threadEx = null;
            String clipString = "";
            Thread staThread = new Thread(
                delegate ()
                {
                    try
                    {
                        idat = Clipboard.GetDataObject();
                        clipString = (string)idat.GetData(DataFormats.Text);

                    }

                    catch (Exception ex)
                    {
                        threadEx = ex;
                    }
                });
            staThread.SetApartmentState(System.Threading.ApartmentState.STA);
            staThread.Start();
            staThread.Join();
            return clipString;
        }

        public static List<string> ReplaceArgumentsWithClipboardValue(AhkGlobalSettingsDef globalSettings, List<string> aargs)
        {
            List<string> clipReplacedAArgs = new List<string>();

            if (globalSettings == null || aargs == null)
            {
                return aargs;
            }
            string clipboardFormat = globalSettings.ClipboardFormat;
            if (string.IsNullOrEmpty(clipboardFormat))
            {
                return aargs;
            }

            string clipString = getClipboardAsString();

            if (!(aargs == null))
            {
                foreach (string a in aargs)
                {
                    if (!(string.IsNullOrEmpty(a)))
                    {
                        string replaced = a;
                        replaced = replaced.Replace(clipboardFormat, clipString);
                        clipReplacedAArgs.Add(replaced);
                    }
                }
            }
            return clipReplacedAArgs;
        }
    }
}
