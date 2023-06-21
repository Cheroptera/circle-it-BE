import express from "express"
const router = express.Router()
import mongoose from "mongoose"
import bcrypt from "bcrypt"
import User from "../Models/user"

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost/circle-it'
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

//* Registration
router.post('/signup', async (req, res) => {
  const { username, password } = req.body
  try {
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      res.status(400).json({
        success: false,
        response: 'User already exists',
      })
    } else {
      const salt = bcrypt.genSaltSync()
      const newUser = await new User({
        username: username,
        password: bcrypt.hashSync(password, salt),
      }).save()
      res.status(201).json({
        success: true,
        response: {
          username: newUser.username,
          id: newUser._id,
          accessToken: newUser.accessToken,
        },
      })
    }
  } catch (e) {
    res.status(500).json({
      success: false,
      response: e,
    })
  }
})

//* Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  try {
    const user = await User.findOne({ username: username })
    if (user && bcrypt.compareSync(password, user.password)) {
      res.status(200).json({
        success: true,
        response: {
          username: user.username,
          id: user._id,
          accessToken: user.accessToken
        }
      })
    } else {
      res.status(400).json({
        success: false,
        response: 'Credentials do not match'
      })
    }
  } catch (e) {
    res.status(500).json({
      success: false,
      response: e
    })
  }
})

export default router