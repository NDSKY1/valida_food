const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
// Secret key for JWT
const SECRET_KEY = process.env.JWT_SECRET; 


const sendOtp = require("../utils/sendOtp"); // OTP sending utility

// Path to users.json file
const usersFilePath = path.join(__dirname, "../models/users.json");

// Read users.json safely
const readUsersFile = () => {
    try {
        if (!fs.existsSync(usersFilePath)) {
            fs.writeFileSync(usersFilePath, "[]", "utf8"); // Create if missing
        }
        let data = fs.readFileSync(usersFilePath, "utf8");
        return JSON.parse(data || "[]"); // Ensure valid JSON
    } catch (error) {
        console.error("Error reading users.json:", error);
        return [];
    }
};

// Write users.json safely
const writeUsersFile = (data) => {
    try {
        fs.writeFileSync(usersFilePath, JSON.stringify(data, null, 2), "utf8");
    } catch (error) {
        console.error("Error writing to users.json:", error);
    }
};

// Vendor Registration API
const registerVendor = (req, res) => {
    try {
        console.log("Received Request Body:", req.body);
        
        const { vendorName, shopName, mobile, password, gstNo, shopNo, address, landmark, city, state, pinCode, salesman } = req.body;

        if (!vendorName || !shopName || !mobile || !password) {
            return res.status(400).json({ status: 400, message: "Missing required fields" });
        }

        let users = readUsersFile();

        if (users.find((user) => user.mobile === mobile)) {
            return res.status(409).json({ status: 409, message: "Vendor already registered" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const newVendor = {
            id: users.length + 1,
            vendorName,
            shopName,
            mobile,
            password, 
            gstNo,
            shopNo,
            address,
            landmark,
            city,
            state,
            pinCode,
            salesman,
            otp,
            verified: false,
        };

        sendOtp(mobile, otp);
        users.push(newVendor);
        writeUsersFile(users);

        res.status(201).json({ status: 201, message: "OTP sent to registered mobile number", mobile });
    } catch (error) {
        console.error("Error in registerVendor:", error);
        res.status(500).json({ status: 500, message: "Internal server error" });
    }
};

// OTP Verification API
const verifyOtp = (req, res) => {
    try {
        let users = readUsersFile();
        const { mobile, otp } = req.body;

        if (!mobile || !otp) {
            return res.status(400).json({ status: 400, message: "Mobile number and OTP required" });
        }

        const vendorIndex = users.findIndex((user) => user.mobile === mobile);
        if (vendorIndex === -1) {
            return res.status(404).json({ status: 404, message: "Vendor not found" });
        }

        const vendor = users[vendorIndex];

        if (vendor.otp !== otp) {
            return res.status(401).json({ status: 401, message: "Invalid OTP" });
        }

        users[vendorIndex].verified = true;
        users[vendorIndex].otp = null;
        writeUsersFile(users);

        res.status(200).json({ status: 200, message: "Vendor verified successfully" });
    } catch (error) {
        console.error("Error in verifyOtp:", error);
        res.status(500).json({ status: 500, message: "Internal server error" });
    }
};

// Vendor Login API





// Vendor Login API
const loginVendor = (req, res) => {
    try {
        let users = readUsersFile();
        const { mobile, password } = req.body;

        if (!mobile || !password) {
            return res.status(400).json({ status: 400, message: "Mobile number and password required" });
        }

        // Find the vendor by mobile number
        const vendor = users.find((user) => user.mobile === mobile);

        if (!vendor) {
            return res.status(404).json({ status: 404, message: "Vendor not found" });
        }

        // Check if password matches
        if (vendor.password !== password) {
            return res.status(401).json({ status: 401, message: "Invalid password" });
        }

        // Check if vendor is verified
        if (!vendor.verified) {
            return res.status(403).json({ status: 403, message: "Vendor not verified. Please verify OTP." });
        }

        // Generate JWT Token
        const token = jwt.sign({ mobile: vendor.mobile, id: vendor.id }, SECRET_KEY, { expiresIn: "7d" });

        // Ensure response matches Flutter model
        res.status(200).json({ 
            status: 200, 
            message: "Login successful", 
            data: {   // <-- Change 'vendor' to 'data' to match Flutter model
                token: token,  
                vendorName: vendor.vendorName,
                mobile: vendor.mobile,
                gstNo: vendor.gstNo
            }
        });
    } catch (error) {
        console.error("Error in loginVendor:", error);
        res.status(500).json({ status: 500, message: "Internal server error" });
    }
};


const getProfile = (req, res) => {
    try {
        let users = readUsersFile();
        
        // Extract user ID from token
        const userId = req.user.id; // Ensure JWT contains 'id'

        const vendor = users.find((user) => user.id === userId);

        if (!vendor) {
            return res.status(404).json({ status: 404, message: "Vendor not found" });
        }

        // Structuring response
        const response = {
            status: 200,
            message: "Vendor profile fetched successfully",
            data: {
                id: vendor.id,
                vendorName: vendor.vendorName,
                shopName: vendor.shopName,
                mobile: vendor.mobile,
                gstNo: vendor.gstNo,
                status: vendor.verified ? "Active" : "Inactive",
                shipment: {
                    shopNo: vendor.shopNo || "",
                    address: vendor.address || "",
                    landmark: vendor.landmark || "",
                    city: vendor.city || "",
                    state: vendor.state || "",
                    pinCode: vendor.pinCode || "",
                }
            },
            orderData: {
                pendingOrders: 0,
                acceptedOrders: 0,
                cancelledOrders: 0,
                outOfDeliveryOrders: 0,
                deliveredOrders: 0
            }
        };

        res.status(200).json(response);
    } catch (error) {
        console.error("Error in getProfile:", error);
        res.status(500).json({ status: 500, message: "Internal server error" });
    }
};




// Change Password API
const changePassword = (req, res) => {
    try {
        let users = readUsersFile();
        
        const mobile = req.user.mobile; 
        
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ status: 400, message: "Old password and new password are required" });
        }

        let userIndex = users.findIndex((user) => user.mobile === mobile);
        if (userIndex === -1) {
            return res.status(404).json({ status: 404, message: "User not found" });
        }

        let user = users[userIndex];

        if (user.password !== oldPassword) {
            return res.status(401).json({ status: 401, message: "Old password is incorrect" });
        }

        users[userIndex].password = newPassword;
        writeUsersFile(users);

        res.status(200).json({ status: 200, message: "Password changed successfully" });
    } catch (error) {
        console.error("Error in changePassword:", error);
        res.status(500).json({ status: 500, message: "Internal server error" });
    }
};


