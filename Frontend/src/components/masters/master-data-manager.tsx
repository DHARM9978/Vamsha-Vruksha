
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  FadeIn,
  Stagger,
  StaggerItem,
} from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type ApiResponse } from "@/lib/api-client";
import type { MasterKey } from "@/types";

/**
 * Master item used by this component.
 * The backend returns an ID and name for every master record.
 */
interface MasterItem {
  id: string;
  name: string;
}

interface BackendMasterItem {
  id: number | string;
  name: string;
}

export interface MasterConfig {
  key: MasterKey;
  title: string;
  description: string;
}

interface MasterDataManagerProps {
  config: MasterConfig;
}

const MASTER_ENDPOINTS: Record<MasterKey, string> = {
  gotra: "gotra",
  sutra: "sutra",
  vamsha: "vamsha",
  kula_devatha: "kula-devatha",
  mane_devru: "mane-devru",
  panchang_sudhi: "panchang-sudhi",
  pooja_vruksha: "pooja-vruksha",
};

function normalizeMasterItem(item: BackendMasterItem): MasterItem {
  return {
    id: String(item.id),
    name: item.name,
  };
}

/**
 * Backend-connected CRUD manager for heritage master data.
 *
 * Admin:
 * - View master records
 * - Add records
 * - Edit records
 * - Delete records
 *
 * User:
 * - View master records
 *
 * Backend authorization remains the final authority.
 */
