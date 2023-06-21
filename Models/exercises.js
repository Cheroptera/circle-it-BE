import mongoose from "mongoose"

const { Schema } = mongoose

export const ExerciseSchema = new Schema({
  name: String,
  description: String,
  musclegroup: [String],
  equipment: [String],
  type: String,
  img: String,
  highImpact: Boolean
})

export const Exercise = mongoose.model('Exercise', ExerciseSchema)

