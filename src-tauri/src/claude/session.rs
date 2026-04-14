//! Session lifecycle: spawn `claude`, attach a PTY, stream stdout/stderr,
//! route stdin. Implemented in Phase 4.

#[allow(dead_code)]
pub(crate) fn placeholder() -> &'static str {
    "session"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn placeholder_returns_name() {
        assert_eq!(placeholder(), "session");
    }
}