export function MasterDataManager({
  config,
}: MasterDataManagerProps) {
  const [items, setItems] = useState<MasterItem[] | null>(null);
  const [query, setQuery] = useState("");

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleting, setDeleting] = useState<MasterItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  const endpoint = MASTER_ENDPOINTS[config.key];

  // Load master records from the backend.
  useEffect(() => {
    let cancelled = false;

    async function loadMasterData() {
      setItems(null);
      setLoadError("");

      try {
        const response = await api.get<
          ApiResponse<BackendMasterItem[]>
        >(`/masters/${endpoint}`);

        if (!response.success || !Array.isArray(response.data)) {
          throw new Error(
            response.message ||
              `Unable to load ${config.title} values.`,
          );
        }

        if (!cancelled) {
          setItems(response.data.map(normalizeMasterItem));
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : `Unable to load ${config.title} values.`,
          );

          setItems([]);
        }
      }
    }

    void loadMasterData();

    return () => {
      cancelled = true;
    };
  }, [endpoint, config.title, loadAttempt]);

  // Filter and sort records.
  const filtered = useMemo(() => {
    if (!items) {
      return [];
    }

    const term = query.trim().toLowerCase();

    const sorted = [...items].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    if (!term) {
      return sorted;
    }

    return sorted.filter((item) =>
      item.name.toLowerCase().includes(term),
    );
  }, [items, query]);

  // Add a new master record.
  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = newName.trim();

    if (!name) {
      toast.error("Please enter a name.");
      return;
    }

    if (name.length > 255) {
      toast.error("Name cannot exceed 255 characters.");
      return;
    }

    const duplicate = items?.some(
      (item) => item.name.toLowerCase() === name.toLowerCase(),
    );

    if (duplicate) {
      toast.error("This value already exists.");
      return;
    }

    setAdding(true);

    try {
      const response = await api.post<
        ApiResponse<BackendMasterItem>
      >(`/masters/${endpoint}`, { name });

      if (!response.success || !response.data) {
        throw new Error(
          response.message || "Could not add the entry.",
        );
      }

      const createdItem = normalizeMasterItem(response.data);

      setItems((current) => {
        const updated = [...(current ?? []), createdItem];

        return updated.sort((a, b) =>
          a.name.localeCompare(b.name),
        );
      });

      setNewName("");

      toast.success(
        `"${createdItem.name}" added to ${config.title}.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not add the entry.",
      );
    } finally {
      setAdding(false);
    }
  }

  // Start editing a record.
  function startEditing(item: MasterItem) {
    setEditingId(item.id);
    setEditName(item.name);
  }

  // Cancel editing.
  function cancelEditing() {
    if (savingEdit) {
      return;
    }

    setEditingId(null);
    setEditName("");
  }

  // Save an edited record.
  async function handleSaveEdit() {
    if (!editingId) {
      return;
    }

    const name = editName.trim();

    if (!name) {
      toast.error("Please enter a name.");
      return;
    }

    if (name.length > 255) {
      toast.error("Name cannot exceed 255 characters.");
      return;
    }

    const duplicate = items?.some(
      (item) =>
        item.id !== editingId &&
        item.name.toLowerCase() === name.toLowerCase(),
    );

    if (duplicate) {
      toast.error("Another entry already uses this name.");
      return;
    }

    setSavingEdit(true);

    try {
      const response = await api.put<
        ApiResponse<BackendMasterItem>
      >(
        `/masters/${endpoint}/${encodeURIComponent(editingId)}`,
        { name },
      );

      if (!response.success || !response.data) {
        throw new Error(
          response.message || "Could not update the entry.",
        );
      }

      const updatedItem = normalizeMasterItem(response.data);

      setItems((current) =>
        (current ?? [])
          .map((item) =>
            item.id === updatedItem.id ? updatedItem : item,
          )
          .sort((a, b) => a.name.localeCompare(b.name)),
      );

      setEditingId(null);
      setEditName("");

      toast.success(`Renamed to "${updatedItem.name}".`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update the entry.",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  // Request deletion confirmation.
  function requestDelete(item: MasterItem) {
    setDeleting(item);
  }

  // Delete a record.
  async function handleDelete() {
    if (!deleting) {
      return;
    }

    const itemToDelete = deleting;

    setBusyId(itemToDelete.id);

    try {
      const response = await api.delete<
        ApiResponse<BackendMasterItem>
      >(
        `/masters/${endpoint}/${encodeURIComponent(itemToDelete.id)}`,
      );

      if (!response.success) {
        throw new Error(
          response.message || "Could not delete the entry.",
        );
      }

      setItems((current) =>
        (current ?? []).filter(
          (item) => item.id !== itemToDelete.id,
        ),
      );

      toast.success(`"${itemToDelete.name}" deleted.`);
      setDeleting(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not delete the entry.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {/* Add master record */}
      <FadeIn>
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="size-4 text-primary" />
              Add to {config.title}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleAdd} className="flex gap-2">
              <Input
                value={newName}
                onChange={(event) =>
                  setNewName(event.target.value)
                }
                placeholder={`New ${config.title.toLowerCase()} value`}
                aria-label={`New ${config.title} value`}
                maxLength={255}
                disabled={adding}
              />

              <Button
                type="submit"
                disabled={adding || !newName.trim()}
              >
                {adding ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Add"
                )}
              </Button>
            </form>

            <p className="mt-3 text-xs text-muted-foreground">
              {config.description}
            </p>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Existing master records */}
      <FadeIn delay={0.08}>
        <Card className="shadow-soft">
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">
              {config.title} values{" "}
              {items !== null && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({items.length})
                </span>
              )}
            </CardTitle>

            <div className="relative w-52">
              <Search
                className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />

              <Input
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                placeholder="Filter…"
                className="h-9 pl-8"
                aria-label={`Filter ${config.title} values`}
              />
            </div>
          </CardHeader>

          <CardContent>
            {items === null ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-12 w-full rounded-xl"
                  />
                ))}
              </div>
            ) : loadError ? (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
              >
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    Unable to load {config.title} values
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {loadError}
                  </p>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() =>
                      setLoadAttempt((attempt) => attempt + 1)
                    }
                  >
                    Try again
                  </Button>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Search}
                title={
                  query ? "No matching values" : "Nothing here yet"
                }
                description={
                  query
                    ? `No values match “${query.trim()}”.`
                    : `Add the first ${config.title.toLowerCase()} value using the form.`
                }
              />
            ) : (
              <Stagger className="space-y-1.5">
                {filtered.map((item) => (
                  <StaggerItem key={item.id}>
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
                      {editingId === item.id ? (
                        <>
                          <Input
                            value={editName}
                            onChange={(event) =>
                              setEditName(event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void handleSaveEdit();
                              }

                              if (event.key === "Escape") {
                                cancelEditing();
                              }
                            }}
                            autoFocus
                            className="h-8"
                            aria-label={`Rename ${item.name}`}
                            maxLength={255}
                            disabled={savingEdit}
                          />

                          <Button
                            type="button"
                            size="sm"
                            className="h-8"
                            onClick={() =>
                              void handleSaveEdit()
                            }
                            disabled={
                              savingEdit || !editName.trim()
                            }
                          >
                            {savingEdit ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              "Save"
                            )}
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={cancelEditing}
                            disabled={savingEdit}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 truncate text-sm font-medium">
                            {item.name}
                          </span>

                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            aria-label={`Edit ${item.name}`}
                            onClick={() => startEditing(item)}
                          >
                            <Pencil className="size-4" />
                          </Button>

                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8 text-destructive hover:text-destructive"
                            aria-label={`Delete ${item.name}`}
                            disabled={busyId === item.id}
                            onClick={() => requestDelete(item)}
                          >
                            {busyId === item.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open && !busyId) {
            setDeleting(null);
          }
        }}
        title={`Delete “${deleting?.name ?? ""}”?`}
        description={`This removes the value from the ${config.title} list. Values referenced by families or people cannot be deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
