import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPrediction } from '../api/predictionApi';

const ORGANISM_OPTIONS = [
  'Acinetobacter baumannii', 'Citrobacter spp.', 'Enterobacteria spp.',
  'Escherichia coli', 'Klebsiella pneumoniae', 'Morganella morganii',
  'Proteus mirabilis', 'Pseudomonas aeruginosa', 'Serratia marcescens', 'Unknown'
];

function PredictionInputPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    age: '',
    gender: 'Male',
    diabetes: false,
    hypertension: false,
    hospital_before: false,
    infection_freq: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    organism: 'Escherichia coli',
  });

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        ...formData,
        age: Number(formData.age),
        infection_freq: Number(formData.infection_freq),
        year: Number(formData.year),
        month: Number(formData.month),
      };

      const result = await getPrediction(payload);

      // Temporarily pass the real result via navigation state,
      // since there's no backend history storage yet (that's Node's job later)
      navigate('/predict/result/live', { state: { prediction: result.data } });
    } catch (err) {
      setError('Prediction failed. Check the console for details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Prediction Input Page</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '350px' }}>
        <label>
          Age
          <input type="number" name="age" value={formData.age} onChange={handleChange} required />
        </label>

        <label>
          Gender
          <select name="gender" value={formData.gender} onChange={handleChange}>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </label>

        <label>
          <input type="checkbox" name="diabetes" checked={formData.diabetes} onChange={handleChange} />
          Diabetes
        </label>

        <label>
          <input type="checkbox" name="hypertension" checked={formData.hypertension} onChange={handleChange} />
          Hypertension
        </label>

        <label>
          <input type="checkbox" name="hospital_before" checked={formData.hospital_before} onChange={handleChange} />
          Hospitalized before
        </label>

        <label>
          Infection Frequency
          <input type="number" name="infection_freq" value={formData.infection_freq} onChange={handleChange} required />
        </label>

        <label>
          Year
          <input type="number" name="year" value={formData.year} onChange={handleChange} required />
        </label>

        <label>
          Month
          <input type="number" name="month" min="1" max="12" value={formData.month} onChange={handleChange} required />
        </label>

        <label>
          Organism
          <select name="organism" value={formData.organism} onChange={handleChange}>
            {ORGANISM_OPTIONS.map((org) => (
              <option key={org} value={org}>{org}</option>
            ))}
          </select>
        </label>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Predicting...' : 'Predict Susceptibility'}
        </button>
      </form>
    </div>
  );
}

export default PredictionInputPage;