"""Own and reap Chromium's child processes on minimal Linux CI containers.

Some containers use a PID 1 that does not reap orphaned Chromium renderer and
crash-handler processes. Act as a subreaper for this *one* test browser, so a
full browser suite can run without leaking process slots.
"""
import ctypes
import os
import signal
import subprocess
import sys
import time

PR_SET_CHILD_SUBREAPER = 36
if ctypes.CDLL(None, use_errno=True).prctl(PR_SET_CHILD_SUBREAPER, 1, 0, 0, 0) != 0:
    raise OSError(ctypes.get_errno(), 'failed to set child subreaper')

browser = subprocess.Popen(sys.argv[1:], start_new_session=True)


def forward(signum, _frame):
    try:
        os.killpg(browser.pid, signum)
    except ProcessLookupError:
        pass


signal.signal(signal.SIGTERM, forward)
signal.signal(signal.SIGINT, forward)
status = browser.wait()
try:
    os.killpg(browser.pid, signal.SIGTERM)
except ProcessLookupError:
    pass

# Crash handlers may have their own session. Once the browser has exited,
# only its adopted descendants can be in this process's child list.
started = time.monotonic()
while True:
    try:
        pid, _ = os.waitpid(-1, os.WNOHANG)
    except ChildProcessError:
        break
    if pid:
        continue
    elapsed = time.monotonic() - started
    if elapsed > 0.5:
        with open(f'/proc/self/task/{os.getpid()}/children', encoding='ascii') as children:
            for child in children.read().split():
                try:
                    os.kill(int(child), signal.SIGKILL if elapsed > 2 else signal.SIGTERM)
                except ProcessLookupError:
                    pass
    time.sleep(0.025)
sys.exit(status if status >= 0 else 128 - status)
