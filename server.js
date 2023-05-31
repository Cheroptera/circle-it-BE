import express from "express";
import cors from "cors";
import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import exerciseData from './data/exercises-bank.json'
import listEndpoints from 'express-list-endpoints';

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/cirle-it"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

// Defines the port the app will run on. Defaults to 8080, but can be overridden
// when starting the server. Example command to overwrite PORT env variable value:
// PORT=9000 npm start
const port = process.env.PORT || 8080;
const app = express();

// Add middlewares to enable cors and json body parsing
app.use(cors());
app.use(express.json());

const { Schema } = mongoose;

const UserSchema = new Schema({
  name:{
    type: String,
    required: true,
    unique: true
  },
  password:{
    type: String,
    required: true
  },
  accessToken:{
    type: String,
    default: () => crypto.randomBytes(128).toString('hex')
  }
})

//Register
const User = mongoose.model("User", UserSchema)
app.post('/register', async (req, res) => {
  const { username, password } = req.body
try {
  const salt = bcrypt.genSaltSync();
  const newUser = await new User({
    username: username,
    password: bcrypt.hashSync(password, salt)
  }).save();
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

const ExerciseSchema = new Schema({
  name: String,
  description: String,
  musclegroup: [String],
  equipment: [String],
  type: String,
  img: String,
  highImpact: Boolean
})

const Exercise = mongoose.model("Exercise", ExerciseSchema)

//Seed database
if(process.env.RESET_DB) {
  const seedDatabase = async () => {
    await Exercise.deleteMany();
   exerciseData.forEach((exercise) => {
      new Exercise(exercise).save()
    })

  }
  seedDatabase()
}

/// Registration
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
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

//Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({username: username})
    if (user && bcrypt.compareSync(password, user.password)) {
      res.status(200).json({
        success: true,
        response: {
          username: user.username,
          id: user._id,
          accessToken: user.accessToken
        }
      });
    } else {
      res.status(400).json({
        success: false,
        response: "Credentials do not match"
      });
    }
  } catch (e) {
    res.status(500).json({
      success: false,
      response: e
    });
  }
});


// Start defining your routes here
app.get('/', (req, res) => {
  res.send(listEndpoints(app))
  // res.send('Hello test!');
});

//First route which shows all movies
app.get('/exercises', (req, res) => {
  res.json(exerciseData)
})

//Random workouts
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



// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
