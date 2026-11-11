"""WSL: stop ONLY this phase's explicitly verified local sandbox process."""
from pathlib import Path
import os
import signal
home=Path('/mnt/e/near-2/floorkit/contract/sandbox-home')
pid=int((home/'pid').read_text().strip())
assert pid>1
cmd=Path(f'/proc/{pid}/cmdline').read_bytes().replace(b'\0',b' ')
assert b'near-sandbox' in cmd and str(home/'node').encode() in cmd, 'Refuse unrelated process'
os.kill(pid,signal.SIGTERM)
print('Stopped only the verified FloorKit local sandbox; state preserved on E:')
