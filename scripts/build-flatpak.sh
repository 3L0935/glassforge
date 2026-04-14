#!/usr/bin/env bash
# Build a local Flatpak bundle for GlassForge. Requires flatpak-builder.
set -euo pipefail

here="$(cd "$(dirname "$0")/.." && pwd)"
cd "${here}/flatpak"

flatpak install -y --noninteractive --user flathub \
  org.gnome.Platform//46 \
  org.gnome.Sdk//46 \
  org.freedesktop.Sdk.Extension.rust-stable//24.08 \
  org.freedesktop.Sdk.Extension.node20//24.08

flatpak-builder --force-clean --user --install-deps-from=flathub \
  --repo=repo build-dir com.glassforge.app.yml

flatpak build-bundle repo glassforge.flatpak com.glassforge.app --runtime-repo=https://flathub.org/repo/flathub.flatpakrepo

echo "Built: ${here}/flatpak/glassforge.flatpak"
