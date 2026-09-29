"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Input, Select, Textarea } from "./ui";
import { NOTE_COLORS, UNCATEGORIZED, type Note } from "@/lib/types";

interface NoteEditorProps {
  note: Note;
  onUpdate: (id: string, patch: Partial<Note>) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}

export function NoteEditor({ note, onUpdate, onDelete, onTogglePin }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [category, setCategory] = useState(note.category);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (title === note.title && body === note.body && category === note.category) return;

    const timer = setTimeout(() => {
      onUpdate(note.id, { title, body, category });
      setSavedAt(new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }));
    }, 500);

    return () => clearTimeout(timer);
  }, [title, body, category, note.id, note.title, note.body, note.category, onUpdate]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Note title"
          aria-label="Note title"
          className="min-w-[12rem] flex-1 font-medium"
        />
        <Button
          size="sm"
          variant={note.pinned ? "primary" : "secondary"}
          onClick={() => onTogglePin(note.id)}
          aria-pressed={note.pinned}
        >
          {note.pinned ? "Pinned" : "Pin"}
        </Button>
        <Button size="sm" variant="danger" onClick={() => onDelete(note.id)}>
          Delete
        </Button>
      </div>

      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Write your note…"
        aria-label="Note body"
        rows={12}
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-muted">
          Category
          <Input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder={UNCATEGORIZED}
            aria-label="Note category"
            className="h-8 w-40 text-xs"
          />
        </label>

        <div role="group" aria-label="Note colour" className="flex items-center gap-1.5">
          {NOTE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onUpdate(note.id, { color })}
              aria-label={`Use colour ${color}`}
              aria-pressed={note.color === color}
              style={{ backgroundColor: color }}
              className={`size-6 rounded-full transition-transform hover:scale-110 ${
                note.color === color ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--panel)]" : ""
              }`}
            />
          ))}
        </div>

        {savedAt ? <span className="text-[11px] text-muted">Saved {savedAt}</span> : null}
      </div>
    </div>
  );
}

export function NoteMeta({ note }: { note: Note }) {
  return (
    <span className="mt-1.5 flex flex-wrap items-center gap-1">
      <Badge tone="accent">{note.category || UNCATEGORIZED}</Badge>
      <Badge>{new Date(note.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</Badge>
      {note.body.trim().length > 0 ? (
        <Badge>{`${note.body.trim().split(/\s+/).length} words`}</Badge>
      ) : null}
    </span>
  );
}

export function NoteSortSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)} aria-label="Sort notes">
      <option value="updated">Recently updated</option>
      <option value="created">Recently created</option>
      <option value="title">Title</option>
    </Select>
  );
}
