import React, { useMemo, useRef, useEffect, useState } from "react";
import CompletionMessage from "./CompletionMessage";

interface TimelineGridProps {
  startHour?: number;
  endHour?: number;
  tasks?: any[];
  showHalfHours?: boolean;
  selectedDate?: Date; // Selected date for day-aware calculations
}

interface TaskPosition {
  task: any;
  top: number;
  height: number;
  left: number;
  width: number;
}

// Task status types
type TaskStatus = "completed" | "overdue" | "in-progress" | "upcoming";

// Utility function to determine task status based on current time
const getTaskStatus = (task: any, currentTime: Date): TaskStatus => {
  // If task is completed, it's always completed
  if (task.completed || task.Completed) {
    return "completed";
  }

  // Need both StartDate and DueDate to determine status
  if (!task.StartDate || !task.DueDate) {
    // If no dates, treat as upcoming (default)
    return "upcoming";
  }

  const startDate = new Date(task.StartDate);
  const dueDate = new Date(task.DueDate);
  const now = currentTime.getTime();

  // Check if dates are valid
  if (isNaN(startDate.getTime()) || isNaN(dueDate.getTime())) {
    return "upcoming";
  }

  const startTime = startDate.getTime();
  const dueTime = dueDate.getTime();

  // Overdue: current time is past due date
  if (now > dueTime) {
    return "overdue";
  }

  // In Progress: current time is between start and due date
  if (now >= startTime && now <= dueTime) {
    return "in-progress";
  }

  // Upcoming: current time is before start date
  return "upcoming";
};

// Color mapping based on task status
const getTaskColor = (status: TaskStatus): string => {
  switch (status) {
    case "completed":
      return "rgba(34, 197, 94, 0.8)"; // Green
    case "overdue":
      return "rgba(249, 115, 22, 0.8)"; // Orange
    case "in-progress":
      return "rgba(234, 179, 8, 0.8)"; // Yellow
    case "upcoming":
      return "rgba(59, 130, 246, 0.8)"; // Blue
    default:
      return "rgba(59, 130, 246, 0.8)"; // Default to blue
  }
};

// Get status label for display
const getStatusLabel = (status: TaskStatus): string => {
  switch (status) {
    case "completed":
      return "Completed";
    case "overdue":
      return "Overdue";
    case "in-progress":
      return "In Progress";
    case "upcoming":
      return "Upcoming";
    default:
      return "Unknown";
  }
};

// Format description to preserve line breaks and limit to 70 characters per line
const formatDescription = (description: string): string => {
  if (!description) return "";

  const maxLineLength = 70;
  const lines = description.split("\n");
  const formattedLines: string[] = [];

  lines.forEach((line) => {
    // If line is already within limit, keep it as is
    if (line.length <= maxLineLength) {
      formattedLines.push(line);
    } else {
      // Break long lines at word boundaries
      let remaining = line;
      while (remaining.length > maxLineLength) {
        // Find the last space before maxLineLength
        let breakPoint = maxLineLength;
        for (let i = maxLineLength; i >= 0; i--) {
          if (remaining[i] === " ") {
            breakPoint = i;
            break;
          }
        }

        // If no space found, break at maxLineLength
        if (breakPoint === maxLineLength) {
          breakPoint = maxLineLength;
        }

        formattedLines.push(remaining.substring(0, breakPoint).trim());
        remaining = remaining.substring(breakPoint).trim();
      }

      // Add remaining part
      if (remaining.length > 0) {
        formattedLines.push(remaining);
      }
    }
  });

  return formattedLines.join("\n");
};

// Memoized task block component to prevent unnecessary re-renders
interface TaskBlockProps {
  task: any;
  position: TaskPosition;
  currentTime: Date;
  onSelect: (task: any) => void;
}

const TaskBlock: React.FC<TaskBlockProps> = React.memo(
  ({ task, position, currentTime, onSelect }) => {
    const taskStatus = getTaskStatus(task, currentTime);
    const taskColor = getTaskColor(taskStatus);
    const statusLabel = getStatusLabel(taskStatus);
    const taskRef = React.useRef<HTMLDivElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(task);
      }
    };

    const startTime = task.StartDate
      ? new Date(task.StartDate).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : "No start time";
    const dueTime = task.DueDate
      ? new Date(task.DueDate).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : "No due time";

    return (
      <div
        ref={taskRef}
        className="timeline-task-block"
        style={{
          position: "absolute",
          top: `${position.top}px`,
          left: `${position.left}%`,
          width: `${position.width}%`,
          height: `${position.height}px`,
          backgroundColor: taskColor,
        }}
        onClick={(e) => {
          onSelect(task);
          (e.currentTarget as HTMLElement).blur();
        }}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`${
          task.title || "Untitled Task"
        }, ${statusLabel}, from ${startTime} to ${dueTime}`}
        title={`${task.title || "Untitled Task"} - ${statusLabel}`}
      >
        <div className="timeline-task-block__content">
          <div className="timeline-task-block__title">
            {task.title || "Untitled Task"}
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if task status changed or position changed
    const prevStatus = getTaskStatus(prevProps.task, prevProps.currentTime);
    const nextStatus = getTaskStatus(nextProps.task, nextProps.currentTime);

    return (
      prevStatus === nextStatus &&
      prevProps.position.top === nextProps.position.top &&
      prevProps.position.left === nextProps.position.left &&
      prevProps.position.width === nextProps.position.width &&
      prevProps.position.height === nextProps.position.height &&
      prevProps.task._id === nextProps.task._id &&
      prevProps.task.title === nextProps.task.title
    );
  }
);

TaskBlock.displayName = "TaskBlock";

