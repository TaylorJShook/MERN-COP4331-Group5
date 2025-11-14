import React, { useState, useEffect, useMemo, useRef } from "react";
import { buildPath } from "./Path";
import { retrieveToken, storeToken } from "../tokenStorage";
import DateNavigator from "./DateNavigator";
import TimelineGrid from "./TimelineGrid";
import CompletionMessage from "./CompletionMessage";

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

function TodoUI() {
  const [message, setMessage] = useState("");
  const [allTodos, setAllTodos] = useState<any[]>([]); // All todos from API
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = React.useState<any>({
    title: "",
    description: "",
    startDate: "",
    dueDate: "",
  });
  // Store original task data for validation (to ensure tasks only move forward in time)
  const [originalTaskData, setOriginalTaskData] = useState<{
    startDate: Date | null;
    dueDate: Date | null;
  } | null>(null);

  // Form validation errors for edit form
  const [editFormErrors, setEditFormErrors] = useState<{
    title?: string;
    startDate?: string;
    dueDate?: string;
    general?: string;
  }>({});
  const [showAddModal, setShowAddModal] = useState(false);

  // Form validation errors
  const [formErrors, setFormErrors] = useState<{
    title?: string;
    startDate?: string;
    dueDate?: string;
    general?: string;
  }>({});

  // Date navigation state - defaults to today
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  // State for current time (for real-time status checking)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Track previous task statuses to detect changes (optimization: only re-render when status changes)
  const previousStatusesRef = useRef<Map<string, TaskStatus>>(new Map());

  // Track completion timestamps for tasks (when they were marked as completed)
  const [completionTimestamps, setCompletionTimestamps] = useState<
    Map<string, Date>
  >(new Map());

  // Loading state for fetching todos
  const [isLoading, setIsLoading] = useState(false);

  // Refs for focus management
  const addModalRef = useRef<HTMLDivElement>(null);
  const addModalFirstInputRef = useRef<HTMLInputElement>(null);
  const addModalCloseRef = useRef<HTMLButtonElement>(null);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);

  const _ud = localStorage.getItem("user_data");
  const ud = _ud ? JSON.parse(_ud) : {};
  const userId = ud.id;

  // Focus management for add modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showAddModal) {
          setShowAddModal(false);
        }
        if (editingId) {
          cancelEdit();
        }
      }
    };

    if (showAddModal) {
      // Store previously focused element
      previousFocusedElementRef.current = document.activeElement as HTMLElement;

      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";

      // Focus trap for modal
      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== "Tab" || !addModalRef.current) return;

        const focusableElements = addModalRef.current.querySelectorAll(
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

      document.addEventListener("keydown", handleTab);

      // Set default times when modal opens (only if fields are empty)
      if (!startDate || !dueDate) {
        const now = new Date();

        // Default start time: current time (not rounded) - use Date object directly
        const defaultStart = formatDateForInput(now);

        // Default due time: 1 hour from now - use Date object directly
        const defaultDue = new Date(now);
        defaultDue.setHours(defaultDue.getHours() + 1);
        const defaultDueFormatted = formatDateForInput(defaultDue);

        if (!startDate) setStartDate(defaultStart);
        if (!dueDate) setDueDate(defaultDueFormatted);
      }

      // Clear form errors when modal opens
      setFormErrors({});

      // Focus first input after a brief delay to ensure modal is rendered
      setTimeout(() => {
        addModalFirstInputRef.current?.focus();
      }, 100);

      return () => {
        document.removeEventListener("keydown", handleEsc);
        document.removeEventListener("keydown", handleTab);
        document.body.style.overflow = "";
        // Restore focus to previously focused element
        previousFocusedElementRef.current?.focus();
      };
    } else {
      document.body.style.overflow = "";
      // Reset form when modal closes
      setTitle("");
      setDescription("");
      setStartDate("");
      setDueDate("");
      setFormErrors({});
    }
  }, [showAddModal]); // eslint-disable-line react-hooks/exhaustive-deps

  async function getTodos(): Promise<void> {
    if (!userId) return;

    setIsLoading(true);
    const obj = { userId, jwtToken: retrieveToken() };
    try {
      const response = await fetch(buildPath("api/gettodos"), {
        method: "POST",
        body: JSON.stringify(obj),
        headers: { "Content-Type": "application/json" },
      });
      const res = await response.json();

      if (res.error && res.error.length > 0) {
        setMessage("Error: " + res.error);
        setIsLoading(false);
        return;
      }

      // Normalize and sort
      const fixedTodos = (res.results || [])
        .map((t: any) => ({
          _id: t.id || t._id || t._id?.$oid,
          title: t.title || t.Title || "",
          description: t.description || t.Description || "",
          completed: t.completed ?? t.Completed ?? false,
          createdAt: t.createdAt || t.CreatedAt || new Date(),
          StartDate: t.StartDate || t.startDate || null,
          DueDate: t.DueDate || t.dueDate || null,
          CompletedAt: t.CompletedAt || t.completedAt || t.completed_at || null,
        }))
        .sort((a: any, b: any) => {
          // Fallback to createdAt if StartDate missing
          const aTime = a.StartDate
            ? new Date(a.StartDate).getTime()
            : new Date(a.createdAt).getTime();
          const bTime = b.StartDate
            ? new Date(b.StartDate).getTime()
            : new Date(b.createdAt).getTime();
          return aTime - bTime;
        });

      setAllTodos(fixedTodos);

      // Sync completion timestamps with backend data (preserve local timestamps if backend doesn't have them)
      setCompletionTimestamps((prev) => {
        const newMap = new Map(prev);
        fixedTodos.forEach((todo: any) => {
          if (todo.completed && !todo.CompletedAt && prev.has(todo._id)) {
            // Keep existing timestamp if backend doesn't have one
            // Don't overwrite if we already have a timestamp
          } else if (todo.completed && todo.CompletedAt) {
            // Use backend timestamp if available
            newMap.set(todo._id, new Date(todo.CompletedAt));
          } else if (!todo.completed) {
            // Remove timestamp if task is no longer completed
            newMap.delete(todo._id);
          }
        });
        return newMap;
      });
      storeToken(res.jwtToken);
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      setMessage(error.toString());
    }
  }

  // Filter todos by selected date - use overlap logic so cross-day tasks appear on all overlapping days
  const todos = useMemo(() => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    return allTodos.filter((todo) => {
      // If task has both StartDate and DueDate, use overlap logic
      if (todo.StartDate && todo.DueDate) {
        const taskStart = new Date(todo.StartDate);
        const taskEnd = new Date(todo.DueDate);
        // Task overlaps day if: taskStart < endOfDay && taskEnd > startOfDay
        return (
          taskStart.getTime() < endOfDay.getTime() &&
          taskEnd.getTime() > startOfDay.getTime()
        );
      }
      // If task has only StartDate, check if it falls on the selected day
      if (todo.StartDate) {
        const startDate = new Date(todo.StartDate);
        return startDate >= startOfDay && startDate <= endOfDay;
      }
      // If task has only DueDate, check if it falls on the selected day
      if (todo.DueDate) {
        const dueDate = new Date(todo.DueDate);
        return dueDate >= startOfDay && dueDate <= endOfDay;
      }
      // If task has no dates, check createdAt (for backwards compatibility)
      if (todo.createdAt) {
        const createdDate = new Date(todo.createdAt);
        return createdDate >= startOfDay && createdDate <= endOfDay;
      }
      return false;
    });
  }, [allTodos, selectedDate]);

  // Date navigation functions
  const goToPreviousDay = () => {
    const prevDay = new Date(selectedDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setSelectedDate(prevDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setSelectedDate(nextDay);
  };

  const goToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setSelectedDate(today);
  };

  // Validate form before submission
  const validateForm = (): boolean => {
    const errors: {
      title?: string;
      startDate?: string;
      dueDate?: string;
      general?: string;
    } = {};

    // Validate title
    if (!title || title.trim().length === 0) {
      errors.title = "Title is required";
    }

    // Validate dates if provided
    if (startDate && dueDate) {
      const start = new Date(startDate);
      const due = new Date(dueDate);

      if (isNaN(start.getTime())) {
        errors.startDate = "Invalid start date";
      }
      if (isNaN(due.getTime())) {
        errors.dueDate = "Invalid due date";
      }

      // Validate start time < end time (strictly less than)
      if (!isNaN(start.getTime()) && !isNaN(due.getTime())) {
        if (start.getTime() >= due.getTime()) {
          errors.dueDate = "Due date must be after start date";
          errors.startDate = "Start date must be before due date";
        }
      }
    } else if (startDate && !dueDate) {
      errors.dueDate = "Due date is required when start date is provided";
    } else if (!startDate && dueDate) {
      errors.startDate = "Start date is required when due date is provided";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  async function addTodo(e: any) {
    e.preventDefault();

    // Validate form before submission - prevent submission if validation fails
    const isValid = validateForm();
    if (!isValid) {
      // Scroll to first error if there are any
      const firstErrorField = document.querySelector(".input--error");
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return; // Stop here - don't submit if validation fails
    }

    const obj = {
      userId,
      title: title.trim(),
      description: description.trim(),
      startDate: startDate ? new Date(startDate).toISOString() : null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      jwtToken: retrieveToken(),
    };

    try {
      const response = await fetch(buildPath("api/addtodo"), {
        method: "POST",
        body: JSON.stringify(obj),
        headers: { "Content-Type": "application/json" },
      });
      const txt = await response.text();
      const res = JSON.parse(txt);
      if (res.error && res.error.length > 0) {
        setFormErrors({ general: res.error });
        setMessage("Error: " + res.error);
      } else {
        setMessage("Todo added successfully!");
        storeToken(res.jwtToken);
        setTitle("");
        setDescription("");
        setStartDate("");
        setDueDate("");
        setFormErrors({});
        setShowAddModal(false);
        await getTodos();
      }
    } catch (error: any) {
      setFormErrors({ general: error.toString() });
      setMessage(error.toString());
    }
  }

  async function toggleTodoCompletion(id: string) {
    // Find the task to check if it's being completed or uncompleted
    const task = allTodos.find((t: any) => t._id === id);
    const isCompleting = !task?.completed;

    // Optimistically update UI immediately
    setAllTodos((prevTodos: any[]) =>
      prevTodos.map((todo: any) =>
        todo._id === id
          ? {
              ...todo,
              completed: !todo.completed,
              Completed: !todo.completed,
              CompletedAt: !todo.completed ? new Date() : null,
            }
          : todo
      )
    );

    // Update completion timestamps
    if (isCompleting) {
      setCompletionTimestamps((prev) => {
        const newMap = new Map(prev);
        newMap.set(id, new Date());
        return newMap;
      });
    } else {
      setCompletionTimestamps((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    }

    const obj = { id, jwtToken: retrieveToken() };
    try {
      const response = await fetch(buildPath("api/check"), {
        method: "POST",
        body: JSON.stringify(obj),
        headers: { "Content-Type": "application/json" },
      });
      const res = await response.json();
      if (res.error && res.error.length > 0) {
        setMessage("Error: " + res.error);
        // Revert optimistic update on error
        await getTodos();
      } else {
        storeToken(res.jwtToken);
        // No need to refetch - already updated optimistically
      }
    } catch (error: any) {
      setMessage(error.toString());
      // Revert optimistic update on error
      await getTodos();
    }
  }

  async function deleteTodo(id: string) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this task?"
    );
    if (!confirmDelete) return;
    const obj = { id, jwtToken: retrieveToken() };
    try {
      const response = await fetch(buildPath("api/deletetodo"), {
        method: "POST",
        body: JSON.stringify(obj),
        headers: { "Content-Type": "application/json" },
      });
      const res = await response.json();
      if (res.error && res.error.length > 0) {
        setMessage("Error: " + res.error);
      } else {
        setMessage("Todo deleted successfully!");
        storeToken(res.jwtToken);
        await getTodos();
      }
    } catch (error: any) {
      setMessage(error.toString());
    }
  }

  // Helper function to format date for datetime-local input (local time, not UTC)
  const formatDateForInput = (date: Date | string): string => {
    if (!date) return "";
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return "";
    // datetime-local format: YYYY-MM-DDTHH:mm
    // Use local time, not UTC
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    const hours = String(dateObj.getHours()).padStart(2, "0");
    const minutes = String(dateObj.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  function startEdit(todo: any) {
    setEditingId(todo._id);
    const startDateStr = todo.StartDate
      ? formatDateForInput(todo.StartDate)
      : "";
    const dueDateStr = todo.DueDate ? formatDateForInput(todo.DueDate) : "";

    setEditData({
      title: todo.title || todo.Title || "",
      description: todo.description || todo.Description || "",
      startDate: startDateStr,
      dueDate: dueDateStr,
    });

    // Store original dates for validation (ensure tasks only move forward in time)
    setOriginalTaskData({
      startDate: todo.StartDate ? new Date(todo.StartDate) : null,
      dueDate: todo.DueDate ? new Date(todo.DueDate) : null,
    });

    // Clear edit form errors when starting edit
    setEditFormErrors({});
  }

  // Move task to next day (add 24 hours to both start and due dates)
  function moveToNextDay() {
    if (!editData.startDate || !editData.dueDate) {
      setEditFormErrors({
        general: "Task must have both start and due dates to move to next day",
      });
      return;
    }

    const startDate = new Date(editData.startDate);
    const dueDate = new Date(editData.dueDate);

    // Add 24 hours (1 day) to both dates
    startDate.setHours(startDate.getHours() + 24);
    dueDate.setHours(dueDate.getHours() + 24);

    setEditData({
      ...editData,
      startDate: formatDateForInput(startDate),
      dueDate: formatDateForInput(dueDate),
    });

    // Clear any date-related errors
    setEditFormErrors({
      ...editFormErrors,
      startDate: undefined,
      dueDate: undefined,
      general: undefined,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData({ title: "", description: "", startDate: "", dueDate: "" });
    setOriginalTaskData(null);
    setEditFormErrors({});
  }

  // Validate edit form before submission
  const validateEditForm = (): boolean => {
    const errors: {
      title?: string;
      startDate?: string;
      dueDate?: string;
      general?: string;
    } = {};

    // Validate title
    if (!editData.title || editData.title.trim().length === 0) {
      errors.title = "Title is required";
    }

    // Validate dates if provided
    if (editData.startDate && editData.dueDate) {
      const start = new Date(editData.startDate);
      const due = new Date(editData.dueDate);

      if (isNaN(start.getTime())) {
        errors.startDate = "Invalid start date";
      }
      if (isNaN(due.getTime())) {
        errors.dueDate = "Invalid due date";
      }

      // Validate start time < end time
      if (!isNaN(start.getTime()) && !isNaN(due.getTime())) {
        if (start.getTime() >= due.getTime()) {
          errors.dueDate = "Due date must be after start date";
          errors.startDate = "Start date must be before due date";
        }
      }

      // Validate: tasks can only move forward in time (not backward)
      if (originalTaskData) {
        if (!isNaN(start.getTime()) && originalTaskData.startDate) {
          if (start.getTime() < originalTaskData.startDate.getTime()) {
            errors.startDate =
              "Cannot move task backward in time. Start date must be after original start date.";
          }
        }
        if (!isNaN(due.getTime()) && originalTaskData.dueDate) {
          if (due.getTime() < originalTaskData.dueDate.getTime()) {
            errors.dueDate =
              "Cannot move task backward in time. Due date must be after original due date.";
          }
        }
      }
    } else if (editData.startDate && !editData.dueDate) {
      errors.dueDate = "Due date is required when start date is provided";
    } else if (!editData.startDate && editData.dueDate) {
      errors.startDate = "Start date is required when due date is provided";
    }

    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  async function saveEdit(id: string) {
    // Validate form before submission - prevent submission if validation fails
    const isValid = validateEditForm();
    if (!isValid) {
      // Scroll to first error if there are any
      const firstErrorField = document.querySelector(
        ".todo-edit .input--error"
      );
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return; // Stop here - don't submit if validation fails
    }

    const obj = {
      id,
      title: editData.title.trim(),
      description: editData.description.trim(),
      startDate: editData.startDate
        ? new Date(editData.startDate).toISOString()
        : null,
      dueDate: editData.dueDate
        ? new Date(editData.dueDate).toISOString()
        : null,
      jwtToken: retrieveToken(),
    };
    try {
      const response = await fetch(buildPath("api/edittodo"), {
        method: "POST",
        body: JSON.stringify(obj),
        headers: { "Content-Type": "application/json" },
      });
      const res = await response.json();
      if (res.error && res.error.length > 0) {
        setEditFormErrors({ general: res.error });
        setMessage("Error: " + res.error);
      } else {
        setMessage("Todo updated successfully!");
        storeToken(res.jwtToken);
        setEditingId(null);
        setOriginalTaskData(null);
        setEditFormErrors({});
        await getTodos();
      }
    } catch (error: any) {
      setEditFormErrors({ general: error.toString() });
      setMessage(error.toString());
    }
  }

  // Optimized time update: only update when status actually changes
  useEffect(() => {
    // Update immediately on mount
    const initialTime = new Date();
    setCurrentTime(initialTime);

    // Initialize previous statuses
    const initialStatuses = new Map<string, TaskStatus>();
    todos.forEach((todo) => {
      const todoId = todo._id || todo.id || String(todo);
      initialStatuses.set(todoId, getTaskStatus(todo, initialTime));
    });
    previousStatusesRef.current = initialStatuses;

    // Update every minute, but only trigger re-render if status changed
    const interval = setInterval(() => {
      const newTime = new Date();

      // Calculate new statuses with new time
      const newStatuses = new Map<string, TaskStatus>();
      todos.forEach((todo) => {
        const todoId = todo._id || todo.id || String(todo);
        newStatuses.set(todoId, getTaskStatus(todo, newTime));
      });

      // Compare with previous statuses
      let statusChanged = false;
      const previous = previousStatusesRef.current;

      // Check if task count changed
      if (previous.size !== newStatuses.size) {
        statusChanged = true;
      } else {
        // Check if any status changed
        for (const [todoId, newStatus] of newStatuses.entries()) {
          const previousStatus = previous.get(todoId);
          if (previousStatus !== newStatus) {
            statusChanged = true;
            break;
          }
        }
      }

      // Only update currentTime (trigger re-render) if a status actually changed
      if (statusChanged) {
        setCurrentTime(newTime);
        previousStatusesRef.current = newStatuses;
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [todos]);

  useEffect(() => {
    getTodos();
  }, []);

  return (
    <div className="todo-ui">
      <DateNavigator
        selectedDate={selectedDate}
        onPreviousDay={goToPreviousDay}
        onNextDay={goToNextDay}
        onToday={goToToday}
      />

      <div className="todo-ui__header">
        <h2 className="todo-ui__title">Your Tasks</h2>
        <button
          type="button"
          className="btn btn--fab"
          onClick={() => setShowAddModal(true)}
          aria-label="Add new task"
        >
          +
        </button>
      </div>

      {/* Loading Spinner */}
      {isLoading && (
        <div className="loading-spinner-container">
          <div className="loading-spinner">
            <div className="loading-spinner__circle"></div>
          </div>
          <p className="loading-spinner__text">Loading tasks...</p>
        </div>
      )}

      {/* Timeline Grid - Full 24-hour cycle */}
      {!isLoading && (
        <TimelineGrid
          startHour={0}
          endHour={23}
          tasks={todos}
          showHalfHours={true}
          selectedDate={selectedDate}
        />
      )}

      {/* Task List (keeping for now, will be replaced by timeline in Step 4) */}
      {!isLoading && todos.length > 0 ? (
        <ul className="todo-list" role="list" aria-label="Task list">
          {todos.map((todo, index) => (
            <li key={index} className="todo-item" role="listitem">
              {editingId === todo._id ? (
                <div className="todo-edit">
                  <label className="label">
                    Title <span className="required">*</span>
                  </label>
                  <div
                    className={`input ${
                      editFormErrors.title ? "input--error" : ""
                    }`}
                  >
                    <input
                      type="text"
                      value={editData.title}
                      onChange={(e) => {
                        setEditData({ ...editData, title: e.target.value });
                        // Clear error when user starts typing
                        if (editFormErrors.title) {
                          setEditFormErrors({
                            ...editFormErrors,
                            title: undefined,
                          });
                        }
                      }}
                      placeholder="Title"
                    />
                  </div>
                  {editFormErrors.title && (
                    <div className="form-error">{editFormErrors.title}</div>
                  )}

                  <label className="label">Description (Optional)</label>
                  <div className="input">
                    <textarea
                      value={editData.description}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                      placeholder="Description (optional)"
                    />
                  </div>

                  <label className="label">Start Date & Time</label>
                  <div
                    className={`input ${
                      editFormErrors.startDate ? "input--error" : ""
                    }`}
                  >
                    <input
                      type="datetime-local"
                      value={editData.startDate}
                      onChange={(e) => {
                        setEditData({ ...editData, startDate: e.target.value });
                        // Real-time validation: check if dates are valid
                        if (e.target.value && editData.dueDate) {
                          const start = new Date(e.target.value);
                          const due = new Date(editData.dueDate);
                          if (
                            !isNaN(start.getTime()) &&
                            !isNaN(due.getTime())
                          ) {
                            if (start.getTime() >= due.getTime()) {
                              setEditFormErrors({
                                ...editFormErrors,
                                startDate: "Start date must be before due date",
                                dueDate: "Due date must be after start date",
                              });
                            } else {
                              // Check forward-only constraint
                              if (
                                originalTaskData &&
                                originalTaskData.startDate
                              ) {
                                if (
                                  start.getTime() <
                                  originalTaskData.startDate.getTime()
                                ) {
                                  setEditFormErrors({
                                    ...editFormErrors,
                                    startDate:
                                      "Cannot move task backward in time. Start date must be after original start date.",
                                  });
                                } else {
                                  setEditFormErrors({
                                    ...editFormErrors,
                                    startDate: undefined,
                                    dueDate: undefined,
                                  });
                                }
                              } else {
                                setEditFormErrors({
                                  ...editFormErrors,
                                  startDate: undefined,
                                  dueDate: undefined,
                                });
                              }
                            }
                          }
                        } else {
                          setEditFormErrors({
                            ...editFormErrors,
                            startDate: undefined,
                            dueDate: undefined,
                          });
                        }
                      }}
                    />
                  </div>
                  {editFormErrors.startDate && (
                    <div className="form-error">{editFormErrors.startDate}</div>
                  )}

                  <label className="label">Due Date & Time</label>
                  <div
                    className={`input ${
                      editFormErrors.dueDate ? "input--error" : ""
                    }`}
                  >
                    <input
                      type="datetime-local"
                      value={editData.dueDate}
                      onChange={(e) => {
                        setEditData({ ...editData, dueDate: e.target.value });
                        // Real-time validation: check if dates are valid
                        if (editData.startDate && e.target.value) {
                          const start = new Date(editData.startDate);
                          const due = new Date(e.target.value);
                          if (
                            !isNaN(start.getTime()) &&
                            !isNaN(due.getTime())
                          ) {
                            if (start.getTime() >= due.getTime()) {
                              setEditFormErrors({
                                ...editFormErrors,
                                dueDate: "Due date must be after start date",
                                startDate: "Start date must be before due date",
                              });
                            } else {
                              // Check forward-only constraint
                              if (
                                originalTaskData &&
                                originalTaskData.dueDate
                              ) {
                                if (
                                  due.getTime() <
                                  originalTaskData.dueDate.getTime()
                                ) {
                                  setEditFormErrors({
                                    ...editFormErrors,
                                    dueDate:
                                      "Cannot move task backward in time. Due date must be after original due date.",
                                  });
                                } else {
                                  setEditFormErrors({
                                    ...editFormErrors,
                                    dueDate: undefined,
                                    startDate: undefined,
                                  });
                                }
                              } else {
                                setEditFormErrors({
                                  ...editFormErrors,
                                  dueDate: undefined,
                                  startDate: undefined,
                                });
                              }
                            }
                          }
                        } else {
                          setEditFormErrors({
                            ...editFormErrors,
                            dueDate: undefined,
                            startDate: undefined,
                          });
                        }
                      }}
                    />
                  </div>
                  {editFormErrors.dueDate && (
                    <div className="form-error">{editFormErrors.dueDate}</div>
                  )}

                  {editFormErrors.general && (
                    <div className="form-error form-error--general">
                      {editFormErrors.general}
                    </div>
                  )}

                  <div className="todo-edit__actions">
                    <button
                      type="button"
                      className="btn btn--shift-forward"
                      onClick={moveToNextDay}
                      disabled={!editData.startDate || !editData.dueDate}
                      title="Shift task forward by 1 day (adds 24 hours to start and due dates)"
                    >
                      Shift
                      <span className="btn__icon">
                        <svg
                          width="20"
                          height="18"
                          viewBox="0 0 20 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          {/* Double arrow (more emphasis) */}
                          <path
                            d="M5 12L9 8L5 4M10 12L14 8L10 4"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => saveEdit(todo._id)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn btn--cancel"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="todo-card"
                  role="article"
                  aria-label={`Task: ${todo.title}, ${getStatusLabel(
                    getTaskStatus(todo, currentTime)
                  )}`}
                >
                  <label className="todo-checkbox">
                    <input
                      type="checkbox"
                      checked={!!todo.completed}
                      onChange={() => toggleTodoCompletion(todo._id)}
                      aria-label={`Mark ${todo.title} as ${
                        todo.completed ? "incomplete" : "complete"
                      }`}
                    />
                    <strong
                      className={`todo-title ${
                        todo.completed ? "todo-title--completed" : ""
                      }`}
                    >
                      {todo.title}
                    </strong>
                  </label>

                  {/* Status badge */}
                  <div className="todo-status">
                    <span
                      className={`todo-status-badge todo-status-badge--${getTaskStatus(
                        todo,
                        currentTime
                      )}`}
                    >
                      {getStatusLabel(getTaskStatus(todo, currentTime))}
                    </span>
                  </div>

                  {todo.description &&
                    (() => {
                      const formatted = formatDescription(todo.description);
                      const lines = formatted.split("\n");
                      return (
                        <div className="todo-description">
                          {lines.map((line, index) => (
                            <React.Fragment key={index}>
                              {line}
                              {index < lines.length - 1 && <br />}
                            </React.Fragment>
                          ))}
                        </div>
                      );
                    })()}

                  {/* Completion message - show when task is completed */}
                  {todo.completed &&
                    (() => {
                      // Use CompletedAt from backend, or fallback to stored timestamp
                      // Only show message if we have a valid timestamp (don't use current time)
                      const completedAt = todo.CompletedAt
                        ? new Date(todo.CompletedAt)
                        : completionTimestamps.get(todo._id);

                      // Only render completion message if we have a valid timestamp
                      if (!completedAt) return null;

                      return (
                        <CompletionMessage
                          completedAt={completedAt}
                          dueDate={todo.DueDate}
                          startDate={todo.StartDate}
                        />
                      );
                    })()}

                  <div className="todo-dates">
                    {todo.StartDate && (
                      <div className="todo-date">
                        <em>Start:</em>{" "}
                        {new Date(todo.StartDate).toLocaleString()}
                      </div>
                    )}
                    {todo.DueDate && (
                      <div className="todo-date">
                        <em>Due:</em> {new Date(todo.DueDate).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="todo-actions">
                    <button
                      type="button"
                      className="btn btn--small btn--edit"
                      onClick={() => startEdit(todo)}
                      aria-label={`Edit task: ${todo.title}`}
                      title="Edit task"
                    >
                      <span className="btn__icon" aria-hidden="true">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M3 11.5L10.5 4L12 5.5L4.5 13H3V11.5Z"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M9.5 3.5L11 5"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn--small btn--danger"
                      onClick={() => deleteTodo(todo._id)}
                      aria-label={`Delete task: ${todo.title}`}
                      title="Delete task"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="todo-empty">
          <p>No tasks found. Create your first task to get started!</p>
        </div>
      )}

      {/* Add Todo Modal */}
      {showAddModal && (
        <>
          <div
            className="backdrop"
            onClick={() => setShowAddModal(false)}
            aria-hidden="true"
          />
          <main
            ref={addModalRef}
            className="login-modal show"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-task-title"
            aria-describedby="add-task-description"
          >
            <div className="glass">
              <button
                ref={addModalCloseRef}
                className="modal-close"
                onClick={() => setShowAddModal(false)}
                aria-label="Close add task form"
              >
                ×
              </button>
              <h2 className="glass__title" id="add-task-title">
                Add New Task
              </h2>
              <p id="add-task-description" className="sr-only">
                Create a new task with title, description, start time, and due
                time
              </p>
              <form className="form" onSubmit={addTodo} noValidate>
                <label className="label" htmlFor="title">
                  Title <span className="required">*</span>
                </label>
                <div
                  className={`input ${formErrors.title ? "input--error" : ""}`}
                >
                  <input
                    ref={addModalFirstInputRef}
                    id="title"
                    type="text"
                    placeholder="Enter task title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      // Clear error when user starts typing
                      if (formErrors.title) {
                        setFormErrors({ ...formErrors, title: undefined });
                      }
                    }}
                    required
                    aria-required="true"
                    aria-invalid={formErrors.title ? "true" : "false"}
                    aria-describedby={
                      formErrors.title ? "title-error" : undefined
                    }
                  />
                </div>
                {formErrors.title && (
                  <div id="title-error" className="form-error" role="alert">
                    {formErrors.title}
                  </div>
                )}

                <label className="label" htmlFor="description">
                  Description (Optional)
                </label>
                <div className="input">
                  <textarea
                    id="description"
                    placeholder="Enter task description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <label className="label" htmlFor="startDate">
                  Start Date & Time
                </label>
                <div
                  className={`input ${
                    formErrors.startDate ? "input--error" : ""
                  }`}
                >
                  <input
                    id="startDate"
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      // Real-time validation: check if dates are valid
                      if (e.target.value && dueDate) {
                        const start = new Date(e.target.value);
                        const due = new Date(dueDate);
                        if (!isNaN(start.getTime()) && !isNaN(due.getTime())) {
                          if (start.getTime() >= due.getTime()) {
                            setFormErrors({
                              ...formErrors,
                              startDate: "Start date must be before due date",
                              dueDate: "Due date must be after start date",
                            });
                          } else {
                            // Clear errors if dates are now valid
                            setFormErrors({
                              ...formErrors,
                              startDate: undefined,
                              dueDate: undefined,
                            });
                          }
                        }
                      } else {
                        // Clear errors when user changes date
                        setFormErrors({
                          ...formErrors,
                          startDate: undefined,
                          dueDate: undefined,
                        });
                      }
                    }}
                  />
                </div>
                {formErrors.startDate && (
                  <div className="form-error">{formErrors.startDate}</div>
                )}

                <label className="label" htmlFor="dueDate">
                  Due Date & Time
                </label>
                <div
                  className={`input ${
                    formErrors.dueDate ? "input--error" : ""
                  }`}
                >
                  <input
                    id="dueDate"
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value);
                      // Real-time validation: check if dates are valid
                      if (startDate && e.target.value) {
                        const start = new Date(startDate);
                        const due = new Date(e.target.value);
                        if (!isNaN(start.getTime()) && !isNaN(due.getTime())) {
                          if (start.getTime() >= due.getTime()) {
                            setFormErrors({
                              ...formErrors,
                              dueDate: "Due date must be after start date",
                              startDate: "Start date must be before due date",
                            });
                          } else {
                            // Clear errors if dates are now valid
                            setFormErrors({
                              ...formErrors,
                              dueDate: undefined,
                              startDate: undefined,
                            });
                          }
                        }
                      } else {
                        // Clear errors when user changes date
                        setFormErrors({
                          ...formErrors,
                          dueDate: undefined,
                          startDate: undefined,
                        });
                      }
                    }}
                  />
                </div>
                {formErrors.dueDate && (
                  <div className="form-error">{formErrors.dueDate}</div>
                )}

                {formErrors.general && (
                  <div className="form-error form-error--general">
                    {formErrors.general}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={false}
                >
                  Add Task
                </button>
              </form>
            </div>
          </main>
        </>
      )}

      {message && !showAddModal && (
        <div className="todo-message">{message}</div>
      )}
    </div>
  );
}

export default TodoUI;
