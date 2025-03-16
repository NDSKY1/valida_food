require("dotenv").config(); // Load environment variables
const app = require("./app"); // Import the Express app

const PORT = process.env.PORT || 5005;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
