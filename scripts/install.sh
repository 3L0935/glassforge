#!/usr/bin/env bash
# GlassForge installer — downloads the latest AppImage from GitHub
# releases, drops it into ~/.local/bin, and creates a .desktop entry.
set -euo pipefail

REPO="3L0935/glassforge"
BIN_NAME="glassforge"
INSTALL_DIR="${HOME}/.local/bin"
DESKTOP_DIR="${HOME}/.local/share/applications"
ICON_DIR="${HOME}/.local/share/icons/hicolor/256x256/apps"

bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
info()  { printf '\033[36m[glassforge]\033[0m %s\n' "$*"; }
warn()  { printf '\033[33m[glassforge]\033[0m %s\n' "$*"; }
err()   { printf '\033[31m[glassforge]\033[0m %s\n' "$*" >&2; }

need() {
  command -v "$1" >/dev/null 2>&1 || { err "missing dependency: $1"; exit 1; }
}

need curl
need jq || true  # jq is optional; we fall back to sed if absent

bold "GlassForge installer"
info "Fetching latest release metadata from github.com/${REPO}"

api="https://api.github.com/repos/${REPO}/releases/latest"
json=$(curl -sSL "${api}")

if command -v jq >/dev/null 2>&1; then
  tag=$(printf '%s' "${json}" | jq -r .tag_name)
  url=$(printf '%s' "${json}" | jq -r '.assets[] | select(.name | test("AppImage$")) | .browser_download_url' | head -n1)
else
  tag=$(printf '%s' "${json}" | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -n1)
  url=$(printf '%s' "${json}" | sed -n 's/.*"browser_download_url": *"\([^"]*AppImage\)".*/\1/p' | head -n1)
fi

if [[ -z "${tag}" || -z "${url}" || "${tag}" == "null" ]]; then
  err "could not resolve the latest AppImage URL."
  err "Check that a release has been published at https://github.com/${REPO}/releases"
  exit 1
fi

info "Latest release: ${tag}"
info "AppImage URL:   ${url}"

mkdir -p "${INSTALL_DIR}" "${DESKTOP_DIR}" "${ICON_DIR}"
dest="${INSTALL_DIR}/${BIN_NAME}"

info "Downloading to ${dest}"
curl -fSL --progress-bar -o "${dest}.new" "${url}"
chmod +x "${dest}.new"
mv -f "${dest}.new" "${dest}"

# Extract the bundled icon if available (best-effort).
tmp=$(mktemp -d)
trap 'rm -rf "${tmp}"' EXIT
if (cd "${tmp}" && "${dest}" --appimage-extract >/dev/null 2>&1); then
  icon_src=$(find "${tmp}/squashfs-root" -maxdepth 2 -name '*.png' -print -quit 2>/dev/null || true)
  if [[ -n "${icon_src}" ]]; then
    cp -f "${icon_src}" "${ICON_DIR}/glassforge.png"
  fi
fi

cat > "${DESKTOP_DIR}/glassforge.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=GlassForge
Comment=A glassy Linux GUI for Claude Code
Exec=${dest} %U
Icon=glassforge
Terminal=false
Categories=Development;IDE;
StartupWMClass=GlassForge
EOF

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "${DESKTOP_DIR}" >/dev/null 2>&1 || true
fi

bold "Installed."
info "Run it with:  ${BIN_NAME}  (make sure ${INSTALL_DIR} is on \$PATH)"
info "Or launch 'GlassForge' from your app menu."

if ! command -v claude >/dev/null 2>&1; then
  warn "The 'claude' CLI was not found on PATH. GlassForge needs it to spawn sessions."
  warn "Install it first: https://docs.anthropic.com/claude/docs/claude-code"
fi
