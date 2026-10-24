from publish_manifest import PUBLISH_FILES
from pathlib import Path
root=Path(__file__).resolve().parent.parent
count=0
for name in PUBLISH_FILES:
    assert (root/'publish'/name).read_text()==(root/name).read_text().replace('./assets/','./'),name
    count+=1
for p in (root/'assets').iterdir():
    if p.is_file():
        assert p.read_bytes()==(root/'publish'/p.name).read_bytes(),p.name
        count+=1
print(f'PASS: all {count} source/publish files match (asset paths normalized)')
