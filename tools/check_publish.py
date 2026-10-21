from pathlib import Path
root=Path(__file__).resolve().parent.parent
count=0
for name in ['advanced-picker.js', 'analysis-compare.js', 'analysis-quality.js', 'analytics.js', 'app.js', 'batch-results.js', 'batch-ui.js', 'bet-patterns.js', 'calendar-view.js', 'calendar.js', 'category-compare.js', 'core.js', 'day-ledger.js', 'db.js', 'dock.js', 'entry-drafts.js', 'entry-results.js', 'entry-sheets.js', 'fast-results.js', 'graded-master.js', 'graded-races.js', 'growth-companion.js', 'growth-rewards.js', 'growth-v2.js', 'jp-holidays.js', 'ledger-calendar.js', 'ledger-tools.js', 'ledger-trends.js', 'line-correction.js', 'manual-race-correction.js', 'manual-race.js', 'navigation.js', 'number-pad.js', 'race-audit.js', 'race-info.js', 'results.js', 'screen-roles.js', 'settlement-preview.js', 'simple-ledger.js', 'stake-allocation.js', 'stake-workflow.js', 'style-view.js', 'sw.js', 'tips.js', 'updates.js', 'index.html', 'style.css', 'manifest.webmanifest']:
    assert (root/'publish'/name).read_text()==(root/name).read_text().replace('./assets/','./'),name
    count+=1
for p in (root/'assets').iterdir():
    if p.is_file():
        assert p.read_bytes()==(root/'publish'/p.name).read_bytes(),p.name
        count+=1
print(f'PASS: all {count} source/publish files match (asset paths normalized)')
