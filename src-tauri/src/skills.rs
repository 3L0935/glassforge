//! Skill discovery and install. Scans `~/.claude/skills/` for folders
//! containing a `SKILL.md` with YAML frontmatter (`name:` + `description:`).
//! `install_skill_from_git` shells out to `git clone` into the same dir.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Skill {
    pub name: String,
    pub description: String,
    pub path: String,
    pub source: String,
}

fn home_dir() -> Option<PathBuf> {
    std::env::var_os("HOME").map(PathBuf::from)
}

fn user_skills_dir() -> Option<PathBuf> {
    home_dir().map(|h| h.join(".claude").join("skills"))
}

pub fn list_skills() -> Result<Vec<Skill>> {
    let mut out = Vec::new();
    if let Some(dir) = user_skills_dir() {
        if dir.is_dir() {
            scan_dir(&dir, "user", &mut out)?;
        }
    }
    out.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(out)
}

fn scan_dir(root: &Path, source: &str, out: &mut Vec<Skill>) -> Result<()> {
    for entry in fs::read_dir(root)
        .with_context(|| format!("read_dir {}", root.display()))?
        .flatten()
    {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let skill_md = path.join("SKILL.md");
        if !skill_md.is_file() {
            continue;
        }
        let content = fs::read_to_string(&skill_md).unwrap_or_default();
        let (name, description) = parse_frontmatter(&content, &path);
        out.push(Skill {
            name,
            description,
            path: path.to_string_lossy().into_owned(),
            source: source.to_string(),
        });
    }
    Ok(())
}

fn parse_frontmatter(content: &str, fallback_path: &Path) -> (String, String) {
    let fallback_name = fallback_path
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| "skill".to_string());

    let trimmed = content.trim_start();
    let Some(rest) = trimmed.strip_prefix("---") else {
        return (fallback_name, String::new());
    };
    let end = match rest.find("\n---") {
        Some(i) => i,
        None => return (fallback_name, String::new()),
    };
    let block = &rest[..end];

    let mut name = fallback_name;
    let mut description = String::new();
    for line in block.lines() {
        let line = line.trim();
        if let Some(v) = line.strip_prefix("name:") {
            name = unquote(v.trim());
        } else if let Some(v) = line.strip_prefix("description:") {
            description = unquote(v.trim());
        }
    }
    (name, description)
}

fn unquote(s: &str) -> String {
    let t = s.trim();
    let t = t.strip_prefix('"').unwrap_or(t);
    let t = t.strip_suffix('"').unwrap_or(t);
    let t = t.strip_prefix('\'').unwrap_or(t);
    let t = t.strip_suffix('\'').unwrap_or(t);
    t.to_string()
}

pub fn install_skill_from_git(url: &str) -> Result<Skill> {
    let dir = user_skills_dir()
        .ok_or_else(|| anyhow!("could not locate user skills dir (HOME unset)"))?;
    fs::create_dir_all(&dir).with_context(|| format!("create skills dir {}", dir.display()))?;

    let folder_name = url
        .rsplit('/')
        .next()
        .unwrap_or("skill")
        .trim_end_matches(".git");
    if folder_name.is_empty() || folder_name.contains("..") {
        return Err(anyhow!("invalid skill name derived from url"));
    }
    let target = dir.join(folder_name);
    if target.exists() {
        return Err(anyhow!("skill already exists: {}", folder_name));
    }

    let status = Command::new("git")
        .args(["clone", "--depth=1", url])
        .arg(&target)
        .status()
        .context("failed to invoke git")?;
    if !status.success() {
        return Err(anyhow!("git clone exited with {}", status));
    }

    let content = fs::read_to_string(target.join("SKILL.md")).unwrap_or_default();
    let (name, description) = parse_frontmatter(&content, &target);
    Ok(Skill {
        name,
        description,
        path: target.to_string_lossy().into_owned(),
        source: "user".to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn parse_frontmatter_extracts_name_and_description() {
        let md = "---\nname: my-skill\ndescription: \"Does the thing\"\n---\n\nBody.";
        let (n, d) = parse_frontmatter(md, Path::new("/tmp/fallback"));
        assert_eq!(n, "my-skill");
        assert_eq!(d, "Does the thing");
    }

    #[test]
    fn parse_frontmatter_falls_back_to_dir_name() {
        let md = "just some markdown, no frontmatter";
        let (n, d) = parse_frontmatter(md, Path::new("/tmp/my-folder"));
        assert_eq!(n, "my-folder");
        assert_eq!(d, "");
    }

    #[test]
    fn scan_dir_reads_skill_md() {
        let tmp = tempdir();
        let skill_root = tmp.join("alpha");
        fs::create_dir_all(&skill_root).unwrap();
        let mut f = fs::File::create(skill_root.join("SKILL.md")).unwrap();
        writeln!(f, "---\nname: alpha-skill\ndescription: first\n---\n").unwrap();

        let mut out = Vec::new();
        scan_dir(&tmp, "user", &mut out).unwrap();
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].name, "alpha-skill");
        assert_eq!(out[0].description, "first");
        assert_eq!(out[0].source, "user");
    }

    #[test]
    fn unquote_strips_wrapping_quotes() {
        assert_eq!(unquote("\"hello\""), "hello");
        assert_eq!(unquote("'hello'"), "hello");
        assert_eq!(unquote("hello"), "hello");
    }

    fn tempdir() -> PathBuf {
        let mut p = std::env::temp_dir();
        p.push(format!(
            "glassforge-skills-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(&p).unwrap();
        p
    }
}
