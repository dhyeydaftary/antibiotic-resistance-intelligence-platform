const mongoose = require('mongoose');

const predictionHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  inputData: {
    type: Object,
    required: true,
  },
  predictions: {
    type: Array,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('PredictionHistory', predictionHistorySchema);