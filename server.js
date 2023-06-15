import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import exerciseData from './data/exercises-bank.json'
import listEndpoints from 'express-list-endpoints'

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost/circle-it'
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

// Defines the port the app will run on. Defaults to 8080, but can be overridden
// when starting the server. Example command to overwrite PORT env variable value:
// PORT=9000 npm start
const port = process.env.PORT || 8080
const app = express()

// Defines the options for CORS
const corsOptions = {
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PATCH', 'DELETE'], // Allow GET and POST requests
  preflightContinue: false, // Enable preflight requests
  optionsSuccessStatus: 204, // Return 204 status for successful preflight requests
}


// Middlewares
app.use(cors(corsOptions))
app.use(express.json())
app.options('*', cors())
// Add middlewares to enable cors and json body parsing
// app.use((req, res, next) => {
//   res.setHeader(
//     'Access-Control-Allow-Origin', '*'
//     // 'http://localhost:3000', 'http://localhost:3000/set-timer', '*', 'https://imaginative-churros-e76935.netlify.app'
//   )

//   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PUT, PATCH')
//   res.setHeader(
//     'Access-Control-Allow-Headers',
//     'Content-Type, Authorization, X-RapidAPI-Key'
//   )
//   next()
// })
// app.use(cors({
//   origin: 'http://localhost:3000',
//   methods: 'GET, POST'
// }))
// app.use(express.json())

const { Schema } = mongoose

/// Schemas
const ExerciseSchema = new Schema({
  name: String,
  description: String,
  musclegroup: [String],
  equipment: [String],
  type: String,
  img: String,
  highImpact: Boolean
})

const Exercise = mongoose.model('Exercise', ExerciseSchema)

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 2
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  favoriteWorkouts: [
    {
      timestamp: {
        type: Date, default:
          Date.now
      },
      exercises: [ExerciseSchema],
    },
  ],
  recentWorkouts: [
    {
      timestamp: {
        type: Date, default:
          Date.now
      },
      exercises: [ExerciseSchema],
    },
  ],
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString('hex')
  }
})
const User = mongoose.model('User', UserSchema)

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

/// First route
app.get('/', (req, res) => {
  res.send(listEndpoints(app))
})

/// Registration
app.post('/signup', async (req, res) => {
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


/// Login
app.post('/login', async (req, res) => {
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

/// Authenticate the user
const authenticateUser = async (req, res, next) => {
  const accessToken = req.header('Authorization')
  try {
    const user = await User.findOne({ accessToken: accessToken })
    if (user) {
      next()
    } else {
      res.status(401).json({
        success: false,
        response: 'Please log in'
      })
    }
  } catch (e) {
    res.status(500).json({
      success: false,
      response: e
    })
  }
}

/// Welcome page
app.get('/welcome', authenticateUser)
app.get('/welcome', async (req, res) => {
  /*   const accessToken = req.header('Authorization')
    const user = await User.findOne({ accessToken: accessToken }) */
  //https://mongoosejs.com/docs/populate.html
  res.status(200).json({ success: true })
})

/// All exercises
app.get('/exercises', authenticateUser)
app.get('/exercises', (req, res) => {
  res.json(exerciseData)
})

/// Random workout
app.get('/exercises/random', async (req, res) => {
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

/// Filter exercises based on multiple choices
app.get('/exercises/filter', authenticateUser, async (req, res) => {
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


/// Save favorite workouts
app.patch('/favorites', authenticateUser, async (req, res) => {
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

//Get favorites
app.get('/favorites', authenticateUser, async (req, res) => {
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

//Add recent workouts

app.patch('/recent', authenticateUser, async (req, res) => {
  const { timestamp, exercises } = req.body
  const accessToken = req.header("Authorization")

  try {
    const user = await User.findOne({ accessToken: accessToken })
    if (user) {
      if (user.recentWorkouts.length >= 5) {
        user.recentWorkouts.shift() // Remove the oldest workout if the array is full
      }
      user.recentWorkouts.push({ timestamp, exercises })
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

// Get recent workouts
app.get('/recent', authenticateUser, async (req, res) => {
  const accessToken = req.header('Authorization')
  try {
    const user = await User.findOne({ accessToken }).populate('recentWorkouts.exercises')
    if (user) {
      const recentWorkouts = user.recentWorkouts.slice(-5) // Retrieve the last 5 recent workouts
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



/// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
