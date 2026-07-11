const express = require('express');
const axios = require('axios');
const verifyToken = require('../middleware/verifyToken');
const PredictionHistory = require('../models/PredictionHistory');

const router = express.Router();

router.post('/predict', verifyToken, async (req, res) => {
  try {
    const patientData = req.body;

    const djangoResponse = await axios.post(
      `${process.env.DJANGO_API_URL}/predict/`,
      patientData
    );

    const { predictions, modelVersion } = djangoResponse.data.data;

    await PredictionHistory.create({
      userId: req.userId,
      inputData: patientData,
      predictions: predictions,
    });

    res.status(200).json({
      success: true,
      data: {
        predictions,
        modelVersion,
      },
      error: null,
    });

  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }

    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message,
        field: null,
      },
    });
  }
});

module.exports = router;