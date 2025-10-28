import React, { useState, useEffect } from 'react';
import { buildPath } from './Path';
import { retrieveToken, storeToken } from '../tokenStorage';

function TodoUI() {
  const [message, setMessage] = useState('');
  const [todos, setTodos] = React.useState<any[]>([]);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');

  const _ud = localStorage.getItem('user_data');
  const ud = JSON.parse(String(_ud));
  const userId = ud.id;

  //
  // ======== FETCH TODOS ========
  //
  async function getTodos(): Promise<void> {
    const obj = { userId: userId, jwtToken: retrieveToken() };
    const js = JSON.stringify(obj);

    try {
      const response = await fetch(buildPath('api/gettodos'), {
        method: 'POST',
        body: js,
        headers: { 'Content-Type': 'application/json' },
      });

      const txt = await response.text();
      const res = JSON.parse(txt);

      if (res.error && res.error.length > 0) {
        setMessage('Error: ' + res.error);
      } else {
        setTodos(res.results || []);
        storeToken(res.jwtToken);
      }
    } catch (error: any) {
      setMessage(error.toString());
    }
  }

  //
  // ======== ADD TODO ========
  //
  async function addTodo(e: any): Promise<void> {
    e.preventDefault();

    const obj = {
      userId: userId,
      title: title,
      description: description,
      startDate: startDate,
      dueDate: dueDate,
      jwtToken: retrieveToken(),
    };

    const js = JSON.stringify(obj);

    try {
      const response = await fetch(buildPath('api/addtodo'), {
        method: 'POST',
        body: js,
        headers: { 'Content-Type': 'application/json' },
      });

      const txt = await response.text();
      const res = JSON.parse(txt);

      if (res.error && res.error.length > 0) {
        setMessage('Error: ' + res.error);
      } else {
        setMessage('Todo added successfully!');
        storeToken(res.jwtToken);
        setTitle('');
        setDescription('');
        setStartDate('');
        setDueDate('');
        await getTodos(); // Refresh list
      }
    } catch (error: any) {
      console.error('Catch error:', error);
      setMessage(error.toString());
    }
  }

  //
  // ======== INITIAL LOAD ========
  //
  useEffect(() => {
    getTodos();
  }, []);

  return (
    <div id="todoUIDiv" style={{ marginTop: '20px' }}>
      <h2>Your Todos</h2>

      {/* Display todos */}
      {todos.length > 0 ? (
        <ul>
          {todos.map((todo, index) => (
            <li key={index} style={{ marginBottom: '10px' }}>
              <strong>{todo.title}</strong> <br />
              {todo.description && <span>{todo.description}</span>} <br />
              <em>Start:</em> {todo.StartDate || 'N/A'} | <em>Due:</em>{' '}
              {todo.dueDate || 'N/A'} <br />
              <em>Completed:</em> {todo.completed ? '✅' : '❌'}
            </li>
          ))}
        </ul>
      ) : (
        <p>No todos found.</p>
      )}

      <hr />
      <h3>Add a New Todo</h3>
      <form onSubmit={addTodo}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />{' '}
        <br />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />{' '}
        <br />
        <label>Start Date: </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />{' '}
        <br />
        <label>Due Date: </label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />{' '}
        <br />
        <button type="submit" className="buttons">
          Add Todo
        </button>
      </form>

      <p id="todoMessage">{message}</p>
    </div>
  );
}

export default TodoUI;
