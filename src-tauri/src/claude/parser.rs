//! Parses `claude --output-format stream-json` output into typed events.
//! Implemented in Phase 4.

#[allow(dead_code)]
pub(crate) fn placeholder() -> &'static str {
    "parser"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn placeholder_returns_name() {
        assert_eq!(placeholder(), "parser");
    }
}
