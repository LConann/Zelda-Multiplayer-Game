const Socket = (function () {
    // This stores the current Socket.IO socket
    let socket = null;
    let playerID = null;

    // This function gets the socket from the module
    const getSocket = function () {
        return socket;
    };

    // This function connects the server and initializes the socket
    const connect = function () {
        socket = io();

        socket.on("playerBehaviour", (data) => {
            if (data.behaviour ==="move" || data.behaviour ==="stop" ){
                setTimeout(function () {
                    game.playerBehaviour(data.playerID, data.behaviour, data.direction)
                }, 10);
            }else {
                game.playerBehaviour(data.playerID, data.behaviour, data.direction)
            }
           
        });

        socket.on("gameEvent", (data) => {
            // setTimeout(function () {
                game.gameControl(data.gameEvent, data.value)
            // }, 10);
        });

        // Wait for the socket to connect successfully
        socket.on("connect", () => {
            // Get the online user list
            socket.emit("get users");

            // Get the chatroom messages
            socket.emit("get messages");
        });

        // Set up the messages event
        socket.on("messages", (chatroom) => {
            chatroom = JSON.parse(chatroom);

            // Show the chatroom messages
            ChatPanel.update(chatroom);
        });

        // Set up the add message event
        socket.on("add message", (message) => {
            message = JSON.parse(message);
            // Add the message to the chatroom
            ChatPanel.addMessage(message);
        });

        socket.on("add typing", (name) => {
            // console.log(JSON.stringify(Authentication.getUser()));
            if (Authentication.getUser().name != name)
                $("#chat-input-form").prepend($('<div style="font-style: italic; padding: 6px 10px; font-size: 90%" id="typing-message">' + name + " is typing..." + "</div>"));
        });

        socket.on("remove typing message", () => {
            // console.log("remove typing message");
            $("#typing-message").remove();
        });
        
        socket.on("ready join game", (player) => {
            const player1Button = $("#join-player1");
            const player2Button = $("#join-player2");

            if (player.id === 0) {
                player1Button.html(player.name);
                player1Button.css("background", "#9354fa");
            }
            else if (player.id === 1) {
                player2Button.html(player.name);
                player2Button.css("background", "#9354fa");
            }

            if (player1Button.html() !== "Player 1" && player2Button.html() !== "Player 2") {
                GamePage.show();
                PairUpPage.hide();
                game.start();
            }
        });

        socket.on("get players name", (players) => {
            if (players["player1"] != null) {
                $("#player1-name").html(players["player1"]);
                $("#game-over-player1-name").html(players["player1"]);                
            }
            if (players["player2"] != null) {
                $("#player2-name").html(players["player2"]);
                $("#game-over-player2-name").html(players["player2"]);   
            }
        });

        // socket.on("get ranking", (rankingsData) => {
        //
        //     // we can get the player name and data in html here and store the score in the page
        //     // append both player result to ranking list
        //     // sort and get the top 10 result
        //     // write the need to write the result back the json
        //
        //     console.log("rankingsData:",rankingsData)
        //     const dataArray = Object.entries(rankingsData).map(([name, score]) => ({ name, score }));
        //
        //     // Sort in descending order based on the score
        //     dataArray.sort((a, b) => b.score - a.score);
        //
        //     // Get the tbody element to populate
        //     const rankingList = $('#ranking-list');
        //
        //     // Clear any existing content in the table body
        //     rankingList.empty();
        //
        //     // Populate the table body with the sorted data
        //     dataArray.forEach((item, index) => {
        //         const row = `<tr>
        //             <td>${index + 1}</td>
        //             <td>${item.name}</td>
        //             <td>${item.score}</td>
        //         </tr>`;
        //         rankingList.append(row);
        //     });
        //
        // });

        socket.on("restart", (players) => {
            const player1Button = $("#join-player1");
            const player2Button = $("#join-player2");
            players["player1"] = null
            players["player2"] = null
            // Reset the pair up button
            player1Button.html('Player 1');
            player2Button.html('Player 2');

            $(".pair-up-button").css("background", "rgb(117, 183, 229)");

            //clear chatroom data
            const chatroomArea = $('#chat-area');
            chatroomArea.empty();

            $('#chat-input').val('');

        });

        // all end game logic are here (including showing ranking data and the two current players' data)
        socket.on("end game", (data) => {
            console.log("Updating the end game details");
            $("#game-over-player1-score").text(data.playersScore[0]);
            $("#game-over-player2-score").text(data.playersScore[1]);
            let player1Result = $("#player1-game-result");
            let player2Result = $("#player2-game-result");
            if (data.playersScore[0] < data.playersScore[1]) {
                player1Result.text("Loser");
                player1Result.css("color", "red");
                player2Result.text("Winner");
                player2Result.css("color", "green");
            }
            else if (data.playersScore[0] > data.playersScore[1]) {
                player2Result.text("Loser");
                player2Result.css("color", "red");
                player1Result.text("Winner");
                player1Result.css("color", "green");
            }
            else {
                player2Result.text("Draw");
                player2Result.css("color", "purple");
                player1Result.text("Draw");
                player1Result.css("color", "purple");
            }

            console.log("rankingsData:", data.rankingData)
            // const ranking = Object.entries(data.rankingData).map(([name, score]) => ({ name, score }));
            //
            // // Sort in descending order based on the score
            // ranking.sort((a, b) => b.score - a.score);

            // Convert the object into an array for easier sorting
            const ranking = Object.values(data.rankingData).map((entry) => entry);

            // Sort the ranking array based on score and name
            ranking.sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score; // Sort by score in descending order
                } else {
                    return a.playtime - b.playtime; // Sort by time in ascending order
                }
            });

            // Get the top 10 results or all if the array length is less than 10
            const top10 = ranking.slice(0, Math.min(10, ranking.length));

            console.log(top10);

            // Get the tbody element to populate
            const rankingList = $('#ranking-list');

            // Clear any existing content in the table body
            rankingList.empty();

            // Populate the table body with the sorted data
            top10.forEach((item, index) => {
                const row = `<tr>
                    <td>${index + 1}</td>
                    <td>${item.name}</td>
                    <td>${item.score}</td>
                    <td>${item.playtime}</td>
                </tr>`;
                rankingList.append(row);
            });
        })
    };

    // This function disconnects the socket from the server
    const disconnect = function () {
        socket.disconnect();
        socket = null;
    };

    // This function sends a post message event to the server
    const postMessage = function (content) {
        if (socket && socket.connected) {
            socket.emit("post message", content);
        }
    };

    const typingMessage = (event) => {
        if (socket && socket.connected) {
            if (event == "typing")
                socket.emit("typing");
            else if (event == "remove typing")
                socket.emit("remove typing");
        }
    }

    
    const joinGame = (name, id) => {
        playerID = id;
        game.setUpRole(playerID);
        socket.emit("join game", { name, id });
    }

    const getPlayersName = function () {
        socket.emit("get players name", true);
    }

    const getRanking = function () {
        socket.emit("get ranking", true);
    }

    const restart = function () {
        socket.emit("restart", true);
    }

    const postBehaviour = function (behaviour, direction) {
        if(behaviour ==="move" || behaviour ==="stop" ){
            setTimeout(function () {
                socket.emit("playerBehaviour", { playerID: playerID, behaviour: behaviour, direction: direction });
            }, 10);
        }else{
            socket.emit("playerBehaviour", { playerID: playerID, behaviour: behaviour, direction: direction });
        }
    }

    const postGameEvents = function(gameEvent, value) {
        socket.emit("gameEvent", {gameEvent: gameEvent, value: value});
    }

    // call by game.js (when timeRemaining = 0)
    const endGame = (playersScore) => {
        console.log("socket.endGame");
        socket.emit("end game", {playersScore});
    }

    // // collect gem to server (called by game.js)
    // const collectGem = function (player) {
    //     socket.emit("collect gem", {playerID: playerID});
    // }

    return { getSocket, connect, disconnect, postMessage, typingMessage, joinGame, getPlayersName,
         getRanking, restart, postBehaviour, postGameEvents, endGame};
})();
