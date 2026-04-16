//! Unified catalog: merges marketplace plugins, installed plugins, and
//! standalone skills into a single `Vec<CatalogEntry>`.

pub mod types;

mod installed;
mod marketplace;

pub use installed::list_installed;
pub use marketplace::list_marketplace_entries;
pub use types::CatalogEntry;
