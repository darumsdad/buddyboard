"use client";

import { useTransition, useState, useRef } from "react";
import { searchCampersAction, type CamperSuggestion } from "../actions";

type Props = {
  sessionId: string;
  label: string;
  onResolved: (camper: CamperSuggestion | null) => void;
  error?: string | null;
  inputRef?: React.RefObject<HTMLInputElement>;
};

export function CamperField({ sessionId, label, onResolved, error, inputRef }: Props) {
  const [suggestions, setSuggestions] = useState<CamperSuggestion[]>([]);
  const [resolved, setResolved] = useState<CamperSuggestion | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fieldId = useRef(`camper-field-${Math.random().toString(36).slice(2)}`);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setInputValue(value);
    setActiveIndex(-1);

    if (timer.current) clearTimeout(timer.current);

    if (value.length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    timer.current = setTimeout(() => {
      startTransition(async () => {
        const results = await searchCampersAction(value, sessionId);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
        // Auto-resolve on exact code match (single result from exact path)
        if (results.length === 1 && results[0].code === value.trim()) {
          selectCamper(results[0]);
        }
      });
    }, 300);
  }

  function selectCamper(camper: CamperSuggestion) {
    setResolved(camper);
    onResolved(camper);
    setSuggestions([]);
    setShowDropdown(false);
    setInputValue("");
    setActiveIndex(-1);
  }

  function clearResolved() {
    setResolved(null);
    onResolved(null);
    setInputValue("");
    setSuggestions([]);
    setShowDropdown(false);
    setTimeout(() => {
      if (inputRef?.current) {
        inputRef.current.focus();
      }
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        selectCamper(suggestions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setSuggestions([]);
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  }

  const hasError = Boolean(error);

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={fieldId.current}
        className="text-sm font-semibold text-slate-900"
      >
        {label}
      </label>

      <div className="relative">
        {resolved ? (
          <div
            className={`min-h-[44px] flex items-center w-full border rounded-md px-3 ${
              hasError
                ? "border-red-400"
                : "border-slate-300"
            }`}
          >
            <span className="inline-flex items-center gap-1 bg-blue-100 border border-blue-300 rounded-full px-3 py-1 text-sm font-semibold text-blue-700">
              {resolved.firstName} {resolved.lastName} · {resolved.bunk}
              <button
                type="button"
                onClick={clearResolved}
                className="ml-1 text-blue-500 hover:text-blue-700 cursor-pointer leading-none"
                aria-label="Clear selection"
              >
                ×
              </button>
            </span>
          </div>
        ) : (
          <input
            id={fieldId.current}
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Code or name…"
            aria-label={label}
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            className={`min-h-[44px] w-full border rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:ring-1 focus:outline-none ${
              hasError
                ? "border-red-400 focus:border-red-400 focus:ring-red-400"
                : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"
            }`}
          />
        )}

        {showDropdown && !resolved && (
          <div
            role="listbox"
            aria-live="polite"
            className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-slate-200 rounded-md shadow-md overflow-hidden max-h-48 overflow-y-auto"
          >
            {isPending ? (
              <div className="px-3 py-2 text-base text-slate-500">Searching…</div>
            ) : suggestions.length === 0 ? (
              <div className="px-3 py-2 text-base text-slate-500">No campers found</div>
            ) : (
              suggestions.map((s, i) => (
                <div
                  key={s.id}
                  role="option"
                  aria-selected={i === activeIndex}
                  onClick={() => selectCamper(s)}
                  className={`px-3 py-2 text-base text-slate-900 cursor-pointer ${
                    i === activeIndex ? "bg-slate-100" : "hover:bg-slate-50"
                  }`}
                >
                  {s.firstName} {s.lastName} · {s.bunk}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {hasError && (
        <p role="alert" className="text-sm text-red-600 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
