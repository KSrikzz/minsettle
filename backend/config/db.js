import mongoose from 'mongoose';

export async function connectDB() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://mongo:27017/group_debt_optimiser';

    const conn = await mongoose.connect(mongoUri);
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error(`[Database Error] ${error.message}`);
    }
    throw error;
  }
}
