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


router.get('/trends', verifyToken, async (req, res) => {
  try {
    const djangoResponse = await axios.get(
      `${process.env.DJANGO_API_URL}/trends/`,
      { params: req.query }
    );

    res.status(200).json(djangoResponse.data);

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


router.get('/dataset-stats', verifyToken, async (req, res) => {
  try {
    const djangoResponse = await axios.get(
      `${process.env.DJANGO_API_URL}/dataset-stats/`
    );

    res.status(200).json(djangoResponse.data);

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


router.get('/history', verifyToken, async (req, res) => {
  try {
    const history = await PredictionHistory.find({ userId: req.userId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        history,
      },
      error: null,
    });

  } catch (err) {
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