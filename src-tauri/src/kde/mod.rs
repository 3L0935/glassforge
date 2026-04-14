//! KDE Plasma compositor integration (window blur, panel hints).
//! Fully feature-gated to Linux.

#[cfg(target_os = "linux")]
pub mod blur;

#[cfg(target_os = "linux")]
#[cfg(test)]
mod tests {
    #[test]
    fn module_is_reachable() {
        let _ = super::blur::placeholder();
    }
}
