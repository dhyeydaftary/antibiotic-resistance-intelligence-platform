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

    const { predictions, aiInsights, modelVersion } = djangoResponse.data.data;

    await PredictionHistory.create({
      userId: req.userId,
      inputData: patientData,
      predictions: predictions,
      aiInsights: aiInsights,
    });

    res.status(200).json({
      success: true,
      data: {
        predictions,
        aiInsights,
        modelVersion,
      },
      error: null,
    });

  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }

    console.error('Error in /predict:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong while generating the prediction.',
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

    console.error('Error in /trends:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong while fetching trend data.',
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

    console.error('Error in /dataset-stats:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong while fetching dataset statistics.',
        field: null,
      },
    });
  }
});


router.get('/explain-trend', verifyToken, async (req, res) => {
  try {
    const djangoResponse = await axios.get(
      `${process.env.DJANGO_API_URL}/explain-trend/`,
      { params: req.query }
    );

    res.status(200).json(djangoResponse.data);

  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }

    console.error('Error in /explain-trend:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong while generating the trend explanation.',
        field: null,
      },
    });
  }
});


router.get('/research-papers', verifyToken, async (req, res) => {
  try {
    const djangoResponse = await axios.get(
      `${process.env.DJANGO_API_URL}/research-papers/`,
      { params: req.query }
    );

    res.status(200).json(djangoResponse.data);

  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }

    console.error('Error in /research-papers:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong while fetching research papers.',
        field: null,
      },
    });
  }
});


router.get('/history', verifyToken, async (req, res) => {
  try {
    const {
      result,
      antibiotic,
      confidenceMin,
      confidenceMax,
      organism,
      dateFrom,
      dateTo,
      search,
    } = req.query;

    const query = { userId: req.userId };

    // --- Organism filter (top-level field on inputData) ---
    if (organism) {
      query['inputData.organism'] = organism;
    }

    // --- Date range filter (on createdAt, from timestamps) ---
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // --- Result / Antibiotic / Confidence Range filter ---
    // These three combine into a single $elemMatch on the predictions array,
    // since they all describe a condition on ONE antibiotic entry within the record.
    const elemMatchConditions = {};

    if (antibiotic) {
      elemMatchConditions.antibiotic = antibiotic;
    }
    if (result) {
      elemMatchConditions.result = result;
    }
    if (confidenceMin || confidenceMax) {
      elemMatchConditions.confidence = {};
      if (confidenceMin) elemMatchConditions.confidence.$gte = parseFloat(confidenceMin);
      if (confidenceMax) elemMatchConditions.confidence.$lte = parseFloat(confidenceMax);
    }

    if (Object.keys(elemMatchConditions).length > 0) {
      query.predictions = { $elemMatch: elemMatchConditions };
    }

    // --- Search (organism name or antibiotic name, case-insensitive) ---
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { 'inputData.organism': searchRegex },
        { 'predictions.antibiotic': searchRegex },
      ];
    }

    const history = await PredictionHistory.find(query)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        history,
      },
      error: null,
    });

  } catch (err) {
    console.error('Error in /history:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong while fetching prediction history.',
        field: null,
      },
    });
  }
});

module.exports = router;