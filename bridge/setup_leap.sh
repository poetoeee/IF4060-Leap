#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV="$ROOT/.venv-leap"
BINDINGS="$ROOT/leapc-python-bindings"
UNAME_S="$(uname -s)"
UNAME_M="$(uname -m)"

# If running in WSL and Windows Ultraleap SDK exists while native Linux SDK is absent,
# allow delegating to Windows PowerShell if requested or if native Linux LeapC is not installed.
if grep -qi microsoft /proc/version 2>/dev/null; then
  if [ ! -f "/usr/include/LeapC.h" ] && [ -z "${LEAPSDK_INSTALL_LOCATION:-}" ] && [ -z "${LEAPC_HEADER_OVERRIDE:-}" ]; then
    if [ -d "/mnt/c/Program Files/Ultraleap/LeapSDK" ] && command -v powershell.exe >/dev/null 2>&1; then
      echo "WSL detected with Windows Ultraleap SDK. Delegating setup to Windows PowerShell..."
      WIN_SCRIPT="$(wslpath -w "$SCRIPT_DIR/setup_leap.ps1")"
      powershell.exe -ExecutionPolicy Bypass -File "$WIN_SCRIPT"
      exit 0
    fi
  fi
fi

if [ -x "$VENV/bin/python" ]; then
  PYTHON="$VENV/bin/python"
elif [ -x "$VENV/Scripts/python.exe" ]; then
  PYTHON="$VENV/Scripts/python.exe"
else
  PY_CMD=""
  for candidate in python3.8 python3 python; do
    if command -v "$candidate" >/dev/null 2>&1; then
      PY_CMD="$candidate"
      break
    fi
  done
  if [ -z "$PY_CMD" ]; then
    echo "Error: Python 3.8+ is required. Install python3 and python3-venv and run this script again." >&2
    exit 1
  fi
  "$PY_CMD" -m venv "$VENV"
  if [ -x "$VENV/bin/python" ]; then
    PYTHON="$VENV/bin/python"
  else
    PYTHON="$VENV/Scripts/python.exe"
  fi
fi

if [ ! -f "$BINDINGS/requirements.txt" ]; then
  rm -rf "$BINDINGS"
  git clone https://github.com/ultraleap/leapc-python-bindings "$BINDINGS"
fi

case "$UNAME_S" in
  Darwin)
    export LEAPSDK_INSTALL_LOCATION="${LEAPSDK_INSTALL_LOCATION:-/Applications/Ultraleap Hand Tracking.app/Contents/LeapSDK}"
    if [ ! -f "$LEAPSDK_INSTALL_LOCATION/include/LeapC.h" ]; then
      echo "Error: Leap SDK not found at '$LEAPSDK_INSTALL_LOCATION'. Install Ultraleap Tracking Software or set LEAPSDK_INSTALL_LOCATION." >&2
      exit 1
    fi
    ;;
  Linux)
    if [ "$UNAME_M" = "aarch64" ]; then
      export LEAPSDK_INSTALL_LOCATION="${LEAPSDK_INSTALL_LOCATION:-/opt/ultraleap/LeapSDK}"
      if [ ! -f "$LEAPSDK_INSTALL_LOCATION/include/LeapC.h" ]; then
        echo "Error: Leap SDK not found at '$LEAPSDK_INSTALL_LOCATION'. Install Ultraleap Tracking Software or set LEAPSDK_INSTALL_LOCATION." >&2
        exit 1
      fi
    else
      if [ -n "${LEAPSDK_INSTALL_LOCATION:-}" ] && [ -f "$LEAPSDK_INSTALL_LOCATION/include/LeapC.h" ]; then
        export LEAPC_HEADER_OVERRIDE="${LEAPC_HEADER_OVERRIDE:-$LEAPSDK_INSTALL_LOCATION/include/LeapC.h}"
        if [ -f "$LEAPSDK_INSTALL_LOCATION/lib/libLeapC.so" ]; then
          export LEAPC_LIB_OVERRIDE="${LEAPC_LIB_OVERRIDE:-$LEAPSDK_INSTALL_LOCATION/lib/libLeapC.so}"
        elif [ -f "$LEAPSDK_INSTALL_LOCATION/lib/x64/libLeapC.so" ]; then
          export LEAPC_LIB_OVERRIDE="${LEAPC_LIB_OVERRIDE:-$LEAPSDK_INSTALL_LOCATION/lib/x64/libLeapC.so}"
        fi
      fi
      HEADER_CHECK="${LEAPC_HEADER_OVERRIDE:-/usr/include/LeapC.h}"
      if [ ! -f "$HEADER_CHECK" ]; then
        echo "Error: LeapC.h not found at '$HEADER_CHECK'. Install ultraleap-hand-tracking-service or set LEAPSDK_INSTALL_LOCATION / LEAPC_HEADER_OVERRIDE." >&2
        exit 1
      fi
    fi
    ;;
  MINGW*|MSYS*|CYGWIN*)
    export LEAPSDK_INSTALL_LOCATION="${LEAPSDK_INSTALL_LOCATION:-C:/Program Files/Ultraleap/LeapSDK}"
    if [ ! -f "$LEAPSDK_INSTALL_LOCATION/include/LeapC.h" ]; then
      echo "Error: Leap SDK not found at '$LEAPSDK_INSTALL_LOCATION'. Install Ultraleap Tracking Software or set LEAPSDK_INSTALL_LOCATION." >&2
      exit 1
    fi
    ;;
esac

"$PYTHON" -m pip install -r "$BINDINGS/requirements.txt"
"$PYTHON" -m pip install -r "$ROOT/bridge/requirements.txt"
"$PYTHON" -m pip install -e "$BINDINGS/leapc-cffi"
"$PYTHON" -m pip install -e "$BINDINGS/leapc-python-api"

"$PYTHON" -c "import leap; print('Leap bindings ready:', leap.__file__)"

echo ""
echo "Leap setup complete. Start the bridge with:"
echo "$PYTHON bridge/leap_bridge.py"
