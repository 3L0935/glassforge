import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

import { useCatalogStore } from "@/stores/catalogStore";

import { CatalogListItem } from "./CatalogListItem";
import { FilterPills } from "./FilterPills";
import { SearchBar } from "./SearchBar";
import styles from "./SkillsPanel.module.css";

export function SkillsPanel() {
  const loading = useCatalogStore((s) => s.loading);
  const searchQuery = useCatalogStore((s) => s.searchQuery);
  const typeFilter = useCatalogStore((s) => s.typeFilter);
  const statusFilter = useCatalogStore((s) => s.statusFilter);
  const selectedEntry = useCatalogStore((s) => s.selectedEntry);
  const fetchCatalog = useCatalogStore((s) => s.fetchCatalog);
  const refreshMarketplaces = useCatalogStore((s) => s.refreshMarketplaces);
  const setSearchQuery = useCatalogStore((s) => s.setSearchQuery);
  const setTypeFilter = useCatalogStore((s) => s.setTypeFilter);
  const setStatusFilter = useCatalogStore((s) => s.setStatusFilter);
  const selectEntry = useCatalogStore((s) => s.selectEntry);
  const filteredEntries = useCatalogStore((s) => s.filteredEntries);
  const updateCount = useCatalogStore((s) => s.updateCount);

  const entries = filteredEntries();
  const updates = updateCount();

  useEffect(() => {
    void fetchCatalog();
    void refreshMarketplaces();
  }, [fetchCatalog, refreshMarketplaces]);

  const installed = entries.filter((e) => e.installed != null);
  const available = entries.filter((e) => e.installed == null);

  return (
    <div className={styles.root}>
      <SearchBar value={searchQuery} onChange={setSearchQuery} />
      <FilterPills
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        updateCount={updates}
        onTypeChange={setTypeFilter}
        onStatusChange={setStatusFilter}
      />

      <div className={styles.refreshRow}>
        <button
          type="button"
          className={styles.refresh}
          onClick={() => void refreshMarketplaces()}
          aria-label="Refresh marketplaces"
          title="Refresh marketplace catalogs"
        >
          <RefreshCw size={11} />
        </button>
      </div>

      {loading ? (
        <div className={styles.skeletons}>
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
        </div>
      ) : entries.length === 0 ? (
        <p className={styles.empty}>
          {searchQuery
            ? "No matches found."
            : "No plugins or skills found. Add a marketplace via the Claude CLI."}
        </p>
      ) : (
        <div className={styles.list}>
          {installed.length > 0 ? (
            <section>
              <h3 className={styles.sectionHeader}>
                Installed · {installed.length}
              </h3>
              {installed.map((e) => (
                <CatalogListItem
                  key={e.id}
                  entry={e}
                  selected={selectedEntry?.id === e.id}
                  onClick={() => selectEntry(e)}
                />
              ))}
            </section>
          ) : null}
          {available.length > 0 ? (
            <section>
              <h3 className={styles.sectionHeader}>
                Available · {available.length}
              </h3>
              {available.map((e) => (
                <CatalogListItem
                  key={e.id}
                  entry={e}
                  selected={selectedEntry?.id === e.id}
                  onClick={() => selectEntry(e)}
                />
              ))}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
