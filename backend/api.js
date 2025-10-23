require('express');
require('mongodb');

exports.setApp = function (app, client) {
  const token = require('./createJWT.js');

  app.post('/api/addtodo', async (req, res) => {
    const { userId, title, description, createdAt, dueDate, priority, jwtToken } = req.body;

    try {
      if (token.isExpired(jwtToken)) {
        return res.status(200).json({ error: 'The JWT is no longer valid', jwtToken: '' });
      }
    } catch (e) {
      console.log(e.message);
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
      console.log(e.message);
    }

    res.status(200).json({ error, jwtToken: refreshedToken });
  });

  app.post('/api/login', async (req, res) => {
    const { login, password } = req.body;
    const db = client.db('TodoApp');
    const results = await db.collection('Users').find({ Login: login, Password: password }).toArray();

    if (results.length === 0) {
      return res.status(200).json({ error: 'Login/Password incorrect' });
    }

    const { UserId: id, FirstName: fn, LastName: ln } = results[0];

    try {
      const jwt = token.createToken(fn, ln, id);
      res.status(200).json({
        accessToken: jwt.accessToken || jwt.jwtToken || jwt.token || '',
        firstName: fn,
        lastName: ln,
        id,
        error: ''
      });
    } catch (e) {
      res.status(200).json({ error: e.message });
    }
  });

  app.post('/api/gettodos', async (req, res) => {
    const { userId, jwtToken } = req.body;

    try {
      if (token.isExpired(jwtToken)) {
        return res.status(200).json({ error: 'The JWT is no longer valid', jwtToken: '' });
      }
    } catch (e) {
      console.log(e.message);
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
      console.log(e.message);
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
