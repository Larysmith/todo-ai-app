"use client";

import { useCallback, useMemo, useState } from "react";
import { NoteEditor, NoteMeta, NoteSortSelect } from "./NoteEditor";
import { Button, Card, CardHeader, EmptyState, Input } from "./ui";
import { useNotes } from "@/lib/store";
import type { Note } from "@/lib/types";

type SortMode = "updated" | "created" | "title";

function matchesSearch(note: Note, query: string): boolean {
  if (!query) return true;
  return `${note.title} ${note.body} ${note.category}`.toLowerCase().includes(query);
}

export function NotesPanel() {
  const [notes, { addNote, updateNote, deleteNote, togglePin }] = useNotes();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("updated");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = notes.filter((note) => matchesSearch(note, query));
    const sorted = [...filtered];

    if (sort === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      sorted.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        const key = sort === "created" ? "createdAt" : "updatedAt";
        return b[key].localeCompare(a[key]);
      });
    }

    return sorted;
  }, [notes, search, sort]);

  const selected = useMemo(
    () => notes.find((note) => note.id === selectedId) ?? visible[0] ?? null,
    [notes, selectedId, visible],
  );

  const createNote = useCallback(() => {
    const note = addNote({ title: "New note", body: "", category: "General" });
    setSelectedId(note.id);
  }, [addNote]);

  const removeNote = useCallback(
    (id: string) => {
      const index = visible.findIndex((note) => note.id === id);
      const next = visible[index + 1] ?? visible[index - 1] ?? null;
      deleteNote(id);
      setSelectedId(next ? next.id : null);
    },
    [deleteNote, visible],
  );

  const confirmDelete = useCallback(
    (id: string) => {
      const note = notes.find((entry) => entry.id === id);
      if (!note) return;
      const accepted = window.confirm(`Delete "${note.title}"? This cannot be undone.`);
      if (accepted) removeNote(id);
    },
    [notes, removeNote],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      <Card>
        <CardHeader
          title="Notes"
          description={`${notes.length} note${notes.length === 1 ? "" : "s"}`}
          actions={<Button size="sm" variant="primary" onClick={createNote}>New note</Button>}
        />

        <div className="flex flex-col gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, body, category…"
            aria-label="Search notes"
          />
          <NoteSortSelect value={sort} onChange={(next) => setSort(next as SortMode)} />
        </div>

        <ul className="mt-3 flex max-h-[28rem] flex-col gap-1.5 overflow-y-auto pr-1">
          {visible.map((note) => {
            const active = selected?.id === note.id;
            return (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(note.id)}
                  aria-current={active}
                  className={`w-full rounded-lg border p-2.5 text-left transition-colors ${
                    active
                      ? "border-accent bg-accent-soft"
                      : "border-edge bg-panel hover:border-edge-strong"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: note.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {note.pinned ? `📌 ${note.title}` : note.title}
                    </span>
                  </span>
                  <NoteMeta note={note} />
                </button>
              </li>
            );
          })}
        </ul>

        {visible.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title={notes.length === 0 ? "No notes yet" : "No matching notes"}
              description={
                notes.length === 0
                  ? "Notes autosave as you type and are stored only in this browser."
                  : "Try a different search term."
              }
              action={
                notes.length === 0 ? (
                  <Button size="sm" variant="primary" onClick={createNote}>
                    Create your first note
                  </Button>
                ) : null
              }
            />
          </div>
        ) : null}
      </Card>

      <Card>
        {selected ? (
          <NoteEditor
            key={selected.id}
            note={selected}
            onUpdate={updateNote}
            onDelete={confirmDelete}
            onTogglePin={togglePin}
          />
        ) : (
          <EmptyState
            title="Select a note"
            description="Pick a note from the list, or create a new one to start writing."
          />
        )}
      </Card>
    </div>
  );
}