const TimelineGrid: React.FC<TimelineGridProps> = ({
  startHour = 0,
  endHour = 23,
  tasks = [],
  showHalfHours: _showHalfHours = true, // Reserved for future use - currently using Option 1 (hour lines only)
  selectedDate = new Date(), // Default to today if not provided
}) => {
  // Refs to measure actual rendered sizes
  const firstHourSlotRef = useRef<HTMLDivElement>(null);
  const timelineColumnRef = useRef<HTMLDivElement>(null);
  const timelineTasksRef = useRef<HTMLDivElement>(null);

  // State to store measured dimensions
  const [hourHeight, setHourHeight] = useState(60); // Default fallback - matches CSS base height
  const [baseOffset, setBaseOffset] = useState(0); // Default fallback; will be measured as top edge of first slot

  // State for sidebar
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const sidebarCloseRef = useRef<HTMLButtonElement>(null);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);

  // State for current time (for real-time status checking)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Track previous task statuses to detect changes (optimization: only re-render when status changes)
  const previousStatusesRef = useRef<Map<string, TaskStatus>>(new Map());

  // Optimized time update: only update when status actually changes
  useEffect(() => {
    // Update immediately on mount
    const initialTime = new Date();
    setCurrentTime(initialTime);

    // Initialize previous statuses
    const initialStatuses = new Map<string, TaskStatus>();
    (tasks || []).forEach((task) => {
      const taskId = task._id || task.id || String(task);
      initialStatuses.set(taskId, getTaskStatus(task, initialTime));
    });
    previousStatusesRef.current = initialStatuses;

    // Update every minute, but only trigger re-render if status changed
    const interval = setInterval(() => {
      const newTime = new Date();

      // Calculate new statuses with new time
      const newStatuses = new Map<string, TaskStatus>();
      (tasks || []).forEach((task) => {
        const taskId = task._id || task.id || String(task);
        newStatuses.set(taskId, getTaskStatus(task, newTime));
      });

      // Compare with previous statuses
      let statusChanged = false;
      const previous = previousStatusesRef.current;

      // Check if task count changed
      if (previous.size !== newStatuses.size) {
        statusChanged = true;
      } else {
        // Check if any status changed
        for (const [taskId, newStatus] of newStatuses.entries()) {
          const previousStatus = previous.get(taskId);
          if (previousStatus !== newStatus) {
            statusChanged = true;
            break;
          }
        }
      }

      // Always update current time so indicators stay accurate
      setCurrentTime(newTime);

      // Only update stored statuses if something actually changed
      if (statusChanged) {
        previousStatusesRef.current = newStatuses;
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [tasks]);

  // Reset hourHeight to base when day changes to prevent using expanded heights from previous day
  useEffect(() => {
    // Reset to CSS base height (60px) when day changes
    // This ensures we don't use expanded heights from previous day's calculations
    setHourHeight(60);

    // Reset baseOffset to 0 - will be remeasured after DOM updates
    setBaseOffset(0);

    // Remeasure baseOffset after DOM has updated with new day's slots
    // Use a longer delay to ensure slots have reset to base height
    const remeasureTimeout = setTimeout(() => {
      requestAnimationFrame(() => {
        if (firstHourSlotRef.current && timelineTasksRef.current) {
          const hourSlot = firstHourSlotRef.current;
          const tasksContainer = timelineTasksRef.current;

          const hourSlotRect = hourSlot.getBoundingClientRect();
          const tasksContainerRect = tasksContainer.getBoundingClientRect();

          const firstSlotTopRelativeToTasks =
            hourSlotRect.top - tasksContainerRect.top;
          setBaseOffset(firstSlotTopRelativeToTasks);
        }
      });
    }, 150);

    return () => clearTimeout(remeasureTimeout);
  }, [selectedDate]);

  // Measure actual rendered dimensions
  // Only measure on mount and resize, not on day changes (to avoid measuring expanded slots)
  useEffect(() => {
    const measureDimensions = () => {
      // Use requestAnimationFrame to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        if (firstHourSlotRef.current && timelineTasksRef.current) {
          const hourSlot = firstHourSlotRef.current;
          const tasksContainer = timelineTasksRef.current;

          const hourSlotRect = hourSlot.getBoundingClientRect();
          const tasksContainerRect = tasksContainer.getBoundingClientRect();

          const height = hourSlotRect.height;

          // Only update if we got a valid measurement
          // But validate: if height is significantly different from base (60px),
          // it might be an expanded slot, so use the base height instead
          if (height > 0) {
            // Always use base height (60px) as the canonical value
            // The measurement is only used to validate or account for browser zoom
            // If measured height is close to base (within 10px), we're good
            // If it's way off, it means we're measuring an expanded slot and should ignore it
            const baseHeight = 60;
            const heightDifference = Math.abs(height - baseHeight);

            // Only use measured height if it's very close to base (accounting for rounding/zoom)
            // This prevents us from using expanded slot heights
            if (heightDifference < 10) {
              // Measurement is valid, use it (might be slightly off due to zoom/subpixel rendering)
              setHourHeight(height);
            } else {
              // Measurement is way off - likely an expanded slot, use base height
              setHourHeight(baseHeight);
            }

            // Calculate base offset: position of first slot TOP EDGE relative to tasks container
            // Hour lines are now at the top edge of each slot, not the center
            const firstSlotTopRelativeToTasks =
              hourSlotRect.top - tasksContainerRect.top;
            const baseOffsetValue = firstSlotTopRelativeToTasks; // Top edge, not center
            setBaseOffset(baseOffsetValue);
          }
        }
      });
    };

    // Measure on mount (with a small delay to ensure DOM is ready)
    const timeoutId = setTimeout(measureDimensions, 100);

    // Use ResizeObserver to detect size changes (handles zoom)
    const resizeObserver = new ResizeObserver(() => {
      // Add a small delay to avoid measuring during rapid changes
      setTimeout(measureDimensions, 50);
    });

    if (firstHourSlotRef.current) {
      resizeObserver.observe(firstHourSlotRef.current);
    }
    if (timelineTasksRef.current) {
      resizeObserver.observe(timelineTasksRef.current);
    }
    if (timelineColumnRef.current) {
      resizeObserver.observe(timelineColumnRef.current);
    }

    // Also listen to window resize events
    window.addEventListener("resize", measureDimensions);

    // Listen to zoom events (some browsers)
    window.addEventListener("zoom", measureDimensions);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureDimensions);
      window.removeEventListener("zoom", measureDimensions);
    };
  }, []); // Only run on mount, not on day changes

  // Generate hour markers (0-23 for full 24-hour cycle)
  const hours = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => startHour + i
  );

  const formatHour = (hour: number): string => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  // Format duration for display
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
  };

  // Calculate task duration in minutes
  const getTaskDuration = (task: any): number => {
    if (!task.StartDate || !task.DueDate) return 0;
    const startDate = new Date(task.StartDate);
    const endDate = new Date(task.DueDate);
    return (endDate.getTime() - startDate.getTime()) / (1000 * 60);
  };

  // ---- Local time helpers (consistent with hour labels) ----
  const makeLocalDayAnchor = (d: Date): Date => {
    // Use the user's chosen calendar date at 00:00 local time
    const anchor = new Date(d);
    anchor.setHours(0, 0, 0, 0);
    return anchor;
  };

  const hourWindowLocal = (
    anchorLocal: Date,
    hour: number
  ): [number, number] => {
    // Returns [startMs, endMs) for the hour on the anchor's calendar day, in local time
    const hourStart = new Date(anchorLocal);
    hourStart.setHours(hour, 0, 0, 0);
    const hourEnd = new Date(anchorLocal);
    hourEnd.setHours(hour + 1, 0, 0, 0);
    return [hourStart.getTime(), hourEnd.getTime()];
  };

  const overlapMinutesInHourLocal = (
    taskStartMs: number,
    taskEndMs: number,
    anchorLocal: Date,
    hour: number
  ): number => {
    const [hs, he] = hourWindowLocal(anchorLocal, hour);
    const ms = Math.max(0, Math.min(taskEndMs, he) - Math.max(taskStartMs, hs));
    return ms / 60000;
  };

  // Calculate dynamic slot heights and task positions together
  // This ensures slot heights account for adjusted task positions after overlap prevention
  const { slotHeights, taskPositions } = useMemo(() => {
    // Create local day anchor: selectedDate at 00:00:00 local time (start of the visible day)
    // All hour window calculations will be anchored to this local day (matches hour labels)
    const dayAnchorLocal = makeLocalDayAnchor(selectedDate);

    // First, calculate initial slot heights
    const heights: Map<number, number> = new Map();
    // No maximum cap - let slots expand as needed to fit all tasks
    // Users can scroll if there are many tasks in one hour
    // Note: Minimum task height (36px) is applied to task blocks in taskPositions, not to slot heights

    // Initialize all hours with base height (explicitly reset to ensure clean state)
    hours.forEach((hour) => {
      heights.set(hour, hourHeight);
    });

    // Filter valid tasks
    const validTasks = tasks.filter((task) => {
      if (!task.StartDate || !task.DueDate) return false;
      const startDate = new Date(task.StartDate);
      const endDate = new Date(task.DueDate);
      return (
        !isNaN(startDate.getTime()) &&
        !isNaN(endDate.getTime()) &&
        endDate > startDate
      );
    });

    if (validTasks.length === 0) {
      return { slotHeights: heights, taskPositions: [] }; // No tasks, return base heights
    }

    // Step 2: For each hour, calculate slot height based on actual task heights
    // Count only the minutes that fall within each hour
    // Add short-segment guard to ensure short tasks maintain correct time-to-pixels ratio
    hours.forEach((hour) => {
      // Find all tasks that overlap with this hour
      // Use local hour window for consistent day-aware calculation (matches hour labels)
      const [hourStartMs, hourEndMs] = hourWindowLocal(dayAnchorLocal, hour);

      const overlappingTasks = validTasks.filter((task) => {
        const taskStart = new Date(task.StartDate).getTime();
        const taskEnd = new Date(task.DueDate).getTime();

        // Task overlaps hour if it doesn't completely end before hour starts or start after hour ends
        // This uses actual timestamps, properly handling multi-day tasks
        return taskEnd > hourStartMs && taskStart < hourEndMs;
      });

      if (overlappingTasks.length === 0) {
        // No tasks in this hour, keep base height
        heights.set(hour, hourHeight);
        return;
      }

      // --- 1) SHORT-SEGMENT GUARD: compute minimum hour height required
      // For short task segments, ensure the hour is tall enough so the segment
      // renders at least minTaskPixels while maintaining correct time ratio
      const minTaskPixels = 36; // Visual minimum for task blocks (for readability)
      const maxHourExpansion = hourHeight * 4; // Cap expansion at 4x base height (e.g., 240px for 60px base)
      let requiredHourHeightFromShorts = hourHeight; // Start at base

      overlappingTasks.forEach((task) => {
        const s = new Date(task.StartDate).getTime();
        const e = new Date(task.DueDate).getTime();

        // Use local overlap calculation (matches hour labels)
        const overlapMinutes = overlapMinutesInHourLocal(
          s,
          e,
          dayAnchorLocal,
          hour
        );
        if (overlapMinutes <= 0) return;

        // If this piece is short, figure out how tall the hour must be
        // to make the proportional segment at least minTaskPixels
        // Formula: requiredHourHeight = (minTaskPixels * 60) / overlapMinutes
        // For a 20-minute task: (36 * 60) / 20 = 108px
        // For a 1-minute task: (36 * 60) / 1 = 2160px (too large!)
        const requiredForThisSegment = (minTaskPixels * 60) / overlapMinutes;

        // Cap the expansion to prevent extreme growth for very short tasks
        // Very short tasks (< 2-3 minutes) may render slightly smaller than minTaskPixels
        // but the hour slot won't expand unreasonably
        const cappedHeight = Math.min(requiredForThisSegment, maxHourExpansion);

        if (cappedHeight > requiredHourHeightFromShorts) {
          requiredHourHeightFromShorts = cappedHeight;
        }
      });

      // At this point, using requiredHourHeightFromShorts ensures any tiny segment
      // will render at least minTaskPixels without breaking proportionality (up to the cap).
      // Very short tasks that exceed the cap will render proportionally smaller but still visible.
      // This is the provisional hour height H
      const H = Math.max(hourHeight, requiredHourHeightFromShorts);

      // --- 2) Columnize tasks for this hour (time-based overlap, same as before)
      const sortedTasks = overlappingTasks
        .slice()
        .sort(
          (a, b) =>
            new Date(a.StartDate).getTime() - new Date(b.StartDate).getTime()
        );

      const columns: any[][] = [];
      sortedTasks.forEach((task) => {
        const tStart = new Date(task.StartDate).getTime();
        const tEnd = new Date(task.DueDate).getTime();

        let placed = false;
        for (const col of columns) {
          const clash = col.some((x) => {
            const xs = new Date(x.StartDate).getTime();
            const xe = new Date(x.DueDate).getTime();
            return !(tStart >= xe || tEnd <= xs);
          });
          if (!clash) {
            col.push(task);
            placed = true;
            break;
          }
        }
        if (!placed) columns.push([task]);
      });

      // --- 3) With the provisional hour height H, compute stacked height in this hour
      let maxColumnStackPx = 0;
      columns.forEach((col) => {
        // Sort inside column just for determinism
        const ordered = col
          .slice()
          .sort(
            (a, b) =>
              new Date(a.StartDate).getTime() - new Date(b.StartDate).getTime()
          );

        let stackPx = 0;
        ordered.forEach((task) => {
          const s = new Date(task.StartDate).getTime();
          const e = new Date(task.DueDate).getTime();

          // Use local overlap calculation (matches hour labels)
          const overlapMinutes = overlapMinutesInHourLocal(
            s,
            e,
            dayAnchorLocal,
            hour
          );
          if (overlapMinutes <= 0) return;

          // Convert overlap minutes → px using the provisional hour height H
          const segmentPx = (overlapMinutes / 60) * H;

          // NOTE: we do not apply minTaskPixels here; the hour H was already
          // chosen to guarantee short segments will be >= minTaskPixels.
          stackPx += segmentPx;
        });

        if (stackPx > maxColumnStackPx) maxColumnStackPx = stackPx;
      });

      // --- 4) Final height for this hour
      const finalHourHeight = Math.max(H, maxColumnStackPx);
      heights.set(hour, finalHourHeight);
    });

    // Now calculate task positions based on initial slot heights
    // Then adjust positions and recalculate slot heights if needed
    // Reuse validTasks from above, but filter for additional validation needed for positioning
    const validTasksForPositioning = validTasks.filter((task) => {
      const startDate = new Date(task.StartDate);
      const endDate = new Date(task.DueDate);

      // Additional validation: ensure duration is reasonable (not more than 7 days)
      const durationDays =
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (durationDays > 7) {
        console.warn(
          "Task duration exceeds 7 days, may display incorrectly:",
          task.title
        );
      }

      return true;
    });

    // Calculate positions for each task
    // All calculations use local time to match hour labels
    // Multi-day tasks are clamped to show only the portion within the selected day
    const positions: TaskPosition[] = validTasksForPositioning
      .map((task) => {
        const taskStart = new Date(task.StartDate);
        const taskEnd = new Date(task.DueDate);

        // Calculate day boundaries in local time for the selected day
        const dayStartMs = dayAnchorLocal.getTime();
        const dayEndMs = dayStartMs + 24 * 3600 * 1000; // 24 hours later in local time (midnight next day)

        // Clamp task times to the selected day boundaries
        const taskStartMs = taskStart.getTime();
        const taskEndMs = taskEnd.getTime();
        const clampedStart = Math.max(dayStartMs, taskStartMs);
        const clampedEnd = Math.min(dayEndMs, taskEndMs);

        // If task doesn't overlap with the selected day at all, skip it
        if (clampedEnd <= clampedStart) {
          return null;
        }

        // Use local hours and minutes for positioning (matches hour labels)
        const clampedStartDate = new Date(clampedStart);
        const clampedEndDate = new Date(clampedEnd);

        // Check if task ends exactly at midnight of next day (clampedEnd == dayEndMs)
        // In that case, we want to show it extending to the end of the current day (hour 24)
        const isEndAtDayBoundary =
          clampedEnd === dayEndMs && taskEndMs > dayEndMs;

        // Get local hours and fractional minutes
        const sh = clampedStartDate.getHours();
        let eh = clampedEndDate.getHours();
        const sMin =
          clampedStartDate.getMinutes() +
          clampedStartDate.getSeconds() / 60 +
          clampedStartDate.getMilliseconds() / 60000;
        let eMin =
          clampedEndDate.getMinutes() +
          clampedEndDate.getSeconds() / 60 +
          clampedEndDate.getMilliseconds() / 60000;

        // If task ends at midnight of next day (clamped to day boundary), show it extending to end of current day
        if (isEndAtDayBoundary) {
          eh = 24; // Show until end of day (24 = midnight next day, exclusive)
          eMin = 0;
        }

        // Clamp to visible hour range (0-24)
        const dayStart = 0; // 12:00 AM
        const dayEnd = 24; // 12:00 AM next day (exclusive)
        const clampedStartHour = Math.max(dayStart, Math.min(dayEnd, sh));
        const clampedEndHour = Math.max(dayStart, Math.min(dayEnd, eh));

        // If task doesn't overlap with visible day at all, skip it
        if (
          clampedEndHour < clampedStartHour ||
          (clampedEndHour === clampedStartHour && eMin <= sMin)
        ) {
          return null;
        }

        // Calculate top position using cumulative slot heights
        // baseOffset is where the 12:00 AM line is (TOP EDGE of first slot)
        const startHourSlotHeight = heights.get(clampedStartHour) || hourHeight;

        // Calculate cumulative top:
        // 1. Start from baseOffset (12:00 AM top edge position)
        // 2. Add all full hour slots before the start hour (each slot's top-to-top distance)
        let cumulativeTop = baseOffset;
        for (let h = 0; h < clampedStartHour; h++) {
          cumulativeTop += heights.get(h) || hourHeight;
        }
        // 3. Add the minutes portion from the start hour's top edge
        cumulativeTop += (sMin / 60) * startHourSlotHeight;

        const top = cumulativeTop;

        // Calculate height: distance from visible start time to visible end time
        // Calculate end time position the same way we calculated top
        const endHourSlotHeight = heights.get(clampedEndHour) || hourHeight;

        // Calculate end time position (same method as top)
        let endTimePosition = baseOffset;
        for (let h = 0; h < clampedEndHour; h++) {
          endTimePosition += heights.get(h) || hourHeight;
        }
        endTimePosition += (eMin / 60) * endHourSlotHeight;

        // Height is simply the difference between end and start positions
        const height = endTimePosition - top;

        // Height is already calculated correctly from top to endTimePosition
        // No need to clamp since we calculated it directly from the positions
        const clampedHeight = height;

        // Minimum height for readable title text (36px)
        // This ensures task boxes are big enough to display title text clearly
        const minHeightForReadableTitle = 36;
        const finalHeight = Math.max(clampedHeight, minHeightForReadableTitle);

        return {
          task,
          top,
          height: finalHeight,
          left: 0, // Start at left edge, will be adjusted for overlapping
          width: 100, // Default 100% width, will be adjusted for overlapping
        };
      })
      .filter((pos): pos is TaskPosition => pos !== null); // Filter out null positions (tasks outside visible day)

    // Handle overlapping tasks by stacking them
    // Sort by start time (using actual task times, not pixel positions)
    positions.sort((a, b) => {
      const aStart = new Date(a.task.StartDate).getTime();
      const bStart = new Date(b.task.StartDate).getTime();
      return aStart - bStart;
    });

    // Group overlapping tasks into columns
    // Only overlapping tasks go to new columns; non-overlapping tasks share the same column
    // Use actual task times for overlap detection, not pixel positions
    const columns: TaskPosition[][] = [];
    positions.forEach((pos) => {
      const posStart = new Date(pos.task.StartDate).getTime();
      const posEnd = new Date(pos.task.DueDate).getTime();

      let placed = false;
      // Try to place in existing column
      for (const column of columns) {
        // Check if this task overlaps with ANY task in this column (using actual times)
        const hasOverlap = column.some((existingPos) => {
          const existingStart = new Date(existingPos.task.StartDate).getTime();
          const existingEnd = new Date(existingPos.task.DueDate).getTime();
          // Tasks overlap if one doesn't completely end before the other starts
          return !(posStart >= existingEnd || posEnd <= existingStart);
        });

        // If NO overlap with any task in this column, place it here
        if (!hasOverlap) {
          column.push(pos);
          placed = true;
          break;
        }
      }
      // If overlaps with all existing columns, create new one
      if (!placed) {
        columns.push([pos]);
      }
    });

    // Adjust positions within each column to prevent visual overlap
    // Tasks in the same column should stack vertically without overlapping
    columns.forEach((column) => {
      // Sort tasks in column by start time
      column.sort((a, b) => {
        const aStart = new Date(a.task.StartDate).getTime();
        const bStart = new Date(b.task.StartDate).getTime();
        return aStart - bStart;
      });

      // Adjust positions to prevent visual overlap
      for (let i = 1; i < column.length; i++) {
        const currentTask = column[i];
        const previousTask = column[i - 1];

        const previousBottom = previousTask.top + previousTask.height;

        // If current task's top is above previous task's bottom, push it down
        if (currentTask.top < previousBottom) {
          // Calculate the task's actual end time position using local time
          const taskEndDate = new Date(currentTask.task.DueDate);
          const taskEndMs = taskEndDate.getTime();

          // Clamp to selected day (local time)
          const dayStartMs = dayAnchorLocal.getTime();
          const dayEndMs = dayStartMs + 24 * 3600 * 1000;
          const clampedEnd = Math.min(
            dayEndMs,
            Math.max(dayStartMs, taskEndMs)
          );

          // Use local hours and minutes
          const clampedEndDate = new Date(clampedEnd);
          const visibleEndHoursInt = clampedEndDate.getHours();
          const endMinutes =
            clampedEndDate.getMinutes() +
            clampedEndDate.getSeconds() / 60 +
            clampedEndDate.getMilliseconds() / 60000;

          // Calculate end time position
          let endTimePosition = baseOffset;
          for (let h = 0; h < visibleEndHoursInt; h++) {
            endTimePosition += heights.get(h) || hourHeight;
          }
          const endHourSlotHeight =
            heights.get(visibleEndHoursInt) || hourHeight;
          endTimePosition += (endMinutes / 60) * endHourSlotHeight;

          // Move task down to just below previous task
          const newTop = previousBottom;

          // Recalculate height from new top to end time position
          const newHeight = endTimePosition - newTop;
          const minHeightForReadableTitle = 36;
          const finalHeight = Math.max(newHeight, minHeightForReadableTitle);

          currentTask.top = newTop;
          currentTask.height = finalHeight;
        }
      }
    });

    // Adjust left and width for stacked tasks
    const totalColumns = columns.length;
    positions.forEach((pos) => {
      const columnIndex = columns.findIndex((col) => col.includes(pos));
      if (columnIndex !== -1) {
        pos.width = totalColumns > 1 ? 100 / totalColumns : 100;
        pos.left = (columnIndex * 100) / totalColumns;
      }
    });

    // Recalculate slot heights based on actual final task positions
    // This is only needed when tasks are pushed down to prevent overlap within the same hour
    // For multi-hour tasks without overlaps, the initial calculation should be sufficient
    // Only expand hours if tasks were actually pushed down due to stacking
    const initialHeights = new Map(heights);
    let needsRecalculation = false;

    // Check if any tasks were pushed down (indicating overlap adjustment occurred)
    positions.forEach((pos) => {
      // Calculate natural top position using local time
      const taskStart = new Date(pos.task.StartDate);
      const taskEnd = new Date(pos.task.DueDate);

      // Clamp to selected day (local time)
      const dayStartMs = dayAnchorLocal.getTime();
      const dayEndMs = dayStartMs + 24 * 3600 * 1000;
      const taskStartMs = taskStart.getTime();
      const taskEndMs = taskEnd.getTime();
      const clampedStart = Math.max(dayStartMs, taskStartMs);
      const clampedEnd = Math.min(dayEndMs, taskEndMs);

      if (clampedEnd <= clampedStart) return; // Task doesn't overlap selected day

      // Use local hours and minutes
      const clampedStartDate = new Date(clampedStart);
      const visibleStartHoursInt = clampedStartDate.getHours();
      const startMinutes =
        clampedStartDate.getMinutes() +
        clampedStartDate.getSeconds() / 60 +
        clampedStartDate.getMilliseconds() / 60000;

      let naturalTop = baseOffset;
      for (let h = 0; h < visibleStartHoursInt; h++) {
        naturalTop += initialHeights.get(h) || hourHeight;
      }
      naturalTop +=
        (startMinutes / 60) *
        (initialHeights.get(visibleStartHoursInt) || hourHeight);

      if (pos.top > naturalTop + 1) {
        needsRecalculation = true;
      }
    });

    // Only recalculate if tasks were pushed down
    if (needsRecalculation) {
      hours.forEach((hour) => {
        // Calculate hour slot top position using initial heights
        let hourTop = baseOffset;
        for (let h = 0; h < hour; h++) {
          hourTop += initialHeights.get(h) || hourHeight;
        }
        const hourBottom = hourTop + (initialHeights.get(hour) || hourHeight);

        // Find all tasks that overlap with this hour (by time)
        // Use local hour window for consistent calculation
        const [hourStartMs, hourEndMs] = hourWindowLocal(dayAnchorLocal, hour);

        const tasksInThisHour = positions.filter((pos) => {
          const taskStart = new Date(pos.task.StartDate).getTime();
          const taskEnd = new Date(pos.task.DueDate).getTime();

          // Task overlaps hour if it doesn't completely end before hour starts or start after hour ends
          return taskEnd > hourStartMs && taskStart < hourEndMs;
        });

        if (tasksInThisHour.length === 0) {
          // No tasks, keep base height
          heights.set(hour, hourHeight);
        } else {
          // Find the latest task bottom position
          // For tasks pushed down, we need to expand the hour to fit them
          let latestBottom = hourTop;

          tasksInThisHour.forEach((pos) => {
            const taskBottom = pos.top + pos.height;

            // Calculate where task should naturally start using local time
            const taskStart = new Date(pos.task.StartDate);
            const taskEnd = new Date(pos.task.DueDate);

            // Clamp to selected day (local time)
            const dayStartMs = dayAnchorLocal.getTime();
            const dayEndMs = dayStartMs + 24 * 3600 * 1000;
            const taskStartMs = taskStart.getTime();
            const taskEndMs = taskEnd.getTime();
            const clampedStart = Math.max(dayStartMs, taskStartMs);
            const clampedEnd = Math.min(dayEndMs, taskEndMs);

            if (clampedEnd <= clampedStart) return; // Task doesn't overlap selected day

            // Use local hours and minutes
            const clampedStartDate = new Date(clampedStart);
            const visibleStartHoursInt = clampedStartDate.getHours();
            const startMinutes =
              clampedStartDate.getMinutes() +
              clampedStartDate.getSeconds() / 60 +
              clampedStartDate.getMilliseconds() / 60000;

            let naturalTop = baseOffset;
            for (let h = 0; h < visibleStartHoursInt; h++) {
              naturalTop += initialHeights.get(h) || hourHeight;
            }
            naturalTop +=
              (startMinutes / 60) *
              (initialHeights.get(visibleStartHoursInt) || hourHeight);

            // If task was pushed down (stacked below another task), expand hour to fit it
            if (pos.top > naturalTop + 1) {
              // Task was pushed down, so we need to expand the hour
              // But only consider the portion that's within or affects this hour
              if (pos.top < hourBottom) {
                // Task starts in this hour, expand to fit its bottom
                latestBottom = Math.max(latestBottom, taskBottom);
              } else if (taskBottom > hourBottom && pos.top < hourBottom) {
                // Task extends from previous hour into this one, expand to fit
                latestBottom = Math.max(latestBottom, taskBottom);
              }
            } else {
              // Task was not pushed down, use initial calculation
              // Only consider portion within this hour
              const taskBottomInHour = Math.min(taskBottom, hourBottom);
              if (taskBottomInHour > latestBottom) {
                latestBottom = taskBottomInHour;
              }
            }
          });

          // Calculate required height: from hour top to latest task bottom
          const requiredHeight = Math.max(
            hourHeight, // Base height
            latestBottom - hourTop // Height to fit all tasks
          );

          heights.set(hour, requiredHeight);
        }
      });
    }

    return { slotHeights: heights, taskPositions: positions };
  }, [tasks, hours, hourHeight, baseOffset, selectedDate]);

  // Compute current time indicator position (only when viewing the current day)
  const currentTimeIndicator = useMemo(() => {
    if (!slotHeights) {
      return { visible: false };
    }

    const now = currentTime;
    const nowMs = now.getTime();

    const dayAnchorLocal = makeLocalDayAnchor(selectedDate);
    const dayStartMs = dayAnchorLocal.getTime();
    const dayEndLocal = new Date(dayAnchorLocal);
    dayEndLocal.setHours(23, 59, 59, 999);
    const dayEndMs = dayEndLocal.getTime();

    // Only show indicator when viewing the selected day that matches "now"
    if (nowMs < dayStartMs || nowMs > dayEndMs) {
      return { visible: false };
    }

    const currentHour = now.getHours();
    const currentMinutes =
      now.getMinutes() + now.getSeconds() / 60 + now.getMilliseconds() / 60000;

    if (currentHour < startHour || currentHour > endHour) {
      return { visible: false };
    }

    let top = baseOffset;
    for (let hour = startHour; hour < currentHour; hour++) {
      top += slotHeights.get(hour) || hourHeight;
    }

    const currentHourHeight = slotHeights.get(currentHour) || hourHeight;
    top += (currentMinutes / 60) * currentHourHeight;

    // Clamp within timeline bounds
    let totalHeight = 0;
    for (let hour = startHour; hour <= endHour; hour++) {
      totalHeight += slotHeights.get(hour) || hourHeight;
    }

    const minTop = baseOffset;
    const maxTop = baseOffset + totalHeight;
    const clampedTop = Math.min(Math.max(top, minTop), maxTop);

    return {
      visible: true,
      top: clampedTop,
      label: now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    };
  }, [
    currentTime,
    slotHeights,
    hourHeight,
    baseOffset,
    selectedDate,
    startHour,
    endHour,
  ]);

  // Clear selected task when day changes (prevents showing task from previous day)
  // Also validate that selectedTask still exists in current tasks
  useEffect(() => {
    setSelectedTask(null);
  }, [selectedDate]);

  // Validate selectedTask exists in current tasks (handles edge cases during rapid day switching)
  useEffect(() => {
    if (selectedTask) {
      const taskExists = tasks.some(
        (task: any) =>
          task._id === selectedTask._id ||
          (task.id && task.id === selectedTask.id)
      );
      if (!taskExists) {
        setSelectedTask(null);
      }
    }
  }, [tasks, selectedTask]);

  // Auto-scroll to first task when day changes
  useEffect(() => {
    // Wait for task positions to be calculated and DOM to update
    const scrollTimeout = setTimeout(() => {
      if (timelineColumnRef.current && taskPositions.length > 0) {
        // Find the first task (lowest top position)
        const firstTask = taskPositions.reduce((earliest, current) => {
          return current.top < earliest.top ? current : earliest;
        }, taskPositions[0]);

        // Scroll to the first task position
        // Task positions are relative to timeline-inner, which is inside the scroll container
        // Add some padding from top for better visibility (20px)
        const scrollPosition = Math.max(0, firstTask.top - 20);

        timelineColumnRef.current.scrollTo({
          top: scrollPosition,
          behavior: "smooth",
        });
      } else if (timelineColumnRef.current && taskPositions.length === 0) {
        // If no tasks, scroll to top
        timelineColumnRef.current.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    }, 300); // Delay to ensure DOM has updated with new task positions and slot heights

    return () => clearTimeout(scrollTimeout);
  }, [selectedDate, taskPositions]);

  // Generate time slots with dynamic heights
  const timeSlots: Array<{
    hour: number;
    minute: number;
    isHalfHour: boolean;
    height: number;
  }> = [];
  hours.forEach((hour) => {
    timeSlots.push({
      hour,
      minute: 0,
      isHalfHour: false,
      height: slotHeights.get(hour) || hourHeight,
    });
  });

  // Focus management for sidebar
  useEffect(() => {
    if (selectedTask) {
      // Store previously focused element
      previousFocusedElementRef.current = document.activeElement as HTMLElement;

      // Focus close button after a brief delay
      setTimeout(() => {
        sidebarCloseRef.current?.focus();
      }, 100);

      // Handle Escape key to close sidebar
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setSelectedTask(null);
        }
      };

      // Focus trap for sidebar
      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== "Tab" || !sidebarRef.current) return;

        const focusableElements = sidebarRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[
          focusableElements.length - 1
        ] as HTMLElement;

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };

      document.addEventListener("keydown", handleEsc);
      document.addEventListener("keydown", handleTab);

      return () => {
        document.removeEventListener("keydown", handleEsc);
        document.removeEventListener("keydown", handleTab);
        // Restore focus to previously focused element
        previousFocusedElementRef.current?.focus();
      };
    }
  }, [selectedTask]);

  return (
    <div
      className="timeline-grid"
      role="region"
      aria-label="Daily timeline view"
    >
      <div className="timeline-grid__container" ref={timelineColumnRef}>
        {/* Hour markers column */}
        <div className="timeline-hours" role="list" aria-label="Hour markers">
          {hours.map((hour) => {
            // Last hour marker only spans the hour slot (no half-hour after it)
            const isLastHour = hour === endHour;
            const slotHeight = slotHeights.get(hour) || hourHeight;
            return (
              <div
                key={hour}
                className={`timeline-hour-marker ${
                  isLastHour ? "timeline-hour-marker--last" : ""
                }`}
                style={{ height: `${slotHeight}px` }}
                role="listitem"
              >
                <span
                  className="timeline-hour-label"
                  aria-label={`Hour ${formatHour(hour)}`}
                >
                  {formatHour(hour)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Timeline scroll container - contains both slots and tasks overlay */}
        <div className="timeline-scroll">
          {/* Inner container - offset parent for both slots and tasks */}
          <div className="timeline-inner">
            {/* Timeline slots */}
            <div className="timeline-column">
              {timeSlots.map((slot, index) => (
                <div
                  key={`${slot.hour}-${slot.minute}`}
                  ref={index === 0 ? firstHourSlotRef : undefined}
                  className="timeline-time-slot timeline-time-slot--hour"
                  style={{ height: `${slot.height}px` }}
                >
                  <div className="timeline-hour-line"></div>
                </div>
              ))}
            </div>

            {/* Task blocks overlay - absolute positioned relative to timeline-inner */}
            <div
              className="timeline-tasks"
              ref={timelineTasksRef}
              role="list"
              aria-label={`Timeline tasks for selected day, ${
                taskPositions.length
              } task${taskPositions.length !== 1 ? "s" : ""}`}
            >
              {currentTimeIndicator.visible && (
                <div
                  className="timeline-current-time"
                  style={{ top: `${currentTimeIndicator.top}px` }}
                  role="status"
                  aria-label={`Current time: ${currentTimeIndicator.label}`}
                >
                  <div
                    className="timeline-current-time__line"
                    aria-hidden="true"
                  ></div>
                  <div
                    className="timeline-current-time__dot"
                    aria-hidden="true"
                  ></div>
                  <div className="timeline-current-time__label">
                    <span
                      className="timeline-current-time__label-dot"
                      aria-hidden="true"
                    ></span>
                    Now • {currentTimeIndicator.label}
                  </div>
                </div>
              )}
              {taskPositions.map((pos, index) => (
                <TaskBlock
                  key={pos.task._id || index}
                  task={pos.task}
                  position={pos}
                  currentTime={currentTime}
                  onSelect={setSelectedTask}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Detail Panel */}
      {selectedTask && (
        <>
          <div
            className="backdrop"
            onClick={() => setSelectedTask(null)}
            aria-hidden="true"
          />
          <div
            ref={sidebarRef}
            className="timeline-sidebar"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sidebar-task-title"
          >
            <button
              ref={sidebarCloseRef}
              className="timeline-sidebar__close"
              onClick={() => setSelectedTask(null)}
              aria-label="Close task details"
              title="Close (Escape)"
            >
              ×
            </button>
            <div className="timeline-sidebar__content">
              <h3 id="sidebar-task-title" className="timeline-sidebar__title">
                {selectedTask.title || "Untitled Task"}
              </h3>

              {/* Status section */}
              <div className="timeline-sidebar__section">
                <div className="timeline-sidebar__label">Status</div>
                <div className="timeline-sidebar__value timeline-sidebar__status">
                  <span
                    className={`timeline-sidebar__status-badge timeline-sidebar__status-badge--${getTaskStatus(
                      selectedTask,
                      currentTime
                    )}`}
                  >
                    {getStatusLabel(getTaskStatus(selectedTask, currentTime))}
                  </span>
                </div>
              </div>

              {selectedTask.description &&
                (() => {
                  const formatted = formatDescription(selectedTask.description);
                  const lines = formatted.split("\n");
                  return (
                    <div className="timeline-sidebar__section">
                      <div className="timeline-sidebar__label">Description</div>
                      <div className="timeline-sidebar__value">
                        {lines.map((line, index) => (
                          <React.Fragment key={index}>
                            {line}
                            {index < lines.length - 1 && <br />}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  );
                })()}

              {selectedTask.StartDate && (
                <div className="timeline-sidebar__section">
                  <div className="timeline-sidebar__label">Start Time</div>
                  <div className="timeline-sidebar__value">
                    {new Date(selectedTask.StartDate).toLocaleString()}
                  </div>
                </div>
              )}

              {selectedTask.DueDate && (
                <div className="timeline-sidebar__section">
                  <div className="timeline-sidebar__label">Due Time</div>
                  <div className="timeline-sidebar__value">
                    {new Date(selectedTask.DueDate).toLocaleString()}
                  </div>
                </div>
              )}

              {selectedTask.StartDate && selectedTask.DueDate && (
                <div className="timeline-sidebar__section">
                  <div className="timeline-sidebar__label">Duration</div>
                  <div className="timeline-sidebar__value">
                    {formatDuration(getTaskDuration(selectedTask))}
                  </div>
                </div>
              )}

              {/* Completion message - show when task is completed */}
              {selectedTask.completed && selectedTask.CompletedAt && (
                <div className="timeline-sidebar__section">
                  <CompletionMessage
                    completedAt={selectedTask.CompletedAt}
                    dueDate={selectedTask.DueDate}
                    startDate={selectedTask.StartDate}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TimelineGrid;
