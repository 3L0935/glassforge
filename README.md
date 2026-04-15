# GlassForge

> A fast, glassy Linux GUI for Claude Code. Wraps the `claude` CLI in a Tauri 2 app with multi-session PTY streaming, usage tracking, a skills manager, a runtime theme editor, and native KDE Plasma 6 window blur.

**Stack:** Tauri 2 · Rust · React 19 · TypeScript · Zustand · portable-pty · x11rb

---

## Features

- **Multiple live sessions** — every session is a real `claude` process in its own PTY, streamed to the UI via `session://{id}/stdout` events.
- **Usage tracking** — per-session token estimates, cost estimates by model, concurrent/daily/weekly limit bars, and a color-graded context-window ring.
- **Skills manager** — scans `~/.claude/skills/`, installs new skills with `git clone` from a URL.
- **Runtime theme editor** — 7 presets (Dark Glass, Midnight Blue, Cyberpunk Neon, Forest, Nord, Dracula, Catppuccin Mocha), plus sliders for blur, glow, saturation, transparency, typography, and corner radius. Persisted via `tauri-plugin-store`.
- **KDE blur** — sets `_KDE_NET_WM_BLUR_BEHIND_REGION` through x11rb so KWin blurs whatever sits behind the window. Toggleable from the theme editor. X11 today; Wayland blur manager is on the roadmap.
- **No Electron** — ~10 MB binary, native WebKitGTK webview.

## Requirements

- Linux with WebKitGTK (KDE Plasma 6 tested; GNOME works without the window blur)
- Claude Code CLI installed and on `PATH` (`claude --version` should succeed)
- For building from source: Rust stable + Node 20 + pnpm 10

### System packages

```bash
# Debian / Ubuntu
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev \
  librsvg2-dev libssl-dev pkg-config curl wget build-essential \
  libxdo-dev libx11-dev libxcb1-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel gtk3-devel libappindicator-gtk3-devel \
  librsvg2-devel openssl-devel xdotool libX11-devel libxcb-devel

# Arch
sudo pacman -S webkit2gtk-4.1 gtk3 libappindicator-gtk3 librsvg openssl \
  xdotool libx11 libxcb
```

## Install

### AppImage (one-liner)

```bash
curl -sSL https://raw.githubusercontent.com/3L0935/glassforge/main/scripts/install.sh | bash
```

This grabs the latest AppImage from GitHub Releases, drops it into `~/.local/bin/glassforge`, and creates a `.desktop` entry in `~/.local/share/applications`.

### Flatpak

```bash
git clone https://github.com/3L0935/glassforge
cd glassforge
./scripts/build-flatpak.sh
flatpak install --user glassforge.flatpak
```

### From source

```bash
git clone https://github.com/3L0935/glassforge
cd glassforge
pnpm install
pnpm tauri dev       # run against Vite HMR
pnpm tauri build --bundles appimage  # produce a release AppImage
```

## KDE blur setup

GlassForge ships with two distinct kinds of blur:

- **In-app glass** — CSS `backdrop-filter` on cards, sidebar, settings panel. This works on every compositor (GNOME, KDE, Sway, etc).
- **Window-level blur** — KWin blurs the wallpaper/other windows that sit behind GlassForge. Controlled by the `_KDE_NET_WM_BLUR_BEHIND_REGION` X11 atom.

To enable window-level blur:

1. Make sure you're running KDE Plasma 6 on X11 (Wayland support is pending).
2. Open GlassForge → **Settings (gear icon)** → **Window** → toggle **Enable KDE blur behind window**.
3. If nothing happens, check KWin compositing is on: *System Settings → Display → Compositor → Enable on startup*.

## Theming

Open **Settings** (top-right gear). Every knob is live:

- **Preset** — pick one of the bundled palettes.
- **Accent & glow** — primary/secondary accent, ambient glow intensity & radius.
- **Glass & blur** — in-app backdrop blur strength, saturation, background opacity.
- **Window** — background color, window opacity, KDE blur toggle.
- **Typography** — sans/mono font families, base size, corner radius.

Settings persist to `~/.local/share/com.glassforge.app/settings.json` (or whatever your platform's store path is).

## Configuration

| Path | Purpose |
|---|---|
| `~/.local/share/com.glassforge.app/settings.json` | Theme + limit config (managed by `tauri-plugin-store`) |
| `~/.claude/skills/` | User skills discovered by GlassForge |
| `~/.local/share/com.glassforge.app/logs/` | Runtime logs via `tauri-plugin-log` |

GlassForge never writes anywhere else. It spawns only the user's local `claude` binary — no network calls of its own.

## Architecture

```
Frontend (React)  ←─ invoke / event ─→  Tauri Command Layer (Rust)
                                                │
                                                ├── claude::session    (PTY + streaming)
                                                ├── skills             (scan + git install)
                                                ├── kde::blur          (X11 atom)
                                                └── config             (tauri-plugin-store)
```

- Every side effect goes through a Tauri command — the frontend never spawns processes directly.
- Sessions live in a `SessionRegistry` (`Arc<RwLock<HashMap<Uuid, SessionHandle>>>`).
- Each session owns a dedicated OS thread that blocks on `portable-pty` reads and re-publishes chunks as `session://{id}/stdout` Tauri events.
- Status transitions emit `session://{id}/status`; exit codes emit `session://{id}/exit`.

## Contributing

PRs welcome. Before committing:

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
pnpm typecheck
```

CI re-runs all of the above on every push.

## Not in scope

- GlassForge is not a reimplementation of Claude Code — it spawns the user's existing `claude` binary.
- Not an Electron app — no bundled Chromium.
- Not a network service — all state is local; the only network activity belongs to `claude` itself.
- Not a theme engine for KDE — the window-blur integration is nice-to-have, not the core feature.

## License

MIT. See [`LICENSE`](./LICENSE).
