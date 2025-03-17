const express = require("express");
const cors = require("cors");
const path = require("path");

const vendorRoutes = require("./routes/vendorRoutes");
const salesmanRoutes = require("./routes/salesmanRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes"); // Cart-related routes
const orderRoutes = require("./routes/orderRoutes"); // Order-related routes

const app = express();

const corsOptions = {
  origin: 'http://localhost:5005',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
};

app.use(cors(corsOptions));
// Middleware
// app.use(cors());
app.use(express.json());

// Serve static files (for uploaded images)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/vendor", vendorRoutes);
app.use("/salesman", salesmanRoutes);
app.use("/product", productRoutes);
app.use("/cart", cartRoutes); // Register cart routes
app.use("/order", orderRoutes); // Register order routes

// Default route for health check
app.get("/", (req, res) => {
  res.status(200).json({ message: "API is running successfully!" });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({ message: "Internal Server Error", error: err.message });
});

module.exports = app;
