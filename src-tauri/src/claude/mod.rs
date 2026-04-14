//! Everything that talks to the `claude` CLI: session spawn, PTY IO,
//! streaming parser, usage/limits tracking.
//!
//! Public surface is added incrementally — Phase 4 wires up sessions.

pub mod limits;
pub mod parser;
pub mod session;

#[cfg(test)]
mod tests {
    #[test]
    fn module_is_reachable() {
        // Sanity: this module compiles and its submodules are hooked up.
        let _ = super::session::placeholder();
        let _ = super::parser::placeholder();
        let _ = super::limits::placeholder();
    }
}
