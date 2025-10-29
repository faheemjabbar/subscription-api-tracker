import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import User from '../models/user.model.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/env.js'

export const signUp = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      await session.abortTransaction();
      session.endSession();
      const error = new Error('Name, email, and password are required');
      error.statusCode = 400;
      throw error;
    }

    if (password.length < 6) {
      await session.abortTransaction();
      session.endSession();
      const error = new Error('Password must be at least 6 characters long');
      error.statusCode = 400;
      throw error;
    }

    // Check if a user already exists
    const existingUser = await User.findOne({ email });

    if(existingUser) {
      await session.abortTransaction();
      session.endSession();
      const error = new Error('User with this email already exists');
      error.statusCode = 409;
      throw error;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUsers = await User.create([{ name, email, password: hashedPassword }], { session });

    const token = jwt.sign({ userId: newUsers[0]._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    await session.commitTransaction();
    session.endSession();

    // Return user without password
    const userResponse = {
      _id: newUsers[0]._id,
      name: newUsers[0].name,
      email: newUsers[0].email,
      createdAt: newUsers[0].createdAt,
      updatedAt: newUsers[0].updatedAt
    };

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        token,
        user: userResponse,
      }
    })
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    next(error);
  }
}

export const signIn = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      const error = new Error('Email and password are required');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findOne({ email });

    if(!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if(!isPasswordValid) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Return user without password
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'User signed in successfully',
      data: {
        token,
        user: userResponse,
      }
    });
  } catch (error) {
    next(error);
  }
}

export const signOut = async (req, res, next) => {
  try {
    // Since you're using JWT, sign out is typically handled on the client side
    // by removing the token from storage
    res.status(200).json({
      success: true,
      message: 'User signed out successfully'
    });
  } catch (error) {
    next(error);
  }
}