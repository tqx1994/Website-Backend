const express = require('express')
const app = express()
const bodyParser = require('body-parser');
const sql = require("./db.js");
const port = 3000

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: false }));

// return activity details
app.get('/api/user/activities', (req, res) => {
    let activities = [];
    sql.query('SELECT * FROM activity', (err, result) => {
        if (err) {
            res.send({ err: err });
        } else {
            for (let r of result) {
                activities.push({ id: r.id, name: r.name, score: r.score });
            }
            res.json(activities);
        }
    });
});

// insert completed activities
app.post('/api/user/insertactivity', (req, res) => {
    sql.query("INSERT INTO useractivity (userID, activityID) \
    VALUES (" + req.body.userID + "," + req.body.activityID + ")", (err, result) => {
        if (err) {
            res.json({ err: "Unsuccessful" });
            console.log(err);
        }
        else res.json({ success: "Insert successful" });
    })
});

// register account
app.post('/api/user/register', (req, res) => {
    sql.query("SELECT COUNT(email) AS cnt FROM user WHERE email \
    = \"" + req.body.email + "\"", (err, result) => {
        if (err) console.log(err);
        else if (result[0].cnt > 0) res.json({ err: "User already exist" })
        else {
            sql.query("INSERT INTO user (name, email, password) VALUES \
            (\"" + req.body.name + "\",\"" + req.body.email + "\", \
            MD5(\"" + req.body.password + "\"))", (err, result2) => {
                if (err) console.log(err);
                else res.json({ success: "User created", id: result2.insertId });
            });
        }
    });
});
// login account
app.post('/api/user/login', (req, res) => {
    console.log(req.body);
    sql.query("SELECT COUNT(password) AS cnt, id, name FROM user WHERE email \
    = \"" + req.body.email + "\" AND password = MD5(\"" + req.body.password + "\") \
    GROUP BY id, name", (err, result) => {
        if (err) console.log(err);
        else if (result.length > 0) res.send(JSON.stringify({ success: "Login Successful!", id: result[0].id, name: result[0].name }));
        else res.send(JSON.stringify({ err: "Please enter a correct email and password. Note that both fields may be case-sensitive." }))
    });
});
//news feed
app.get('/api/user/feed', (req, res) => {
    sql.query("SELECT AC.score, UA.completeDT, AC.name AS activity, US.name \
    FROM useractivity AS UA INNER JOIN activity AS AC ON AC.id = UA.activityID \
    INNER JOIN userfriend AS UF ON ua.userID = uf.friendID INNER JOIN user AS US ON US.id = UA.userID \
    WHERE YEAR(CURRENT_TIMESTAMP) = YEAR(UA.completeDT)AND MONTH(CURRENT_TIMESTAMP) = MONTH(UA.completeDT) \
    AND DAY(CURRENT_TIMESTAMP) = DAY(UA.completeDT) \
    AND (uf.userID = " + req.query.userid + ") \
    ORDER BY completeDT ASC", (err, result) => {
        if (err) res.json({ err: err });
        else {
            // console.log(result);
            let feed = [];
            for (let r of result) {
                feed.push({ name: r.name, activity: r.activity, score: r.score, time: r.completeDT });
            }

            sql.query("SELECT AC.score, UA.completeDT, AC.name AS activity, US.name \
                        FROM useractivity AS UA INNER JOIN activity AS AC ON AC.id = UA.activityID \
                        INNER JOIN user AS US ON US.id = UA.userID \
                        WHERE YEAR(CURRENT_TIMESTAMP) = YEAR(UA.completeDT)AND MONTH(CURRENT_TIMESTAMP) = MONTH(UA.completeDT) \
                        AND DAY(CURRENT_TIMESTAMP) = DAY(UA.completeDT) \
                        AND (UA.userID = " + req.query.userid + ") \
                        ORDER BY completeDT ASC", (err2, result2) => {
                if (err2) res.json({ err: err2 });
                else {
                    for (let r of result2) {
                        feed.push({ name: r.name, activity: r.activity, score: r.score, time: r.completeDT });
                    }
                    // sort by date
                    feed.sort(function (a, b) {
                        return b.time > a.time;
                    });

                    res.json(feed);
                }
            });
        }
    })
});

//event screen
app.get('/api/user/events', (req, res) => {
    sql.query("SELECT EV.title, US.name, COUNT(P.name) AS participantCount, EV.startTime, \
    EV.endTime, EV.description, EV.location \
    FROM event AS EV INNER JOIN user AS US ON EV.hostID = US.id INNER JOIN user AS P ON EV.participantID = P.id \
    WHERE CURRENT_TIMESTAMP < EV.startTime \
    GROUP BY EV.title, US.name, EV.startTime, EV.endTime, EV.description, EV.location", (err, result) => {
        if (err) res.json({ err: err });
        else {
            console.log(result)
            let feed = [];
            for (let r of result) {
                feed.push({
                    name: r.name, participantCount: r.participantCount,
                    startTime: r.startTime, endTime: r.endTime,
                    description: r.description, title: r.title,
                    location: r.location
                });
            }
            res.json(feed);
        }
    })
});

