"""Optional maintainer tool. The ready-to-upload publish/ folder is already included.
Run only after editing source files; Python is NOT required by app users.
"""
from pathlib import Path
import shutil
root=Path(__file__).resolve().parent.parent
out=root/'publish'
out.mkdir(exist_ok=True)
for name in ['advanced-picker.js', 'analysis-compare.js', 'analysis-quality.js', 'analytics.js', 'app.js', 'batch-results.js', 'batch-ui.js', 'bet-patterns.js', 'calendar-view.js', 'calendar.js', 'category-compare.js', 'core.js', 'day-ledger.js', 'db.js', 'dock.js', 'entry-drafts.js', 'entry-results.js', 'entry-sheets.js', 'fast-results.js', 'graded-master.js', 'graded-races.js', 'growth-companion.js', 'growth-rewards.js', 'growth-v2.js', 'jp-holidays.js', 'ledger-calendar.js', 'ledger-tools.js', 'ledger-trends.js', 'line-correction.js', 'manual-race-correction.js', 'manual-race.js', 'navigation.js', 'number-pad.js', 'race-audit.js', 'race-info.js', 'results.js', 'screen-roles.js', 'settlement-preview.js', 'simple-ledger.js', 'stake-allocation.js', 'stake-workflow.js', 'style-view.js', 'sw.js', 'tips.js', 'updates.js', 'index.html', 'style.css', 'manifest.webmanifest']:
    (out/name).write_text((root/name).read_text().replace('./assets/','./'),encoding='utf-8')
for asset in (root/'assets').iterdir():
    if asset.is_file():shutil.copyfile(asset,out/asset.name)
print(f'{len(list(out.iterdir()))} deployment files ready in {out}')
