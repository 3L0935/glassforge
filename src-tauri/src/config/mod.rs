//! Persisted user settings via `tauri-plugin-store`.

pub mod theme;

#[cfg(test)]
mod tests {
    #[test]
    fn module_is_reachable() {
        let _ = super::theme::placeholder();
    }
}
