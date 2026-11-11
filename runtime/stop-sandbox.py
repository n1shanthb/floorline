"""Stop only this project's local node; do not affect any other WSL process."""
import os
import signal
from pathlib import Path

binary = b"/mnt/e/near-2/.sandbox/bin/Linux-x86_64/near-sandbox"
home = b"/mnt/e/near-2/.sandbox/node"
for process in Path("/proc").iterdir():
    if not process.name.isdecimal():
        continue
    try:
        args = (process / "cmdline").read_bytes().split(b"\0")
        if args[0] == binary and b"--home" in args and args[args.index(b"--home") + 1] == home:
            os.kill(int(process.name), signal.SIGTERM)
            print("Stopped this project's local sandbox node", process.name)
    except (FileNotFoundError, ProcessLookupError, PermissionError, IndexError):
        pass
