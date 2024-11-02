const { validationResult } = require('express-validator')
const argon = require('argon2')
const jwt = require('jsonwebtoken')

const User = require('../models/user')

const signup = (req, res, next) => {
	const { email, name, password } = req.body

	const errors = validationResult(req)

	if (!errors.isEmpty()) {
		const error = new Error('Validation failed, entered data is incorrect.')
		error.status = 422
		error.data = errors.array()
		throw error
	}

	User.findOne({ email })
		.then((user) => {
			if (user) {
				const error = new Error('User with this email already exists')
				error.status = 409
				throw error
			}

			return argon.hash(password)
		})
		.then((hash) => {
			return User.create({ email, name, password: hash })
		})
		.then((user) => {
			res.status(201).json({
				message: 'User created successfully!',
				userId: user._id
			})
		})
		.catch((err) => next(err))
}

const login = (req, res, next) => {
	const { email, password } = req.body

	let fetchedUser

	User.findOne({ email })
		.then((user) => {
			if (!user) {
				const error = new Error('User not found.')
				error.status = 404
				throw error
			}

			fetchedUser = user

			return argon.verify(user.password, password)
		})
		.then((isPasswordCorrect) => {
			if (!isPasswordCorrect) {
				const error = new Error('Wrong password.')
				error.status = 401
				throw error
			}

			const token = jwt.sign(
				{
					email,
					userId: fetchedUser._id.toString()
				},
				'secret_key',
				{
					expiresIn: '1h'
				}
			)

			res.status(200).json({
				token,
				userId: fetchedUser._id.toString()
			})
		})
		.catch((err) => next(err))
}

module.exports = {
	signup,
	login
}