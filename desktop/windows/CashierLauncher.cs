using System;
using System.IO;
using System.Net;
using System.Diagnostics;
using System.Threading;
using System.Collections.Generic;
using System.Web.Script.Serialization;
using System.Windows.Forms;
class CashierLauncher {
  static readonly JavaScriptSerializer json=new JavaScriptSerializer();
  static Dictionary<string,object> Read(string path){return json.Deserialize<Dictionary<string,object>>(File.ReadAllText(path));}
  static string Q(string path){return "\""+path.Replace("\"","\\\"")+"\"";}
  static Process Start(string file,string arguments,bool wait){var p=Process.Start(new ProcessStartInfo(file,arguments){UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden});if(wait)p.WaitForExit();return p;}
  [STAThread] static int Main(){try{
    string root=Path.GetDirectoryName(Application.ExecutablePath),current=Path.Combine(root,"current.json");var pointer=Read(current);string version=Convert.ToString(pointer["version"]);if(!System.Text.RegularExpressions.Regex.IsMatch(version,@"^\d+\.\d+\.\d+(?:-rc\.\d+)?$"))throw new Exception("Invalid Retail version");string code=Path.Combine(root,"versions",version),profile=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Sham Touch","Retail Cashier"),config=Path.Combine(profile,"client.json");Directory.CreateDirectory(profile);
    if(!File.Exists(config)){var setup=Start("powershell.exe","-NoProfile -ExecutionPolicy Bypass -File "+Q(Path.Combine(code,"desktop","windows","Configure-Cashier.ps1"))+" -InstallDir "+Q(code)+" -DefaultsPath "+Q(Path.Combine(root,"cashier-defaults.json")),true);if(setup.ExitCode!=0)return setup.ExitCode;}
    var settings=Read(config);int port=Convert.ToInt32(settings["port"]);string origin="http://127.0.0.1:"+port;bool ready=false;
    using(var web=new WebClient()){web.Headers["X-Retail-Local"]="1";try{var status=json.Deserialize<Dictionary<string,object>>(web.DownloadString(origin+"/local/status"));if(Convert.ToString(status["server"])!=Convert.ToString(settings["server"]).TrimEnd('/'))throw new Exception("Cashier port is in use by another server configuration");if(Convert.ToString(status["version"])!=version){web.UploadString(origin+"/local/shutdown","POST","{}");Thread.Sleep(2000);}else ready=true;}catch(WebException){}}
    if(!ready){Start(Path.Combine(code,"runtime","node.exe"),Q(Path.Combine(code,"desktop","agent.mjs"))+" "+Q(config),false);for(int i=0;i<60;i++){Thread.Sleep(300);try{using(var web=new WebClient()){var status=json.Deserialize<Dictionary<string,object>>(web.DownloadString(origin+"/local/status"));if(Convert.ToString(status["server"])==Convert.ToString(settings["server"]).TrimEnd('/')&&Convert.ToString(status["version"])==version){ready=true;break;}}}catch(WebException){}}}
    if(!ready)throw new Exception("Unable to start Retail cashier. Check the device log and connection settings.");string browser=Convert.ToString(settings["chrome"]);if(!File.Exists(browser))throw new Exception("Configured Chrome or Edge is not installed");Start(browser,"--app="+origin+" --user-data-dir="+Q(Path.Combine(profile,"browser-profile")),false);return 0;
  }catch(Exception error){MessageBox.Show(error.Message,"Sham Touch Retail",MessageBoxButtons.OK,MessageBoxIcon.Error);return 1;}}
}
