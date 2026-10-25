#!/usr/bin/python3
import pathlib, subprocess, os, sys, json, time, urllib.request
ROOT=pathlib.Path(__file__).resolve().parent.parent
apps={'general':('resize-总','Resize-Product-Workbench-Business-Hierarchy-Low-v9-arm64'),'banner':('resize-2000x300','Resize-UltraWide-Banner-Workbench-arm64')}
key=sys.argv[1]; mode=sys.argv[2] if len(sys.argv)>2 else 'preview'
folder,package=apps[key]; app=ROOT/folder/package
data=ROOT/'本地数据'/key/mode;data.mkdir(parents=True,exist_ok=True)
env=os.environ.copy();env.update(RESIZE_APP_DATA_ROOT=str(data),RESIZE_NO_OPEN='1')
script={'preview':'launch-production-preview.zsh','production':'launch-production.zsh','key':'launch-key-setup.zsh'}[mode]
def url_if_ready():
 try:
  lock=json.loads((data/'run/instance.lock').read_text());url=f"http://127.0.0.1:{lock['port']}/"
  req=urllib.request.Request(url+'api/health',headers={'x-instance-token':lock['token']})
  with urllib.request.urlopen(req,timeout=1) as r:
   if r.status==200:return url
 except Exception:pass
url=url_if_ready()
if not url:
 with (data/'startup.log').open('ab') as log:
  p=subprocess.Popen(['/bin/zsh',str(app/'scripts'/script)],cwd=app,env=env,stdout=log,stderr=log,start_new_session=True)
 for _ in range(80):
  url=url_if_ready()
  if url:break
  if p.poll() is not None:break
  time.sleep(.25)
if not url:
 print('启动失败，请查看：'+str(data/'startup.log'));sys.exit(1)
print(url)
if '--no-open' not in sys.argv:subprocess.run(['/usr/bin/open',url],check=True)
