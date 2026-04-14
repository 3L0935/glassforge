// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    {
        // Force X11 backend on Linux unless the user has explicitly chosen
        // otherwise. This lets us honor `_KDE_NET_WM_BLUR_BEHIND_REGION` on
        // KDE Plasma 6 Wayland via Xwayland, which is the only reliable way
        // to get window-behind blur today. Users who need native Wayland can
        // override with `GDK_BACKEND=wayland glassforge`.
        if std::env::var_os("GDK_BACKEND").is_none() {
            std::env::set_var("GDK_BACKEND", "x11");
        }
    }
    glassforge_lib::run();
}
