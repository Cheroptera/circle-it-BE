import express from 'express'
import cors from 'cors'
import listEndpoints from 'express-list-endpoints'
import mongoose from 'mongoose'

//* Defines the port the app will run on. 
const port = process.env.PORT || 8080
const app = express()

//*Import all the routes
import mongoExercisesRoute from './Routes/mongo-exercises'
import mongoUsersRoute from './Routes/mongo-users'
import mongoFavoritesRoute from './Routes/mongo-favorites'
import mongoRecentRoute from './Routes/mongo-recent'

//* Defines the options for CORS
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  preflightContinue: false, // Enable preflight requests
  optionsSuccessStatus: 204, // Return 204 status for successful preflight requests
}

//* Middlewares to enable cors and json body parsing
app.use(cors(corsOptions))
app.use(express.json())
app.options('*', cors())
app.use((req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    next()
  } else {
    res.status(503).json({ error: 'Service unavailable' })
  }
})

//* Adding the route files to the app
app.use('/', mongoExercisesRoute)
app.use('/', mongoFavoritesRoute)
app.use('/', mongoRecentRoute)
app.use('/', mongoUsersRoute)

//* Start of routes/ Get list of endpoints
app.get('/', (req, res) => {
  res.send(listEndpoints(app))
})

//* Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
