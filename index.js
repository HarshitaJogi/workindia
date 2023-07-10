const express = require('express')
const app = express()
const connection = require('./connection')
app.use(express.json())
const CryptoJS = require('crypto-js')
var generator = require('generate-password')
const jwt = require("jsonwebtoken")
require("dotenv").config()
const auth = require('./authroute')


function generateUserID() {
  var min = 100000; // Minimum value (inclusive)
  var max = 999999; // Maximum value (inclusive)
  var userID = Math.floor(Math.random() * (max - min + 1)) + min;
  return userID;
}

function generateBookID() {
  var min = 10000; // Minimum value (inclusive)
  var max = 99999; // Maximum value (inclusive)
  var userID = Math.floor(Math.random() * (max - min + 1)) + min;
  return userID;
}


function generateBookingID() {
  var min = 10000; // Minimum value (inclusive)
  var max = 99999; // Maximum value (inclusive)
  var userID = Math.floor(Math.random() * (max - min + 1)) + min;
  return userID;
}


app.get('/', (req, res) => {
    res.status(201).json('api is running')
})


app.post('/api/signup', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const email = req.body.email;
    var user_id = generateUserID();

    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = date + ' ' + time;
    

    var sql1 = `INSERT INTO workindia.user VALUES (?,?,?,?,?,CURDATE(),?)`
    connection.query(sql1,
        [   
            username,
            password,
            email,
            user_id,
            'No',
            null
        ],
        function (err, result) {
        if (err) throw err;
        console.log("Account successfully created");
            res.status(200).json({
                "status": "Account successfully created",
                "status_code": 200,
                "user_id": user_id
        })
    });
})




app.post('/api/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;


    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = date + ' ' + time;
    
    
    var sql2 = `SELECT * FROM workindia.user WHERE username = '${username}' AND password = '${password}'`
    connection.query(sql2,
        function (err, user) {
            if (err) throw err;
            if (user[0].length == 0) {
                res.status(401).json("Incorrect username/password provided. Please retry")
            }
            else {
                const token = jwt.sign({username: user[0].username}, process.env.JWT_KEY, {
                        expiresIn : "10 minutes"
                    })

                    res.cookie('jwt', token, {
                        expires: new Date(Date.now() + 600000),
                        httpOnly: true
                    })
                res.status(200).json({
                "status": "Login successful",
                "status_code": 200,
                "user_id": req.body.user_id,
                "access_token": token
        })
            }
            
    });
})




app.post('/api/books/create', (req, res) => {
    
    const title = req.body.title;
    const author = req.body.author;
    const isbn = req.body.isbn;
    const book_id = generateBookID();
    const booking_id = generateBookingID();
    

    var sql3 = `INSERT INTO workindia.book VALUES (?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,?)`
    connection.query(sql3,
        [   
            title,
            author,
            isbn,
            book_id,
            null
        ],
        function (err, result) {
        if (err) throw err;
        console.log("Account successfully created");
            res.status(200).json({
                "message": "Book added successfully",
                "book_id": book_id
        })
    });
})



app.get('/api/books', (req, res) => {
    const title = req.query.title;

    var sql4 = `select book_id, title, author, isbn from workindia.book where title like '%${title}%' or title like '${title}%'`
    connection.query(sql4,
        function (err, result) {
            if (err) throw err;
            else {
                console.log("Book Found");
                res.status(200).json(result)
            }
    });
})




app.get('/api/books/:bookid/availability', (req, res) => {
    const bookid = req.params.bookid;

    var sql5 = 'SELECT * FROM  workindia.book WHERE book_id=?';
    connection.query(sql5,
        [   
            bookid,
        ],
        function (err, book) {
        if (err) throw err;

        if(book[0].length==0) res.send(401).json({
            "status": "Incorrect ID provided. Please retry",
            "status_code": 401
        })
       else{

        const currentTime = new Date();
        const bookDateTime = new Date(book[0].returntime);

        if (currentTime > bookDateTime) {
            res.status(201).json({
                "book_id": book[0].book_id,
                "title": book[0].title,
                "author": book[0].author,
                "available": true
            })
        } else {
            const next_available_at = new Date(bookDateTime);
            next_available_at.setDate(bookDateTime.getDate() + 1);

            res.status(201).json({
                "book_id": book[0].book_id,
                "title": book[0].title,
                "author": book[0].author,
                "available": false,
                "next_available_at": next_available_at,
            })
        }

       }
        
        
    });
     
   
})




app.post("/api/books/borrow",auth,(req,res) => {
    const book_id = req.body.book_id;
    const user_id = req.body.user_id;
    const issue_time = req.body.issue_time;
    const return_time = req.body.return_time;

    var sql6 = 'SELECT * FROM  workindia.book WHERE book_id=?';
    connection.query(sql6,
        [ 
            book_id,
        ],
        function (err, book) {
        if (err) throw err;

        if(book[0].length==0) res.send(401).json({
            "status": "Incorrect ID provided. Please retry",
            "status_code": 401
        })
       else{

        const currentTime = new Date();
        const bookDateTime = new Date(book[0].returntime);
        const booking_id=generateBookID();

        if (currentTime > bookDateTime) {
            

            //update user
            var sql7 =`UPDATE workindia.user SET booking_id = ? WHERE user_id=?`
            connection.query(sql7,
            [   
                booking_id,
                user_id
            ],
            function (err, result) {
            if (err) throw err;
            });


            //update book
                var sql8 =`UPDATE workindia.book
                SET booking_id = ?,issuetime=?,returntime=?
                WHERE book_id=?;`
            connection.query(sql8,
            [   
                booking_id,
                issue_time,
                return_time,
                book_id,
            ],
            function (err, result) {
            if (err) throw err;
            });

            res.status(200).json({
                "status": "Book booked successfully",
                "status_code": 200,
                "booking_id": booking_id,
            })


        } else {
           
            res.status(400).json({
                "status": "Book is not available at this moment",
                "status_code": 400
            })
        }

       }
        
        
    });
    
})




app.listen(3000, () => {
    console.log('backend server is running')
}) 