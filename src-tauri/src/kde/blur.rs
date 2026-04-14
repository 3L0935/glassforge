//! Sets `_KDE_NET_WM_BLUR_BEHIND_REGION` (X11) and talks to the
//! `org_kde_kwin_blur_manager` protocol (Wayland). Implemented in Phase 9.

#[allow(dead_code)]
pub(crate) fn placeholder() -> &'static str {
    "kde::blur"
}

#[allow(dead_code)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SessionType {
    Wayland,
    X11,
    Unknown,
}

#[allow(dead_code)]
pub fn detect_session_type() -> SessionType {
    if std::env::var("WAYLAND_DISPLAY").is_ok() {
        SessionType::Wayland
    } else if std::env::var("DISPLAY").is_ok() {
        SessionType::X11
    } else {
        SessionType::Unknown
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn placeholder_returns_name() {
        assert_eq!(placeholder(), "kde::blur");
    }

    #[test]
    fn session_type_detection_does_not_panic() {
        let _ = detect_session_type();
    }
}
