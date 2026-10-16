from pathlib import Path
root=Path(__file__).resolve().parent.parent
for name in ['index.html','style.css','app.js','core.js','db.js','results.js','dock.js','tips.js','analytics.js','race-info.js','style-view.js','sw.js','manifest.webmanifest']:
    assert (root/'publish'/name).read_text()==(root/name).read_text().replace('./assets/','./'),name
for p in (root/'assets').iterdir():
    if p.is_file(): assert p.read_bytes()==(root/'publish'/p.name).read_bytes(),p.name
print('PASS: all 22 source/publish files match (asset paths normalized)')
