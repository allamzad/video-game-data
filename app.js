/*
 * Name: Allam Amzad
 * Email: aamzad@caltech.edu
 * Date: 6/2/2024
 * 
 * This file implements the Game Data API for the Video 
 * Game Data website, where users can choose from a 
 * dropdown that allows them to pick between receiving ranking
 * data based on a query, a specific game's rank, or a randomized
 * game recommendation. This app.js file uses the vgsales.csv
 * and imdb-videogames.csv data files to return JSON and 
 * plain-text objects based on the users game-related queries.
 */

"use strict";
// 1. Load required modules
const express = require("express");
const fs = require("fs/promises");
const cors = require("cors");
const parse = require('csv-parse/sync');

const app = express();
app.use(express.static("public"));
app.use(cors());

// Number of games in the sales data csv file.
const NUM_GAME_SALES = 16600;
// Number of games in the IMDB video game summary csv file.
const NUM_GAME_RECOMMENDATIONS = 20802;
const CLIENT_ERR_CODE = 400;
const SERVER_ERR_CODE = 500;
// Limit is out of bounds.
const LIMIT_ERROR = "Limit parameter invalid.";
// No name is provided when one is required.
const NAME_ERROR = "No video game name provided."
const SERVER_ERROR = "An error ocurred on the server, please try again later.";
// Headers for the vgsales.csv file.
const SALES_HEADERS = ["Rank", "Name", "Platform", "Year", "Genre", "Publisher", 
                 "NA_Sales", "EU_Sales", "JP_Sales", "Other_Sales", "Global_Sales"]; 
// Headers for the imdb-videogames.csv file.
const REC_HEADERS = ["index", "name", "url", "year", "certificate", "rating",
                     "votes", "plot", "Action", "Adventure", "Comedy", "Crime", "Family", 
                     "Fantasy", "Mystery", "Sci-Fi", "Thriller"];

/**
 * Returns a JSON object containing all the games in order of rank based
 * on the user query from the vgsales.csv file.
 * Example: For queries Genre="Sports" Publisher="Activision", Platform="X360" 
 * all Xbox 360 Activision Sports games will be returned in order of rank.
 */
app.get("/rank", async (req, res) => {
    try {
        const csvContent = await fs.readFile('data/vgsales.csv');
        const records = parse.parse(csvContent, {delimiter: ',', from_line: 2, 
                                    columns: SALES_HEADERS, 
                                    on_record: (record) => getGameRank(record, req.query)
        });
        res.json(records);
    } catch(err) {
        res.status(SERVER_ERR_CODE).send(SERVER_ERROR);
    }
});

/**
 * Returns a JSON object containing up to LIMIT games in order of rank based
 * on the user query from the vgsales.csv file.
 * Example: For LIMIT=100 and query Publisher="Nintendo", up to the top 100 
 * Nintendo games will be returned in order of rank.
 */
app.get("/rank/:limit", async (req, res) => {
    try {
        let rankLimit = Number(req.params.limit);
        if (rankLimit < 1 || rankLimit > NUM_GAME_SALES) {
            res.status(CLIENT_ERR_CODE).send(LIMIT_ERROR);
        }

        const csvContent = await fs.readFile('data/vgsales.csv');
        const records = parse.parse(csvContent, {delimiter: ',', from_line: 2, columns: SALES_HEADERS, 
                                    on_record: (record) => getGameRank(record, req.query)
        });

        res.json(records.slice(0, rankLimit));
    } catch(err) {
        res.status(SERVER_ERR_CODE).send(SERVER_ERROR);
    }
});

/**
 * Returns a JSON object containing the rank record from the vgsales.csv
 * for the game named GAMENAME.
 * Example: For GAMENAME = "Super Mario Galaxy 2", the funcction will return
 * {
 *   "Rank": "92",
 *   "Name": "Super Mario Galaxy 2",
 *   "Platform": "Wii",
 *   "Year": "2010",
 *   "Genre": "Platform",
 *   "Publisher": "Nintendo",
 *   "NA_Sales": "3.66",
 *   "EU_Sales": "2.42",
 *   "JP_Sales": "0.98",
 *   "Other_Sales": "0.64",
 *   "Global_Sales": "7.69"
 * }
 */
app.get("/game/:gamename", async (req, res) => {
    let gameName = req.params.gamename.toLowerCase();
    try {
        if (!gameName) {
            res.status(CLIENT_ERR_CODE).send(NAME_ERROR);
        }
        const csvContent = await fs.readFile('data/vgsales.csv');
        const records = parse.parse(csvContent, {delimiter: ',', columns: SALES_HEADERS, 
                        on_record: record => getSpecificGameRank(record, gameName, req.query)});
        res.json(records);
    } catch(err) {
        res.status(SERVER_ERR_CODE).send(SERVER_ERROR);
    }
});

/**
 * Returns a plain-text response of the game from the imdb-videogames.csv
 * file from row INDEX.
 * Example: Index = 0 returns "Spider-Man".
 */
app.get("/recommendation/:index", async (req, res) => {
    let index = req.params.index;
    try {
        if (index < 0 || index > NUM_GAME_RECOMMENDATIONS) {
            res.status(CLIENT_ERR_CODE).send(LIMIT_ERROR);
        }
        const csvContent = await fs.readFile('data/imdb-videogames.csv');
        const records = parse.parse(csvContent, {delimiter: ',', columns: REC_HEADERS, 
                                    from_line: index, to_line: index});
        const gameName = records[0]["name"] + "\n";
        res.type("text");
        res.send(gameName);
    } catch(err) {
        res.status(SERVER_ERR_CODE).send(SERVER_ERROR);
    }
});

// -------------------- Helper Functions for Endpoints -------------------- //

/**
 * Checks that the record matches all of the user inputted queries
 * for the rank API endpoint, if entered.
 * @param record - the row from the vgsales.csv file
 * @param query - all the queries from the user
 * @returns - the record if satisfies all queries or null otherwise.
 */
function getGameRank(record, query) {
    /* Checks the record matches the year query. */
    if (query["year"]) {
        if (record["Year"] !== query["year"]) {
            return null;
        }
    }

    /* Checks the record matches the genre query. */
    if (query["genre"]) {
        const genre = query["genre"].toLowerCase();
        if (record["Genre"].toLowerCase() !== genre) {
            return null;
        }
    }

    /* Checks the record matches the publisher query. */
    if (query["publisher"]) {
        const publisher = query["publisher"].toLowerCase();
        if (record["Publisher"].toLowerCase() !== publisher) {
            return null;
        }
    }

    /* Checks the record matches the platform query. */
    if (query["platform"]) {
        const platform = query["platform"].toLowerCase();
        if (record["Platform"].toLowerCase() !== platform) {
            return null;
        }
    }

    return record;
}

/**
 * Checks that the record matches all of the user inputted queries
 * for the game rank endpoint.
 * @param record - the row from the vgsales.csv file
 * @param gameName - the specific game entered by the user
 * @param query - all the queries from the user
 * @returns - the record if satisfies all queries or null otherwise
 */
function getSpecificGameRank(record, gameName, query) {
    if (record["Name"].toLowerCase() != gameName) {
        return null;
    }

    if (query["platform"]) {
        const platform = query["platform"].toLowerCase();
        if (record["Platform"].toLowerCase() !== platform) {
            return null;
        }
    }

    return record;
}

// 3. Start the app on an open port.
const PORT = process.env.PORT || 8000;
app.listen(PORT);