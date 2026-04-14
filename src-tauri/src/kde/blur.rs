//! Tells KWin to blur the region behind a Tauri window by setting the
//! `_KDE_NET_WM_BLUR_BEHIND_REGION` X11 atom. An empty CARDINAL region is
//! interpreted by KWin as "blur the entire window".
//!
//! On Wayland sessions this code path is selected automatically when the
//! app is run under Xwayland (GlassForge forces `GDK_BACKEND=x11` at
//! startup to make this possible — KWin honors the X11 blur atom for
//! Xwayland clients just as well as for native X11 clients).
//!
//! Native Wayland blur would require binding the private
//! `org_kde_kwin_blur_manager` protocol to Tauri's existing `wl_surface`,
//! which is tracked for a future release.

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
        // An empty CARDINAL[] region means "blur the entire client area".
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn session_type_detection_does_not_panic() {
        let _ = detect_session_type();
    }
}
