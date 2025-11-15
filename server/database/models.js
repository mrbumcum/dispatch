const { getDB } = require('./connection');

// Conversation model
class Conversation {
  static getCollection() {
    return getDB().collection('conversations');
  }

  static async create(conversationData) {
    const collection = this.getCollection();
    const result = await collection.insertOne({
      ...conversationData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return result.insertedId;
  }

  static async findById(id) {
    const collection = this.getCollection();
    return await collection.findOne({ _id: id });
  }

  static async update(id, updateData) {
    const collection = this.getCollection();
    return await collection.updateOne(
      { _id: id },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
  }

  static async findBySessionId(sessionId) {
    const collection = this.getCollection();
    return await collection.find({ sessionId }).sort({ createdAt: 1 }).toArray();
  }
}

// Session model
class Session {
  static getCollection() {
    return getDB().collection('sessions');
  }

  static async create(sessionData) {
    const collection = this.getCollection();
    const result = await collection.insertOne({
      ...sessionData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return result.insertedId;
  }

  static async findBySessionId(sessionId) {
    const collection = this.getCollection();
    return await collection.findOne({ sessionId: sessionId });
  }

  static async findById(id) {
    const collection = this.getCollection();
    const { ObjectId } = require('mongodb');
    return await collection.findOne({ _id: new ObjectId(id) });
  }

  static async updateBySessionId(sessionId, updateData) {
    const collection = this.getCollection();
    return await collection.updateOne(
      { sessionId: sessionId },
      { $set: { ...updateData, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  static async update(id, updateData) {
    const collection = this.getCollection();
    const { ObjectId } = require('mongodb');
    return await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
  }
}

module.exports = { Conversation, Session };

