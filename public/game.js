/*
 * Name: Allam Amzad
 * Email: aamzad@caltech.edu
 * Date: 6/2/2024
 * 
 * This file implements the functionality for the Video 
 * Game Data website, where users can choose from a 
 * dropdown that allows them to pick between receiving ranking
 * data based on a query, a specific game's rank, or a randomized
 * game recommendation. This game.js file fetches from game-app.js 
 * and the RAWG API for data using the user inputted queries and 
 * generates a table or card featuring the information.
 */

(function() {
    "use strict";

    // Game Sales Data API URL (created for this project).
    const GAME_BASE_URL = "https://aqueous-beach-11282-e6868d87ba6b.herokuapp.com/";

    // RAWG API Credientials.
    const RAWG_BASE_URL = "https://api.rawg.io/api/"
    const RAWG_API_KEY = "9d115472ee1e4d5f9df6bf5c1c645444";
    // Number of games in the IMDB video game summary csv file.
    const NUM_GAME_RECOMMENDATIONS = 20802;

    // Headers of the the game sales data csv file.
    const SALES_HEADERS = ["Rank", "Name", "Platform", "Year", "Genre", "Publisher", 
                 "NA_Sales", "EU_Sales", "JP_Sales", "Other_Sales", "Global_Sales"]; 

    // Maximum index of header relevant to game information.
    const GAME_INFO_HEADER_IDX_MAX = 5;
    // Minimum index of header relevant to sales information.
    const SALES_INFO_HEADER_IDX_MIN = 6;

    /**
     * Initializes the buttons for data requests and the back button for navigation.
     * @returns none
     */
    function init() {
        qs("#data-submit-btn").addEventListener("click", loadData);
        qs("#rank-search-btn").addEventListener("click", genRankingsTable);
        qs("#game-search-btn").addEventListener("click", genGameCard);
        qs("#game-rec-btn").addEventListener("click", genRecommendationCard);
        qs("#back-btn").addEventListener("click", clearDataSection);
    }

    /* ------------------------------ RAWG API Functions ------------------------------ */  

    /**
     * Fetches a game's information (background image, rating, release date, etc.) 
     * from the RAWG Video Game Database. Called by the Game Recommendation system
     * with the input being randomized from the IMDb video game dataset.
     * @param name - the random game from the IMDb video game dataset.
     * @returns the Promise object containing the games information.
     */
    async function searchGameInformation(name) {
        let resp = await fetch(RAWG_BASE_URL + "games" + "?key=" + RAWG_API_KEY 
                               + "&search=" + name + "&search_precise=true", {
            method: "GET"
        })
        .then(checkStatus)
        .then(response => response.json())
        .then(data => data.results[0])
        .catch(handleRawgError);
        return resp;
    }

    /* --------------------- Custom Game Sales API Functions ----------------------- */  

    /**
     * Fetches ALL games' rankings and sales from Ulrik Thyge Pederse's
     * Kaggle Video Game Sales dataset based on the user's queries. 
     * @returns the Promise object containing the games' sales info.
     */
    async function getRankings(queryURL) {
        let resp = await fetch(GAME_BASE_URL + "rank/" + queryURL, {
            method: "GET"
        })
        .then(checkStatus)
        .then(response => response.json())
        .catch(handleGameDataError);
        return resp;
    }

    /**
     * Fetches up to LIMIT games' rankings and sales from Ulrik Thyge Pederse's
     * Kaggle Video Game Sales dataset based on the user's queries. 
     * @returns the Promise object containing the games' sales info.
     */
    async function getLimitedRankings(queryURL, limit) {
        let resp = await fetch(GAME_BASE_URL + "rank/" + limit + "/" + queryURL, {
            method: "GET"
        })
        .then(checkStatus)
        .then(response => response.json())
        .catch(handleGameDataError);
        return resp;
    }

    /**
     * Fetches a game's ranking and sales from Ulrik Thyge Pederse's
     * Kaggle Video Game Sales dataset. 
     * @returns the Promise object containing the game's sales info.
     */
    async function getGameRanking(queries) {
        const game = queries[0];
        const platform = queries[1];
        let resp = await fetch(GAME_BASE_URL + "game/" + game + 
                               "?platform=" + platform, {
            method: "GET"
        })
        .then(checkStatus)
        .then(response => response.json())
        .catch(handleGameDataError);
        return resp;
    }

    /**
     * Fetches a random game from the IMDB video game summary csv file
     * and returns the game's name.
     * @returns the Promise object containing the recommended game's info.
     */
    async function getGameRecommendation() {
        const randomGame = getRandomInt(NUM_GAME_RECOMMENDATIONS);
        let resp = await fetch(GAME_BASE_URL + "recommendation/" + randomGame, {
            method: "GET"
        })
        .then(checkStatus)
        .then(response => response.text())
        .catch(handleGameDataError);
        return resp;
    }

    /* --------------------- API Parameter Parsing Functions ----------------------- */  

    /**
     * Builds the query part of the URL for the ranking fetch.
     * Ex: "?year=1999&publisher=nintendo"
     * @returns {String} - the segment of the fetch URL containing queries.
     */
    function getRankingQueries() {
        let queryURL = "";
        let firstQuery = true;
        const year = qs("#rank-year").value;
        [queryURL, firstQuery] = queryURLBuilder("year", year, queryURL, firstQuery);
        const genre = qs("#rank-genre").value;
        [queryURL, firstQuery] = queryURLBuilder("genre", genre, queryURL, firstQuery);
        const publisher = qs("#rank-publisher").value;
        [queryURL, firstQuery] = queryURLBuilder("publisher", publisher, queryURL, firstQuery);
        const platform = qs("#rank-platform").value;
        [queryURL, firstQuery] = queryURLBuilder("platform", platform, queryURL, firstQuery);
        return queryURL;
    }

    /**
     * Gets the game parameter and the platform query if specified.
     * @returns {Array} - the game parameter and platform query
     */
    function getGameQueries() {
        const game = qs("#game-game").value;
        const platform = qs("#game-platform").value;
        return [game, platform];
    }

    /* --------------------- API Table/Card Generation Functions ----------------------- */  

    /**
     * Hides all the data related query divs, reveals the data selection dropdown,
     * and hides the back button.
     */
    function clearDataSection() {
        const allDataDivs = qsa("#video-game-data > div");
        for (let i = 0; i < allDataDivs.length; i++) {
            allDataDivs[i].classList.add("hidden");
        }
        qs("#data-selection").classList.toggle("hidden");
        qs("#back-btn").classList.toggle("hidden");
    }

    /**
     * Generates a row of the ranking table.
     * @param {String} rankingInfo - information about a game's rank
     * @returns {DOMElement} - the row containing game's information for the Rankings table
     */
    function genRankingTableEntry(rankingInfo) {
        const rankingRow = gen("tr");
        for (let i = 0; i < SALES_HEADERS.length; i++) {
            let rankingCell = gen("td");
            rankingCell.textContent = rankingInfo[SALES_HEADERS[i]];
            rankingRow.appendChild(rankingCell);
        }
        return rankingRow;
    }

    /**
     * Generates the header of the Rankings table.
     * @returns {DOMElement} - the row containing the headers for the Rankings table
     */
    function genRankingTableHeader() {
        const rankingRow = gen("tr");
        for (let i = 0; i < SALES_HEADERS.length; i++) {
            let rankingCell = gen("td");
            rankingCell.textContent = SALES_HEADERS[i];
            rankingRow.appendChild(rankingCell);
        }
        return rankingRow;
    }

    /**
     * Adds the user requested data to the Video Game Data section.
     */
    function addDataToSection(data) {
        const dataSection = qs("#video-game-data");
        dataSection.appendChild(data);  
    }

    /**
     * Removes the table featuring the rank of games based on the user's
     * queries.
     */
    function removeRankingsTable() {
        const rankingsTable = qs("#rankings-table");
        rankingsTable.remove();
        qs("#back-btn").removeEventListener("click", removeRankingsTable);
    }

    /**
     * Generates a table featuring the rank of games based on the user's
     * queries.
     */
    async function genRankingsTable() {
        const queries = getRankingQueries();
        const limit = qs("#rank-limit").value;
        let ranking;
        if (limit) {
            ranking = await getLimitedRankings(queries, limit);
        } else {
            ranking = await getRankings(queries);
        }
        qs("#rank-request").classList.toggle("hidden");
        const rankingsTable = gen("table");
        rankingsTable.id = "rankings-table";
        qs("#back-btn").addEventListener("click", removeRankingsTable); 
        rankingsTable.appendChild(genRankingTableHeader());
        for (let i = 0; i < ranking.length; i++) {
            let rankingEntry = genRankingTableEntry(ranking[i]);
            rankingsTable.appendChild(rankingEntry);
        }   
        addDataToSection(rankingsTable);
    }

    /**
     * Removes the card featuring the rank of a video game in terms
     * of its sales.
     */
    function removeGameCard() {
        const gameCard = qs("#game-card");
        gameCard.remove();
        qs("#back-btn").removeEventListener("click", removeGameCard);
    }

    /**
     * Generates a card featuring the rank of a video game in terms
     * of its sales.
     */
    async function genGameCard() {
        const queries = getGameQueries();
        let game = await getGameRanking(queries);
        if (game.length > 1) {
            game = game[0];
        }
        qs("#game-rank").classList.toggle("hidden");
        const gameCardDiv = gen("div");
        gameCardDiv.id = "game-card";
        const gameCardHeader = gen("h2");
        gameCardHeader.textContent = "Rank " + game["Rank"] + ": " + game["Name"];
        const gameCardInfoDiv = gen("div");
        gameCardInfoDiv.id = "game-card-info";
        const gameInfoDiv = gen("div");
        gameInfoDiv.id = "game-info";
        for (let i = 2; i < GAME_INFO_HEADER_IDX_MAX; i++) {
            let gameInfo = gen("p");
            gameInfo.textContent = SALES_HEADERS[i] + ": " + game[SALES_HEADERS[i]];
            gameInfoDiv.appendChild(gameInfo);
        }
        const salesInfoDiv = gen("div");
        salesInfoDiv.id = "sales-info";
        for (let i = SALES_INFO_HEADER_IDX_MIN; i < SALES_HEADERS.length; i++) {
            let salesInfo = gen("p");
            salesInfo.textContent = SALES_HEADERS[i] + ": " + game[SALES_HEADERS[i]];
            salesInfoDiv.appendChild(salesInfo);
        }
        gameCardInfoDiv.appendChild(gameInfoDiv);
        gameCardInfoDiv.appendChild(salesInfoDiv);
        gameCardDiv.appendChild(gameCardHeader);
        gameCardDiv.appendChild(gameCardInfoDiv);
        addDataToSection(gameCardDiv);
        qs("#back-btn").addEventListener("click", removeGameCard); 
    }

    /**
     * Removes the card with a recommended game's information.
     */
    function removeRecCard() {
        const recCard = qs("#rec-card");
        recCard.remove();
        qs("#back-btn").removeEventListener("click", removeRecCard);
    }

    /**
     * Generates a card with a recommended game's information.
     */
    async function genRecommendationCard() {
        const recommendation = await getGameRecommendation();
        const recInformation = await searchGameInformation(recommendation);
        qs("#game-rec").classList.toggle("hidden");
        const recCardDiv = gen("div");
        recCardDiv.id = "rec-card";
        const recCardHeader = gen("h2");
        recCardHeader.textContent = recInformation.name;
        const recCardImage = gen("img");
        recCardImage.src = recInformation.background_image;
        recCardImage.alt = "Background image from: " + recInformation.name;
        const recCardRating = gen("p");
        recCardRating.textContent = "Rating: " + recInformation.rating;
        const recCardReleaseDate = gen("p");
        recCardReleaseDate.textContent = "Release date: " + recInformation.released;
        recCardDiv.appendChild(recCardHeader);
        recCardDiv.appendChild(recCardImage);
        recCardDiv.appendChild(recCardRating);
        recCardDiv.appendChild(recCardReleaseDate);
        addDataToSection(recCardDiv);
        qs("#back-btn").addEventListener("click", removeRecCard);
    }

    /* --------------------- Section Generation/Clearing Functions ----------------------- */  

    /**
     * Loads the section with the queries for the data that the user wishes to view.
     */
    function loadData() {
        const dropdown = qs("#data-dropdown");
        const dataValue = dropdown.value;
        clearDataSection();
        if (dataValue == "all-rankings") {
            qs("#rank-request").classList.toggle("hidden");
        } else if (dataValue == "game-rank") {
            qs("#game-rank").classList.toggle("hidden");
        } else {
            qs("#game-rec").classList.toggle("hidden");
        }
        qs("#data-selection").classList.toggle("hidden");
    }

    /* ------------------------------ Helper Functions ------------------------------ */  

    /**
     * Generates the query part of the URL based upon the querying input rules.
     * @param {String} queryText - query name
     * @param {String} query - query value
     * @param {String} queryURL - query URL (ex: "?year=1999&genre=sports")
     * @param {Boolean} firstQuery - if the query is the first thus far in the URL
     * @returns {Array} - the updated queryURL and firstQuery value
     */
    function queryURLBuilder(queryText, query, queryURL, firstQuery) {
        if (query) {
            if (firstQuery) {
                queryURL += "?"
                firstQuery = false;
            } else {
                queryURL += "&"
            }
            queryURL += queryText + "=" + query;
        }
        return [queryURL, firstQuery];
    }

    /**
     * Generates a random integer from 0 to max.
     * @param {Number} max - maximum random integer that can be randomly generated.
     * @returns the random integer from 0 to max.
     */
    function getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }

    /* -------------------- Custom Error-handling -------------------- */  

    /**
     * Displays an Game Data API error message on the page, hiding any previous results.
     * If errMsg is passed as a string, the string is used to customize an error message.
     * Otherwise (the errMsg is an object or missing), a generic message is displayed.
     * @param {String} errMsg - optional specific error message to display on page.
     */
    function handleGameDataError(errMsg) {
        if (typeof errMsg === "string") {
            qs("#message-area").textContent = errMsg;
        } else {
            /* The err object was passed, don't want to show it on the page;
               instead use generic error message. */
            qs("#message-area").textContent =
                "An error ocurred fetching the Game Data data. Please try again later.";
        }
        qs("#message-area").classList.remove("hidden");
    }

    /**
     * Displays an RAWG API error message on the page, hiding any previous results.
     * If errMsg is passed as a string, the string is used to customize an error message.
     * Otherwise (the errMsg is an object or missing), a generic message is displayed.
     * @param {String} errMsg - optional specific error message to display on page.
     */
    function handleRawgError(errMsg) {
        if (typeof errMsg === "string") {
            qs("#message-area").textContent = errMsg;
        } else {
            /* The err object was passed, don't want to show it on the page;
               instead use generic error message. */
            qs("#message-area").textContent =
                "An error ocurred fetching the RAWG data. Please try again later.";
        }
        qs("#message-area").classList.remove("hidden");
    }

    init();
})();