const mongoose = require('mongoose');
const User = require('../Model/UserModel');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect("mongodb+srv://triveni:M9fLy2oWyu8ewljr@cluster0.it4e3sl.mongodb.net/")
  .then(() => {
    console.log("Connected to MongoDB");
    addSampleLawyers();
  })
  .catch(err => console.log("MongoDB connection error:", err));

async function addSampleLawyers() {
  try {
    // Check if lawyers already exist
    const existingLawyers = await User.find({ userType: 'lawyer' });
    if (existingLawyers.length > 0) {
      console.log('Lawyers already exist, skipping...');
      process.exit(0);
    }

    const sampleLawyers = [
      {
        name: "John Smith",
        email: "john.smith@law.com",
        password: "password123",
        nic: "123456789V",
        phone: "0771234567",
        address: "123 Main Street, Colombo",
        userType: "lawyer",
        specialization: ["Civil", "Small Claims"],
        barNumber: "BAR001",
        yearsExperience: 5,
        rating: 4.5,
        casesHandled: 25,
        availability: true
      },
      {
        name: "Sarah Johnson",
        email: "sarah.johnson@law.com",
        password: "password123",
        nic: "234567890V",
        phone: "0772345678",
        address: "456 Oak Avenue, Kandy",
        userType: "lawyer",
        specialization: ["Property", "Real Estate"],
        barNumber: "BAR002",
        yearsExperience: 8,
        rating: 4.8,
        casesHandled: 40,
        availability: true
      },
      {
        name: "Michael Brown",
        email: "michael.brown@law.com",
        password: "password123",
        nic: "345678901V",
        phone: "0773456789",
        address: "789 Pine Road, Galle",
        userType: "lawyer",
        specialization: ["Family", "Divorce"],
        barNumber: "BAR003",
        yearsExperience: 12,
        rating: 4.9,
        casesHandled: 60,
        availability: true
      },
      {
        name: "Emily Davis",
        email: "emily.davis@law.com",
        password: "password123",
        nic: "456789012V",
        phone: "0774567890",
        address: "321 Elm Street, Negombo",
        userType: "lawyer",
        specialization: ["Consumer Rights", "Commercial"],
        barNumber: "BAR004",
        yearsExperience: 6,
        rating: 4.3,
        casesHandled: 30,
        availability: true
      },
      {
        name: "David Wilson",
        email: "david.wilson@law.com",
        password: "password123",
        nic: "567890123V",
        phone: "0775678901",
        address: "654 Maple Drive, Jaffna",
        userType: "lawyer",
        specialization: ["General Practice"],
        barNumber: "BAR005",
        yearsExperience: 15,
        rating: 4.7,
        casesHandled: 80,
        availability: true
      }
    ];

    // Hash passwords and create lawyers
    for (const lawyer of sampleLawyers) {
      lawyer.password = await bcrypt.hash(lawyer.password, 12);
    }

    await User.insertMany(sampleLawyers);
    console.log('Sample lawyers added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding sample lawyers:', error);
    process.exit(1);
  }
}
