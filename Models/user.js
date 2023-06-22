import mongoose from 'mongoose'
import crypto from 'crypto'
import { ExerciseSchema } from './exercises'

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
      favoriteName: {
        type: String,
        required: true,
        minlength: 2,
        default: Date.now
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      exercises: [ExerciseSchema]
    }
  ],
  recentWorkouts: [
    {
      timestamp: {
        type: Date,
        default: Date.now
      },
      exercises: [ExerciseSchema]
    }
  ],
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString('hex')
  }
})
const User = mongoose.model('User', UserSchema)

export default User
