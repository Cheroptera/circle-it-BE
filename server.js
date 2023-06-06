import express from "express";
import cors from "cors";
import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import exerciseData from './data/exercises-bank.json'
import listEndpoints from 'express-list-endpoints';

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/circle-it"
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

const UserSchema = new mongoose.Schema({
  username:{
    type: String,
    required: true,
    unique: true,
    minlength: 2
  },
  password:{
    type: String,
    required: true,
    minlength: 6
  },
  favorites:[{
    type: Schema.Types.ObjectId, ref: 'Favorite'
  }],
  accessToken:{
    type: String,
    default: () => crypto.randomBytes(128).toString('hex')
  }
})
const User = mongoose.model("User", UserSchema)


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

// Authenticate the user
const authenticateUser = async (req, res, next) => {
  const accessToken = req.header("Authorization")
  try {
    const user = await User.findOne({ accessToken: accessToken })
    if (user) {
      next()
    } else {
      res.status(401).json({
        success: false,
        response: "Please log in"
      })
    }
  } catch (e) {
    res.status(500).json({
      success: false,
      response: e
    })
  }
}

const FavoriteSchema = new mongoose.Schema({
  body: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const FavoriteModel = mongoose.model('Favorite', FavoriteSchema);

app.post('/createFavorite', authenticateUser, async (req, res) => {
  try {
    const favorite = new FavoriteModel();
    favorite.user = req.user._id; // Assuming req.user contains the logged-in user object with the user ID
    favorite.body = req.body.body;
    await favorite.save();

    const user = await User.findById(req.user._id);
    if (user) {
      user.favorites.push(favorite._id);
      await user.save();
      res.json({ message: 'Favorite saved!' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error });
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

//Welcome page
app.get("/welcome", authenticateUser)
app.get("/welcome", async (req, res) => {
  const accessToken = req.header("Authorization")
  const user = await User.findOne({ accessToken: accessToken })
  // TODO const favorites = await favorites.find({ user: user._id })
  //https://mongoosejs.com/docs/populate.html
  res.status(200).json({ success: true, response: favorites })
});


//Route to filter by musclegroup
app.get("/exercises/musclegroup/:musclegroup", async (req, res) => {
  const { musclegroup } = req.params
  try {
    const showMuscleGroup = await Exercise.find({ musclegroup: { $in: [musclegroup] } })
 
    if (showMuscleGroup.length > 0) {
      res.status(200).json({
        success: true,
        message: 'OK',
        body: {
          showMuscleGroup
        }
      })
    } else {
        res.status(404).send({
        success: false ,
        body: {
          message: "(404) Musclegroup not found",
  
        }
        }
       )}
  } catch(error){
       res.status(400).json({
         success: false,
         body: {
           message: "bad request"
        }
  })
  }})

//Route to filter by equipment
app.get("/exercises/equipment/:equipment", async (req, res) => {
  const { equipment } = req.params
  try {
    const showEquipment = await Exercise.find({ equipment: { $in: [equipment] } })
 
    if (showEquipment.length > 0) {
      res.status(200).json({
        success: true,
        message: 'OK',
        body: {
          showEquipment
        }
      })
    } else {
        res.status(404).send({
        success: false ,
        body: {
          message: "(404) Equipment not found",
  
        }
        }
       )}
  } catch(error){
       res.status(400).json({
         success: false,
         body: {
           message: "bad request"
        }
  })
  }})

  
  

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
