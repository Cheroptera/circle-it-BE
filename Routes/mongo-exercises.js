import express from 'express'
const router = express.Router()
import mongoose from 'mongoose'
import exerciseData from '../data/exercises-bank.json'
import authenticateUser from '../Middlewares/middlewares'
import Exercise from '../Models/exercises'

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost/circle-it'
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

///* Seed database
if (process.env.RESET_DB) {
  const seedDatabase = async () => {
    await Exercise.deleteMany()
    exerciseData.forEach((exercise) => {
      new Exercise(exercise).save()
    })
  }
  seedDatabase()
}

//* Welcome page
router.get('/welcome', authenticateUser, async (req, res) => {
  res.status(200).json({ success: true })
})

//* Get all exercises
router.get('/exercises', authenticateUser, (req, res) => {
  res.json(exerciseData)
})

//* Show five random exercises
router.get('/exercises/random', async (req, res) => {
  try {
    const randomWorkout = await Exercise.aggregate([
      { $sample: { size: 5 } },
    ])
    res.status(200).json({
      success: true,
      response: randomWorkout
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      response: error
    })
  }
})

//* Filter exercises based on multiple criteria
router.get('/exercises/filter', authenticateUser, async (req, res) => {
  const { musclegroup, equipment, impact } = req.query

  try {
    let query = {}

    if (musclegroup) {
      query.musclegroup = { $in: musclegroup.split(',') }
    }

    if (equipment) {
      query.equipment = { $in: equipment.split(',') }
    }

    if (impact === 'low') {
      query.highImpact = false
    }

    const filteredExercises = await Exercise.find(query)

    if (filteredExercises.length > 0) {
      res.status(200).json({
        success: true,
        message: 'OK',
        body: {
          exercises: filteredExercises
        }
      })
    } else {
      res.status(404).send({
        success: false,
        body: {
          message: 'No exercises found'
        }
      })
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      body: {
        message: 'Bad request'
      }
    })
  }
})

export default router