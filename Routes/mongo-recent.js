import express from 'express'
const router = express.Router()
import mongoose from 'mongoose'
import authenticateUser from '../Middlewares/middlewares'
import User from '../Models/user'

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost/circle-it'
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

//* Add the five most recent workouts.
router.patch('/recent', authenticateUser, async (req, res) => {
  const { timestamp, exercises } = req.body
  const accessToken = req.header("Authorization")

  try {
    const user = await User.findOne({ accessToken: accessToken })
    if (user) {
      if (user.recentWorkouts.length >= 5) {
        user.recentWorkouts.shift() // Removes the oldest workout if the array is full
      }
      user.recentWorkouts.push({ timestamp, exercises })
      await user.save()
      res.status(201).json({
        success: true,
        response: 'Recent workouts saved successfully'
      })
    } else {
      res.status(404).json({
        success: false,
        response: 'User not found, could not save recent workouts'
      })
    }
  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: false,
      response: error
    })
  }
})

//* Get the five most recent workouts
router.get('/recent', authenticateUser, async (req, res) => {
  const accessToken = req.header('Authorization')
  try {
    const user = await User.findOne({ accessToken }).populate('recentWorkouts.exercises')
    if (user) {
      const recentWorkouts = user.recentWorkouts.slice(-5)
      res.status(200).json({
        success: true,
        response: recentWorkouts,
      })
    } else {
      res.status(404).json({
        success: false,
        response: 'User not found',
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      response: error.message,
    })
  }
})

export default router