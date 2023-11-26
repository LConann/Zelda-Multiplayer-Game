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

        // Wait for the socket to connect successfully
        socket.on("connect", () => {
            // Get the online user list
            socket.emit("get users");

            // Get the chatroom messages
            socket.emit("get messages");
        });

        // Set up the users event
        socket.on("users", (onlineUsers) => {
            onlineUsers = JSON.parse(onlineUsers);

            // Show the online users
            OnlineUsersPanel.update(onlineUsers);
        });

        // Set up the add user event
        socket.on("add user", (user) => {
            user = JSON.parse(user);

            // Add the online user
            OnlineUsersPanel.addUser(user);
        });

        // Set up the remove user event
        socket.on("remove user", (user) => {
            user = JSON.parse(user);

            // Remove the online user
            OnlineUsersPanel.removeUser(user);
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
                player1Button.css("background", "purple");
            }
            else if (player.id === 1) {
                player2Button.html(player.name);
                player2Button.css("background", "purple");
            }
            if (player1Button.html() !== "Player 1" && player2Button.html() !== "Player 2") {
                GamePage.show();
                PariUpPage.hide();
                game.start();
            }
        });

        socket.on("get players name", (players) => {
            if (players["player1"] != null) {
                $("#player1-name").html(players["player1"]);
            }
            if (players["player2"] != null) {
                $("#player2-name").html(players["player2"]);
            }
        });

        socket.on("get ranking", (rankingsData) => {
            console.log("rankingsData:",rankingsData)
            const dataArray = Object.entries(rankingsData).map(([name, score]) => ({ name, score }));
             
            // Sort in descending order based on the score
            dataArray.sort((a, b) => b.score - a.score);

            // Get the tbody element to populate
            const rankingList = $('#ranking-list');

            // Clear any existing content in the table body
            rankingList.empty();

            // Populate the table body with the sorted data
            dataArray.forEach((item, index) => {
                const row = `<tr>
                    <td>${index + 1}</td>
                    <td>${item.name}</td>
                    <td>${item.score}</td>
                </tr>`;
                rankingList.append(row);
            });

        });

        
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
        socket.emit("join game", { name, id });
    }

    const getPlayersName = function () {
        socket.emit("get players name", true);
    }



    const getRanking = function () {
        socket.emit("get ranking", true);
    }



    return { getSocket, connect, disconnect, postMessage, typingMessage, joinGame, getPlayersName,
         getRanking};
})();
