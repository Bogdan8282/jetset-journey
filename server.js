const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const mysql = require("mysql2");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const session = require("express-session");
const MySQLStore = require('express-mysql-session')(session);
const methodOverride = require("method-override");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set("views", path.join(__dirname, "public"));
app.set("view engine", "ejs");

const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(methodOverride("_method"));

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_DATABASE,
});

db.connect((err) => {
  if (err) {
    throw err;
  }
});

app.use((req, res, next) => {
  if (req.session || req.session.authenticated) {
    db.query(
      "SELECT * FROM administrators WHERE email = ?",
      [req.session.email],
      (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Error fetching user role");
        }
        req.session.isAdmin = results.length > 0;
        next();
      }
    );
  } else {
    next();
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/confirmation", (req, res) => {
  const email = req.query.email;

  if (email) {
    const sql = "UPDATE users SET confirmed = true WHERE email = ?";
    db.query(sql, [email], (err, result) => {
      if (err) throw err;
      req.session.save();
      req.session.authenticated = true;
      res.render("confirmation.ejs", {});
    });
  } else {
    res.status(400).send("Bad Request");
  }
});

app.get("/verification", (req, res) => {
  res.render("verification.ejs", {});
});

app.post("/register", async (req, res) => {
  const regUsername = req.body.reg_username;
  const regEmail = req.body.email;
  const regPassword = req.body.reg_password;
  const hashedPassword = await bcrypt.hash(req.body.reg_password, 10);

  const sql =
    "INSERT INTO users (username, email, password, confirmed) VALUES (?, ?, ?, ?)";
  db.query(
    sql,
    [regUsername, regEmail, hashedPassword, false],
    (err, result) => {
      if (err) {
        console.log("Error occurred while inserting into database: ", err);
        return res
          .status(500)
          .send("Error occurred while inserting into database.");
      }

      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: 587,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      let message = {
        from: "Larry Zieme <larry.zieme@ethereal.email>",
        to: regEmail,
        subject: "Підтвердження пошти",
        html: `
                <p>Шановний користувач,</p>
                <p>Будь ласка, підтвердіть реєстрацію перейшовши за посиланням:</p>
                <p><a href="http://localhost:3000/confirmation?email=${regEmail}">Підтвердити</a></p>
                <p>Якщо ви не очікували на це повідомлення, ігноруйте його.</p>
            `,
        };
      transporter.sendMail(message, (err, info) => {
        if (err) {
          console.log("Error occurred. " + err.message);
          return res.status(500).send("Error occurred while sending email.");
        }

        console.log("Message sent: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

        res.redirect("/verification");
      });
    }
  );
});

app.post("/login", (req, res) => {
  const username = req.body.login_username;
  const password = req.body.login_password;

  db.query(
    "SELECT id, password, email FROM users WHERE username = ?",
    [username],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).send("Login error");
      }

      if (results.length === 0) {
        return res.status(400).send("User not found");
      }

      const user = results[0];
      const hash = user.password;

      bcrypt.compare(password, hash, (err, match) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Error passsword comparison");
        }

        if (match) {
          req.session.authenticated = true;
          req.session.save();
          req.session.userId = user.id;
          req.session.email = user.email;
          console.log("User ID:", user.id);
          res.redirect("/tours");
        } else {
          res.status(400).send("Incorrect password");
        }
      });
    }
  );
});

app.get("/tours", (req, res) => {
  if (!req.session.authenticated || !req.session) {
    return res.redirect("/authentication");
  }
  
  const isAdmin = req.session.isAdmin || false;
  
  db.query("SELECT * FROM tours", (err, results) => {
    if (err) throw err;
    res.render("tours.ejs", { tours: results, isAdmin: isAdmin });
  });
});

app.get("/tours/:id", (req, res) => {
  if (!req.session.authenticated || !req.session) {
    return res.redirect("/authentication");
  }
  const tourId = parseInt(req.params.id);
  db.query(
    "SELECT * FROM tours WHERE id = ?",
    [tourId],
    (err, tour) => {
      if (err) throw err;
      if (!tour[0]) {
        res.status(404).send("Tour not found");
        return;
      }
      db.query(
        "SELECT * FROM hotels WHERE city = ?",
        [tour[0].city],
        (err, hotels) => {
          if (err) throw err;
          res.render("tour.ejs", { tour: tour[0], hotels: hotels });
        }
      );
    }
  );
});

app.get("/tours/delete/:id", (req, res) => {
  if (!req.session.authenticated || !req.session) {
    return res.redirect("/authentication");
  }
  const tourId = parseInt(req.params.id);
  db.query(
    "DELETE FROM tours WHERE id = ?",
    [tourId],
    (err, result) => {
      if (err) throw err;
      res.redirect("/tours");
    }
  );
});

app.get("/tours/add/new", (req, res) => {
  if (!req.session.authenticated || !req.session) {
    return res.redirect("/authentication");
  }
  res.render("addTour.ejs");
});

