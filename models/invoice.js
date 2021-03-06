'use strict';

const db = require('../db');
const { BadRequestError, NotFoundError } = require('../expressError');
const { checkRestaurantExists, checkInvoiceExists } = require('../helpers/checkExist');

class Invoice {
	/** REGISTER
     * Adds an invoice to the database.
     * 
     * Accepts: {restaurantId, date, invoice, vendor, total, notes}
     * Returns: {id, restaurantId, date, invoice, vendor, total, notes}
     * 
     * Throws BadRequestError if name is a duplicate.
     */
	static async register({ restaurantId, date, invoice, vendor, total, notes }) {
		await checkRestaurantExists(restaurantId);

		const duplicateCheck = await db.query(
			`SELECT restaurant_id, vendor, invoice
            FROM invoices
            WHERE restaurant_id = $1 AND vendor = $2 AND invoice = $3`,
			[ restaurantId, vendor, invoice ]
		);

		if (duplicateCheck.rows[0]) throw new BadRequestError(`Invoice already exists.`);

		const result = await db.query(
			`INSERT INTO invoices (restaurant_id, date, invoice, vendor, total, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, restaurant_id AS "restaurantId", date, invoice, vendor, total, notes`,
			[ restaurantId, date, invoice, vendor, total, notes ]
		);
		return result.rows[0];
	}

	/** GET 
	 * Get a single invoice by ID.
	 * 
	 * Accepts: id
	 * Returns: {id, restaurantId, date, invoice, vendor, total, notes}
	 * 
	 * Throws NotFoundError if invoice does not exist.
	 */
	static async get(id) {
		const result = await db.query(
			`SELECT id, restaurant_id AS "restaurantId", date, invoice, vendor, total, notes
			FROM invoices
			WHERE id = $1`,
			[ id ]
		);
		const invoice = result.rows[0];
		if (!invoice) throw new NotFoundError(`There is no invoice with the id ${id}.`);
		return invoice;
	}

	/** GET ALL FOR RESTAURANT
	 * Returns array of all invoices associated with a restaurant.
	 * 
	 * Accepts: restaurantId
	 * Returns: [{id, restaurantId, date, invoice, vendor, total, notes},...]
	 */
	static async getAllForRestaurant(restaurantId) {
		await checkRestaurantExists(restaurantId);

		const result = await db.query(
			`SELECT id, restaurant_id AS "restaurantId", date, invoice, vendor, total, notes
			FROM invoices
			WHERE restaurant_id = $1`,
			[ restaurantId ]
		);
		return result.rows;
	}

	/** GET DATE RANGE FOR RESTAURANT
	 * Returns array of all invoice in a given date range associated with a restaurant.
	 * 
	 * Accepts: restaurantId, startDate, endDate
	 * Returns: [{id, restaurantId, date, invoice, vendor, total, notes},...]
	 */
	static async getDatesForRestaurant(restaurantId, startDate, endDate) {
		await checkRestaurantExists(restaurantId);

		const result = await db.query(
			`SELECT id, restaurant_id AS "restaurantId", date, invoice, vendor, total, notes
			FROM invoices
			WHERE restaurant_id = $1 AND date >= $2 AND date <= $3`,
			[ restaurantId, startDate, endDate ]
		);
		return result.rows;
	}

	/** UPDATE
	 * Replace date, invoice, vendor, total, notes for an invoice.
	 * 
	 * Accepts: id, {date, invoice, vendor, total, notes}
	 * Returns: {id, restaurantId, date, invoice, vendor, total, notes}
	 */
	static async update(id, { date, invoice, vendor, total, notes }) {
		await checkInvoiceExists(id);

		const result = await db.query(
			`UPDATE invoices
			SET date = $1, invoice = $2, vendor = $3, total = $4, notes = $5
			WHERE id = $6
			RETURNING id, restaurant_id as "restaurantId", date, invoice, vendor, total, notes`,
			[ date, invoice, vendor, total, notes, id ]
		);
		return result.rows[0];
	}

	/** REMOVE
	 * Deletes an invoice from the database.
	 * 
	 * Accepts: id
	 * Returns: (nothing)
	 * 
	 * Throws NotFoundError if invoice does not exist.
	 */
	static async remove(id) {
		const result = await db.query(
			`DELETE FROM invoices
			WHERE id = $1
			RETURNING id`,
			[ id ]
		);
		const category = result.rows[0];
		if (!category) throw new NotFoundError(`There is no invoice with id ${id}.`);
	}
}

module.exports = Invoice;
