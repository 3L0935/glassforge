//! Theme persistence (presets + custom variables). Implemented in Phase 8.

#[allow(dead_code)]
pub(crate) fn placeholder() -> &'static str {
    "theme"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn placeholder_returns_name() {
        assert_eq!(placeholder(), "theme");
    }
}