app.get("/view-booking", isAdminCheck, (req, res) => {
    let sortBy = req.query.sort || "id";
    let sortOrder = req.query.order || "ASC";

    const sql = `
        SELECT booking.*, users.email, hotels.name AS hotel_name, tours.title AS tour_title
        FROM booking 
        INNER JOIN users_booking ON booking.id = users_booking.booking_id 
        INNER JOIN users ON users_booking.user_id = users.id
        LEFT JOIN hotels ON booking.hotel_id = hotels.id
        LEFT JOIN tours ON booking.tour_id = tours.id
        ORDER BY ${sortBy} ${sortOrder}
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching data from database:", err);
            return res.status(500).send("Internal server error");
        }

        res.render("view-booking.ejs", { bookings: results });
    });
});

app.get("/view-hotels", isAdminCheck, (req, res) => {
    let sortBy = req.query.sort || "id";
    let sortOrder = req.query.order || "ASC";

    const sql = `SELECT * FROM hotels ORDER BY ${sortBy} ${sortOrder}`;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching data from database:", err);
            return res.status(500).send("Internal server error");
        }

        res.render("view-hotels.ejs", { hotels: results });
    });
});

app.get("/view-messages", isAdminCheck, (req, res) => {
    let sortBy = req.query.sort || "id";
    let sortOrder = req.query.order || "ASC";

    const sql = `SELECT messages.*, users.email 
                FROM messages 
                INNER JOIN users 
                ON messages.user_id = users.id
                ORDER BY ${sortBy} ${sortOrder}`;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching messages:", err);
            return res.status(500).send("Internal server error");
        }

        res.render("view-messages.ejs", { messages: results });
    });
});

app.post("/tours/add/new", (req, res) => {
  const { title, description, city, price, category } = req.body;
  const admin_id = 1;
  db.query(
    "INSERT INTO tours (title, description, city, price, category, admin_id) VALUES (?, ?, ?, ?, ?, ?)",
    [title, description, city, price, category, admin_id],
    (err, result) => {
      if (err) throw err;
      res.redirect("/tours");
    }
  );
});

app.post("/order", (req, res) => {
    const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const { tourId, hotel, peopleNum } = req.body;
    
    let hotelId = null;
    if (hotel) {
        const [selectedHotelId, dailyPrice] = hotel.split(",");
        hotelId = parseInt(selectedHotelId);
    }

    const bookingData = [
        currentDate,
        peopleNum,
        hotelId,
        parseInt(tourId),
    ];

    const insertBookingSql = "INSERT INTO booking (timestamp, people_num, hotel_id, tour_id) VALUES (?, ?, ?, ?)";
    
    db.query(insertBookingSql, bookingData, (err, result) => {
        if (err) {
            console.error("Error inserting data into booking table:", err);
            return res.status(500).send("Internal server error");
        }

        const bookingId = result.insertId;

        const userId = req.session.userId;

        const insertUserBookingSql = "INSERT INTO users_booking (user_id, booking_id) VALUES (?, ?)";

        db.query(insertUserBookingSql, [userId, bookingId], (err, result) => {
            if (err) {
                console.error("Error inserting data into users_booking table:", err);
                return res.status(500).send("Internal server error");
            }

            console.log("Booking data inserted into MySQL with ID:", bookingId);
            console.log("User ID:", userId);

            res.send('<script>alert("Ваше замовлення прийнято. Ми з вами зв\'яжемось."); window.location.href="/tours";</script>');
        });
    });
});

app.get("/authentication", (req, res) => {
  res.render("authentication.ejs", { authenticated: req.session.authenticated });
});

app.get("/booking", (req, res) => {
  res.render("booking.ejs", { });
});

app.get("/contact-us", (req, res) => {
  if (!req.session.authenticated || !req.session) {
    return res.redirect("/authentication");
  }

  const isAdmin = req.session && req.session.isAdmin;

  res.render('contact-us.ejs', { isAdmin: isAdmin });
});

app.get("/faq", (req, res) => {
  res.render("faq.ejs", {});
});

app.post("/submit-form", (req, res) => {
  const { topic, message } = req.body;

  if (!topic || !message) {
    return res.status(400).send("Будь ласка, заповніть усі поля");
  }

  const userId = req.session.userId;

  if (!userId) {
    return res.status(400).send("Користувач не ідентифікований");
  }

  const sql = "INSERT INTO messages (topic, message, user_id) VALUES (?, ?, ?)";
  db.query(sql, [topic, message, userId], (err, result) => {
    if (err) {
      console.error("Error inserting data into database:", err);
      return res.status(500).send("Internal server error");
    }
  });
});

app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session: ", err);
            return res.status(500).send("Error destroying session");
        }
        if (req.session && req.session.authenticated) {
            delete req.session.authenticated;
        }
        res.redirect("/authentication");
    });
});

app.delete("/delete-message/:id", isAdminCheck, (req, res) => {
  const messageId = req.params.id;

  db.query("DELETE FROM messages WHERE id = ?", [messageId], (err, result) => {
    if (err) {
      console.error("Error deleting message:", err);
      return res.status(500).send("Internal server error");
    }
    res.redirect("/view-messages");
  });
});

app.delete("/delete-booking/:id", isAdminCheck, (req, res) => {
  const bookingId = req.params.id;

  db.query(
    "DELETE FROM users_booking WHERE booking_id = ?",
    [bookingId],
    (err, result) => {
      if (err) {
        console.error("Error deleting users_booking records:", err);
        return res.status(500).send("Internal server error");
      }

      db.query(
        "DELETE FROM booking WHERE id = ?",
        [bookingId],
        (err, result) => {
          if (err) {
            console.error("Error deleting booking:", err);
            return res.status(500).send("Internal server error");
          }
          res.redirect("/view-booking");
        }
      );
    }
  );
});

function isAdminCheck(req, res, next) {
  if (!req.session || !req.session.isAdmin) {
    return res.status(403).send('Доступ заборонено');
  }
  next();
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
