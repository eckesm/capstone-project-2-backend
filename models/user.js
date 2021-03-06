'use strict';

const db = require('../db');
const bcrypt = require('bcrypt');
const { BCRYPT_WORK_FACTOR } = require('../config');

const { NotFoundError, BadRequestError, UnauthrorizedError } = require('../expressError');
const Restaurant_User = require('./restaurant_user');
const { checkUserExists } = require('../helpers/checkExist');

class User {
	/** AUTHENTICATE 
	 * Authenticates a user and returns a JWT token to be included with future requests. 
	 * 
	 * Accepts: {emailAddress, password}
	 * Returns: {id, emailAddress, firstName, lastName}
	 *
	 * Throws UnauthorizedError if email address and password do not match.
	 */
	static async authenticate(emailAddress, password) {
		const result = await db.query(
			`SELECT id, email_address, password, first_name AS "firstName", last_name AS "lastName"
			FROM users
			WHERE email_address = $1`,
			[ emailAddress.toLowerCase() ]
		);

		const user = result.rows[0];
		if (user) {
			const isValid = await bcrypt.compare(password, user.password);
			if (isValid) {
				delete user.password;
				return user;
			}
		}
		throw new UnauthrorizedError(`The entered email address (${emailAddress.toLowerCase()}) and password do not match.`);
	}

	/** REGISTER
	 * Adds user to the database.
     * 
     * Accepts: {emailAddress, firstName, lastName, password}
     * Returns: {id, emailAddress, firstName, lastName}
     * 
     * Throws BadRequestError if emailAddress is a duplicate.
     */
	static async register({ emailAddress, firstName, lastName, password }) {
		const duplicateCheck = await db.query(
			`SELECT email_address
            FROM users
            WHERE email_address = $1`,
			[ emailAddress.toLowerCase() ]
		);

		if (duplicateCheck.rows[0])
			throw new BadRequestError(
				`The email address ${emailAddress.toLowerCase()} is already associated with an existing account.`
			);

		const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
		const result = await db.query(
			`INSERT INTO users (email_address, first_name, last_name, password)
            VALUES ($1, $2, $3, $4)
            RETURNING id, email_address AS "emailAddress", first_name AS "firstName", last_name AS "lastName"`,
			[ emailAddress.toLowerCase(), firstName, lastName, hashedPassword ]
		);
		const user = result.rows[0];
		return user;
	}

	/** GET 
	 * Get a single user by ID.
	 * 
	 * Accepts: id
	 * Returns: {id, emailAddress, firstName, lastName, restaurants}
	 * 
	 * Throws NotFoundError if user does not exist.
	 */
	static async get(id) {
		const result = await db.query(
			`SELECT id, email_address AS "emailAddress", first_name AS "firstName", last_name AS "lastName"
            FROM users
            WHERE id = $1`,
			[ id ]
		);

		const user = result.rows[0];
		if (!user) throw new NotFoundError(`There is no user with the ID ${id}.`);

		const restaurants = await Restaurant_User.getAllUserRestaurants(id);

		for (let i = 0; i < restaurants.length; i++) {
			let r = restaurants[i];
			const res = await db.query(
				`SELECT id, owner_id AS "ownerId", name, address, phone, email, website, notes
				FROM restaurants
				WHERE id = $1`,
				[ r.restaurantId ]
			);
			const restaurant = res.rows[0];
			r.id = restaurant.id;
			r.name = restaurant.name;
			r.address = restaurant.address;
			r.phone = restaurant.phone;
			r.email = restaurant.email;
			r.website = restaurant.website;
			r.notes = restaurant.notes;
			r.ownerId = restaurant.ownerId;
			delete r.userId;
			delete r.restaurantId;
		}

		user.restaurants = restaurants;
		return user;
	}

	/** GET BY EMAIL ADDRESS
	 * Get a basic user information by email address.
	 * 
	 * Accepts: id
	 * Returns: {id, emailAddress, firstName, lastName}
	 * 
	 * Throws NotFoundError if user does not exist.
	 */
	static async getByEmailAddress(emailAddress) {
		const result = await db.query(
			`SELECT id, email_address AS "emailAddress", first_name AS "firstName", last_name AS "lastName"
            FROM users
            WHERE email_address = $1`,
			[ emailAddress.toLowerCase() ]
		);

		const user = result.rows[0];
		if (!user) throw new NotFoundError(`There is no user with the email address ${emailAddress.toLowerCase()}.`);

		return user;
	}

	/** UPDATE
	 * Replace user's email address, first name, and last name.
	 * 
     * Accepts: id, {emailAddress, firstName, lastName}
     * Returns: {id, emailAddress, firstName, lastName}
	 * 
     * Throws BadRequestError if emailAddress is a duplicate.
     */
	static async update(id, { emailAddress, firstName, lastName }) {
		await checkUserExists(id);

		const duplicateCheck = await db.query(
			`SELECT id, email_address
            FROM users
            WHERE id = $1`,
			[ id ]
		);

		if (duplicateCheck.rows[0]) {
			if (duplicateCheck.rows[0].id != id) {
				throw new BadRequestError(
					`The email address ${emailAddress.toLowerCase()} is already associated with an existing account.`
				);
			}
		}

		const result = await db.query(
			`UPDATE users
			SET email_address = $2, first_name = $3, last_name = $4
            WHERE id = $1
            RETURNING id, email_address AS "emailAddress", first_name AS "firstName", last_name AS "lastName"`,
			[ id, emailAddress.toLowerCase(), firstName, lastName ]
		);
		const user = result.rows[0];
		return user;
	}

	/** REMOVE
	 * Deletes a user from the database.
     * 
	 * Accepts: id
     * Returns: (nothing)
     * 
	 * Throws NotFoundError if user does not exist.
     */
	static async remove(id) {
		const result = await db.query(
			`DELETE FROM users
            WHERE id = $1
            RETURNING id`,
			[ id ]
		);
		const user = result.rows[0];
		if (!user) throw new NotFoundError(`There is no user with id ${id}.`);
	}
}

module.exports = User;
