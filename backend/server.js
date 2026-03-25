const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const sql = require("mssql/msnodesqlv8");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use("/img", express.static(path.join(__dirname, "..", "frontend", "img")));

const MODE = (process.env.CORS_MODE || "vulnerable").toLowerCase();
let corsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-Test"],
  optionsSuccessStatus: 200,
};
if (MODE === "broken") {
  corsOptions = {
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Test"],
    optionsSuccessStatus: 200,
  };
}
if (MODE === "secure") {
  corsOptions = {
    origin: ["http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Test"],
    optionsSuccessStatus: 200,
  };
}
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use((req, _res, next) => {
  const origin = req.headers.origin || "none";
  const userId = req.cookies.userId || "none";
  console.log(`[REQ] ${req.method} ${req.path} | origin=${origin} | userId=${userId} | mode=${MODE}`);
  next();
});

const sqlConfig = {
  driver: "msnodesqlv8",
  server: "(localdb)\\MSSQLLocalDB",
  database: "SalesDB",
  options: {
    trustServerCertificate: true,
    encrypt: false,
    enableArithAbort: true,
  },
};

let pool = null;

async function ensureSchemaAndSeed() {
  const request = pool.request();
  await request.query(`
    IF OBJECT_ID('dbo.users', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        contact VARCHAR(255) NULL,
        city VARCHAR(255) NULL,
        address VARCHAR(255) NULL
      );
    END;

    IF OBJECT_ID('dbo.items', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.items (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price INT NOT NULL,
        category VARCHAR(100) NOT NULL,
        image_path VARCHAR(255) NULL
      );
    END;

    IF COL_LENGTH('dbo.items', 'category') IS NULL
      ALTER TABLE dbo.items ADD category VARCHAR(100) NOT NULL DEFAULT 'General';

    IF COL_LENGTH('dbo.items', 'image_path') IS NULL
      ALTER TABLE dbo.items ADD image_path VARCHAR(255) NULL;

    IF OBJECT_ID('dbo.users_items', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.users_items (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        item_id INT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Added to cart',
        CONSTRAINT FK_users_items_users FOREIGN KEY (user_id) REFERENCES dbo.users(id),
        CONSTRAINT FK_users_items_items FOREIGN KEY (item_id) REFERENCES dbo.items(id)
      );
    END;

    IF OBJECT_ID('dbo.orders', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.orders (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_orders_users FOREIGN KEY (user_id) REFERENCES dbo.users(id)
      );
    END;

    IF OBJECT_ID('dbo.order_items', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.order_items (
        id INT IDENTITY(1,1) PRIMARY KEY,
        order_id INT NOT NULL,
        item_id INT NOT NULL,
        price INT NOT NULL,
        CONSTRAINT FK_order_items_orders FOREIGN KEY (order_id) REFERENCES dbo.orders(id),
        CONSTRAINT FK_order_items_items FOREIGN KEY (item_id) REFERENCES dbo.items(id)
      );
    END;
  `);

  const itemsSeed = [
    { name: "Cannon EOS", price: 36000, category: "Cameras", img: "cannon_eos.jpg" },
    { name: "Sony DSLR", price: 40000, category: "Cameras", img: "sony_dslr.jpeg" },
    { name: "Sony DSLR", price: 50000, category: "Cameras", img: "sony_dslr2.jpeg" },
    { name: "Olympus DSLR", price: 80000, category: "Cameras", img: "olympus.jpg" },
    { name: "Titan Model #301", price: 13000, category: "Watches", img: "titan301.jpg" },
    { name: "Titan Model #201", price: 3000, category: "Watches", img: "titan201.jpg" },
    { name: "HMT Milan", price: 8000, category: "Watches", img: "hmt.JPG" },
    { name: "Favre Lueba #111", price: 18000, category: "Watches", img: "favreleuba.jpg" },
    { name: "Raymond", price: 1500, category: "Shirts", img: "raymond.jpg" },
    { name: "Charles", price: 1000, category: "Shirts", img: "charles.jpg" },
    { name: "HXR", price: 900, category: "Shirts", img: "HXR.jpg" },
    { name: "PINK", price: 1200, category: "Shirts", img: "pink.jpg" },
  ];

  const itemCount = await pool.request().query("SELECT COUNT(*) AS count FROM dbo.items");
  if (itemCount.recordset[0].count === 0) {
    for (const item of itemsSeed) {
      await pool
        .request()
        .input("name", sql.VarChar, item.name)
        .input("price", sql.Int, item.price)
        .input("category", sql.VarChar, item.category)
        .input("image_path", sql.VarChar, `/img/${item.img}`)
        .query("INSERT INTO dbo.items (name, price, category, image_path) VALUES (@name, @price, @category, @image_path)");
    }
  }

  const userCount = await pool.request().query("SELECT COUNT(*) AS count FROM dbo.users");
  if (userCount.recordset[0].count === 0) {
    await pool
      .request()
      .input("name", sql.VarChar, "Ram")
      .input("email", sql.VarChar, "ram@xyz.com")
      .input("password", sql.VarChar, "password123")
      .input("contact", sql.VarChar, "8899889989")
      .input("city", sql.VarChar, "Pune")
      .input("address", sql.VarChar, "100 palace colony, Pune")
      .query(
        "INSERT INTO dbo.users (name, email, password, contact, city, address) VALUES (@name, @email, @password, @contact, @city, @address)"
      );
  }
}