const forgotPassword = (req, res) => {
    try {
        let users = readUsersFile();
        const { mobile } = req.body;

        if (!mobile) {
            return res.status(400).json({ status: 400, message: "Mobile number is required" });
        }

        let userIndex = users.findIndex((user) => user.mobile === mobile);
        if (userIndex === -1) {
            return res.status(404).json({ status: 404, message: "User not found" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate OTP
        users[userIndex].otp = otp;
        writeUsersFile(users);

        sendOtp(mobile, otp); // Send OTP to the user

        res.status(200).json({ status: 200, message: "OTP sent successfully", mobile });
    } catch (error) {
        console.error("Error in forgotPassword:", error);
        res.status(500).json({ status: 500, message: "Internal server error" });
    }
};



// Forgot Password OTP Verification API
const forgotPasswordVerifyOtp = (req, res) => {
    try {
        let users = readUsersFile();
        const { mobile, otp, password } = req.body;

        if (!mobile || !otp || !password) {
            return res.status(400).json({ status: 400, message: "Mobile, OTP, and new password are required" });
        }

        let userIndex = users.findIndex((user) => user.mobile === mobile);
        if (userIndex === -1) {
            return res.status(404).json({ status: 404, message: "User not found" });
        }

        let user = users[userIndex];

        if (user.otp !== otp) {
            return res.status(401).json({ status: 401, message: "Invalid OTP" });
        }

        // Update the password and remove OTP
        users[userIndex].password = password;
        users[userIndex].otp = null; // Clear OTP after verification
        writeUsersFile(users);

        res.status(200).json({ status: 200, message: "Password reset successfully" });
    } catch (error) {
        console.error("Error in forgotPasswordVerifyOtp:", error);
        res.status(500).json({ status: 500, message: "Internal server error" });
    }
};

module.exports = { 
    registerVendor, 
    verifyOtp, 
    loginVendor, 
    getProfile, 
    changePassword, 
    forgotPassword,  
    forgotPasswordVerifyOtp
};

