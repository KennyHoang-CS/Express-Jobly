"use strict";

const { query } = require("express");
const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
   /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, companyHandle }
   *
   * Returns { id, title, salary, equity, companyHandle }
   **/

    static async create(data) {
        const result = await db.query(
            `INSERT INTO jobs
            (title, salary, equity, company_handle)
            VALUES
            ($1, $2, $3, $4)
            RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
            [data.title, data.salary, data.equity, data.company_handle]
        );
        let job = result.rows[0];
        return job; 
    }

    /** Find all jobs (optional filter on searchFilters).
   *
   * searchFilters (all optional):
   * - minSalary
   * - hasEquity (true returns only jobs with equity > 0, other values ignored)
   * - title (will find case-insensitive, partial matches)
   *
   * Returns [{ id, title, salary, equity, companyHandle, companyName }, ...]
   * */

    static async findAll(searchFilters = {}) {
        
        // Set up initial query. 
        let query = 
            `SELECT j.id, j.title, j.salary, j.equity, 
            j.company_handle AS "companyHandle", c.name
            FROM jobs j
            LEFT JOIN companies c
            ON c.handle = j.company_handle`;
        
        let queryValues = [];
        let whereExpressions = [];

        // Get search filter values. 
        let { title, minSalary, hasEquity } = searchFilters;

        // Get filter conditions.  
        if (title !== undefined) {
            queryValues.push(`%${title}%`);
            whereExpressions.push(`title ILIKE $${queryValues.length}`);
        }

        if (minSalary !== undefined) {
            queryValues.push(minSalary);
            whereExpressions.push(`salary >= $${queryValues.length}`);
        }

        if (hasEquity === true) {
            whereExpressions.push(`equity > 0`);
        }

        // Finalize the initial query.  
        if (whereExpressions.length > 0) {
            query += ` WHERE ` + whereExpressions.join(' AND ');
        }
        query += ' ORDER BY title';

        // Make the query and return the results. 
        const jobResults = await db.query(query, queryValues);
        return jobResults.rows; 
    }

    /** Given a job id, return data about job.
   *
   * Returns { id, title, salary, equity, companyHandle, company }
   *   where company is { handle, name, description, numEmployees, logoUrl }
   *
   * Throws NotFoundError if not found.
   **/
   static async get(id) {

        // Get data from jobs table.
        const jobResults = await db.query(
            `SELECT  
            id, title, salary, equity, company_handle AS "companyHandle"
            FROM jobs
            WHERE id = $1`,
            [id]
        );
        const job =  jobResults.rows[0];
        
        // Check if job exists.
        if (!job) {
            throw new NotFoundError(`Job ID: ${id} not found.`);
        }
        
        // Get data from companies table.
        const companyResults = await db.query(
            `SELECT handle, name, description, 
            num_employees AS "numEmployees", 
            logo_url AS "logoUrl" 
            FROM companies
            WHERE handle = $1`, [job.companyHandle]
        );
       
        // Remove the duplicate handle from job. 
        delete job.companyHandle; 
        
        // Attach company data to job. 
        job.company = companyResults.rows[0];
        
        return job;
   }

    /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain
   * all the fields; this only changes provided ones.
   *
   * Data can include: { title, salary, equity }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   */
   static async update(id, data) {
        
        // Format JS data into SQL-able data. 
        const { setCols, values } = sqlForPartialUpdate(data, {});

        // Container for id. 
        const _id = '$' + (values.length + 1);

        // The update query. 
        const query = 
            `UPDATE jobs
            SET ${setCols}
            WHERE id = ${_id}
            RETURNING id, title, salary, equity, company_handle AS "companyHandle"`;
        
        // Make a query to jobs table. 
        const updateRes = await db.query(query, [...values, id]);
        const job = updateRes.rows[0];
        
        // If job doesn't exist, throw error. 
        if (!job) {
            throw new NotFoundError(`Job ${id} not found.`);
        }
        
        return job;
   }

   /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/
   static async remove(id) {
       const result = await db.query(
           `DELETE FROM jobs
           WHERE id = $1
           RETURNING id`, [id]
       );

       const job = result.rows[0];

       // If job doesn't exist, throw error. 
       if (!job) {
           throw new NotFoundError(`Job ${id} not found.`);
       }
   }
}

module.exports = Job;