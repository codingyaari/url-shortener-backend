import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const dbUrl = process.env.MONGODB_URI;
    if (!dbUrl) {
      console.error('MONGODB_URI is not defined in environment variables');
      process.exit(1);
    }
    const conn = await mongoose.connect(dbUrl);
    console.log(`✅ MongoDB Connected: ${dbUrl}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`, error);
    process.exit(1);
  }
};

export default connectDB;
