"""Regression: a successful CLI response must not hide stale plugin files."""
import hashlib,json,os,subprocess,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def digest(b): return hashlib.sha256(b).hexdigest()
class InstallerRegression(unittest.TestCase):
 def test_false_success_restores_previous_files(self):
  with tempfile.TemporaryDirectory(dir=ROOT/'.acceptance',prefix='installer-mock-') as td:
   base=Path(td); profile=base/'user/.dsh/profiles/desktop'; installed=profile/'node_modules/dsh-kurowhale-pet'; installed.mkdir(parents=True); pet=base/'pet';pet.mkdir(); (pet/'pet.json').write_text('{"spritesheetPath":"spritesheet.webp"}');(pet/'spritesheet.webp').write_bytes(b'RIFF'+b'0000'+b'WEBP'+b'0'*30)
   old=b'{"name":"dsh-kurowhale-pet","version":"0.1.0-rc.2"}'; target=b'{"name":"dsh-kurowhale-pet","version":"0.1.0"}'; (installed/'package.json').write_bytes(old); (installed/'index.js').write_bytes(b'old'); (profile/'package.json').write_text('{"dependencies":{"dsh-kurowhale-pet":"old"}}'); template=base/'old';template.mkdir();(template/'package.json').write_bytes(old);(template/'index.js').write_bytes(b'old')
   bundle=base/'bundle';bundle.mkdir();(bundle/'pkg.tgz').write_bytes(b'package'); runtime=base/'runtime.exe';runtime.write_bytes(b'runtime');(bundle/'dependencies.lock.json').write_text(json.dumps({'externalPrerequisites':[{'name':'Neutralino Windows x64','exeSha256':digest(b'runtime')}]})); (bundle/'bundle-manifest.json').write_text(json.dumps({'name':'dsh-kurowhale-pet','artworkIncluded':False,'version':'0.1.0','package':'pkg.tgz','files':{'pkg.tgz':digest(b'package')},'pluginFiles':{'package.json':digest(target),'index.js':digest(b'new')}}))
   cli=base/'dsh/resources/runtime/cli/bin';cli.mkdir(parents=True); fake=base/'fake.py';fake.write_text(r'''import json,os,sys,shutil
from pathlib import Path
args=sys.argv[1:]
if args==['--version']: print('0.2.1-rc.3');sys.exit(0)
p=Path(os.environ['USERPROFILE'])/'.dsh/profiles/desktop'; f=p/'package.json'; doc=json.loads(f.read_text()); dest=p/'node_modules/dsh-kurowhale-pet'
if 'remove' in args:
 doc['dependencies'].pop('dsh-kurowhale-pet',None);shutil.rmtree(dest,ignore_errors=True)
elif 'add' in args:
 doc['dependencies']['dsh-kurowhale-pet']='local';shutil.copytree(Path(os.environ['KW_MOCK_OLD']),dest,dirs_exist_ok=True);print('Already up to date')
f.write_text(json.dumps(doc))
''',encoding='utf8'); (cli/'dsh.cmd').write_text('@python "'+str(fake)+'" %*\r\n',encoding='utf8')
   env=os.environ.copy();env['USERPROFILE']=str(base/'user');env['KW_MOCK_OLD']=str(template);env.pop('DSH_HOME',None)
   cmd=['pwsh','-NoProfile','-File',str(ROOT/'scripts/install-windows.ps1'),'-Action','Install','-TasksEnded','-DshInstall',str(base/'dsh'),'-AssetDirectory',str(pet),'-RuntimePath',str(runtime),'-BundleRoot',str(bundle)]
   result=subprocess.run(cmd,env=env,capture_output=True,text=True,errors='replace'); self.assertNotEqual(result.returncode,0,result.stdout);self.assertIn('Rollback verified=True',result.stderr);self.assertEqual((installed/'package.json').read_bytes(),old);self.assertEqual((installed/'index.js').read_bytes(),b'old')
if __name__=='__main__':unittest.main()