async function initDb() {
  pool = await sql.connect(sqlConfig);
  await ensureSchemaAndSeed();
}

const authMiddleware = (req, res, next) => {
  const userIdRaw = req.cookies.userId;
  const userId = parseInt(userIdRaw, 10);
  if (!userId || Number.isNaN(userId)) {
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }
  req.userId = userId;
  next();
};

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, contact, city, address } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }
    await pool
      .request()
      .input("name", sql.VarChar, name)
      .input("email", sql.VarChar, email)
      .input("password", sql.VarChar, password)
      .input("contact", sql.VarChar, contact)
      .input("city", sql.VarChar, city)
      .input("address", sql.VarChar, address)
      .query(
        "INSERT INTO dbo.users (name, email, password, contact, city, address) VALUES (@name, @email, @password, @contact, @city, @address)"
      );
    res.status(201).json({ message: "User registered successfully." });
  } catch (err) {
    if (String(err.message || "").toLowerCase().includes("unique")) {
      return res.status(409).json({ error: "Email already exists." });
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
    const result = await pool
      .request()
      .input("email", sql.VarChar, email)
      .input("password", sql.VarChar, password)
      .query("SELECT id, name, email FROM dbo.users WHERE email = @email AND password = @password");

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
    const result = await pool.request().query("SELECT id, name, price, category, image_path FROM dbo.items ORDER BY id");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/items/search", async (req, res) => {
  try {
    const searchTerm = req.query.q;
    if (!searchTerm) return res.status(400).json({ error: "Search query 'q' is required." });
    const result = await pool
      .request()
      .input("searchTerm", sql.VarChar, `%${searchTerm}%`)
      .query("SELECT id, name, price, category, image_path FROM dbo.items WHERE name LIKE @searchTerm ORDER BY id");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/items/category/:categoryName", async (req, res) => {
  try {
    const { categoryName } = req.params;
    const result = await pool
      .request()
      .input("categoryName", sql.VarChar, categoryName)
      .query("SELECT id, name, price, category, image_path FROM dbo.items WHERE category = @categoryName ORDER BY id");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/items", authMiddleware, async (req, res) => {
  try {
    const { name, price, category, image_path } = req.body;
    if (!name || price === undefined || price === null || !category) {
      return res.status(400).json({ error: "name, price, category are required." });
    }
    await pool
      .request()
      .input("name", sql.VarChar, name)
      .input("price", sql.Int, price)
      .input("category", sql.VarChar, category)
      .input("image_path", sql.VarChar, image_path || null)
      .query("INSERT INTO dbo.items (name, price, category, image_path) VALUES (@name, @price, @category, @image_path)");
    res.status(201).json({ message: "Item created." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/items/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, price, category, image_path } = req.body;
    if (!id || Number.isNaN(id)) return res.status(400).json({ error: "Invalid id." });
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("name", sql.VarChar, name || null)
      .input("price", sql.Int, price === undefined ? null : price)
      .input("category", sql.VarChar, category || null)
      .input("image_path", sql.VarChar, image_path === undefined ? null : image_path)
      .query(`
        UPDATE dbo.items
        SET
          name = COALESCE(@name, name),
          price = COALESCE(@price, price),
          category = COALESCE(@category, category),
          image_path = COALESCE(@image_path, image_path)
        WHERE id = @id
      `);
    res.json({ message: "Item updated." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/items/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || Number.isNaN(id)) return res.status(400).json({ error: "Invalid id." });
    await pool.request().input("id", sql.Int, id).query("DELETE FROM dbo.items WHERE id = @id");
    res.json({ message: "Item deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/cart", authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: "itemId is required." });

    const existing = await pool
      .request()
      .input("userId", sql.Int, req.userId)
      .input("itemId", sql.Int, itemId)
      .query("SELECT id FROM dbo.users_items WHERE user_id = @userId AND item_id = @itemId AND status = 'Added to cart'");

    if (existing.recordset.length > 0) return res.status(409).json({ message: "Item is already in the cart." });

    await pool
      .request()
      .input("userId", sql.Int, req.userId)
      .input("itemId", sql.Int, itemId)
      .query("INSERT INTO dbo.users_items (user_id, item_id, status) VALUES (@userId, @itemId, 'Added to cart')");

    res.status(201).json({ message: "Item added to cart." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/cart", authMiddleware, async (req, res) => {
  try {
    const result = await pool
      .request()
      .input("userId", sql.Int, req.userId)
      .query(`
        SELECT i.id, i.name, i.price, i.category, i.image_path
        FROM dbo.items i
        JOIN dbo.users_items ui ON i.id = ui.item_id
        WHERE ui.user_id = @userId AND ui.status = 'Added to cart'
        ORDER BY ui.id DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/cart/:itemId", authMiddleware, async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    if (!itemId || Number.isNaN(itemId)) return res.status(400).json({ error: "Invalid itemId." });

    await pool
      .request()
      .input("userId", sql.Int, req.userId)
      .input("itemId", sql.Int, itemId)
      .query("DELETE FROM dbo.users_items WHERE user_id = @userId AND item_id = @itemId AND status = 'Added to cart'");

    res.json({ message: "Item removed from cart." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/checkout", authMiddleware, async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const cartItems = await new sql.Request(transaction)
      .input("userId", sql.Int, req.userId)
      .query(`
        SELECT ui.id AS cart_id, ui.item_id, i.price
        FROM dbo.users_items ui
        JOIN dbo.items i ON i.id = ui.item_id
        WHERE ui.user_id = @userId AND ui.status = 'Added to cart'
      `);

    if (cartItems.recordset.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: "Cart is empty." });
    }

    const orderInsert = await new sql.Request(transaction)
      .input("userId", sql.Int, req.userId)
      .query("INSERT INTO dbo.orders (user_id) OUTPUT inserted.id VALUES (@userId)");
    const orderId = orderInsert.recordset[0].id;

    for (const row of cartItems.recordset) {
      await new sql.Request(transaction)
        .input("orderId", sql.Int, orderId)
        .input("itemId", sql.Int, row.item_id)
        .input("price", sql.Int, row.price)
        .query("INSERT INTO dbo.order_items (order_id, item_id, price) VALUES (@orderId, @itemId, @price)");
    }

    await new sql.Request(transaction)
      .input("userId", sql.Int, req.userId)
      .query("UPDATE dbo.users_items SET status = 'Confirmed' WHERE user_id = @userId AND status = 'Added to cart'");

    await transaction.commit();
    res.json({ message: "Thanh toán thành công! Cảm ơn bạn đã mua sắm.", orderId });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch (_) {}
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/orders", authMiddleware, async (req, res) => {
  try {
    const result = await pool
      .request()
      .input("userId", sql.Int, req.userId)
      .query(`
        SELECT o.id, o.created_at,
          (SELECT COUNT(*) FROM dbo.order_items oi WHERE oi.order_id = o.id) AS items_count,
          (SELECT SUM(oi.price) FROM dbo.order_items oi WHERE oi.order_id = o.id) AS total
        FROM dbo.orders o
        WHERE o.user_id = @userId
        ORDER BY o.id DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/orders/:id", authMiddleware, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    if (!orderId || Number.isNaN(orderId)) return res.status(400).json({ error: "Invalid order id." });

    const order = await pool
      .request()
      .input("orderId", sql.Int, orderId)
      .input("userId", sql.Int, req.userId)
      .query("SELECT id, user_id, created_at FROM dbo.orders WHERE id = @orderId AND user_id = @userId");

    if (order.recordset.length === 0) return res.status(404).json({ error: "Order not found." });

    const items = await pool
      .request()
      .input("orderId", sql.Int, orderId)
      .query(`
        SELECT i.id, i.name, oi.price, i.image_path, i.category
        FROM dbo.order_items oi
        JOIN dbo.items i ON i.id = oi.item_id
        WHERE oi.order_id = @orderId
        ORDER BY oi.id
      `);

    res.json({ order: order.recordset[0], items: items.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 5000;
initDb()
  .then(() => {
    app.listen(PORT, () => {});
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
