//! Everything that talks to the `claude` CLI: session spawn, PTY IO,
//! streaming parser, usage/limits tracking.

pub mod limits;
pub mod parser;
pub mod session;

pub use session::{
    create_session, kill_session, list_sessions, send_message, SessionInfo, SessionRegistry,
};
