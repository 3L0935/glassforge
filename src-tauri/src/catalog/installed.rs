//! Reads installed plugins from `~/.claude/plugins/installed_plugins.json`
//! and standalone skills from `~/.claude/skills/`.

use anyhow::Result;

use super::types::CatalogEntry;

/// List all installed plugins and standalone skills as catalog entries.
pub fn list_installed() -> Result<Vec<CatalogEntry>> {
    // Stub — implemented in step 2.
    Ok(Vec::new())
}
