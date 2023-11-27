const express = require("express");

const bcrypt = require("bcrypt");
const fs = require("fs");
const session = require("express-session");

// Create the Express app
const app = express();

// Use the 'public' folder to serve static files
app.use(express.static("public"));

// Use the json middleware to parse JSON data
app.use(express.json());

// Use the session middleware to maintain sessions
const chatSession = session({
    secret: "game",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { maxAge: 300000 }
});
app.use(chatSession);

// This helper function checks whether the text only contains word characters
function containWordCharsOnly(text) {
    return /^\w+$/.test(text);
}

// Handle the /register endpoint
app.post("/register", (req, res) => {
    // Get the JSON data from the body
    const { username, password } = req.body;

    //
    // D. Reading the users.json file
    //
    const users = JSON.parse(fs.readFileSync("data/users.json"));

    //
    // E. Checking for the user data correctness
    //
    if (username === '') res.json({ status: "error", error: "The username cannot be empty." });
    if (password === '') res.json({ status: "error", error: "The password cannot be empty." });

    if (!containWordCharsOnly(username)) res.json({ status: "error", error: "The username can contain only underscores, letters or number" });

    if (username in users) res.json({ status: "error", error: "The username has already existed in the current list of users" });

    //
    // G. Adding the new user account
    //
    const hash = bcrypt.hashSync(password, 10);
    users[username] = { "avatar": "&#128057;", "name": username, "password": hash };
    //
    // H. Saving the users.json file
    //
    fs.writeFileSync("data/users.json", JSON.stringify(users, null, " "));

    //
    // I. Sending a success response to the browser
    //
    res.json({ status: "success" });

  });

// Handle the /signin endpoint
app.post("/signin", (req, res) => {
    // Get the JSON data from the body
    const { username, password } = req.body;

    //
    // D. Reading the users.json file
    //
    const users = JSON.parse(fs.readFileSync("data/users.json"));
    
    //
    // E. Checking for username/password
    //  
    if (!(username in users)) res.json({ status: "error", error: "This username is not registered yet" });
    const hash = users[username].password;

    if (!bcrypt.compareSync(password, hash)) res.json({ status: "error", error: "Wrong Password" });

    //
    // G. Sending a success response with the user account
    //
    const save_user = { "username": username, "avatar": users[username].avatar, "name": users[username].name };
    req.session.user = save_user;
    res.json({ status: "success", user: save_user });

});

// Handle the /validate endpoint
app.get("/validate", (req, res) => {

   
    const current_user = req.session.user;
    // B. Getting req.session.user
    //eq.session.user;

    //
    // D. Sending a success response with the user account
    //
    if (current_user == null) res.json({ status: "error", error: "There is no current user logged in" });

    const save_user = { "username": current_user.username, "avatar": current_user.avatar, "name": current_user.name };
    res.json({ status: "success", user: save_user });

    // Delete when appropriate
    // res.json({ status: "error", error: "This endpoint is not yet implemented." });
});

// Handle the /signout endpoint
app.get("/signout", (req, res) => {

    //
    // Deleting req.session.user
    //
    delete req.session.user;

    //
    // Sending a success response
    //
    res.json({ status: "success" });

});


//
// ***** Please insert your Lab 6 code here *****
const { createServer } = require("http");
const { Server } = require("socket.io");
const httpServer = createServer(app);
const io = new Server(httpServer);
io.use((socket, next) => {
    chatSession(socket.request, {}, next);
});

const onlineUsers = {};
let players = { player1: null, player2: null };


// Game server timer logic
const totalGameTime = 20; // Total game time in seconds
const gemMaxAge = 3000;
let gem;
let connectedClients = 0;

function startGameTimer() {
    let gameStartTime = Date.now();
    // Update the timer every second
    const timer = setInterval(() => {
        let gameTimeSoFar = Math.floor((Date.now() - gameStartTime) / 1000);
        let timeRemaining = totalGameTime - gameTimeSoFar;
        if (timeRemaining <= 0) {
            connectedClients = 0;
            clearInterval(timer);
            io.emit('gameEvent', { gameEvent: 'endGame', value: null });
        } else {
            io.emit('gameEvent', { gameEvent: 'updateTimer', value: timeRemaining });
            if(gem) {
                const currentTime = Date.now();
                const gemAge = currentTime - gem.birthTime;
                if (gemAge >= gemMaxAge) {
                    gem = randomGem();
                    io.emit('gameEvent', { gameEvent: 'randomGem', value: { x: gem.x, y: gem.y, color: gem.color } });
                }
            } else{
                gem = randomGem();
                io.emit('gameEvent', { gameEvent: 'randomGem', value: { x: gem.x, y: gem.y, color: gem.color } });
            }
        }
    }, 1000);
}

