const express = require("express");
const cookieParser = require("cookie-parser");
const sql = require("mssql/msnodesqlv8");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use('/img', express.static(path.join(__dirname, '..', 'frontend', 'img')));

app.use((req, res, next) => {
  const origin = req.headers.origin || "*";
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, X-Test");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const sqlConfig = {
  driver: "msnodesqlv8",
  server: "(localdb)\\MSSQLLocalDB",
  database: "SalesDB",
  options: {
    trustServerCertificate: true,
    encrypt: false,
    enableArithAbort: true
  },
};

let pool = null;

async function initDb() {
  try {
    pool = await sql.connect(sqlConfig);
    console.log("DB CONNECTED SUCCESSFULLY");
    await setupSchema();
  } catch (err) {
    console.error("DB Connection error:", err.message);
  }
}

async function setupSchema() {
  try {
    const request = pool.request();
    await request.query(`
      IF OBJECT_ID('users_items', 'U') IS NOT NULL DROP TABLE users_items;
      IF OBJECT_ID('items', 'U') IS NOT NULL DROP TABLE items;
      IF OBJECT_ID('users', 'U') IS NOT NULL DROP TABLE users;
    `);
    console.log("Old tables dropped.");

    await request.query(`
      CREATE TABLE users (
        id INT PRIMARY KEY IDENTITY(1,1),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        contact VARCHAR(255),
        city VARCHAR(255),
        address VARCHAR(255)
      );

      CREATE TABLE items (
        id INT PRIMARY KEY IDENTITY(1,1),
        name VARCHAR(255) NOT NULL,
        price INT NOT NULL,
        category VARCHAR(100) NOT NULL,
        image_path VARCHAR(255)
      );

      CREATE TABLE users_items (
        id INT PRIMARY KEY IDENTITY(1,1),
        user_id INT NOT NULL,
        item_id INT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Added to cart',
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (item_id) REFERENCES items(id)
      );
    `);
    console.log("New tables created successfully.");
    await insertData();
  } catch (err) {
    console.error("Error setting up schema:", err.message);
  }
}

async function insertData() {
  try {
    const items = [
      { name: 'Cannon EOS', price: 36000, category: 'Cameras', img: 'cannon_eos.jpg' },
      { name: 'Sony DSLR', price: 40000, category: 'Cameras', img: 'sony_dslr.jpeg' },
      { name: 'Sony DSLR', price: 50000, category: 'Cameras', img: 'sony_dslr2.jpeg' },
      { name: 'Olympus DSLR', price: 80000, category: 'Cameras', img: 'olympus.jpg' },
      { name: 'Titan Model #301', price: 13000, category: 'Watches', img: 'titan301.jpg' },
      { name: 'Titan Model #201', price: 3000, category: 'Watches', img: 'titan201.jpg' },
      { name: 'HMT Milan', price: 8000, category: 'Watches', img: 'hmt.JPG' },
      { name: 'Favre Lueba #111', price: 18000, category: 'Watches', img: 'favreleuba.jpg' },
      { name: 'Raymond', price: 1500, category: 'Shirts', img: 'raymond.jpg' },
      { name: 'Charles', price: 1000, category: 'Shirts', img: 'charles.jpg' },
      { name: 'HXR', price: 900, category: 'Shirts', img: 'HXR.jpg' },
      { name: 'PINK', price: 1200, category: 'Shirts', img: 'pink.jpg' }
    ];

    const itemCheck = await pool.request().query("SELECT COUNT(*) as count FROM items");
    if (itemCheck.recordset[0].count === 0) {
      for (const item of items) {
        await pool.request()
          .input('name', sql.VarChar, item.name)
          .input('price', sql.Int, item.price)
          .input('category', sql.VarChar, item.category)
          .input('image_path', sql.VarChar, `/img/${item.img}`)
          .query("INSERT INTO items (name, price, category, image_path) VALUES (@name, @price, @category, @image_path)");
      }
      console.log("Items with categories inserted successfully.");
    }

    const userCheck = await pool.request().query("SELECT COUNT(*) as count FROM users");
    if (userCheck.recordset[0].count === 0) {
      await pool.request()
        .input('name', sql.VarChar, 'Ram')
        .input('email', sql.VarChar, 'ram@xyz.com')
        .input('password', sql.VarChar, 'password123')
        .input('contact', sql.VarChar, '8899889989')
        .input('city', sql.VarChar, 'Pune')
        .input('address', sql.VarChar, '100 palace colony, Pune')
        .query("INSERT INTO users (name, email, password, contact, city, address) VALUES (@name, @email, @password, @contact, @city, @address)");
      console.log("Sample user 'ram@xyz.com' created.");
    }
  } catch (err) {
    console.error("Error inserting data:", err.message);
  }
}

const authMiddleware = (req, res, next) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized. Please log in." });
  req.userId = parseInt(userId);
  next();
};

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, contact, city, address } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }
    await pool.request()
      .input('name', sql.VarChar, name)
      .input('email', sql.VarChar, email)
      .input('password', sql.VarChar, password)
      .input('contact', sql.VarChar, contact)
      .input('city', sql.VarChar, city)
      .input('address', sql.VarChar, address)
      .query("INSERT INTO users (name, email, password, contact, city, address) VALUES (@name, @email, @password, @contact, @city, @address)");
    res.status(201).json({ message: "User registered successfully." });
  } catch (err) {
    // Handle potential duplicate email error
    if (err.message.includes('UNIQUE KEY')) {
        return res.status(409).json({ error: 'Email already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const result = await pool.request()
      .input("email", sql.VarChar, email)
      .input("password", sql.VarChar, password)
      .query("SELECT id, name, email FROM users WHERE email = @email AND password = @password");

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: "Invalid credentials." });
    }
    
    const user = result.recordset[0];
    res.cookie("userId", user.id, { httpOnly: false, sameSite: "Lax", secure: false, maxAge: 86400000 });
    res.json({ message: "Logged in successfully.", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("userId");
  res.json({ message: "Logged out successfully." });
});

app.get("/api/items", async (req, res) => {
  try {
    const result = await pool.request().query("SELECT * FROM items");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/items/search", async (req, res) => {
    try {
        const searchTerm = req.query.q;
        if (!searchTerm) return res.status(400).json({ error: "Search query 'q' is required." });
        const result = await pool.request()
            .input("searchTerm", sql.VarChar, `%${searchTerm}%`)
            .query("SELECT * FROM items WHERE name LIKE @searchTerm");
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/items/category/:categoryName", async (req, res) => {
    try {
        const { categoryName } = req.params;
        const result = await pool.request()
            .input("categoryName", sql.VarChar, categoryName)
            .query("SELECT * FROM items WHERE category = @categoryName");
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/cart", authMiddleware, async (req, res) => {
    try {
        const result = await pool.request()
            .input("userId", sql.Int, req.userId)
            .query(`
                SELECT i.id, i.name, i.price, i.image_path 
                FROM items i
                JOIN users_items ui ON i.id = ui.item_id
                WHERE ui.user_id = @userId AND ui.status = 'Added to cart'
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete("/api/cart/:itemId", authMiddleware, async (req, res) => {
    try {
        const { itemId } = req.params;
        await pool.request()
            .input("userId", sql.Int, req.userId)
            .input("itemId", sql.Int, itemId)
            .query("DELETE FROM users_items WHERE user_id = @userId AND item_id = @itemId AND status = 'Added to cart'");
        res.json({ message: "Item removed from cart." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/checkout", authMiddleware, async (req, res) => {
    try {
        // This is a simplified checkout. In a real app, you'd create an order record.
        await pool.request()
            .input("userId", sql.Int, req.userId)
            .query("UPDATE users_items SET status = 'Confirmed' WHERE user_id = @userId AND status = 'Added to cart'");
        res.json({ message: "Thanh toán thành công! Cảm ơn bạn đã mua sắm." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/cart", authMiddleware, async (req, res) => {
    try {
        const { itemId } = req.body;
        if (!itemId) {
            return res.status(400).json({ error: "itemId is required." });
        }

        const existing = await pool.request()
            .input("userId", sql.Int, req.userId)
            .input("itemId", sql.Int, itemId)
            .query("SELECT id FROM users_items WHERE user_id = @userId AND item_id = @itemId AND status = 'Added to cart'");

        if (existing.recordset.length > 0) {
            return res.status(409).json({ message: "Item is already in the cart." });
        }

        await pool.request()
            .input("userId", sql.Int, req.userId)
            .input("itemId", sql.Int, itemId)
            .query("INSERT INTO users_items (user_id, item_id, status) VALUES (@userId, @itemId, 'Added to cart')");
        
        res.status(201).json({ message: "Item added to cart." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = 5000;
initDb().then(() => {
  app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));
});
