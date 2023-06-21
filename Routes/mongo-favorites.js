import express from 'express'
const router = express.Router()
import mongoose from 'mongoose'
import authenticateUser from '../Middlewares/middlewares'
import User from '../Models/user'

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost/circle-it'
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

//* Save favorite workouts
router.patch('/favorites', authenticateUser, async (req, res) => {
  const { timestamp, exercises } = req.body
  const accessToken = req.header("Authorization")

  try {
    const user = await User.findOne({ accessToken: accessToken })
    if (user) {
      user.favoriteWorkouts.push({ timestamp, exercises })
      await user.save()
      res.status(201).json({
        success: true,
        response: 'Workout saved successfully'
      })
    } else {
      res.status(404).json({
        success: false,
        response: 'User not found, could not save the workout'
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

//* Get favorite workouts
router.get('/favorites', authenticateUser, async (req, res) => {
  const accessToken = req.header("Authorization") // Retrieve the accessToken from the request headers
  try {
    const user = await User.findOne({ accessToken: accessToken })
    if (user) {
      res.status(200).json({
        success: true,
        response: user.favoriteWorkouts,
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

// Change name of the favorite
router.patch('/favorites/:favoriteid/update', authenticateUser, async (req, res) => {
  const { favoriteid } = req.params; // Retrieve the favorite workout ID from the request parameters
  const { favoriteName } = req.body;
  const accessToken = req.header("Authorization");

  try {
    const user = await User.findOneAndUpdate(
      {
        accessToken: accessToken,
        "favoriteWorkouts._id": favoriteid, // Find the user by accessToken and the workout by its ID
      },
      { $set: { "favoriteWorkouts.$.favoriteName": favoriteName } }, // Update the workout's name
      { new: true } // Return the modified user document
    );

    if (user) {
      res.status(200).json({
        success: true,
        response: 'Workout name updated successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        response: 'User not found or workout not found'
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      response: error
    });
  }
});


export default router