//! Tells KWin to blur the region behind a Tauri window by setting the
//! `_KDE_NET_WM_BLUR_BEHIND_REGION` X11 atom. An empty CARDINAL region is
//! interpreted by KWin as "blur the entire window".
//!
//! On Wayland sessions this code path is selected automatically when the
//! app is run under Xwayland (GlassForge forces `GDK_BACKEND=x11` at
//! startup to make this possible — KWin honors the X11 blur atom for
//! Xwayland clients just as well as for native X11 clients).
//!
//! KWin does not expose a per-window blur strength; it's a global
//! compositor setting. `set_blur_strength` therefore writes to
//! `~/.config/kwinrc` and asks KWin to reconfigure. This affects every
//! window that uses the blur effect, which is documented in the UI.

use std::process::Command;

use anyhow::{anyhow, Context, Result};
use raw_window_handle::{HasWindowHandle, RawWindowHandle};
use tauri::WebviewWindow;
use x11rb::connection::Connection;
use x11rb::protocol::xproto::{AtomEnum, ConnectionExt as _, PropMode};
use x11rb::wrapper::ConnectionExt as _;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SessionType {
    Wayland,
    X11,
    Unknown,
}

pub fn detect_session_type() -> SessionType {
    if std::env::var_os("WAYLAND_DISPLAY").is_some() {
        SessionType::Wayland
    } else if std::env::var_os("DISPLAY").is_some() {
        SessionType::X11
    } else {
        SessionType::Unknown
    }
}

pub fn apply_blur(window: &WebviewWindow, enabled: bool) -> Result<()> {
    let handle = window
        .window_handle()
        .map_err(|e| anyhow!("window_handle: {e}"))?;
    match handle.as_raw() {
        RawWindowHandle::Xlib(h) => {
            set_kde_blur_x11(h.window as u32, enabled)?;
            Ok(())
        }
        RawWindowHandle::Wayland(_) => Err(anyhow!(
            "GlassForge is running as a native Wayland client. KDE blur on \
             Wayland is not implemented yet. Relaunch with \
             `GDK_BACKEND=x11 glassforge` to get KWin blur via Xwayland."
        )),
        other => Err(anyhow!("unsupported window handle variant: {other:?}")),
    }
}

fn set_kde_blur_x11(window_id: u32, enabled: bool) -> Result<()> {
    let (conn, _screen) = x11rb::connect(None).context("x11 connect")?;
    let atom = conn
        .intern_atom(false, b"_KDE_NET_WM_BLUR_BEHIND_REGION")
        .context("intern_atom")?
        .reply()
        .context("intern_atom reply")?
        .atom;

    if enabled {
        let empty: &[u32] = &[];
        conn.change_property32(
            PropMode::REPLACE,
            window_id,
            atom,
            AtomEnum::CARDINAL,
            empty,
        )
        .context("change_property")?
        .check()
        .context("change_property check")?;
    } else {
        conn.delete_property(window_id, atom)
            .context("delete_property")?
            .check()
            .context("delete_property check")?;
    }
    conn.flush().context("flush")?;
    Ok(())
}

/// Update KWin's global blur strength and ask KWin to reload its config.
/// Strength is clamped to the [1, 15] range KWin accepts. This is a
/// compositor-global setting — it affects every blurred window on the
/// user's session.
pub fn set_blur_strength(strength: u8) -> Result<()> {
    let clamped = strength.clamp(1, 15).to_string();

    run_alternatives(
        &["kwriteconfig6", "kwriteconfig5"],
        &[
            "--file",
            "kwinrc",
            "--group",
            "Effect-blur",
            "--key",
            "BlurStrength",
            clamped.as_str(),
        ],
    )
    .context("update kwinrc BlurStrength")?;

    run_alternatives(
        &["qdbus6", "qdbus"],
        &["org.kde.KWin", "/KWin", "reconfigure"],
    )
    .context("reload kwin config")?;

    Ok(())
}

fn run_alternatives(alternatives: &[&str], args: &[&str]) -> Result<()> {
    let mut last: Option<anyhow::Error> = None;
    for cmd in alternatives {
        match Command::new(cmd).args(args).status() {
            Ok(s) if s.success() => return Ok(()),
            Ok(s) => last = Some(anyhow!("{cmd} exited with {s}")),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => continue,
            Err(e) => last = Some(e.into()),
        }
    }
    Err(last.unwrap_or_else(|| anyhow!("none of {:?} are installed", alternatives)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn session_type_detection_does_not_panic() {
        let _ = detect_session_type();
    }

    #[test]
    fn run_alternatives_errors_when_nothing_found() {
        let err = run_alternatives(&["__glassforge_nope_1", "__glassforge_nope_2"], &["--help"])
            .unwrap_err();
        let msg = format!("{err}");
        assert!(msg.contains("not installed") || msg.contains("__glassforge_nope"));
    }
}
