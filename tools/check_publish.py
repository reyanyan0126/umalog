from pathlib import Path
root=Path(__file__).resolve().parent.parent
count=0
for name in ['index.html','style.css','app.js','core.js','db.js','results.js','entry-results.js','day-ledger.js','growth-rewards.js','fast-results.js','entry-sheets.js','dock.js','tips.js','analytics.js','race-info.js','style-view.js','graded-master.js','graded-races.js','calendar.js','calendar-view.js','growth-v2.js','settlement-preview.js','ledger-calendar.js','jp-holidays.js','number-pad.js','advanced-picker.js','bet-patterns.js','batch-results.js','batch-ui.js','sw.js','manifest.webmanifest']:
    assert (root/'publish'/name).read_text()==(root/name).read_text().replace('./assets/','./'),name
    count+=1
for p in (root/'assets').iterdir():
    if p.is_file():
        assert p.read_bytes()==(root/'publish'/p.name).read_bytes(),p.name
        count+=1
print(f'PASS: all {count} source/publish files match (asset paths normalized)')
