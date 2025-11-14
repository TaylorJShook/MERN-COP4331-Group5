import React, { useEffect, useRef } from "react";

interface DateNavigatorProps {
  selectedDate: Date;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
}

const DateNavigator: React.FC<DateNavigatorProps> = ({
  selectedDate,
  onPreviousDay,
  onNextDay,
  onToday,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation for date navigator
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard shortcuts when date navigator or its children are focused
      if (!containerRef.current?.contains(document.activeElement)) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          onPreviousDay();
          break;
        case "ArrowRight":
          e.preventDefault();
          onNextDay();
          break;
        case "Home":
          e.preventDefault();
          onToday();
          break;
        case "End":
          e.preventDefault();
          onToday();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onPreviousDay, onNextDay, onToday]);
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const today = isToday(selectedDate);

  return (
    <div
      ref={containerRef}
      className="date-navigator"
      role="navigation"
      aria-label="Date navigation"
    >
      <button
        type="button"
        className="date-nav-btn"
        onClick={onPreviousDay}
        aria-label="Previous day"
        title="Previous day (Left Arrow)"
      >
        ←
      </button>

      <div className="date-display" role="status" aria-live="polite">
        <div
          className="date-display__main"
          aria-label={`Selected date: ${formatDate(selectedDate)}`}
        >
          {formatDate(selectedDate)}
        </div>
        {!today && (
          <button
            type="button"
            className="date-nav-today"
            onClick={onToday}
            aria-label="Go to today"
            title="Go to today (Home key)"
          >
            Today
          </button>
        )}
      </div>

      <button
        type="button"
        className="date-nav-btn"
        onClick={onNextDay}
        aria-label="Next day"
        title="Next day (Right Arrow)"
      >
        →
      </button>
      <span className="sr-only">
        Keyboard shortcuts: Left Arrow for previous day, Right Arrow for next
        day, Home for today
      </span>
    </div>
  );
};

export default DateNavigator;
