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

// Add middlewares to enable cors and json body parsing
app.use((req, res, next) => {
  res.setHeader(
    'Access-Control-Allow-Origin',
    'http://localhost:3000', 'http://localhost:3000/set-timer', 'https://imaginative-churros-e76935.netlify.app'
  )
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-RapidAPI-Key'
  )
  next()
})
app.use(cors())
app.use(express.json())

const { Schema } = mongoose

/// Schemas
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
  //! Check parameter names below and compare to frontend
  finishedWorkouts:[{
    createdAt: {
    type: Date,
    default: Date.now
    },
    exercises: [],
    favorite: Boolean
  }],
  accessToken:{
    type: String,
    default: () => crypto.randomBytes(128).toString('hex')
  }
})
const User = mongoose.model('User', UserSchema)

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

const FavoriteSchema = new mongoose.Schema({
  body: [],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }
})

const FavoriteModel = mongoose.model('Favorite', FavoriteSchema)

/// Seed database
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
    const salt = bcrypt.genSaltSync()
    const newUser = await new User({
      username: username,
      password: bcrypt.hashSync(password, salt)
    }).save()
    res.status(201).json({
      success: true,
      response: {
        username: newUser.username,
        id: newUser._id,
        accessToken: newUser.accessToken
      }
    })
  } catch (e) {
    res.status(400).json({
      success: false,
      response: e
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
  // TODO const favorites = await favorites.find({ user: user._id })
  //https://mongoosejs.com/docs/populate.html
  res.status(200).json({ success: true, response: favorites })
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

/// Endpoint for the user to be able to filter exercises based on multiple choices
app.get('/exercises/filter', authenticateUser, async (req, res) => {
  const { musclegroup, equipment, impact } = req.query;

  try {
    let query = {};

    if (musclegroup) {
      query.musclegroup = { $in: musclegroup.split(',') };
    }

    if (equipment) {
      query.equipment = { $in: equipment.split(',') };
    }

    if (impact === 'low') {
      query.highImpact = false;
    }

    const filteredExercises = await Exercise.find(query);

    if (filteredExercises.length > 0) {
      res.status(200).json({
        success: true,
        message: 'OK',
        body: {
          exercises: filteredExercises
        }
      });
    } else {
      res.status(404).send({
        success: false,
        body: {
          message: 'No exercises found'
        }
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      body: {
        message: 'Bad request'
      }
    });
  }
});

/// Endpoint for logged in users to see their favorites
app.get('exercises/favorites', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favorites')
    if (user) {
      res.json({ favorites: user.favorites })
    } else {
      res.status(404).json({ message: 'User not found' })
    }
  } catch (error) {
    res.status(500).json({ error })
  }
})

/// Endpoint for the user to remove a favorite from their list
app.delete(
  'exercises/favorites/:favoriteId',
  authenticateUser,
  async (req, res) => {
    try {
      const favoriteId = req.params.favoriteId
      const userId = req.user._id

      // Find the user and remove the favorite by its ID
      const user = await User.findByIdAndUpdate(
        userId,
        { $pull: { favorites: favoriteId } },
        { new: true }
      )

      if (user) {
        // Delete the favorite document from the FavoriteModel
        await FavoriteModel.findByIdAndDelete(favoriteId)
        res.json({ message: 'Favorite deleted successfully' })
      } else {
        res.status(404).json({ message: 'User not found' })
      }
    } catch (error) {
      res.status(500).json({ error })
    }
  }
)

/// Add favorites for logged in users
app.post(
  '/exercises/addFavorite/:addFavorite',
  authenticateUser,
  async (req, res) => {
    try {
      const favorite = new FavoriteModel()
      favorite.user = req.user._id // Assuming req.user contains the logged-in user object with the user ID
      favorite.body = req.body.body
      await favorite.save()

      const user = await User.findById(req.user._id)
      if (user) {
        user.favorites.push(favorite._id)
        await user.save()
        res.json({ message: 'Favorite saved!' })
      } else {
        res.status(404).json({ message: 'User not found' })
      }
    } catch (error) {
      res.status(500).json({ error })
    }
  }
)

/// Check if a user's favorites exist:
const checkFavoritesExist = async (userId) => {
  try {
    // Find the favorites that belong to the user
    const favorites = await FavoriteModel.find({ user: userId })
    // Check if favorites exist
    if (favorites.length > 0) {
      console.log('User has favorites:', favorites)
    } else {
      console.log('User has no favorites.')
    }
  } catch (error) {
    console.error('Error checking favorites:', error)
  }
}

/// Workouts
app.post('/workouts', authenticateUser, async (req, res) => {
  console.log(req.body)
  const { createdAt, exercises, favorite} = req.body
  const userId = req.user._id

  try {
    const user = await User.findById(userId)
    if (user) {
      user.finishedWorkouts.push({ createdAt, exercises, favorite})
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
    res.status(500).json({
      success: false,
      response: error
    })
  }
})

/// Recent workouts
app.get('workouts/recent', authenticateUser, async (req, res) => {
  const userId = req.user._id

  try {
    const user = await User.findById(userId)
    if (user) {
      const recentWorkouts = user.finishedWorkouts
      res.status(200).json({
        success: true,
        response: recentWorkouts
      })
    } else {
      res.status(404).json({
        success: false,
        response: 'User not found, could not save workout'
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,

      response: error
    })
  }
})

/// Call the function and pass the user ID
const userId = '647ef921853bafaca46af079' // Replace with the actual user ID
checkFavoritesExist(userId)

/// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
