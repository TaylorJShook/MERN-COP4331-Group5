import React from "react";

interface CompletionMessageProps {
  completedAt: Date | string;
  dueDate: Date | string | null;
  startDate: Date | string | null;
}

const CompletionMessage: React.FC<CompletionMessageProps> = ({
  completedAt,
  dueDate,
  startDate,
}) => {
  // Convert to Date objects
  const completed = new Date(completedAt);
  const due = dueDate ? new Date(dueDate) : null;
  const start = startDate ? new Date(startDate) : null;

  // Format completion time
  const completionTime = completed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Calculate timing feedback
  let timingMessage: string | null = null;
  let timingClass: "early" | "on-time" | "late" = "on-time";

  if (due) {
    const completedTime = completed.getTime();
    const dueTime = due.getTime();
    const differenceMs = completedTime - dueTime;
    const differenceMinutes = Math.round(differenceMs / (1000 * 60));

    if (differenceMinutes < 0) {
      // Completed early
      const minutesEarly = Math.abs(differenceMinutes);
      const hoursEarly = Math.floor(minutesEarly / 60);
      const minsEarly = minutesEarly % 60;

      if (hoursEarly > 0) {
        timingMessage = `Completed ${hoursEarly} hour${
          hoursEarly > 1 ? "s" : ""
        } ${
          minsEarly > 0 ? `${minsEarly} minute${minsEarly > 1 ? "s" : ""} ` : ""
        }early`;
      } else {
        timingMessage = `Completed ${minutesEarly} minute${
          minutesEarly > 1 ? "s" : ""
        } early`;
      }
      timingClass = "early";
    } else if (differenceMinutes > 0) {
      // Completed late
      const hoursLate = Math.floor(differenceMinutes / 60);
      const minsLate = differenceMinutes % 60;

      if (hoursLate > 0) {
        timingMessage = `Completed ${hoursLate} hour${
          hoursLate > 1 ? "s" : ""
        } ${
          minsLate > 0 ? `${minsLate} minute${minsLate > 1 ? "s" : ""} ` : ""
        }late`;
      } else {
        timingMessage = `Completed ${differenceMinutes} minute${
          differenceMinutes > 1 ? "s" : ""
        } late`;
      }
      timingClass = "late";
    } else {
      // Completed exactly on time (within 1 minute)
      timingMessage = "Completed on time";
      timingClass = "on-time";
    }
  } else if (start) {
    // If no due date, check if completed after start date
    const completedTime = completed.getTime();
    const startTime = start.getTime();
    const differenceMs = completedTime - startTime;
    const differenceMinutes = Math.round(differenceMs / (1000 * 60));

    if (differenceMinutes >= 0) {
      const hours = Math.floor(differenceMinutes / 60);
      const minutes = differenceMinutes % 60;

      if (hours > 0) {
        timingMessage = `Completed ${hours} hour${hours > 1 ? "s" : ""} ${
          minutes > 0 ? `${minutes} minute${minutes > 1 ? "s" : ""} ` : ""
        }after start`;
      } else {
        timingMessage = `Completed ${minutes} minute${
          minutes > 1 ? "s" : ""
        } after start`;
      }
      timingClass = "on-time";
    }
  }

  // Get icon for each state
  const getIcon = () => {
    switch (timingClass) {
      case "early":
        return (
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Trophy icon - clear achievement symbol */}
            <path
              d="M5 4H13M6 4V7.5C6 8.881 7.119 10 8.5 10H9.5C10.881 10 12 8.881 12 7.5V4M7 4H11M7.5 12V14.5H10.5V12M7 12H11L11.5 13.5H6.5L7 12Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx="9"
              cy="7.5"
              r="2"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        );
      case "on-time":
        return (
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="9"
              cy="9"
              r="8"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M6 9L8.5 11.5L12 6.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case "late":
        return (
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="9"
              cy="9"
              r="8"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M9 5V9L11 11"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="9" cy="13.5" r="1" fill="currentColor" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`completion-message completion-message--${timingClass}`}>
      <div className="completion-message__header">
        <div className="completion-message__icon">{getIcon()}</div>
        <div className="completion-message__content">
          <div className="completion-message__time">
            Task completed at {completionTime}
          </div>
          {timingMessage && (
            <div className="completion-message__timing">{timingMessage}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompletionMessage;
