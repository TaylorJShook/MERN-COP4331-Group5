const express = require('express');
const { MongoClient } = require('mongodb');

exports.setApp = function (app, client) {
  const token = require('./createJWT.js');

  // --- Add Todo ---
  app.post('/api/addtodo', async (req, res) => {
    const { userId, title, description, createdAt, dueDate, priority, jwtToken } = req.body;

    try {
      if (token.isExpired(jwtToken)) {
        return res.status(200).json({ error: 'The JWT is no longer valid', jwtToken: '' });
      }
    } catch (e) {
      console.error(e.message);
    }

    const newTodo = {
      UserID: userId,
      Title: title,
      Description: description,
      Completed: false,
      CreatedAt: createdAt,
      DueDate: dueDate,
      Priority: priority
    };

    let error = '';
    try {
      const db = client.db('TodoApp');
      await db.collection('Todos').insertOne(newTodo);
    } catch (e) {
      error = e.toString();
    }

    let refreshedToken = '';
    try {
      refreshedToken = token.refresh(jwtToken);
    } catch (e) {
      console.error(e.message);
    }

    res.status(200).json({ error, jwtToken: refreshedToken });
  });

  // --- Login ---
  app.post('/api/login', async (req, res) => {
    try {
      const { login, password } = req.body;
      const db = client.db('TodoApp');
      const results = await db.collection('Users').find({ Login: login, Password: password }).toArray();
      console.log('Login attempt:', login, password, 'Results found:', results.length);


      if (results.length === 0) {
        return res.status(200).json({ error: 'Login/Password incorrect' });
      }

      const { UserID: id, FirstName: fn, LastName: ln } = results[0];

      const jwt = token.createToken(fn, ln, id);
      const jwtValue = typeof jwt === 'string'
        ? jwt
        : (jwt.accessToken || jwt.jwtToken || jwt.token || '');

      res.status(200).json({
        accessToken: jwtValue,
        firstName: fn,
        lastName: ln,
        id,
        error: ''
      });
    } catch (e) {
      console.error('Login error:', e);
      res.status(500).json({ error: e.message || 'Internal server error' });
    }
  });

  // --- Get Todos ---
  app.post('/api/gettodos', async (req, res) => {
    const { userId, jwtToken } = req.body;

    try {
      if (token.isExpired(jwtToken)) {
        return res.status(200).json({ error: 'The JWT is no longer valid', jwtToken: '' });
      }
    } catch (e) {
      console.error(e.message);
    }

    const db = client.db('TodoApp');
    let results = [];
    let error = '';

    try {
      results = await db.collection('Todos').find({ UserID: userId }).toArray();
    } catch (e) {
      error = e.toString();
    }

    let refreshedToken = '';
    try {
      refreshedToken = token.refresh(jwtToken);
    } catch (e) {
      console.error(e.message);
    }

    const formattedResults = results.map(task => ({
      title: task.Title,
      description: task.Description,
      completed: task.Completed,
      createdAt: task.CreatedAt,
      dueDate: task.DueDate,
      priority: task.Priority
    }));

    res.status(200).json({ results: formattedResults, error, jwtToken: refreshedToken });
  });
};
