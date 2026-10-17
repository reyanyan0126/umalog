"""Optional maintainer tool. The ready-to-upload publish/ folder is already included.
Run only after editing source files; Python is NOT required by app users.
"""
from pathlib import Path
import shutil
root=Path(__file__).resolve().parent.parent
out=root/'publish'
out.mkdir(exist_ok=True)
for name in ['index.html','style.css','app.js','core.js','db.js','results.js','dock.js','tips.js','analytics.js','race-info.js','style-view.js','graded-master.js','graded-races.js','calendar.js','calendar-view.js','growth-v2.js','settlement-preview.js','ledger-calendar.js','jp-holidays.js','number-pad.js','advanced-picker.js','bet-patterns.js','sw.js','manifest.webmanifest']:
    (out/name).write_text((root/name).read_text().replace('./assets/','./'),encoding='utf-8')
for asset in (root/'assets').iterdir():
    if asset.is_file():shutil.copyfile(asset,out/asset.name)
print(f'{len(list(out.iterdir()))} deployment files ready in {out}')
