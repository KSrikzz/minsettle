import jwt from 'jsonwebtoken';
import User from '../models/User.js';

function generateToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in server environment');
  }
  return jwt.sign(
    { id: userId },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

export async function register(req, res) {
  try {
    const { name, email, password, upiId } = req.body;

    if (!name || !email || !password || !upiId || !upiId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and UPI ID are required',
      });
    }

    const trimmedUpiId = upiId.trim();
    if (!/^[\w.-]+@[\w.-]+$/.test(trimmedUpiId)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid UPI ID (e.g. username@bank)',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      upiId: trimmedUpiId,
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to register user',
      error: error.message,
    });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to log in',
      error: error.message,
    });
  }
}

export async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
}

export async function updateProfile(req, res) {
  try {
    const { name, upiId } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot be empty',
        });
      }
      user.name = name.trim();
    }

    if (upiId !== undefined) {
      const trimmedUpi = upiId.trim();
      if (!trimmedUpi) {
        return res.status(400).json({
          success: false,
          message: 'UPI ID cannot be empty',
        });
      }
      if (!/^[\w.-]+@[\w.-]+$/.test(trimmedUpi)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid UPI ID (e.g. username@bank)',
        });
      }
      user.upiId = trimmedUpi;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
}
