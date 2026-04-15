//! Filesystem listing for the in-app project picker. Returns only
//! directory entries (plus a pointer to the parent) so the React side
//! can render a themed navigator that doesn't flashbang users with the
//! native GTK file chooser.

use std::fs;
use std::path::PathBuf;

use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_hidden: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirListing {
    pub path: String,
    pub parent: Option<String>,
    pub entries: Vec<DirEntry>,
}

pub fn list_dir(raw: &str) -> Result<DirListing> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(anyhow!("empty path"));
    }

    // Expand a leading `~` using $HOME so the input box can accept
    // typed `~/foo` paths like any shell would.
    let expanded: PathBuf = if trimmed == "~" || trimmed.starts_with("~/") {
        let home = std::env::var_os("HOME").ok_or_else(|| anyhow!("HOME unset"))?;
        if trimmed == "~" {
            PathBuf::from(home)
        } else {
            PathBuf::from(home).join(&trimmed[2..])
        }
    } else {
        PathBuf::from(trimmed)
    };

    let absolute = if expanded.is_absolute() {
        expanded
    } else {
        std::env::current_dir().context("cwd")?.join(expanded)
    };

    let canonical = fs::canonicalize(&absolute).unwrap_or(absolute);
    if !canonical.is_dir() {
        return Err(anyhow!("not a directory: {}", canonical.display()));
    }

    let iter =
        fs::read_dir(&canonical).with_context(|| format!("read_dir {}", canonical.display()))?;

    let mut entries: Vec<DirEntry> = Vec::new();
    for entry in iter.flatten() {
        let file_type = match entry.file_type() {
            Ok(t) => t,
            Err(_) => continue,
        };
        // Follow symlinks: if the target is a directory, accept it. This
        // keeps typical cases like `~/src -> /mnt/…` working.
        let is_dir = if file_type.is_symlink() {
            fs::metadata(entry.path())
                .map(|m| m.is_dir())
                .unwrap_or(false)
        } else {
            file_type.is_dir()
        };
        if !is_dir {
            continue;
        }
        let name = entry.file_name().to_string_lossy().into_owned();
        let is_hidden = name.starts_with('.');
        entries.push(DirEntry {
            name,
            path: entry.path().to_string_lossy().into_owned(),
            is_hidden,
        });
    }

    // Sort: non-hidden first, then alphabetical case-insensitive.
    entries.sort_by(|a, b| {
        a.is_hidden
            .cmp(&b.is_hidden)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    let parent = canonical.parent().map(|p| p.to_string_lossy().into_owned());

    Ok(DirListing {
        path: canonical.to_string_lossy().into_owned(),
        parent,
        entries,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn list_dir_rejects_non_directory() {
        let err = list_dir("/dev/null").unwrap_err();
        assert!(format!("{err}").contains("not a directory"));
    }

    #[test]
    fn list_dir_rejects_empty() {
        assert!(list_dir("").is_err());
        assert!(list_dir("   ").is_err());
    }

    #[test]
    fn list_dir_handles_root() {
        let listing = list_dir("/").unwrap();
        assert_eq!(listing.path, "/");
        assert!(listing.parent.is_none());
    }

    #[test]
    fn list_dir_expands_tilde() {
        if let Ok(home) = std::env::var("HOME") {
            let listing = list_dir("~").unwrap();
            assert_eq!(
                listing.path.trim_end_matches('/'),
                home.trim_end_matches('/')
            );
        }
    }

    #[test]
    fn list_dir_returns_only_directories() {
        let tmp = std::env::temp_dir();
        let sub = tmp.join(format!(
            "glassforge-picker-test-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(&sub).unwrap();
        fs::create_dir(sub.join("child_a")).unwrap();
        fs::create_dir(sub.join(".hidden")).unwrap();
        fs::write(sub.join("file.txt"), b"x").unwrap();

        let listing = list_dir(&sub.to_string_lossy()).unwrap();
        let names: Vec<_> = listing.entries.iter().map(|e| e.name.as_str()).collect();
        assert!(names.contains(&"child_a"));
        assert!(names.contains(&".hidden"));
        assert!(!names.contains(&"file.txt"));
        // Non-hidden should come before hidden.
        let a = names.iter().position(|n| n == &"child_a").unwrap();
        let h = names.iter().position(|n| n == &".hidden").unwrap();
        assert!(a < h);

        fs::remove_dir_all(&sub).ok();
    }
}
