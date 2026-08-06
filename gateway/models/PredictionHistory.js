// Mongo schema for one saved prediction result, owned by a user.
// One row per completed /predict call (routes/prediction.js), owned by
// the requesting user (userId). inputData/predictions/aiInsights are
// stored as loosely-typed Object/Array — deliberately not a strict
// sub-schema, since their real shape is defined upstream by Django's
// serializer (ml-backend/predictor/serializers.py) and predict.py's
// output, not by this gateway. Read back by GET /history's filter
// query in routes/prediction.js.
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
  aiInsights: {
    type: Object,
    required: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('PredictionHistory', predictionHistorySchema);