//leaderboard screen
app.get('/api/user/leaderboard', (req, res) => {
    sql.query("SELECT US.name ,SUM(score) AS score \
    FROM useractivity AS UA INNER JOIN userfriend AS UF ON UF.friendID = UA.userID \
    INNER JOIN user AS US ON US.id = UF.friendID INNER JOIN activity AS AC ON AC.id = UA.activityID \
    WHERE (UF.userID = "+ req.query.userid + ") \
    AND YEAR(CURRENT_TIMESTAMP) = YEAR(UA.completeDT)AND MONTH(CURRENT_TIMESTAMP) = MONTH(UA.completeDT) \
    AND DAY(CURRENT_TIMESTAMP) = DAY(UA.completeDT) \
    GROUP BY UF.friendID \
    ORDER BY score DESC", (err, result) => {
        if (err) res.json({ err: err });
        else {
            let feed = [];
            for (let r of result) {
                var score = result[0].score > 100 ? 100 : result[0].score;
                result[0].score = score;
                feed.push({ name: r.name, score: r.score });
                console.log(feed)
            }
            sql.query("SELECT US.name ,SUM(score) AS score FROM useractivity AS UA \
            INNER JOIN user AS US ON US.id = UA.userID INNER JOIN activity AS AC ON AC.id = UA.activityID \
            WHERE (US.id = 1) AND YEAR(CURRENT_TIMESTAMP) = YEAR(UA.completeDT)AND MONTH(CURRENT_TIMESTAMP) = MONTH(UA.completeDT) \
            AND DAY(CURRENT_TIMESTAMP) = DAY(UA.completeDT) GROUP BY US.id", (err, result2) => {
                if (err) res.json({ err: err });
                else {
                    for (let r of result2) {
                        var score = result2[0].score > 100 ? 100 : result2[0].score;
                        result2[0].score = score;
                        feed.push({ name: r.name, score: r.score });
                    }
                    feed.sort(function (a, b) {
                        return b.score > a.score;
                    });
                    res.json(feed);
                }
            });
        }
    })
});

//create event
app.post('/api/user/createevent', (req, res) => {
    console.log(req.body);
    sql.query("INSERT INTO event (hostID, participantID, title, location, \
        startTime, endTime, description) \
        VALUES (" + req.body.id + "," + req.body.id + ", \
        \"" + req.body.title + "\", \"" + req.body.location + "\",\
        \"" + req.body.startTime + "\",\"" + req.body.endTime + "\", \
        \"" + req.body.description + "\")", (err, result) => {
        if (err) res.send(JSON.stringify({ err: "Invalid Result" }))
        else {
            res.send(JSON.stringify({ success: "Successfully created" }));
        }
    });
});



//activity progress
app.get('/api/user/progress', (req, res) => {
    sql.query("SELECT SUM(score) as total FROM useractivity AS UA \
    INNER JOIN activity AS AC ON AC.id = UA.activityID \
    WHERE YEAR(CURRENT_TIMESTAMP) = YEAR(UA.completeDT)AND MONTH(CURRENT_TIMESTAMP) = MONTH(UA.completeDT)\
    AND DAY(CURRENT_TIMESTAMP) = DAY(UA.completeDT) AND UA.userID = " + req.query.userid, (err, result) => {
        if (err) res.json({ err: "Invalid user" });
        else {
            console.log(result[0])
            res.json({ score: (result[0].total > 100 ? 100 : result[0].total == null ? 0 : result[0].total) });
        }
    })
});

//add friend
app.post('/api/user/addfriend', (req, res) => {
    console.log(req.body);
    sql.query("SELECT COUNT(email) AS cnt FROM user WHERE email = \"" + req.body.email + "\"", (err, result) => {
        if (err) console.log(err);
        else if (result[0].cnt < 1) res.json({ err: "User don't exist" })
        else {
            sql.query("SELECT COUNT(UF.friendID) AS cnt \
            FROM userfriend AS UF INNER JOIN user AS US ON US.id = UF.friendID \
            WHERE US.email = \"" + req.body.email + "\" AND UF.userID = " + req.body.id, (err, result) => {
                if (err) console.log(err);
                else if (result[0].cnt > 0) res.json({ err: "User already added" })
                else {
                    sql.query("INSERT INTO userfriend (userID, friendID) \
                    VALUES (" + req.body.id + ", (SELECT id FROM user \
                        WHERE email=  \"" + req.body.email + "\")), \
                        ((SELECT id FROM user \
                            WHERE email= \"" + req.body.email + "\")," + req.body.id + ");", (err, result) => {
                        if (err) console.log(err);
                        else if (result.affectedRows > 0) res.send(JSON.stringify({ success: "Friend Successfully Added" }));
                        else res.send(JSON.stringify({ err: "Invalid" }))
                    });
                }
            });
        }
    });
});

//display friend list
app.get('/api/user/friendlist', (req, res) => {
    sql.query("SELECT US.name, US.email FROM user AS US \
    INNER JOIN userfriend AS UF ON US.id = UF.friendID \
    WHERE UF.userID = " + req.query.userid, (err, result) => {
        if (err) res.json({ err: err });
        else {
            let feed = [];
            for (let r of result) {
                feed.push({ name: r.name, email: r.email });
            }
            console.log(feed)
            res.json(feed);
        }
    })
});

app.listen(port, () => console.log(`Server listening on port ${port}!`))
