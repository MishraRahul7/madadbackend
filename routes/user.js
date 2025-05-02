const express = require('express');
const router = new express.Router();
const User = require('../model/user');
const multer = require('multer');
const sharp = require('sharp');
const auth = require('../middleware/auth');

// Multer config
const upload = multer({
  limits: {
    fileSize: 1000000 // 1MB
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpeg|jpg|png)$/)) {
      return cb(new Error('Please upload an image (.jpg, .jpeg, .png)'));
    }
    cb(undefined, true);
  }
});

// Create user
router.post('/users/add', async (req, res) => {
  const user = new User(req.body);
  console.log('🚀 ~ router.post ~ user:', user);

  try {
    await user.save();
    const token = await user.generateAuthToken();
    res.status(201).send({ user, token });
  } catch (e) {
    console.log('🚀 ~ router.post ~ e:', e);

    // Handle duplicate key error (e.g., email already exists)
    if (e.code === 11000) {
      const field = Object.keys(e.keyPattern)[0]; // Get the field causing the conflict
      res.status(409).send({
        error: `User with this ${field} already exists.`,
        field,
        value: e.keyValue[field]
      });
    } else {
      res
        .status(400)
        .send({ error: 'Failed to create user', details: e.message });
    }
  }
});

// Login
router.post('/users/login', async (req, res) => {
  try {
    const user = await User.findByCredentials(
      req.body.email,
      req.body.password
    );
    const token = await user.generateAuthToken();
    res.send({ user, token });
  } catch (e) {
    res.status(400).send({ error: 'Login failed', details: e.message });
  }
});

// Logout current session
router.post('/users/logout', auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter(
      token => token.token !== req.token
    );
    await req.user.save();
    res.send({ message: 'Logged out successfully' });
  } catch (e) {
    res.status(500).send({ error: 'Logout failed' });
  }
});

// Get current logged-in user
router.get('/users/me', auth, async (req, res) => {
  res.send(req.user);
});

// Update current user
router.patch('/users/me', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = [
    'fullName',
    'fatherName',
    'dob',
    'weight',
    'gender',
    'occupation',
    'bloodGroup',
    'phone',
    'email',
    'password',
    'address',
    'state',
    'city'
  ];
  const isValid = updates.every(update => allowedUpdates.includes(update));

  if (!isValid) {
    return res.status(400).send({ error: 'Invalid updates' });
  }

  try {
    updates.forEach(update => {
      req.user[update] = req.body[update];
    });
    await req.user.save();
    res.send(req.user);
  } catch (e) {
    res.status(400).send({ error: 'Update failed', details: e.message });
  }
});

// Delete current user
router.delete('/users/me', auth, async (req, res) => {
  try {
    await req.user.remove();
    res.send({ message: 'User deleted', user: req.user });
  } catch (e) {
    res.status(500).send({ error: 'Deletion failed' });
  }
});

// Upload avatar
router.post(
  '/users/me/avatar',
  auth,
  upload.single('avatar'),
  async (req, res) => {
    const buffer = await sharp(req.file.buffer)
      .resize({ width: 35, height: 35 })
      .png()
      .toBuffer();
    req.user.avatar = buffer;
    await req.user.save();
    res.send({ message: 'Avatar uploaded' });
  },
  (error, req, res, next) => {
    res.status(400).send({ error: error.message });
  }
);

// ===================
// CRUD routes
// ===================

// Get all users
router.post('/users', async (req, res) => {
  try {
    const { state, city, bloodGroup } = req.body.data || {};

    const filter = {};
    if (state) filter.state = state;
    if (city) filter.city = city;
    if (bloodGroup && bloodGroup !== 'All blood groups')
      filter.bloodGroup = bloodGroup;

    console.log('🚀 ~ Filter:', filter);

    const users = await User.find(filter);
    res.send(users);
  } catch (e) {
    console.error('🚀 ~ Error fetching users:', e);
    res
      .status(500)
      .send({ error: 'Failed to fetch users', details: e.message });
  }
});

// Get user by ID
router.get('/users/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send({ error: 'User not found' });
    res.send(user);
  } catch (e) {
    res.status(500).send({ error: 'Error fetching user' });
  }
});

// Update user by ID
router.patch('/users/:id', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = [
    'fullName',
    'fatherName',
    'dob',
    'weight',
    'gender',
    'occupation',
    'bloodGroup',
    'phone',
    'email',
    'password',
    'address',
    'state',
    'city'
  ];
  const isValid = updates.every(update => allowedUpdates.includes(update));

  if (!isValid) {
    return res.status(400).send({ error: 'Invalid updates' });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send({ error: 'User not found' });

    updates.forEach(update => {
      user[update] = req.body[update];
    });
    await user.save();
    res.send(user);
  } catch (e) {
    res.status(400).send({ error: 'Update failed', details: e.message });
  }
});

// Delete user by ID
router.delete('/users/:id', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).send({ error: 'User not found' });
    res.send({ message: 'User deleted', user });
  } catch (e) {
    res.status(500).send({ error: 'Delete failed' });
  }
});

module.exports = router;
