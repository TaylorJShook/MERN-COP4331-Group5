import React, { useState, useEffect } from "react";
import { buildPath } from "./Path";
import { retrieveToken, storeToken } from "../tokenStorage";

function TodoUI() {
  const [displayDate, setDisplayDate] = useState(new Date());
  const [message, setMessage] = useState("");
  const [todos, setTodos] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = React.useState<any>({
    title: "",
    description: "",
    startDate: "",
    dueDate: "",
  });
  const [showAddModal, setShowAddModal] = useState(false);


  const _ud = localStorage.getItem("user_data");
  const ud = _ud ? JSON.parse(_ud) : {};
  const userId = ud.id;

  const handlePrevDate = () => {
    setDisplayDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  const handleNextDate = () => {
    setDisplayDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  };

  async function getTodos(): Promise<void> {
    if (!userId) return;
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
        return;
      }

      const fixedTodos = (res.results || [])
        .map((t: any) => ({
          _id: t.id || t._id || t._id?.$oid,
          title: t.title || t.Title || "",
          description: t.description || t.Description || "",
          completed: t.completed ?? t.Completed ?? false,
          createdAt: t.createdAt || t.CreatedAt || new Date(),
          StartDate: t.StartDate || t.startDate || t.Startdate || null,
          DueDate: t.DueDate || t.dueDate || t.Duedate || null,
        }))
        .sort((a: any, b: any) => {
          const aTime = a.StartDate
            ? new Date(a.StartDate).getTime()
            : new Date(a.createdAt).getTime();
          const bTime = b.StartDate
            ? new Date(b.StartDate).getTime()
            : new Date(b.createdAt).getTime();
          return aTime - bTime;
        });

      setTodos(fixedTodos);
      storeToken(res.jwtToken);
    } catch (error: any) {
      setMessage(error.toString());
    }
  }

  async function moveUnfinishedTodosToNextDay() {
    if (!todos.length) return;
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem("lastCheckedDate");

    if (storedDate === today) return;
    localStorage.setItem("lastCheckedDate", today);

    for (const todo of todos) {
      if (!todo.completed && todo.StartDate) {
        try {
          const obj = { id: todo._id, jwtToken: retrieveToken() };
          const response = await fetch(buildPath("api/next-day"), {
            method: "POST",
            body: JSON.stringify(obj),
            headers: { "Content-Type": "application/json" },
          });
          const res = await response.json();
          if (res.error && res.error.length > 0) continue;
          storeToken(res.jwtToken);
        } catch {}
      }
    }
    await getTodos();
  }

  async function addTodo(e: any) {
    e.preventDefault();
    const baseDate = new Date(displayDate);
    baseDate.setHours(0, 0, 0, 0);

    const startDate = startTime
      ? new Date(
          `${baseDate.toISOString().split("T")[0]}T${startTime}:00`
        ).toISOString()
      : new Date(baseDate).toISOString();

    const dueDate = dueTime
      ? new Date(
          `${baseDate.toISOString().split("T")[0]}T${dueTime}:00`
        ).toISOString()
      : null;

    const obj = {
      userId,
      title,
      description,
      startDate,
      dueDate,
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
        setMessage("Error: " + res.error);
      } else {
        setMessage("Todo added successfully!");
        storeToken(res.jwtToken);
        setTitle("");
        setDescription("");
        setStartTime("");
        setDueTime("");
        setShowAddModal(false);
        await getTodos();
      }
    } catch (error: any) {
      setMessage(error.toString());
    }
  }

  async function toggleTodoCompletion(id: string) {
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
      } else {
        storeToken(res.jwtToken);
        await getTodos();
      }
    } catch (error: any) {
      setMessage(error.toString());
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

  function startEdit(todo: any) {
    setEditingId(todo._id);
    setEditData({
      title: todo.title || todo.Title || "",
      description: todo.description || todo.Description || "",
      startDate: todo.StartDate
        ? new Date(todo.StartDate).toISOString().slice(0, 16)
        : "",
      dueDate: todo.DueDate
        ? new Date(todo.DueDate).toISOString().slice(0, 16)
        : "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData({ title: "", description: "", startDate: "", dueDate: "" });
  }

  async function saveEdit(id: string) {
    const obj = {
      id,
      title: editData.title,
      description: editData.description,
      startDate: editData.startDate || null,
      dueDate: editData.dueDate || null,
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
        setMessage("Error: " + res.error);
      } else {
        setMessage("Todo updated successfully!");
        storeToken(res.jwtToken);
        setEditingId(null);
        await getTodos();
      }
    } catch (error: any) {
      setMessage(error.toString());
    }
  }

  useEffect(() => {
    getTodos();
  }, [displayDate]);

  useEffect(() => {
    moveUnfinishedTodosToNextDay();
  }, [todos]);

  return (
    <div id="todoUIDiv" style={{ marginTop: "20px", textAlign: "center" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "8px",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={handlePrevDate}
            style={{ fontSize: "1.5rem", padding: "0.5rem 1rem" }}
          >
            {"<"}
          </button>
          <h2 style={{ margin: 0 }}>
            {displayDate.toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </h2>
          <button
            onClick={handleNextDate}
            style={{ fontSize: "1.5rem", padding: "0.5rem 1rem" }}
          >
            {">"}
          </button>
        </div>
      </div>
      <h2>Your Todos</h2>

      <div style={{ marginBottom: "20px" }}>
        <button
          type="button"
          className="buttons"
          onClick={() => setShowAddModal(true)}
          style={{
            fontSize: "20px",
            padding: "10px 20px",
            borderRadius: "50%",
            cursor: "pointer",
          }}
        >
          +
        </button>
      </div>

      {todos.filter((todo) => {
        if (!todo.StartDate) return false;
        const start = new Date(todo.StartDate);
        const selected = new Date(displayDate);
        return start.toDateString() === selected.toDateString();
      }).length > 0 ? (
        <ul style={{ textAlign: "left", display: "inline-block" }}>
          {todos
            .filter((todo) => {
              if (!todo.StartDate) return false;
              const start = new Date(todo.StartDate);
              const selected = new Date(displayDate);
              return start.toDateString() === selected.toDateString();
            })
            .sort(
              (a, b) =>
                new Date(a.StartDate).getTime() -
                new Date(b.StartDate).getTime()
            )
            .map((todo, index) => (
              <li key={index} style={{ marginBottom: "20px" }}>
                {editingId === todo._id ? (
                  <div style={{ marginLeft: "24px" }}>
                    <input
                      type="text"
                      value={editData.title}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          title: e.target.value,
                        })
                      }
                      placeholder="Title"
                    />
                    <br />
                    <textarea
                      value={editData.description}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                    />
                    <br />
                    <label>Start Date & Time: </label>
                    <input
                      type="datetime-local"
                      value={editData.startDate}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          startDate: e.target.value,
                        })
                      }
                    />
                    <br />
                    <label>Due Date & Time: </label>
                    <input
                      type="datetime-local"
                      value={editData.dueDate}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          dueDate: e.target.value,
                        })
                      }
                    />
                    <br />
                    <button
                      type="button"
                      className="buttons"
                      onClick={() => saveEdit(todo._id)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="buttons"
                      onClick={cancelEdit}
                      style={{ marginLeft: "10px" }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!todo.completed}
                        onChange={() => toggleTodoCompletion(todo._id)}
                      />
                      <strong
                        style={{
                          textDecoration: todo.completed
                            ? "line-through"
                            : "none",
                          opacity: todo.completed ? 0.6 : 1,
                        }}
                      >
                        {todo.title}
                      </strong>
                    </label>

                    {todo.description && (
                      <div style={{ marginLeft: "28px", color: "#555" }}>
                        {todo.description}
                      </div>
                    )}

                    <div
                      style={{
                        marginLeft: "28px",
                        marginTop: "6px",
                        color: "#666",
                      }}
                    >
                      {todo.StartDate && (
                        <div>
                          <em>Start:</em>{" "}
                          {new Date(todo.StartDate).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                      {todo.DueDate && (
                        <div>
                          <em>Due:</em>{" "}
                          {new Date(todo.DueDate).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="buttons"
                      onClick={() => startEdit(todo)}
                      style={{ marginTop: "8px", marginLeft: "24px" }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="buttons"
                      onClick={() => deleteTodo(todo._id)}
                      style={{ marginTop: "8px", marginLeft: "10px" }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </li>
            ))}
        </ul>
      ) : (
        <p>No todos found for this date.</p>
      )}

      {showAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
              width: "300px",
            }}
          >
            <h3>Add a New Todo</h3>
            <form onSubmit={addTodo}>
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{ width: "100%" }}
              />
              <br />
              <textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{ width: "100%" }}
              />
              <br />
              <label>Start Time: </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ width: "100%" }}
              />
              <br />
              <label>Due Time: </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                style={{ width: "100%" }}
              />
              <br />
              <div style={{ marginTop: "10px" }}>
                <button type="submit" className="buttons">
                  Add Todo
                </button>
                <button
                  type="button"
                  className="buttons"
                  onClick={() => setShowAddModal(false)}
                  style={{ marginLeft: "10px" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <p id="todoMessage">{message}</p>
    </div>
  );
}

export default TodoUI;