function startGame() {
    io.emit('gameEvent', { gameEvent: 'startGame', value: null });
    // Start the game timer
    startGameTimer();
}

const gameArea = {
    top: 60,
    left: 60,
    bottom: 700,
    right: 800,
};

const colors = ["green", "red", "yellow", "purple"];

const randomGem = function() {
    const x = gameArea.left + (Math.random() * (gameArea.right - gameArea.left));
    const y = gameArea.top + (Math.random() * (gameArea.bottom - gameArea.top));
    const color = colors[Math.floor(Math.random() * 4)];
        let birthTime = Date.now();
    return {x, y, color, birthTime};
};



io.on("connection", (socket) => {
    if (socket.request.session.user != null) {
        // update the online users' list when a new user connected
        onlineUsers[socket.request.session.user.username] = { "avatar": socket.request.session.user.avatar, "name": socket.request.session.user.name };

        // send the online users' list to browser
        socket.on("get users", () => {
            socket.emit("users", JSON.stringify(onlineUsers));
        });

        // chatroom content
        const chatroom = JSON.parse(fs.readFileSync("data/chatroom.json"));
        socket.on("get messages", () => {
            socket.emit("messages", JSON.stringify(chatroom));
        });

        socket.on("post message", (content) => {
            const chat_details = { "user": socket.request.session.user, "datetime": new Date(), "content": content };
            chatroom.push(chat_details);
            // console.log(chatroom);
            fs.writeFileSync("data/chatroom.json", JSON.stringify(chatroom, null, " "));
            io.emit("add message", JSON.stringify(chat_details));
        });

        socket.on("typing", () => {
            io.emit("add typing", socket.request.session.user.name);
        });

        socket.on("remove typing", () => {
            io.emit("remove typing message");
        });


        // disconnection
        socket.on("disconnect", () => {
            delete onlineUsers[socket.request.session.user.username];
            io.emit("remove user", JSON.stringify(socket.request.session.user));

            //Delete Players
            players['player1'] = null;
            players['player2'] = null;

            //clear chatroom Data
            const emptyData = []
            fs.writeFileSync('data/chatroom.json', JSON.stringify(emptyData));

        });

        socket.on("join game", (player) => {
            if (player.id == 0) {
                players.player1 = player.name;
            }
            else if (player.id == 1) {
                players.player2 = player.name;
            }
            connectedClients++
            if(connectedClients === 2) {
                startGame();
            }
            io.emit("ready join game", { name: player.name, id: player.id });
        });

        socket.on("get players name", () => {
            io.emit("get players name", players);
        });
        
        socket.on("get ranking", () => {
            let rankingData = JSON.parse(fs.readFileSync("data/rankings.json"));
            socket.emit("get ranking", rankingData);
        });

        socket.on("restart", (players) => {
            //Clear User Data
            players["player1"] = null;
            players["player2"] = null;
            // Clear chatroom Data
            // let chatroomData = JSON.parse(fs.readFileSync("data/chatroom.json"));s
            const emptyData = []
            fs.writeFileSync('data/chatroom.json', JSON.stringify(emptyData));
            
            io.emit("restart", players);
        });

        socket.on("playerBehaviour", (data) => {
            if(data.behaviour === "collect gem") {
                gem = randomGem();
                io.emit('gameEvent', { gameEvent: 'randomGem', value: { x: gem.x, y: gem.y, color: gem.color } });
                io.emit("playerBehaviour", { playerID: data.playerID, behaviour: data.behaviour, direction: data.direction });
            } else {
                setTimeout(function () {
                    io.emit("playerBehaviour", { playerID: data.playerID, behaviour: data.behaviour, direction: data.direction });
                }, 10);
            }
        });

        socket.on("gameEvent", (data) => {
            if(data.gameEvent ==="end game"){
                // let rankingData = JSON.parse(fs.readFileSync("data/rankings.json"));
                // let playerName = players;
                // //existing player
                // if (rankingData[player]){
                //     rankingData[player] += data.value.player1score;
                // }
                // //new player
                // else {
                //     rankingData[player] = data.value.player1score;
                // }
                // fs.writeFileSync("data/rankings.json", JSON.stringify(rankingData));
                // io.emit("end game", data);
                // players["player1"] = null;
                // players["player2"] = null;
            } else{
                setTimeout(function () {
                    io.emit("gameEvent", { gameEvent: data.gameEvent, value: data.value});
                }, 10);
            }
        });

        socket.on('startGame', () => {
            startGame();
        });
    }
});

// Use a web server to listen at port 8000
httpServer.listen(8000, () => {
    console.log("The game has started...");
});

